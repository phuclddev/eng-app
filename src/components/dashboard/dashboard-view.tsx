"use client";

import {
  Card,
  Col,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";

import { formatDateTime } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/types";

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
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
          <Card title="Weak Topics">
            <Table
              rowKey="topic"
              pagination={false}
              dataSource={snapshot.weakTopics}
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
    </Space>
  );
}
