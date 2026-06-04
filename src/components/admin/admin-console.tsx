"use client";

import {
  App,
  Button,
  Card,
  Form,
  Grid,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { moderateUserAction, saveTopicAction } from "@/server/actions/admin";
import type { TopicOption } from "@/lib/types";
import type { AdminUserRecord } from "@/server/data/admin";

export function AdminConsole({
  users,
  topics,
}: {
  users: AdminUserRecord[];
  topics: TopicOption[];
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();

  const pendingUsers = users.filter((user) => user.status === "PENDING");

  const updateUser = (userId: string, status: "APPROVED" | "BLOCKED") => {
    startTransition(async () => {
      const result = await moderateUserAction({ userId, status });

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      router.refresh();
    });
  };

  const submitTopic = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveTopicAction(values);

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      form.resetFields();
      router.refresh();
    });
  };

  const renderUserSummary = (user: AdminUserRecord) => (
    <div>
      <Typography.Text strong className="wrap-anywhere">
        {user.name ?? user.email}
      </Typography.Text>
      <div className="wrap-anywhere">{user.email}</div>
    </div>
  );

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Admin
        </Typography.Title>
        <Typography.Text type="secondary">
          Approve learners, maintain topics, and keep the learning inventory healthy.
        </Typography.Text>
        <div style={{ marginTop: 12 }}>
          <Button type="primary" className="full-width-mobile">
            <Link href="/admin/questions">Manage question bank</Link>
          </Button>
        </div>
      </div>

      <Card title="Pending approvals" className="table-card">
        {isMobile ? (
          <List
            className="mobile-card-list"
            dataSource={pendingUsers}
            locale={{ emptyText: "No pending approvals." }}
            renderItem={(record) => (
              <List.Item>
                <Card size="small" title={renderUserSummary(record)}>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Space wrap>
                      <Tag>{ROLE_LABELS[record.role]}</Tag>
                      <Tag>{formatDate(record.createdAt)}</Tag>
                    </Space>
                    <div className="mobile-actions">
                      <Button
                        type="primary"
                        onClick={() => updateUser(record.id, "APPROVED")}
                        loading={pending}
                      >
                        Approve
                      </Button>
                      <Popconfirm
                        title="Block this user from entering the workspace?"
                        onConfirm={() => updateUser(record.id, "BLOCKED")}
                      >
                        <Button danger loading={pending}>
                          Block
                        </Button>
                      </Popconfirm>
                    </div>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            pagination={false}
            dataSource={pendingUsers}
            scroll={{ x: 720 }}
            columns={[
              {
                title: "User",
                render: (_, record) => renderUserSummary(record),
              },
              {
                title: "Role",
                render: (_, record) => <Tag>{ROLE_LABELS[record.role]}</Tag>,
              },
              {
                title: "Requested",
                render: (_, record) => formatDate(record.createdAt),
              },
              {
                title: "Action",
                render: (_, record) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => updateUser(record.id, "APPROVED")}
                      loading={pending}
                    >
                      Approve
                    </Button>
                    <Popconfirm
                      title="Block this user from entering the workspace?"
                      onConfirm={() => updateUser(record.id, "BLOCKED")}
                    >
                      <Button
                        danger
                        size="small"
                        loading={pending}
                      >
                        Block
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card title="Topic management" className="table-card">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="Topic name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="color" label="Color">
              <Select
                allowClear
                options={[
                  { label: "Teal", value: "#0f766e" },
                  { label: "Blue", value: "#2563eb" },
                  { label: "Amber", value: "#d97706" },
                  { label: "Rose", value: "#e11d48" },
                ]}
              />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Button
              type="primary"
              onClick={() => void submitTopic()}
              loading={pending}
              className="full-width-mobile"
            >
              Save topic
            </Button>
          </Form>

          {isMobile ? (
            <List
              className="mobile-card-list"
              dataSource={topics}
              renderItem={(record) => (
                <List.Item>
                  <Card size="small" title={<span className="wrap-anywhere">{record.name}</span>}>
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Space wrap>
                        {record.color ? <Tag color={record.color}>{record.color}</Tag> : <Tag>Default</Tag>}
                        <Tag>{record.chunkCount ?? 0} chunks</Tag>
                      </Space>
                      {record.description ? (
                        <Typography.Text type="secondary" className="wrap-anywhere">
                          {record.description}
                        </Typography.Text>
                      ) : (
                        <Typography.Text type="secondary">No description</Typography.Text>
                      )}
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Table
              rowKey="id"
              pagination={false}
              dataSource={topics}
              scroll={{ x: 720 }}
              columns={[
                { title: "Topic", dataIndex: "name" },
                {
                  title: "Color",
                  render: (_, record) =>
                    record.color ? <Tag color={record.color}>{record.color}</Tag> : <Tag>Default</Tag>,
                },
                {
                  title: "Chunks",
                  dataIndex: "chunkCount",
                },
                {
                  title: "Description",
                  dataIndex: "description",
                  render: (value) => <span className="wrap-anywhere">{value ?? ""}</span>,
                },
              ]}
            />
          )}
        </Space>
      </Card>

      <Card title="User overview" className="table-card">
        {isMobile ? (
          <List
            className="mobile-card-list"
            dataSource={users}
            pagination={{ pageSize: 6, align: "center" }}
            renderItem={(record) => (
              <List.Item>
                <Card size="small" title={renderUserSummary(record)}>
                  <Space wrap>
                    <Tag>{ROLE_LABELS[record.role]}</Tag>
                    <Tag color={record.status === "APPROVED" ? "green" : record.status === "BLOCKED" ? "red" : "gold"}>
                      {STATUS_LABELS[record.status]}
                    </Tag>
                    <Tag>{formatDate(record.createdAt)}</Tag>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            pagination={{ pageSize: 6 }}
            dataSource={users}
            scroll={{ x: 720 }}
            columns={[
              {
                title: "User",
                render: (_, record) => renderUserSummary(record),
              },
              {
                title: "Role",
                render: (_, record) => <Tag>{ROLE_LABELS[record.role]}</Tag>,
              },
              {
                title: "Status",
                render: (_, record) => (
                  <Tag color={record.status === "APPROVED" ? "green" : record.status === "BLOCKED" ? "red" : "gold"}>
                    {STATUS_LABELS[record.status]}
                  </Tag>
                ),
              },
              {
                title: "Created",
                render: (_, record) => formatDate(record.createdAt),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
