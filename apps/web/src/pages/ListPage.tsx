import { useEffect, useMemo, useState } from "react";
import { Space, Table, Typography, type TableColumnsType } from "antd";
import { Link } from "react-router";
import { CategorySchema, SeveritySchema } from "@evinova/contracts";
import type { FeedbackRecord } from "@evinova/contracts";
import { fetchAllRecords } from "../api/records.js";

const UNPROCESSED = "unprocessed";

function buildCountSummary(
  records: FeedbackRecord[],
  field: "category" | "severity",
  labels: readonly string[],
): string {
  const counts = new Map<string, number>(labels.map((label) => [label, 0]));
  counts.set(UNPROCESSED, 0);

  for (const record of records) {
    const value = record[field] ?? UNPROCESSED;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
}

export function ListPage() {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<"ascend" | "descend">("ascend");

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

  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return sortDirection === "ascend" ? sorted : sorted.reverse();
  }, [records, sortDirection]);

  const categorySummary = useMemo(
    () => buildCountSummary(records, "category", CategorySchema.options),
    [records],
  );
  const severitySummary = useMemo(
    () => buildCountSummary(records, "severity", SeveritySchema.options),
    [records],
  );

  const columns: TableColumnsType<FeedbackRecord> = [
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      sortOrder: sortDirection,
      showSorterTooltip: false,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () =>
          setSortDirection((current) => (current === "ascend" ? "descend" : "ascend")),
      }),
    },
    {
      title: "Id",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Link to={`/details/${id}`}>{id}</Link>,
    },
    { title: "Text", dataIndex: "originalText", key: "originalText" },
    { title: "Status", dataIndex: "processingState", key: "processingState" },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      filters: [...CategorySchema.options, UNPROCESSED].map((value) => ({
        text: value,
        value,
      })),
      onFilter: (value, record) => (record.category ?? UNPROCESSED) === value,
    },
    { title: "Sentiment", dataIndex: "sentiment", key: "sentiment" },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      filters: [...SeveritySchema.options, UNPROCESSED].map((value) => ({
        text: value,
        value,
      })),
      onFilter: (value, record) => (record.severity ?? UNPROCESSED) === value,
    },
    { title: "Summary", dataIndex: "summary", key: "summary" },
    { title: "Suggested Action", dataIndex: "suggestedAction", key: "suggestedAction" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={2}>Feedback</Typography.Title>
      <Space orientation="vertical" size="middle" style={{ display: "flex" }}>
        <Space orientation="vertical" size="small">
          <Typography.Text>Category — {categorySummary}</Typography.Text>
          <Typography.Text>Severity — {severitySummary}</Typography.Text>
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={sortedRecords}
          loading={loading}
          locale={{ emptyText: "no records available" }}
        />
      </Space>
    </div>
  );
}
