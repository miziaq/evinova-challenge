import { Router } from "express";
import { randomUUID } from "node:crypto";
import { SubmitFeedbackRequestSchema } from "@evinova/contracts";
import type { FeedbackRecord } from "@evinova/contracts";
import type { FeedbackStore, FeedbackWorker } from "../worker/types.js";

export interface RecordsRouterDeps {
  store: Pick<FeedbackStore, "update" | "claim"> & {
    add(record: FeedbackRecord): void;
    getById(id: string): FeedbackRecord | undefined;
  };
  worker: FeedbackWorker;
}

export function createRecordsRouter({ store, worker }: RecordsRouterDeps): Router {
  const router = Router();

  router.post("/new", (req, res) => {
    const parsed = SubmitFeedbackRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const record: FeedbackRecord = {
      id: randomUUID(),
      submittedAt: new Date().toISOString(),
      originalText: parsed.data.text,
      processingState: "pending",
      retries: 0,
      lastAttemptAt: null,
      category: null,
      sentiment: null,
      severity: null,
      summary: null,
      suggestedAction: null,
    };

    store.add(record);

    res.status(201).location(`/api/records/${record.id}`).json(record);

    worker.processRecord(record).catch((error: unknown) => {
      console.error(`AI processing failed for record ${record.id}:`, error);
    });
  });

  router.get("/:id", (req, res) => {
    const record = store.getById(req.params.id);
    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.status(200).json(record);
  });

  return router;
}
