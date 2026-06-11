"use client";

import { ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Col, Empty, List, Row, Space, Statistic, Tag, Typography } from "antd";
import Link from "next/link";

import {
  FAMILY_SPEAKER_ROLE_LABELS,
} from "@/lib/constants";
import type {
  FamilyDashboardSnapshot,
  FamilyProfileRecord,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function FamilyHomeView({
  conversationCount,
  chunkCount,
  dashboard,
  profile,
  scenarioCount,
}: {
  conversationCount: number;
  chunkCount: number;
  dashboard: FamilyDashboardSnapshot;
  profile: FamilyProfileRecord;
  scenarioCount: number;
}) {
  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family English
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          A separate family-life English workspace for daily parent-child communication, kept
          isolated from IELTS training logic and data.
        </Typography.Text>
      </div>

      <Card
        title="Today's Family Plan"
        extra={
          <Button type="primary" icon={<ThunderboltOutlined />}>
            <Link href="/family/today">Open Today&apos;s Plan</Link>
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Your personalized daily English plan lives at /family/today. Quick links: scenarios,
            conversations, chunks, roleplay, and review — all picked from your own data.
          </Typography.Text>
          <Space wrap>
            <Tag color="cyan">
              <Link href="/family/today">Today&apos;s Plan</Link>
            </Tag>
            <Tag color="blue">
              <Link href="/family/insights">Weekly Insights</Link>
            </Tag>
            <Tag color="purple">
              <Link href="/family/favorites">Favorites</Link>
            </Tag>
          </Space>
        </Space>
      </Card>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text strong>{profile.title}</Typography.Text>
          <Space wrap>
            <Tag color="green">Family profile active</Tag>
            <Tag>{scenarioCount} scenarios planned</Tag>
            <Tag>{conversationCount} conversations generated</Tag>
            <Tag>{chunkCount} family chunks approved</Tag>
          </Space>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Family practice and review are tracked separately from IELTS metrics. Approve more
            family chunks to expand today&apos;s practice deck.
          </Typography.Text>
        </Space>
      </Card>

      <Card title="Family Practice dashboard" extra={<Link href="/family/practice">Open</Link>}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Statistic title="Chunks learned" value={dashboard.chunksLearned} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Due reviews" value={dashboard.dueReviews} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="Weekly accuracy"
                value={dashboard.weeklyAccuracy}
                suffix="%"
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="Family streak"
                value={dashboard.familyStreakDays}
                suffix=" days"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Typography.Text strong>Top scenarios this week</Typography.Text>
              {dashboard.topScenarios.length === 0 ? (
                <Empty
                  description="No family practice answers yet this week."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  size="small"
                  dataSource={dashboard.topScenarios}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={2} style={{ width: "100%" }}>
                        <Typography.Text>{item.scenarioCategory}</Typography.Text>
                        <Typography.Text type="secondary">
                          {item.attempts} attempts · {item.accuracyRate}% accurate
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Col>
            <Col xs={24} md={12}>
              <Typography.Text strong>Top speaker roles this week</Typography.Text>
              {dashboard.topSpeakerRoles.length === 0 ? (
                <Empty
                  description="No family practice answers yet this week."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  size="small"
                  dataSource={dashboard.topSpeakerRoles}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={2} style={{ width: "100%" }}>
                        <Typography.Text>
                          {FAMILY_SPEAKER_ROLE_LABELS[item.speakerRole] ?? item.speakerRole}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {item.attempts} attempts · {item.accuracyRate}% accurate
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Col>
          </Row>

          <div>
            <Typography.Text strong>Recent family activity</Typography.Text>
            {dashboard.recentActivity.length === 0 ? (
              <Empty
                description="Complete a family practice session to see recent activity."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                size="small"
                dataSource={dashboard.recentActivity}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={2} style={{ width: "100%" }}>
                      <Typography.Text>{item.label}</Typography.Text>
                      <Typography.Text type="secondary">
                        {item.detail} · {formatDateTime(item.createdAt)}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          {
            href: "/family/profile",
            title: "Family Profile",
            description: "View and edit the private family context used for personalization.",
          },
          {
            href: "/family/scenarios",
            title: "Scenarios",
            description: "Create, edit, archive, and filter private family-life scenarios.",
          },
          {
            href: "/family/conversations",
            title: "Conversations",
            description: "Generate and review AI daily conversations from family scenarios.",
          },
          {
            href: "/family/chunks",
            title: "Family Chunks",
            description: "Review suggested chunks and approve only the family expressions you want to keep.",
          },
          {
            href: "/family/practice",
            title: "Family Practice",
            description: "Daily family practice with separate review scheduling.",
          },
          {
            href: "/family/roleplay",
            title: "Family Roleplay",
            description:
              "Live AI roleplay as Kiwi, Vivi, Mom, or a grandparent for realistic daily English.",
          },
          {
            href: "/family/today",
            title: "Today's Plan",
            description:
              "Personalized daily picks: scenario, conversation, chunks, roleplay, review — one tap each.",
          },
          {
            href: "/family/insights",
            title: "Weekly Insights",
            description:
              "Weekly accuracy, streak, weak and strong chunks, plus an AI Vietnamese coach review.",
          },
          {
            href: "/family/favorites",
            title: "Favorites",
            description:
              "Save important family conversations, chunks, scenarios, and roleplay sessions.",
          },
        ].map((item) => (
          <Col key={item.href} xs={24} md={12} xl={8}>
            <Card title={item.title} extra={<Link href={item.href}>Open</Link>}>
              <Typography.Text type="secondary" className="wrap-anywhere">
                {item.description}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}
