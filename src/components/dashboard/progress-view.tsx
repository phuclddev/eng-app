"use client";

import { Card, Col, Progress, Row, Table, Typography } from "antd";

import { EXERCISE_LABELS } from "@/lib/constants";
import type { ProgressSnapshot } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ProgressView({ snapshot }: { snapshot: ProgressSnapshot }) {
  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Progress
        </Typography.Title>
        <Typography.Text type="secondary">
          Inspect where accuracy drops and which chunks need another deliberate pass.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="By Exercise Type">
            <Table
              rowKey="type"
              pagination={false}
              dataSource={snapshot.byExerciseType}
              columns={[
                {
                  title: "Exercise",
                  render: (_, record) => EXERCISE_LABELS[record.type],
                },
                {
                  title: "Attempts",
                  dataIndex: "attempts",
                },
                {
                  title: "Accuracy",
                  render: (_, record) => (
                    <Progress
                      percent={record.accuracyRate}
                      size="small"
                      strokeColor="#0f766e"
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="By Topic">
            <Table
              rowKey="topic"
              pagination={false}
              dataSource={snapshot.byTopic}
              columns={[
                { title: "Topic", dataIndex: "topic" },
                { title: "Attempts", dataIndex: "attempts" },
                {
                  title: "Accuracy",
                  render: (_, record) => (
                    <Progress
                      percent={record.accuracyRate}
                      size="small"
                      strokeColor={record.accuracyRate < 60 ? "#d97706" : "#0f766e"}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Weak Chunks">
        <Table
          rowKey="chunk"
          pagination={false}
          dataSource={snapshot.weakChunks}
          columns={[
            { title: "Chunk", dataIndex: "chunk" },
            { title: "Topic", dataIndex: "topic" },
            { title: "Mastery", dataIndex: "masteryScore" },
            {
              title: "Next review",
              render: (_, record) => formatDate(record.nextReviewAt),
            },
          ]}
        />
      </Card>
    </div>
  );
}
