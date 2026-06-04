"use client";

import { ArrowRightOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Button, Card, Col, Grid, Progress, Row, Space, Statistic, Typography } from "antd";
import Link from "next/link";

export function LearnTodayView({
  dueReviews,
  totalChunks,
  plannedQuestions,
}: {
  dueReviews: number;
  totalChunks: number;
  plannedQuestions: number;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const completionTarget = Math.min(100, Math.round((plannedQuestions / 10) * 100));

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Learn Today
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Focus on the next high-value chunks before moving into free production.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Review queue" value={dueReviews} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Chunks available" value={totalChunks} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Planned questions" value={plannedQuestions} />
          </Card>
        </Col>
      </Row>

      <Card title="Daily focus plan">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text className="wrap-anywhere">
            Complete one focused practice block, then clear your due reviews while the chunks are still active in working memory.
          </Typography.Text>
          <Progress percent={completionTarget} strokeColor="#0f766e" />
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            size={12}
            style={{ width: "100%" }}
          >
            <Button type="primary" icon={<ArrowRightOutlined />} className="full-width-mobile">
              <Link href="/practice">Start practice</Link>
            </Button>
            <Button className="full-width-mobile">
              <Link href="/review">Open review queue</Link>
            </Button>
            <Button className="full-width-mobile">
              <Link href="/chunks">Browse chunk library</Link>
            </Button>
          </Space>
        </Space>
      </Card>
    </Space>
  );
}
