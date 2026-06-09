import { Card, Col, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";

import type { FamilyProfileRecord } from "@/lib/types";

export function FamilyHomeView({
  conversationCount,
  chunkCount,
  profile,
  scenarioCount,
}: {
  conversationCount: number;
  chunkCount: number;
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
            Family scenarios, private conversations, and reviewable family chunks are now live as
            a separate workspace branch. Practice and roleplay can be added next without touching
            IELTS logic.
          </Typography.Text>
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
            description: "Family practice will track progress separately from IELTS metrics.",
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
