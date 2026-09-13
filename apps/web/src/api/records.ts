import type { FeedbackRecord } from "@evinova/contracts";

export async function fetchAllRecords(): Promise<FeedbackRecord[]> {
  const response = await fetch("/api/records/all");
  if (!response.ok) {
    throw new Error(`Failed to fetch records: ${response.status}`);
  }
  return response.json() as Promise<FeedbackRecord[]>;
}
