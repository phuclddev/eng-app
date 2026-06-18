"use client";

import {
  CheckOutlined,
  EyeOutlined,
  PlusOutlined,
  RobotOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { SPEAKING_IDEA_STATUS_LABELS } from "@/lib/constants";
import type {
  SpeakingIdeaGenerationSummary,
  SpeakingIdeaRecord,
  SpeakingIdeaStatus,
} from "@/lib/types";
import { setSpeakingIdeaStatusAction } from "@/server/actions/admin";

export function SpeakingIdeaListView({
  ideas: initialIdeas,
}: {
  ideas: SpeakingIdeaRecord[];
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [generateForm] = Form.useForm();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<SpeakingIdeaStatus>("ACTIVE");
  const [popularityFilter, setPopularityFilter] = useState<number | undefined>();
  const [reuseFilter, setReuseFilter] = useState<number | undefined>();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [generatePending, startGenerateTransition] = useTransition();

  const counts = useMemo(
    () => ({
      DRAFT: ideas.filter((idea) => idea.status === "DRAFT").length,
      ACTIVE: ideas.filter((idea) => idea.status === "ACTIVE").length,
      ARCHIVED: ideas.filter((idea) => idea.status === "ARCHIVED").length,
    }),
    [ideas],
  );

  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ideas.filter((idea) => {
      if (idea.status !== statusTab) {
        return false;
      }

      if (popularityFilter && idea.popularityScore !== popularityFilter) {
        return false;
      }

      if (reuseFilter && idea.reuseScore !== reuseFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        idea.title,
        idea.shortLabel,
        idea.descriptionVi,
        idea.descriptionEn,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [ideas, popularityFilter, reuseFilter, search, statusTab]);

  const updateStatus = (ideaId: string, status: SpeakingIdeaStatus) => {
    startTransition(async () => {
      const result = await setSpeakingIdeaStatusAction({
        ideaId,
        status,
      });

      if (!result.ok || !result.result) {
        message.error(result.message);
        return;
      }

      setIdeas((current) =>
        current.map((idea) =>
          idea.id === ideaId ? { ...idea, status: result.result!.status } : idea,
        ),
      );
      message.success(result.message);
    });
  };

  const generateIdeas = async () => {
    const values = await generateForm.validateFields();

    startGenerateTransition(async () => {
      const response = await fetch("/api/admin/ideas/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { summary?: SpeakingIdeaGenerationSummary; message?: string }
        | undefined;

      if (!response.ok || !payload?.summary) {
        message.error(payload?.message ?? "Could not generate speaking ideas.");
        return;
      }

      setIdeas((current) => [...payload.summary!.ideas, ...current]);
      setStatusTab("DRAFT");
      setGenerateOpen(false);
      generateForm.resetFields();
      router.refresh();
      message.success(
        `Generated ${payload.summary.created} draft idea(s). Skipped ${payload.summary.skippedDuplicates} duplicate(s).`,
      );
    });
  };

  return (
    <div className="stacked-view">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Speaking Idea Map
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Store reusable IELTS Speaking ideas separately from chunk practice so admins can map
            reasoning, examples, and patterns back to question prompts.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<RobotOutlined />} onClick={() => setGenerateOpen(true)}>
            Generate Ideas with AI
          </Button>
          <Button>
            <Link href="/admin/ideas/coverage">Coverage dashboard</Link>
          </Button>
          <Button>
            <Link href="/admin/ideas/map">Mind map view</Link>
          </Button>
          <Button type="primary" icon={<PlusOutlined />}>
            <Link href="/admin/ideas/new">New idea</Link>
          </Button>
        </Space>
      </div>

      <Card title="Idea library">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Tabs
            activeKey={statusTab}
            onChange={(key) => setStatusTab(key as SpeakingIdeaStatus)}
            items={[
              { key: "ACTIVE", label: `Active (${counts.ACTIVE})` },
              { key: "DRAFT", label: `Review Drafts (${counts.DRAFT})` },
              { key: "ARCHIVED", label: `Archived (${counts.ARCHIVED})` },
            ]}
          />

          <div className="responsive-toolbar">
            <div className="responsive-toolbar__grow">
              <Input.Search
                allowClear
                placeholder="Search by title, short label, or description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="responsive-toolbar__actions">
              <Select
                allowClear
                placeholder="Popularity"
                value={popularityFilter}
                onChange={(value) => setPopularityFilter(value)}
                options={[1, 2, 3, 4, 5].map((value) => ({
                  label: `${value}/5 popularity`,
                  value,
                }))}
                style={{ minWidth: isMobile ? "100%" : 170 }}
              />
              <Select
                allowClear
                placeholder="Reuse score"
                value={reuseFilter}
                onChange={(value) => setReuseFilter(value)}
                options={[1, 2, 3, 4, 5].map((value) => ({
                  label: `${value}/5 reuse`,
                  value,
                }))}
                style={{ minWidth: isMobile ? "100%" : 170 }}
              />
            </div>
          </div>

          {filteredIdeas.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No speaking ideas match the current filters."
              style={{ marginBlock: 32 }}
            />
          ) : isMobile ? (
            <List
              className="mobile-card-list"
              dataSource={filteredIdeas}
              renderItem={(idea) => (
                <List.Item key={idea.id}>
                  <Card
                    className="table-card"
                    title={idea.title}
                    extra={
                      <Tag
                        color={
                          idea.status === "ACTIVE"
                            ? "green"
                            : idea.status === "ARCHIVED"
                              ? "default"
                              : "gold"
                        }
                      >
                        {SPEAKING_IDEA_STATUS_LABELS[idea.status]}
                      </Tag>
                    }
                  >
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Typography.Text strong>{idea.shortLabel}</Typography.Text>
                      <Typography.Text type="secondary" className="wrap-anywhere">
                        {idea.descriptionEn}
                      </Typography.Text>
                      <Space wrap>
                        <Tag>Popularity {idea.popularityScore}/5</Tag>
                        <Tag>Reuse {idea.reuseScore}/5</Tag>
                        <Tag>{idea.variants.length} variants</Tag>
                        <Tag>{idea.questionMaps.length} linked questions</Tag>
                      </Space>
                      <div className="mobile-actions">
                        <Button icon={<EyeOutlined />} className="full-width-mobile">
                          <Link href={`/admin/ideas/${idea.id}`}>Open</Link>
                        </Button>
                        {idea.status !== "ACTIVE" ? (
                          <Button
                            icon={<CheckOutlined />}
                            loading={pending}
                            onClick={() => updateStatus(idea.id, "ACTIVE")}
                            className="full-width-mobile"
                          >
                            Activate
                          </Button>
                        ) : null}
                        {idea.status !== "DRAFT" ? (
                          <Button
                            icon={<UndoOutlined />}
                            loading={pending}
                            onClick={() => updateStatus(idea.id, "DRAFT")}
                            className="full-width-mobile"
                          >
                            Move to draft
                          </Button>
                        ) : null}
                        {idea.status !== "ARCHIVED" ? (
                          <Button
                            danger
                            icon={<StopOutlined />}
                            loading={pending}
                            onClick={() => updateStatus(idea.id, "ARCHIVED")}
                            className="full-width-mobile"
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Table
              rowKey="id"
              dataSource={filteredIdeas}
              pagination={{ pageSize: 12, showSizeChanger: true }}
              columns={[
                {
                  title: "Idea",
                  key: "idea",
                  render: (_value, record: SpeakingIdeaRecord) => (
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{record.title}</Typography.Text>
                      <Typography.Text type="secondary">
                        {record.shortLabel}
                      </Typography.Text>
                    </Space>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (value: SpeakingIdeaStatus) => (
                    <Tag
                      color={
                        value === "ACTIVE"
                          ? "green"
                          : value === "ARCHIVED"
                            ? "default"
                            : "gold"
                      }
                    >
                      {SPEAKING_IDEA_STATUS_LABELS[value]}
                    </Tag>
                  ),
                },
                {
                  title: "Popularity",
                  dataIndex: "popularityScore",
                  width: 110,
                },
                {
                  title: "Reuse",
                  dataIndex: "reuseScore",
                  width: 90,
                },
                {
                  title: "Variants",
                  key: "variants",
                  width: 90,
                  render: (_value, record: SpeakingIdeaRecord) => record.variants.length,
                },
                {
                  title: "Linked Questions",
                  key: "questionMaps",
                  width: 130,
                  render: (_value, record: SpeakingIdeaRecord) =>
                    record.questionMaps.length,
                },
                {
                  title: "Actions",
                  key: "actions",
                  width: 280,
                  render: (_value, record: SpeakingIdeaRecord) => (
                    <Space wrap>
                      <Button size="small" icon={<EyeOutlined />}>
                        <Link href={`/admin/ideas/${record.id}`}>Open</Link>
                      </Button>
                      {record.status !== "ACTIVE" ? (
                        <Button
                          size="small"
                          icon={<CheckOutlined />}
                          loading={pending}
                          onClick={() => updateStatus(record.id, "ACTIVE")}
                        >
                          Activate
                        </Button>
                      ) : null}
                      {record.status !== "DRAFT" ? (
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          loading={pending}
                          onClick={() => updateStatus(record.id, "DRAFT")}
                        >
                          Draft
                        </Button>
                      ) : null}
                      {record.status !== "ARCHIVED" ? (
                        <Button
                          danger
                          size="small"
                          icon={<StopOutlined />}
                          loading={pending}
                          onClick={() => updateStatus(record.id, "ARCHIVED")}
                        >
                          Archive
                        </Button>
                      ) : null}
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Space>
      </Card>

      <Modal
        title="Generate reusable ideas with AI"
        open={generateOpen}
        onCancel={() => setGenerateOpen(false)}
        onOk={() => void generateIdeas()}
        confirmLoading={generatePending}
        okText="Generate drafts"
      >
        <Form
          form={generateForm}
          layout="vertical"
          initialValues={{
            count: 10,
            targetBand: 6.5,
            includeExistingContext: true,
          }}
        >
          <Form.Item name="topic" label="Topic hint">
            <Input placeholder="Optional: Education, Technology, Family..." maxLength={120} />
          </Form.Item>
          <Form.Item name="count" label="Number of ideas" rules={[{ required: true }]}>
            <InputNumber min={1} max={30} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="targetBand" label="Target band" rules={[{ required: true }]}>
            <InputNumber min={4} max={9} step={0.5} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="includeExistingContext"
            label="Avoid duplicates using current idea bank"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Typography.Text type="secondary" className="wrap-anywhere">
            AI-generated ideas are saved as drafts first. Review and approve them before moving
            them to active use.
          </Typography.Text>
        </Form>
      </Modal>
    </div>
  );
}
