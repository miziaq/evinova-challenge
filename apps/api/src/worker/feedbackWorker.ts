import { FeedbackContentSchema } from "@evinova/contracts";
import type { PendingFeedbackRecord } from "@evinova/contracts";
import type { FeedbackWorker, FeedbackWorkerDeps } from "./types.js";

export function createFeedbackWorker({
  store,
  aiClient,
  maxRetries,
}: FeedbackWorkerDeps): FeedbackWorker {
  function recordAttemptFailure(record: PendingFeedbackRecord): void {
    const retries = record.retries + 1;
    store.update(record.id, {
      processingState: retries >= maxRetries ? "failed" : "pending",
      retries,
      lastAttemptAt: new Date().toISOString(),
    });
  }

  async function processClaimedRecord(record: PendingFeedbackRecord): Promise<void> {
    let rawOutput: unknown;
    try {
      rawOutput = await aiClient.extractFeedback(record.originalText);
    } catch (error: unknown) {
      console.error(`AI client call failed for record ${record.id}:`, error);
      recordAttemptFailure(record);
      return;
    }

    const result = FeedbackContentSchema.safeParse(rawOutput);

    if (result.success) {
      store.update(record.id, {
        processingState: "succeeded",
        ...result.data,
      });
      return;
    }

    recordAttemptFailure(record);
  }

  return {
    processClaimedRecord,
    async processRecord(record: PendingFeedbackRecord): Promise<void> {
      if (!store.claim(record.id)) {
        return;
      }

      await processClaimedRecord(record);
    },
  };
}
