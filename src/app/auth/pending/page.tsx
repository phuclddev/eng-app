import { Card, Space, Tag, Typography } from "antd";

import { SignOutButton } from "@/components/ui/auth-buttons";

const descriptions = {
  PENDING: "Your account is waiting for admin approval before study routes unlock.",
  APPROVED: "Your account is already approved. You can return to the dashboard.",
  BLOCKED: "Your access is currently blocked. Contact the administrator for clarification.",
};

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: "PENDING" | "APPROVED" | "BLOCKED" }>;
}) {
  const { status = "PENDING" } = await searchParams;

  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <Card style={{ maxWidth: 640, margin: "0 auto" }}>
          <Space direction="vertical" size={16}>
            <Tag color={status === "BLOCKED" ? "red" : status === "APPROVED" ? "green" : "gold"}>
              {status}
            </Tag>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Access status
            </Typography.Title>
            <Typography.Text type="secondary">
              {descriptions[status]}
            </Typography.Text>
            <SignOutButton />
          </Space>
        </Card>
      </section>
    </main>
  );
}
