import { FeedbackContentSchema } from "@evinova/contracts";
import type { PendingFeedbackRecord } from "@evinova/contracts";
import type { FeedbackWorker, FeedbackWorkerDeps } from "./types.js";

export function createFeedbackWorker({
  store,
  aiClient,
}: FeedbackWorkerDeps): FeedbackWorker {
  return {
    async processRecord(record: PendingFeedbackRecord): Promise<void> {
      const rawOutput = await aiClient.extractFeedback(record.originalText);
      const result = FeedbackContentSchema.safeParse(rawOutput);

      if (result.success) {
        store.update(record.id, {
          processingState: "succeeded",
          ...result.data,
        });
        return;
      }

      store.update(record.id, {
        processingState: "pending",
        retries: record.retries + 1,
        lastAttemptAt: new Date().toISOString(),
      });
    },
  };
}
