"use client";

import { LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import type { FamilyInsightsSnapshot } from "@/lib/types";

export function FamilyInsightsView({
  snapshot,
  aiEnabled,
}: {
  snapshot: FamilyInsightsSnapshot;
  aiEnabled: boolean;
}) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const requestSummary = async () => {
    if (!aiEnabled) {
      message.warning("AI is not configured on this server.");
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/family/insights/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as {
        answer?: string;
        message?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.message ?? "Could not load weekly summary.");
      }

      setSummary(data.answer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load weekly summary.",
      );
    } finally {
      setLoading(false);
    }
  };

  const heroStats = [
    { label: "Practice answers", value: snapshot.totalAnswers },
    {
      label: "Weekly accuracy",
      value: snapshot.accuracyRate,
      suffix: "%",
    },
    {
      label: "Weekly streak",
      value: snapshot.weeklyStreakDays,
      suffix: " days",
    },
    {
      label: "Conversations",
      value: snapshot.conversationsGenerated,
    },
    {
      label: "Roleplays",
      value: snapshot.roleplaysStarted,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Weekly Insights
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Family English progress for the last {snapshot.windowDays} days. Isolated from IELTS analytics.
        </Typography.Text>
      </div>

      <Card>
        <Row gutter={[16, 16]}>
          {heroStats.map((stat) => (
            <Col key={stat.label} xs={12} md={8} lg={6}>
              <Statistic
                title={stat.label}
                value={stat.value}
                suffix={stat.suffix}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title="What should Phuc focus on next week?"
        extra={
          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
            onClick={() => void requestSummary()}
            loading={loading}
            disabled={loading || !aiEnabled}
          >
            {summary ? "Refresh summary" : "Generate AI summary"}
          </Button>
        }
      >
        {error ? (
          <Alert
            type="warning"
            showIcon
            message="Could not load weekly summary"
            description={error}
          />
        ) : summary ? (
          <AiMarkdownMessage content={summary} />
        ) : (
          <Alert
            type="info"
            showIcon
            message="No AI summary yet"
            description="Tap Generate AI summary to get a Vietnamese coach review of last week."
          />
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Most practiced chunks this week">
            {snapshot.topPracticedChunks.length === 0 ? (
              <Empty
                description="No family practice answers yet this week."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={snapshot.topPracticedChunks}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Typography.Text strong>{item.text}</Typography.Text>
                      <Typography.Text>{item.meaningVi}</Typography.Text>
                      <Typography.Text type="secondary">
                        {item.attempts} attempts · {item.accuracyRate}% accurate
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Top scenario categories">
            {snapshot.topScenarios.length === 0 ? (
              <Empty
                description="No scenarios attempted yet this week."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={snapshot.topScenarios}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Typography.Text strong>
                        {item.scenarioCategory}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {item.attempts} attempts · {item.accuracyRate}% accurate
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Weakest chunks">
            {snapshot.weakChunks.length === 0 ? (
              <Empty
                description="No weak chunks identified yet."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={snapshot.weakChunks}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Typography.Text strong>{item.text}</Typography.Text>
                      <Typography.Text>{item.meaningVi}</Typography.Text>
                      <Tag color="warning">Mastery {item.masteryScore}/100</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Strongest chunks">
            {snapshot.strongestChunks.length === 0 ? (
              <Empty
                description="Keep practicing to build mastery."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={snapshot.strongestChunks}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Typography.Text strong>{item.text}</Typography.Text>
                      <Typography.Text>{item.meaningVi}</Typography.Text>
                      <Tag color="success">Mastery {item.masteryScore}/100</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
