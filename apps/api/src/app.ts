import express, { type Express } from "express";
import { createRecordsRouter } from "./routes/records.js";
import type { RecordsRouterDeps } from "./routes/records.js";

export type CreateAppDeps = RecordsRouterDeps;

export function createApp({ store }: CreateAppDeps): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/records", createRecordsRouter({ store }));

  return app;
}
