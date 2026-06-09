"use client";

import { Alert, App, Button, Card, Form, Input, Space, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { FamilyProfileRecord } from "@/lib/types";
import { saveFamilyProfileAction } from "@/server/actions/family";

export function FamilyProfileEditor({
  profile,
}: {
  profile: FamilyProfileRecord;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();

  const save = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveFamilyProfileAction(values);

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      router.refresh();
    });
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Profile
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          This profile powers Family English AI personalization and should stay focused on real
          routines, emotions, and communication patterns at home.
        </Typography.Text>
      </div>

      <Alert
        type="warning"
        showIcon
        message="Personal family data"
        description="This profile is used for AI personalization. Keep it private and avoid sharing sensitive information outside your family workflow."
      />

      <Card
        title="Active family profile"
        extra={
          <Space wrap>
            <Tag color={profile.isActive ? "green" : "default"}>
              {profile.isActive ? "Active" : "Inactive"}
            </Tag>
            <Button
              type="primary"
              onClick={() => void save()}
              loading={pending}
              className="full-width-mobile"
            >
              Save profile
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            title: profile.title,
            profileMarkdown: profile.profileMarkdown,
          }}
        >
          <Form.Item name="title" label="Profile title" rules={[{ required: true }]}>
            <Input maxLength={191} />
          </Form.Item>
          <Form.Item
            name="profileMarkdown"
            label="Profile markdown"
            rules={[{ required: true }]}
            extra="Describe family members, routines, conflicts, preferences, and realistic tone. Markdown headings and bullet lists are supported."
          >
            <Input.TextArea autoSize={{ minRows: 18, maxRows: 30 }} />
          </Form.Item>
          <Typography.Text type="secondary">
            Last updated: {new Date(profile.updatedAt).toLocaleString("en-GB")}
          </Typography.Text>
        </Form>
      </Card>
    </Space>
  );
}
