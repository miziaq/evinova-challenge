import type { FeedbackRecord } from "@evinova/contracts";
import type { FeedbackStore } from "../worker/types.js";
import { getStaleClaimThresholdMs } from "../config.js";

export class InMemoryFeedbackStore implements FeedbackStore {
  private readonly records = new Map<string, FeedbackRecord>();
  private readonly staleClaimThresholdMs: number;

  constructor(staleClaimThresholdMs: number = getStaleClaimThresholdMs()) {
    this.staleClaimThresholdMs = staleClaimThresholdMs;
  }

  add(record: FeedbackRecord): void {
    this.records.set(record.id, record);
  }

  getById(id: string): FeedbackRecord | undefined {
    return this.records.get(id);
  }

  getAll(): FeedbackRecord[] {
    return Array.from(this.records.values());
  }

  update(id: string, patch: Partial<FeedbackRecord>): void {
    const existing = this.records.get(id);
    if (!existing) {
      return;
    }
    this.records.set(id, { ...existing, ...patch });
  }

  claim(id: string): boolean {
    const existing = this.records.get(id);
    if (!existing) {
      return false;
    }

    const isPending = existing.processingState === "pending";
    const isStaleProcessing =
      existing.processingState === "processing" &&
      existing.lastAttemptAt !== null &&
      Date.now() - new Date(existing.lastAttemptAt).getTime() >
        this.staleClaimThresholdMs;

    if (!isPending && !isStaleProcessing) {
      return false;
    }

    this.records.set(id, { ...existing, processingState: "processing" });
    return true;
  }
}
