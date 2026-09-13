import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { InMemoryFeedbackStore } from "./store/inMemoryStore.js";

describe("GET /health", () => {
  it("returns 200 with an ok status", async () => {
    const app = createApp({ store: new InMemoryFeedbackStore() });

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
