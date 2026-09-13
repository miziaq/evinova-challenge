import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryFeedbackStore } from "../store/inMemoryStore.js";

describe("POST /api/records/new", () => {
  it("returns 201 with a Location header on success", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store });

    const response = await request(app)
      .post("/api/records/new")
      .send({ text: "The export button crashes the app every time." });

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/api/records/${response.body.id}`);
  });

  it("sets only id and text on the record, with system defaults for the rest", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store });
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
    const app = createApp({ store });

    const response = await request(app)
      .post("/api/records/new")
      .send({ text: "too short" });

    expect(response.status).toBe(400);
    expect(store.getAll()).toHaveLength(0);
  });
});

describe("GET /api/records/:id", () => {
  it("returns 200 with the record when it exists", async () => {
    const store = new InMemoryFeedbackStore();
    const app = createApp({ store });
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
    const app = createApp({ store });

    const response = await request(app).get(
      "/api/records/11111111-1111-4111-8111-111111111111",
    );

    expect(response.status).toBe(404);
  });
});
