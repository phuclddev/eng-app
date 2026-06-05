"use client";

import { Card, Empty, Space, Typography } from "antd";

import type { AiTutorStructuredFeedbackSection } from "@/lib/types";

export function AiStructuredSections({
  sections,
  emptyDescription = "No structured AI response is available.",
}: {
  sections: AiTutorStructuredFeedbackSection[] | null | undefined;
  emptyDescription?: string;
}) {
  if (!sections || sections.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyDescription}
      />
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {sections.map((section) => (
        <Card key={section.key} size="small" className="ai-inline-response">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong>{section.title}</Typography.Text>
            <Typography.Paragraph
              className="wrap-anywhere"
              style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
            >
              {section.content}
            </Typography.Paragraph>
          </Space>
        </Card>
      ))}
    </Space>
  );
}
