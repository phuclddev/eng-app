"use client";

import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  IELTS_TASK_TYPE_LABELS,
  QUESTION_CHUNK_USAGE_ROLES,
  QUESTION_CHUNK_USAGE_ROLE_LABELS,
} from "@/lib/constants";
import type {
  ChunkOption,
  IeltsQuestionRecord,
  QuestionChunkUsageRole,
} from "@/lib/types";
import { saveQuestionChunkMappingsAction } from "@/server/actions/admin";

export function QuestionBankAdmin({
  chunkOptions,
  questions,
}: {
  chunkOptions: ChunkOption[];
  questions: IeltsQuestionRecord[];
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IeltsQuestionRecord | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredQuestions = questions.filter((question) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [question.prompt, question.topic, question.subTopic ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const renderImportSummary = (summary: {
    created: number;
    updated: number;
    skipped: number;
    totalRows: number;
    errors: Array<{
      message: string;
      rowNumber?: number;
    }>;
  }) => (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Typography.Text>Total rows: {summary.totalRows}</Typography.Text>
      <Typography.Text>Created: {summary.created}</Typography.Text>
      <Typography.Text>Updated: {summary.updated}</Typography.Text>
      <Typography.Text>Skipped: {summary.skipped}</Typography.Text>
      {summary.errors.length > 0 ? (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Typography.Text strong>Errors</Typography.Text>
          {summary.errors.map((error) => (
            <Typography.Text
              key={`${error.rowNumber ?? "general"}-${error.message}`}
              type="danger"
            >
              {error.rowNumber ? `Row ${error.rowNumber}: ` : ""}
              {error.message}
            </Typography.Text>
          ))}
        </Space>
      ) : null}
    </Space>
  );

  const openMappingDrawer = (question: IeltsQuestionRecord) => {
    setEditingQuestion(question);
    form.setFieldsValue({
      questionId: question.id,
      mappings: question.recommendations.map((recommendation) => ({
        chunkId: recommendation.chunk.id,
        usageRole: recommendation.usageRole,
        exampleSentence: recommendation.exampleSentence ?? undefined,
      })),
    });
    setDrawerOpen(true);
  };

  const handleImport = async (file?: File) => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/questions/import", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    const summary = data.summary;

    if (!summary) {
      message.error(data.message ?? "Question import failed.");
      return;
    }

    if (!response.ok || summary.errors.length > 0) {
      modal.error({
        title: "Question import failed",
        width: 720,
        content: renderImportSummary(summary),
      });
      return;
    }

    modal.success({
      title: "Question import complete",
      width: 720,
      content: renderImportSummary(summary),
    });
    router.refresh();
  };

  const submitMappings = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveQuestionChunkMappingsAction(values);

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      setDrawerOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Question Bank Admin
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Import IELTS speaking questions, search the bank, and map recommended chunks for delivery.
        </Typography.Text>
      </div>

      <Card className="table-card">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div className="responsive-toolbar">
            <Input.Search
              className="responsive-toolbar__grow"
              allowClear
              placeholder="Search prompt, topic, or sub-topic"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              type="primary"
              className="full-width-mobile"
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import question CSV
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {isMobile ? (
            <List
              className="mobile-card-list"
              dataSource={filteredQuestions}
              pagination={{ pageSize: 8, align: "center" }}
              renderItem={(record) => (
                <List.Item>
                  <Card
                    size="small"
                    title={<span className="wrap-anywhere">{record.prompt}</span>}
                  >
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Space wrap>
                        <Tag color="blue">{IELTS_TASK_TYPE_LABELS[record.taskType]}</Tag>
                        <Tag>{record.topic}</Tag>
                        {record.subTopic ? <Tag>{record.subTopic}</Tag> : null}
                        <Tag>Band {record.targetBand.toFixed(1)}</Tag>
                        <Tag>Difficulty {record.difficulty}</Tag>
                        <Tag>{record.mappingCount} chunks</Tag>
                      </Space>
                      <Button onClick={() => openMappingDrawer(record)}>
                        Edit mappings
                      </Button>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Table
              rowKey="id"
              dataSource={filteredQuestions}
              pagination={{ pageSize: 8 }}
              scroll={{ x: 900 }}
              columns={[
                {
                  title: "Task",
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Tag color="blue">{IELTS_TASK_TYPE_LABELS[record.taskType]}</Tag>
                      <Typography.Text>{record.topic}</Typography.Text>
                      {record.subTopic ? (
                        <Typography.Text type="secondary">
                          {record.subTopic}
                        </Typography.Text>
                      ) : null}
                    </Space>
                  ),
                },
                {
                  title: "Prompt",
                  dataIndex: "prompt",
                  ellipsis: true,
                },
                {
                  title: "Difficulty",
                  render: (_, record) => `D${record.difficulty}`,
                },
                {
                  title: "Target band",
                  render: (_, record) => record.targetBand.toFixed(1),
                },
                {
                  title: "Mapped chunks",
                  render: (_, record) => record.mappingCount,
                },
                {
                  title: "Actions",
                  render: (_, record) => (
                    <Button size="small" onClick={() => openMappingDrawer(record)}>
                      Edit mappings
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </Space>
      </Card>

      <Drawer
        title={editingQuestion ? "Question mappings" : "Question mappings"}
        width={isMobile ? "100%" : 720}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          <Button
            type="primary"
            onClick={() => void submitMappings()}
            loading={pending}
            className="full-width-mobile"
          >
            Save mappings
          </Button>
        }
      >
        {editingQuestion ? (
          <Space direction="vertical" size={18} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="blue">{IELTS_TASK_TYPE_LABELS[editingQuestion.taskType]}</Tag>
              <Tag>{editingQuestion.topic}</Tag>
              {editingQuestion.subTopic ? <Tag>{editingQuestion.subTopic}</Tag> : null}
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {editingQuestion.prompt}
            </Typography.Title>

            {editingQuestion.supportingPoints.length > 0 ? (
              <List
                size="small"
                header={<Typography.Text strong>Supporting points</Typography.Text>}
                dataSource={editingQuestion.supportingPoints}
                renderItem={(point) => <List.Item>{point}</List.Item>}
              />
            ) : null}

            <Form form={form} layout="vertical">
              <Form.Item name="questionId" hidden>
                <Input />
              </Form.Item>

              <Form.List name="mappings">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    {fields.length === 0 ? (
                      <Empty
                        description="No chunk mappings yet."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : null}

                    {fields.map((field) => (
                      <Card
                        key={field.key}
                        size="small"
                        title={`Mapping ${field.name + 1}`}
                        extra={
                          <Button danger size="small" onClick={() => remove(field.name)}>
                            Remove
                          </Button>
                        }
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, "chunkId"]}
                          label="Chunk"
                          rules={[{ required: true, message: "Chunk is required." }]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            options={chunkOptions.map((chunk) => ({
                              label: `${chunk.chunk} - ${chunk.meaningVi}${
                                chunk.topic ? ` (${chunk.topic})` : ""
                              }`,
                              value: chunk.id,
                            }))}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "usageRole"]}
                          label="Usage role"
                          rules={[{ required: true, message: "Usage role is required." }]}
                        >
                          <Select<QuestionChunkUsageRole>
                            options={QUESTION_CHUNK_USAGE_ROLES.map((role) => ({
                              label: QUESTION_CHUNK_USAGE_ROLE_LABELS[role],
                              value: role,
                            }))}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "exampleSentence"]}
                          label="Example sentence"
                        >
                          <Input.TextArea rows={3} />
                        </Form.Item>
                      </Card>
                    ))}

                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add({ usageRole: "MAIN_IDEA" })}
                    >
                      Add mapping
                    </Button>
                  </Space>
                )}
              </Form.List>
            </Form>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
