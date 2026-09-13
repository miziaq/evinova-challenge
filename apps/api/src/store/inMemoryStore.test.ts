import { describe, expect, it } from "vitest";
import type { FeedbackRecord } from "@evinova/contracts";
import { InMemoryFeedbackStore } from "./inMemoryStore.js";

const STALE_CLAIM_THRESHOLD_MS = 3 * 60 * 1000;

function buildRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    submittedAt: "2026-06-29T10:00:00.000Z",
    originalText: "The export button crashes the app every time I click it.",
    processingState: "pending",
    retries: 0,
    lastAttemptAt: null,
    category: null,
    sentiment: null,
    severity: null,
    summary: null,
    suggestedAction: null,
    ...overrides,
  };
}

describe("InMemoryFeedbackStore#claim", () => {
  it("only lets one of two concurrent claims on the same id succeed", () => {
    const store = new InMemoryFeedbackStore();
    store.add(buildRecord({ processingState: "pending" }));

    const first = store.claim("11111111-1111-4111-8111-111111111111");
    const second = store.claim("11111111-1111-4111-8111-111111111111");

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(store.getById("11111111-1111-4111-8111-111111111111")?.processingState).toBe(
      "processing",
    );
  });

  it("claims a never-attempted pending record", () => {
    const store = new InMemoryFeedbackStore();
    store.add(buildRecord({ processingState: "pending", lastAttemptAt: null }));

    expect(store.claim("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("claims a stale processing record (lastAttemptAt older than the threshold)", () => {
    const store = new InMemoryFeedbackStore(STALE_CLAIM_THRESHOLD_MS);
    const staleTimestamp = new Date(
      Date.now() - STALE_CLAIM_THRESHOLD_MS - 1000,
    ).toISOString();
    store.add(
      buildRecord({ processingState: "processing", lastAttemptAt: staleTimestamp }),
    );

    expect(store.claim("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("does not claim a genuinely mid-flight processing record", () => {
    const store = new InMemoryFeedbackStore(STALE_CLAIM_THRESHOLD_MS);
    const recentTimestamp = new Date(Date.now() - 1000).toISOString();
    store.add(
      buildRecord({ processingState: "processing", lastAttemptAt: recentTimestamp }),
    );

    expect(store.claim("11111111-1111-4111-8111-111111111111")).toBe(false);
  });

  it("does not claim a succeeded or failed record", () => {
    const store = new InMemoryFeedbackStore();
    store.add(buildRecord({ processingState: "succeeded" }));

    expect(store.claim("11111111-1111-4111-8111-111111111111")).toBe(false);
  });

  it("returns false for an unknown id", () => {
    const store = new InMemoryFeedbackStore();

    expect(store.claim("does-not-exist")).toBe(false);
  });
});
