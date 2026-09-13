import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSweeper } from "./sweeper.js";
import type { FeedbackRecord } from "@evinova/contracts";
import type { FeedbackWorker } from "../worker/types.js";
import type { SweeperStore } from "./types.js";

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

describe("createSweeper", () => {
  let store: SweeperStore;
  let worker: FeedbackWorker;

  beforeEach(() => {
    store = { getAll: vi.fn().mockReturnValue([]), claim: vi.fn().mockReturnValue(true) };
    worker = { processRecord: vi.fn().mockResolvedValue(undefined) };
  });

  it("selects and claims a never-attempted pending record, then calls the worker", async () => {
    const pending = buildRecord({
      id: "11111111-1111-4111-8111-111111111111",
      processingState: "pending",
      lastAttemptAt: null,
    });
    vi.mocked(store.getAll).mockReturnValue([pending]);

    const sweeper = createSweeper({ store, worker, staleClaimThresholdMs: STALE_CLAIM_THRESHOLD_MS });
    await sweeper.sweep();

    expect(store.claim).toHaveBeenCalledWith(pending.id);
    expect(worker.processRecord).toHaveBeenCalledTimes(1);
    expect(worker.processRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: pending.id }),
    );
  });

  it("does NOT select a genuinely mid-flight processing record (lastAttemptAt < 3 min old)", async () => {
    const recentTimestamp = new Date(Date.now() - 1000).toISOString();
    const midFlight = buildRecord({
      id: "22222222-2222-4222-8222-222222222222",
      processingState: "processing",
      lastAttemptAt: recentTimestamp,
    });
    vi.mocked(store.getAll).mockReturnValue([midFlight]);

    const sweeper = createSweeper({ store, worker, staleClaimThresholdMs: STALE_CLAIM_THRESHOLD_MS });
    await sweeper.sweep();

    expect(store.claim).not.toHaveBeenCalled();
    expect(worker.processRecord).not.toHaveBeenCalled();
  });

  it("selects and claims a stale-processing record (lastAttemptAt > 3 min old)", async () => {
    const staleTimestamp = new Date(Date.now() - STALE_CLAIM_THRESHOLD_MS - 1000).toISOString();
    const stale = buildRecord({
      id: "33333333-3333-4333-8333-333333333333",
      processingState: "processing",
      lastAttemptAt: staleTimestamp,
    });
    vi.mocked(store.getAll).mockReturnValue([stale]);

    const sweeper = createSweeper({ store, worker, staleClaimThresholdMs: STALE_CLAIM_THRESHOLD_MS });
    await sweeper.sweep();

    expect(store.claim).toHaveBeenCalledWith(stale.id);
    expect(worker.processRecord).toHaveBeenCalledTimes(1);
    expect(worker.processRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: stale.id }),
    );
  });

  it("does not call the worker for a candidate whose claim() fails", async () => {
    const pending = buildRecord({
      id: "44444444-4444-4444-8444-444444444444",
      processingState: "pending",
    });
    vi.mocked(store.getAll).mockReturnValue([pending]);
    vi.mocked(store.claim).mockReturnValue(false);

    const sweeper = createSweeper({ store, worker, staleClaimThresholdMs: STALE_CLAIM_THRESHOLD_MS });
    await sweeper.sweep();

    expect(store.claim).toHaveBeenCalledWith(pending.id);
    expect(worker.processRecord).not.toHaveBeenCalled();
  });

  it("does not select succeeded or failed records", async () => {
    const succeeded = buildRecord({
      id: "55555555-5555-4555-8555-555555555555",
      processingState: "succeeded",
    });
    const failed = buildRecord({
      id: "66666666-6666-4666-8666-666666666666",
      processingState: "failed",
      retries: 3,
    });
    vi.mocked(store.getAll).mockReturnValue([succeeded, failed]);

    const sweeper = createSweeper({ store, worker, staleClaimThresholdMs: STALE_CLAIM_THRESHOLD_MS });
    await sweeper.sweep();

    expect(store.claim).not.toHaveBeenCalled();
    expect(worker.processRecord).not.toHaveBeenCalled();
  });

  it("processes exactly one candidate per successfully claimed record, skipping non-candidates", async () => {
    const recentTimestamp = new Date(Date.now() - 1000).toISOString();
    const staleTimestamp = new Date(Date.now() - STALE_CLAIM_THRESHOLD_MS - 1000).toISOString();

    const neverAttempted = buildRecord({
      id: "11111111-1111-4111-8111-111111111111",
      processingState: "pending",
      lastAttemptAt: null,
    });
    const midFlight = buildRecord({
      id: "22222222-2222-4222-8222-222222222222",
      processingState: "processing",
      lastAttemptAt: recentTimestamp,
    });
    const stale = buildRecord({
      id: "33333333-3333-4333-8333-333333333333",
      processingState: "processing",
      lastAttemptAt: staleTimestamp,
    });
    const succeeded = buildRecord({
      id: "44444444-4444-4444-8444-444444444444",
      processingState: "succeeded",
    });

    vi.mocked(store.getAll).mockReturnValue([neverAttempted, midFlight, stale, succeeded]);

    const sweeper = createSweeper({ store, worker, staleClaimThresholdMs: STALE_CLAIM_THRESHOLD_MS });
    await sweeper.sweep();

    expect(store.claim).toHaveBeenCalledTimes(2);
    expect(store.claim).toHaveBeenCalledWith(neverAttempted.id);
    expect(store.claim).toHaveBeenCalledWith(stale.id);
    expect(store.claim).not.toHaveBeenCalledWith(midFlight.id);
    expect(store.claim).not.toHaveBeenCalledWith(succeeded.id);

    expect(worker.processRecord).toHaveBeenCalledTimes(2);
    expect(worker.processRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: neverAttempted.id }),
    );
    expect(worker.processRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: stale.id }),
    );
  });
});
