"use client";

import {
  Button,
  Card,
  Col,
  Grid,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";

import { formatDateTime } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/types";

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Dashboard
        </Typography.Title>
        <Typography.Text type="secondary">
          Track review load, retention, and weak areas in one compact workspace.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={4}>
          <Card><Statistic title="Chunks in library" value={snapshot.totalChunks} /></Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card><Statistic title="Reviews due" value={snapshot.dueReviews} /></Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card><Statistic title="Accuracy" value={snapshot.accuracyRate} suffix="%" /></Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card><Statistic title="Current streak" value={snapshot.currentStreak} suffix="days" /></Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card><Statistic title="Avg mastery" value={snapshot.masteryAverage} suffix="/100" /></Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card><Statistic title="Learned this week" value={snapshot.learnedThisWeek} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Weak Topics" className="table-card">
            {isMobile ? (
              <List
                className="mobile-card-list"
                dataSource={snapshot.weakTopics}
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
                dataSource={snapshot.weakTopics}
                scroll={{ x: 560 }}
                columns={[
                  {
                    title: "Topic",
                    dataIndex: "topic",
                  },
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
                  {
                    title: "Attempts",
                    dataIndex: "attempts",
                  },
                ]}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Recent Activity">
            <List
              dataSource={snapshot.recentActivity}
              renderItem={(activity) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="geekblue">{activity.label}</Tag>
                        <span>{activity.detail}</span>
                      </Space>
                    }
                    description={formatDateTime(activity.createdAt)}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="AI Study Coach">
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Typography.Text className="wrap-anywhere">
                Turn your weak chunks, due reviews, and low-accuracy topics into a concise 7-day IELTS Speaking plan.
              </Typography.Text>
              <Button type="primary" className="full-width-mobile">
                <Link href="/study-coach">Open AI Study Coach</Link>
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Speaking Simulator">
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Typography.Text className="wrap-anywhere">
                Run a text-based IELTS Speaking interview with one examiner question at a time.
              </Typography.Text>
              <Button className="full-width-mobile">
                <Link href="/speaking-simulator">Start simulator</Link>
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
