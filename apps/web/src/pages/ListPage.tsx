import { useEffect, useState } from "react";
import { Table, Typography, type TableColumnsType } from "antd";
import type { FeedbackRecord } from "@evinova/contracts";
import { fetchAllRecords } from "../api/records.js";

const columns: TableColumnsType<FeedbackRecord> = [
  { title: "Id", dataIndex: "id", key: "id" },
  { title: "Submitted At", dataIndex: "submittedAt", key: "submittedAt" },
  { title: "Text", dataIndex: "originalText", key: "originalText" },
  { title: "Status", dataIndex: "processingState", key: "processingState" },
  { title: "Category", dataIndex: "category", key: "category" },
  { title: "Sentiment", dataIndex: "sentiment", key: "sentiment" },
  { title: "Severity", dataIndex: "severity", key: "severity" },
  { title: "Summary", dataIndex: "summary", key: "summary" },
  { title: "Suggested Action", dataIndex: "suggestedAction", key: "suggestedAction" },
];

export function ListPage() {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchAllRecords()
      .then((data) => {
        if (!cancelled) {
          setRecords(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={2}>Feedback</Typography.Title>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        locale={{ emptyText: "no records available" }}
      />
    </div>
  );
}
