import type { FeedbackRecord } from "@evinova/contracts";
import type { FeedbackWorker } from "../worker/types.js";

export interface SweeperStore {
  getAll(): FeedbackRecord[];
  claim(id: string): boolean;
}

export interface SweeperDeps {
  store: SweeperStore;
  worker: FeedbackWorker;
  staleClaimThresholdMs: number;
}

export interface Sweeper {
  sweep(): Promise<void>;
}
