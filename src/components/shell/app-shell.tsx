"use client";

import {
  BookOutlined,
  MenuOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LineChartOutlined,
  MessageOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ROLE_LABELS, SIDEBAR_ITEMS, STATUS_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { SignOutButton } from "@/components/ui/auth-buttons";

const iconMap = {
  "/dashboard": <DashboardOutlined />,
  "/learn": <BookOutlined />,
  "/questions": <MessageOutlined />,
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selectedItem =
    [...SIDEBAR_ITEMS]
      .sort((left, right) => right.href.length - left.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      ?.href ?? pathname;
  const selectedLabel =
    SIDEBAR_ITEMS.find((item) => item.href === selectedItem)?.label ?? "Workspace";

  const items = SIDEBAR_ITEMS.filter(
    (item) => !item.adminOnly || user.role === "ADMIN",
  ).map((item) => ({
    key: item.href,
    icon: iconMap[item.href],
    label: (
      <Link href={item.href} onClick={() => setDrawerOpen(false)}>
        {item.label}
      </Link>
    ),
  }));

  const userSummary = (
    <Space size="large">
      <Avatar src={user.image ?? undefined}>
        {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
      </Avatar>
      <div style={{ minWidth: 0 }}>
        <Typography.Text strong className="wrap-anywhere">
          {user.name ?? user.email}
        </Typography.Text>
        <div className="header-meta">
          <Tag color="cyan">{ROLE_LABELS[user.role]}</Tag>
          <Tag color={user.status === "APPROVED" ? "green" : "gold"}>
            {STATUS_LABELS[user.status]}
          </Tag>
        </div>
      </div>
    </Space>
  );

  return (
    <Layout className="workspace-layout">
      {!isMobile ? (
        <Layout.Sider
          breakpoint="lg"
          collapsedWidth={80}
          width={260}
          className="workspace-sider workspace-sider-desktop"
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
            selectedKeys={[selectedItem]}
            items={items}
            style={{ background: "transparent", borderInlineEnd: 0 }}
          />

          <div className="sider-footnote">
            <Typography.Text style={{ color: "rgba(255,255,255,0.72)" }}>
              Active recall, contextual practice, spaced repetition.
            </Typography.Text>
          </div>
        </Layout.Sider>
      ) : null}

      <Layout>
        <Layout.Header className="workspace-header">
          {isMobile ? (
            <>
              <div className="workspace-header-main">
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  className="workspace-mobile-nav-trigger"
                  aria-label="Open navigation"
                  onClick={() => setDrawerOpen(true)}
                />
                <div className="workspace-mobile-title">
                  <Typography.Text className="brand-kicker">IELTS Chunk Trainer</Typography.Text>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {selectedLabel}
                  </Typography.Title>
                </div>
              </div>
              <div className="workspace-header-actions">
                <Avatar src={user.image ?? undefined}>
                  {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                </Avatar>
              </div>
            </>
          ) : (
            <>
              <div className="workspace-header-main">{userSummary}</div>
              <div className="workspace-header-actions">
                <Button icon={<LineChartOutlined />}>
                  <Link href="/progress">Progress</Link>
                </Button>
                <SignOutButton />
              </div>
            </>
          )}
        </Layout.Header>

        <Layout.Content className="workspace-content">{children}</Layout.Content>
      </Layout>

      <Drawer
        placement="left"
        width={320}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Workspace navigation"
        className="workspace-nav-drawer"
      >
        <div className="workspace-nav-user">
          {userSummary}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedItem]}
          items={items}
          style={{ borderInlineEnd: 0 }}
        />

        <div className="workspace-nav-actions">
          <Button icon={<LineChartOutlined />} className="full-width-mobile">
            <Link href="/progress" onClick={() => setDrawerOpen(false)}>
              Progress
            </Link>
          </Button>
          <SignOutButton block />
        </div>
      </Drawer>
    </Layout>
  );
}
