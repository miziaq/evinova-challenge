import type { FeedbackRecord } from "@evinova/contracts";
import type { FeedbackStore } from "../worker/types.js";

export class InMemoryFeedbackStore implements FeedbackStore {
  private readonly records = new Map<string, FeedbackRecord>();

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
}
