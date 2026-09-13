import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFeedbackWorker } from "./feedbackWorker.js";
import type { FeedbackRecord, PendingFeedbackRecord } from "@evinova/contracts";
import type { AiClient, FeedbackStore } from "./types.js";

function buildPendingRecord(
  overrides: Partial<PendingFeedbackRecord> = {},
): PendingFeedbackRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    submittedAt: "2026-06-29T10:00:00.000Z",
    originalText: "The export button crashes the app every time I click it.",
    processingState: "pending",
    retries: 0,
    lastAttemptAt: null,
    ...overrides,
  };
}

describe("createFeedbackWorker", () => {
  let store: FeedbackStore;
  let aiClient: AiClient;

  beforeEach(() => {
    store = { update: vi.fn(), claim: vi.fn().mockReturnValue(true) };
    aiClient = { extractFeedback: vi.fn() };
  });

  // Feature: AI feedback extraction
  //   Scenario: AI model returns a valid structured response
  it("marks the record succeeded and sets content fields when the AI response is valid", async () => {
    const record = buildPendingRecord();
    const validContent: Omit<
      FeedbackRecord,
      keyof PendingFeedbackRecord
    > = {
      category: "bug",
      sentiment: "negative",
      severity: "high",
      summary: "Export button crashes the app.",
      suggestedAction: "Investigate export button crash.",
    };
    vi.mocked(aiClient.extractFeedback).mockResolvedValue(validContent);

    const worker = createFeedbackWorker({ store, aiClient, maxRetries: 3 });
    await worker.processRecord(record);

    expect(store.update).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({
        processingState: "succeeded",
        category: validContent.category,
        sentiment: validContent.sentiment,
        severity: validContent.severity,
        summary: validContent.summary,
        suggestedAction: validContent.suggestedAction,
      }),
    );
  });

  // Feature: AI feedback extraction
  //   Scenario: AI model returns output that fails the contract
  it("reverts the record to pending and increments retries when the AI response fails the schema", async () => {
    const record = buildPendingRecord({ processingState: "pending", retries: 0 });
    vi.mocked(aiClient.extractFeedback).mockResolvedValue({
      category: "not-a-valid-category",
      sentiment: "negative",
      severity: "high",
      summary: "Export button crashes the app.",
      suggestedAction: "Investigate export button crash.",
    });

    const worker = createFeedbackWorker({ store, aiClient, maxRetries: 3 });
    const before = Date.now();
    await worker.processRecord(record);
    const after = Date.now();

    expect(store.update).toHaveBeenCalledTimes(1);
    const [id, patch] = vi.mocked(store.update).mock.calls[0]!;
    expect(id).toBe(record.id);
    expect(patch.processingState).toBe("pending");
    expect(patch.retries).toBe(1);
    expect(patch.lastAttemptAt).toBeTruthy();
    const lastAttemptAtMs = new Date(patch.lastAttemptAt as string).getTime();
    expect(lastAttemptAtMs).toBeGreaterThanOrEqual(before);
    expect(lastAttemptAtMs).toBeLessThanOrEqual(after);
  });

  it('marks the record "failed" once retries reaches maxRetries', async () => {
    const maxRetries = 3;
    vi.mocked(aiClient.extractFeedback).mockResolvedValue({
      category: "not-a-valid-category",
    });

    const worker = createFeedbackWorker({ store, aiClient, maxRetries });

    let record = buildPendingRecord({ processingState: "pending", retries: 0 });
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await worker.processRecord(record);
      const [, patch] = vi.mocked(store.update).mock.calls[attempt]!;
      record = { ...record, ...patch } as PendingFeedbackRecord;
    }

    expect(store.update).toHaveBeenCalledTimes(maxRetries);
    const [, finalPatch] = vi.mocked(store.update).mock.calls[maxRetries - 1]!;
    expect(finalPatch.processingState).toBe("failed");
    expect(finalPatch.retries).toBe(maxRetries);
  });

  it("short-circuits without calling aiClient when claim() returns false", async () => {
    vi.mocked(store.claim).mockReturnValue(false);
    const record = buildPendingRecord();

    const worker = createFeedbackWorker({ store, aiClient, maxRetries: 3 });
    await worker.processRecord(record);

    expect(store.claim).toHaveBeenCalledWith(record.id);
    expect(aiClient.extractFeedback).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
  });
});
