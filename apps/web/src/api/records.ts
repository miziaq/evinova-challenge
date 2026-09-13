import type { FeedbackRecord } from "@evinova/contracts";

export async function fetchAllRecords(): Promise<FeedbackRecord[]> {
  const response = await fetch("/api/records/all");
  if (!response.ok) {
    throw new Error(`Failed to fetch records: ${response.status}`);
  }
  return response.json() as Promise<FeedbackRecord[]>;
}

export async function fetchRecordById(id: string): Promise<FeedbackRecord | null> {
  const response = await fetch(`/api/records/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch record: ${response.status}`);
  }
  return response.json() as Promise<FeedbackRecord>;
}
