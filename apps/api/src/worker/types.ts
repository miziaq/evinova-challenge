import type { FeedbackRecord, PendingFeedbackRecord } from "@evinova/contracts";

export interface FeedbackStore {
  update(id: string, patch: Partial<FeedbackRecord>): void;
  claim(id: string): boolean;
}

export interface AiClient {
  extractFeedback(text: string): Promise<unknown>;
}

export interface FeedbackWorkerDeps {
  store: FeedbackStore;
  aiClient: AiClient;
  maxRetries: number;
}

export interface FeedbackWorker {
  processRecord(record: PendingFeedbackRecord): Promise<void>;
}
