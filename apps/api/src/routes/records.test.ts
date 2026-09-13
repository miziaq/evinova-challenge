import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryFeedbackStore } from "../store/inMemoryStore.js";
import type { FeedbackWorker } from "../worker/types.js";
import type { FeedbackRecord } from "@evinova/contracts";

function buildNoopWorker(): FeedbackWorker {
  return {
    processRecord: vi.fn().mockResolvedValue(undefined),
    processClaimedRecord: vi.fn().mockResolvedValue(undefined),
  };
}

let nextId = 1;
function buildRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  const id = String(nextId++).padStart(8, "0");
  return {
    id: `${id}-0000-4000-8000-000000000000`,
    submittedAt: "2026-06-29T10:00:00.000Z",
    originalText: "A piece of feedback long enough to pass validation.",
    processingState: "succeeded",
    retries: 0,
    lastAttemptAt: null,
    category: "bug",
    sentiment: "negative",
    severity: "high",
    summary: "Summary",
    suggestedAction: "Suggested action",
    ...overrides,
  };
}

describe("POST /api/records/new", () => {
  it("returns 201 with a Location header on success", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });

    const response = await request(app)
      .post("/api/records/new")
      .send({ text: "The export button crashes the app every time." });

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/api/records/${response.body.id}`);
  });

  it("sets only id and text on the record, with system defaults for the rest", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });
    const text = "The export button crashes the app every time.";

    const response = await request(app)
      .post("/api/records/new")
      .send({ text });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      originalText: text,
      processingState: "pending",
      retries: 0,
      lastAttemptAt: null,
    });
    expect(response.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof response.body.submittedAt).toBe("string");

    const stored = store.getById(response.body.id);
    expect(stored).toMatchObject({
      originalText: text,
      processingState: "pending",
      retries: 0,
      lastAttemptAt: null,
    });
  });

  it("returns 400 when text is under 15 characters", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });

    const response = await request(app)
      .post("/api/records/new")
      .send({ text: "too short" });

    expect(response.status).toBe(400);
    expect(store.getAll()).toHaveLength(0);
  });

  it("triggers the worker without awaiting it — the response returns before processing completes", async () => {
    const store = new InMemoryFeedbackStore();
    let resolveProcessing!: () => void;
    const processing = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });
    const worker: FeedbackWorker = {
      processRecord: vi.fn().mockReturnValue(processing),
      processClaimedRecord: vi.fn().mockResolvedValue(undefined),
    };
    const app = createApp({ store, worker });

    const response = await request(app)
      .post("/api/records/new")
      .send({ text: "The export button crashes the app every time." });

    expect(response.status).toBe(201);
    expect(worker.processRecord).toHaveBeenCalledTimes(1);
    expect(worker.processRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: response.body.id }),
    );

    resolveProcessing();
  });
});

describe("GET /api/records/all", () => {
  it("returns an empty array when there are no records", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });

    const response = await request(app).get("/api/records/all");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns all records sorted by submittedAt", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });
    store.add({
      id: "11111111-1111-4111-8111-111111111111",
      submittedAt: "2026-06-29T12:00:00.000Z",
      originalText: "Second submitted record, newer timestamp.",
      processingState: "pending",
      retries: 0,
      lastAttemptAt: null,
      category: null,
      sentiment: null,
      severity: null,
      summary: null,
      suggestedAction: null,
    });
    store.add({
      id: "22222222-2222-4222-8222-222222222222",
      submittedAt: "2026-06-29T10:00:00.000Z",
      originalText: "First submitted record, older timestamp.",
      processingState: "pending",
      retries: 0,
      lastAttemptAt: null,
      category: null,
      sentiment: null,
      severity: null,
      summary: null,
      suggestedAction: null,
    });

    const response = await request(app).get("/api/records/all");

    expect(response.status).toBe(200);
    expect(response.body.map((record: { id: string }) => record.id)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("groups records by category when aggregate=category", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });
    const bug = buildRecord({ category: "bug" });
    const praise = buildRecord({ category: "praise" });
    const pending = buildRecord({
      processingState: "pending",
      category: null,
      sentiment: null,
      severity: null,
      summary: null,
      suggestedAction: null,
    });
    [bug, praise, pending].forEach((record) => store.add(record));

    const response = await request(app).get("/api/records/all?aggregate=category");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      bug: [bug],
      feature_request: [],
      praise: [praise],
      other: [],
      unprocessed: [pending],
    });
  });

  it("groups records by severity when aggregate=severity", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });
    const high = buildRecord({ severity: "high" });
    const low = buildRecord({ severity: "low" });
    const failed = buildRecord({
      processingState: "failed",
      retries: 3,
      category: null,
      sentiment: null,
      severity: null,
      summary: null,
      suggestedAction: null,
    });
    [high, low, failed].forEach((record) => store.add(record));

    const response = await request(app).get("/api/records/all?aggregate=severity");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      low: [low],
      medium: [],
      high: [high],
      unprocessed: [failed],
    });
  });

  it("returns 400 for an unsupported aggregate value", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });

    const response = await request(app).get("/api/records/all?aggregate=bogus");

    expect(response.status).toBe(400);
  });
});

describe("GET /api/records/:id", () => {
  it("returns 200 with the record when it exists", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });
    const text = "The export button crashes the app every time.";
    const created = await request(app).post("/api/records/new").send({ text });

    const response = await request(app).get(`/api/records/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: created.body.id,
      originalText: text,
      processingState: "pending",
    });
  });

  it("returns 404 when the record does not exist", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store, worker: buildNoopWorker() });

    const response = await request(app).get(
      "/api/records/11111111-1111-4111-8111-111111111111",
    );

    expect(response.status).toBe(404);
  });
});
