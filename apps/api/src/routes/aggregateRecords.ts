import { z } from "zod";
import { CategorySchema, SeveritySchema } from "@evinova/contracts";
import type { FeedbackRecord } from "@evinova/contracts";

const UNPROCESSED = "unprocessed";

export const AggregateDimensionSchema = z.enum(["category", "severity"]);
export type AggregateDimension = z.infer<typeof AggregateDimensionSchema>;

export function aggregateRecords(
  records: FeedbackRecord[],
  dimension: AggregateDimension,
): Record<string, FeedbackRecord[]> {
  const labels: string[] =
    dimension === "category" ? [...CategorySchema.options] : [...SeveritySchema.options];

  const buckets: Record<string, FeedbackRecord[]> = Object.fromEntries(
    labels.map((label) => [label, []]),
  );
  buckets[UNPROCESSED] = [];

  for (const record of records) {
    const value = record[dimension];
    const bucket = value === null ? UNPROCESSED : value;
    buckets[bucket]!.push(record);
  }

  return buckets;
}
