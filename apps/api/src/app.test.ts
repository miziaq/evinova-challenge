import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { InMemoryFeedbackStore } from "./store/inMemoryStore.js";
import type { FeedbackWorker } from "./worker/types.js";

describe("GET /health", () => {
  it("returns 200 with an ok status", async () => {
    const worker: FeedbackWorker = { processRecord: vi.fn().mockResolvedValue(undefined) };
    const app = createApp({ store: new InMemoryFeedbackStore(), worker });

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
