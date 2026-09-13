import { FeedbackContentSchema } from "@evinova/contracts";
import type { PendingFeedbackRecord } from "@evinova/contracts";
import type { FeedbackWorker, FeedbackWorkerDeps } from "./types.js";

export function createFeedbackWorker({
  store,
  aiClient,
  maxRetries,
}: FeedbackWorkerDeps): FeedbackWorker {
  return {
    async processRecord(record: PendingFeedbackRecord): Promise<void> {
      if (!store.claim(record.id)) {
        return;
      }

      const rawOutput = await aiClient.extractFeedback(record.originalText);
      const result = FeedbackContentSchema.safeParse(rawOutput);

      if (result.success) {
        store.update(record.id, {
          processingState: "succeeded",
          ...result.data,
        });
        return;
      }

      const retries = record.retries + 1;
      store.update(record.id, {
        processingState: retries >= maxRetries ? "failed" : "pending",
        retries,
        lastAttemptAt: new Date().toISOString(),
      });
    },
  };
}
