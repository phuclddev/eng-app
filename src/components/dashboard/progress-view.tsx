"use client";

import { Card, Col, Grid, List, Progress, Row, Space, Table, Tag, Typography } from "antd";

import { EXERCISE_LABELS } from "@/lib/constants";
import type { ProgressSnapshot } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ProgressView({ snapshot }: { snapshot: ProgressSnapshot }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Progress
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Inspect where accuracy drops and which chunks need another deliberate pass.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="By Exercise Type" className="table-card">
            {isMobile ? (
              <List
                className="mobile-card-list"
                dataSource={snapshot.byExerciseType}
                renderItem={(record) => (
                  <List.Item>
                    <Card size="small" title={EXERCISE_LABELS[record.type]}>
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <Progress
                          percent={record.accuracyRate}
                          size="small"
                          strokeColor="#0f766e"
                        />
                        <Typography.Text type="secondary">
                          {record.attempts} attempts
                        </Typography.Text>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Table
                rowKey="type"
                pagination={false}
                dataSource={snapshot.byExerciseType}
                scroll={{ x: 560 }}
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
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="By Topic" className="table-card">
            {isMobile ? (
              <List
                className="mobile-card-list"
                dataSource={snapshot.byTopic}
                renderItem={(record) => (
                  <List.Item>
                    <Card size="small" title={<span className="wrap-anywhere">{record.topic}</span>}>
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <Progress
                          percent={record.accuracyRate}
                          size="small"
                          strokeColor={record.accuracyRate < 60 ? "#d97706" : "#0f766e"}
                        />
                        <Typography.Text type="secondary">
                          {record.attempts} attempts
                        </Typography.Text>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Table
                rowKey="topic"
                pagination={false}
                dataSource={snapshot.byTopic}
                scroll={{ x: 560 }}
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
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Weak Chunks" className="table-card">
        {isMobile ? (
          <List
            className="mobile-card-list"
            dataSource={snapshot.weakChunks}
            renderItem={(record) => (
              <List.Item>
                <Card size="small" title={<span className="wrap-anywhere">{record.chunk}</span>}>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Space wrap>
                      {record.topic ? <Tag>{record.topic}</Tag> : <Tag>No topic</Tag>}
                      <Tag color={record.masteryScore < 50 ? "volcano" : "green"}>
                        Mastery {record.masteryScore}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      Next review: {formatDate(record.nextReviewAt)}
                    </Typography.Text>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="chunk"
            pagination={false}
            dataSource={snapshot.weakChunks}
            scroll={{ x: 640 }}
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
        )}
      </Card>
    </div>
  );
}
