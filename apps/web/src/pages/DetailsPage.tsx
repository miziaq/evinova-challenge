import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Alert, Button, List, Typography } from "antd";
import type { FeedbackRecord } from "@evinova/contracts";
import { fetchRecordById } from "../api/records.js";

const FIELD_LABELS: Record<keyof FeedbackRecord, string> = {
  id: "Id",
  submittedAt: "Submitted At",
  originalText: "Text",
  processingState: "Status",
  retries: "Retries",
  lastAttemptAt: "Last Attempt At",
  category: "Category",
  sentiment: "Sentiment",
  severity: "Severity",
  summary: "Summary",
  suggestedAction: "Suggested Action",
};

function formatValue(value: FeedbackRecord[keyof FeedbackRecord]): string {
  if (value === null) {
    return "—";
  }
  return String(value);
}

export function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<FeedbackRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Missing record id.");
      return;
    }

    let cancelled = false;
    fetchRecordById(id)
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (!data) {
          setError("Record not found.");
          return;
        }
        setRecord(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load record.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Back
      </Button>
      <Typography.Title level={2}>Feedback Details</Typography.Title>
      {error && <Alert type="error" title={error} showIcon />}
      {!error && record && (
        <List
          bordered
          dataSource={Object.keys(FIELD_LABELS) as (keyof FeedbackRecord)[]}
          renderItem={(field) => (
            <List.Item>
              <List.Item.Meta title={FIELD_LABELS[field]} description={formatValue(record[field])} />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
