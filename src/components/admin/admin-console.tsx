"use client";

import { App, Button, Card, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
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

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Admin
        </Typography.Title>
        <Typography.Text type="secondary">
          Approve learners, maintain topics, and keep the learning inventory healthy.
        </Typography.Text>
      </div>

      <Card title="Pending approvals">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={pendingUsers}
          columns={[
            {
              title: "User",
              render: (_, record) => (
                <div>
                  <Typography.Text strong>{record.name ?? record.email}</Typography.Text>
                  <div>{record.email}</div>
                </div>
              ),
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
                  <Button
                    danger
                    size="small"
                    onClick={() => updateUser(record.id, "BLOCKED")}
                    loading={pending}
                  >
                    Block
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Topic management">
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
            <Button type="primary" onClick={() => void submitTopic()} loading={pending}>
              Save topic
            </Button>
          </Form>

          <Table
            rowKey="id"
            pagination={false}
            dataSource={topics}
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
              },
            ]}
          />
        </Space>
      </Card>

      <Card title="User overview">
        <Table
          rowKey="id"
          pagination={{ pageSize: 6 }}
          dataSource={users}
          columns={[
            {
              title: "User",
              render: (_, record) => (
                <div>
                  <Typography.Text strong>{record.name ?? record.email}</Typography.Text>
                  <div>{record.email}</div>
                </div>
              ),
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
      </Card>
    </div>
  );
}
