"use client";

import {
  BookOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LineChartOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Layout, Menu, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ROLE_LABELS, SIDEBAR_ITEMS, STATUS_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { SignOutButton } from "@/components/ui/auth-buttons";

const iconMap = {
  "/dashboard": <DashboardOutlined />,
  "/learn": <BookOutlined />,
  "/chunks": <FileTextOutlined />,
  "/practice": <ToolOutlined />,
  "/review": <ScheduleOutlined />,
  "/progress": <LineChartOutlined />,
  "/admin": <SafetyOutlined />,
} as const;

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const items = SIDEBAR_ITEMS.filter(
    (item) => !item.adminOnly || user.role === "ADMIN",
  ).map((item) => ({
    key: item.href,
    icon: iconMap[item.href],
    label: <Link href={item.href}>{item.label}</Link>,
  }));

  return (
    <Layout className="workspace-layout">
      <Layout.Sider
        breakpoint="lg"
        collapsedWidth={80}
        width={260}
        className="workspace-sider"
      >
        <div className="brand-block">
          <Badge color="#0f766e" />
          <div>
            <Typography.Text className="brand-kicker">demo.garena.vn</Typography.Text>
            <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
              IELTS Chunk Trainer
            </Typography.Title>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          style={{ background: "transparent", borderInlineEnd: 0 }}
        />

        <div className="sider-footnote">
          <Typography.Text style={{ color: "rgba(255,255,255,0.72)" }}>
            Active recall, contextual practice, spaced repetition.
          </Typography.Text>
        </div>
      </Layout.Sider>

      <Layout>
        <Layout.Header className="workspace-header">
          <Space size="large">
            <Avatar src={user.image ?? undefined}>
              {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
            </Avatar>
            <div>
              <Typography.Text strong>{user.name ?? user.email}</Typography.Text>
              <div className="header-meta">
                <Tag color="cyan">{ROLE_LABELS[user.role]}</Tag>
                <Tag color={user.status === "APPROVED" ? "green" : "gold"}>
                  {STATUS_LABELS[user.status]}
                </Tag>
              </div>
            </div>
          </Space>
          <Space>
            <Button icon={<LineChartOutlined />}>
              <Link href="/progress">Progress</Link>
            </Button>
            <SignOutButton />
          </Space>
        </Layout.Header>

        <Layout.Content className="workspace-content">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
