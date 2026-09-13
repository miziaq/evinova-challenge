import type { FeedbackRecord } from "@evinova/contracts";
import type { Sweeper, SweeperDeps } from "./types.js";

function isCandidate(record: FeedbackRecord, staleClaimThresholdMs: number): boolean {
  if (record.processingState === "pending") {
    return true;
  }

  return (
    record.processingState === "processing" &&
    record.lastAttemptAt !== null &&
    Date.now() - new Date(record.lastAttemptAt).getTime() > staleClaimThresholdMs
  );
}

export function createSweeper({ store, worker, staleClaimThresholdMs }: SweeperDeps): Sweeper {
  return {
    async sweep(): Promise<void> {
      const candidates = store.getAll().filter((record) => isCandidate(record, staleClaimThresholdMs));

      await Promise.all(
        candidates.map(async (record) => {
          if (!store.claim(record.id)) {
            return;
          }
          await worker.processClaimedRecord(record);
        }),
      );
    },
  };
}
