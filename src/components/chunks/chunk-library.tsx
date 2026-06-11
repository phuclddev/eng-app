"use client";

import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { ChunkCoachTrigger } from "@/components/ai/chunk-coach-trigger";
import { deleteChunkAction, saveChunkAction } from "@/server/actions/admin";
import type { ChunkRecord, TopicOption } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

export function ChunkLibrary({
  aiTutorEnabled,
  chunks,
  topics,
  canManage,
}: {
  aiTutorEnabled: boolean;
  chunks: ChunkRecord[];
  topics: TopicOption[];
  canManage: boolean;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState<ChunkRecord | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const renderImportSummary = ({
    created,
    updated,
    skipped,
    totalRows,
    errors,
  }: {
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
      <Typography.Text>Total rows: {totalRows}</Typography.Text>
      <Typography.Text>Created: {created}</Typography.Text>
      <Typography.Text>Updated: {updated}</Typography.Text>
      <Typography.Text>Skipped: {skipped}</Typography.Text>
      {errors.length > 0 ? (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Typography.Text strong>Errors</Typography.Text>
          {errors.map((error) => (
            <Typography.Text key={`${error.rowNumber ?? "general"}-${error.message}`} type="danger">
              {error.rowNumber ? `Row ${error.rowNumber}: ` : ""}
              {error.message}
            </Typography.Text>
          ))}
        </Space>
      ) : null}
    </Space>
  );

  const filteredChunks = chunks.filter((chunk) => {
    const query = normalizeText(search);
    if (!query) {
      return true;
    }

    return [chunk.chunk, chunk.meaningVi, chunk.example, chunk.topic?.name ?? ""]
      .map((value) => normalizeText(value))
      .some((value) => value.includes(query));
  });

  const openCreateDrawer = () => {
    setEditingChunk(null);
    form.resetFields();
    form.setFieldsValue({
      difficulty: 1,
      bandLevel: 6,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (chunk: ChunkRecord) => {
    setEditingChunk(chunk);
    form.setFieldsValue({
      id: chunk.id,
      chunk: chunk.chunk,
      meaningVi: chunk.meaningVi,
      example: chunk.example,
      wrongExamples: chunk.wrongExamples.join("\n"),
      topicId: chunk.topic?.id,
      difficulty: chunk.difficulty,
      bandLevel: chunk.bandLevel,
      grammarPattern: chunk.grammarPattern,
      tags: chunk.tags.join(", "),
      notes: chunk.notes,
    });
    setDrawerOpen(true);
  };

  const submitChunk = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveChunkAction(values);

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      setDrawerOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteChunkAction(id);

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      router.refresh();
    });
  };

  const handleImport = async (file?: File) => {
    if (!file) {
      return;
    }

    const submitImport = async (dryRun: boolean) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dryRun", String(dryRun));

      const response = await fetch("/api/admin/chunks/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      return {
        response,
        data,
      };
    };

    const preview = await submitImport(true);
    const previewSummary = preview.data.summary;

    if (!previewSummary) {
      message.error(preview.data.message ?? "Import validation failed.");
      return;
    }

    if (previewSummary.errors.length > 0) {
      modal.error({
        title: "Import validation failed",
        width: 720,
        content: renderImportSummary(previewSummary),
      });
      return;
    }

    if (previewSummary.created === 0 && previewSummary.updated === 0) {
      modal.info({
        title: "Import validation complete",
        content: renderImportSummary(previewSummary),
      });
      return;
    }

    modal.confirm({
      title: "Confirm chunk import",
      okText: "Import now",
      width: 720,
      content: renderImportSummary(previewSummary),
      onOk: async () => {
        const result = await submitImport(false);
        const summary = result.data.summary;

        if (!summary) {
          message.error(result.data.message ?? "Import failed.");
          return;
        }

        if (!result.response.ok || summary.errors.length > 0) {
          modal.error({
            title: "Import failed",
            width: 720,
            content: renderImportSummary(summary),
          });
          return;
        }

        message.success(
          `Import complete: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped.`,
        );
        router.refresh();
      },
    });
  };

  const renderChunkMeta = (chunk: ChunkRecord) => (
    <Space wrap>
      <Tag color="blue">Band {chunk.bandLevel.toFixed(1)}</Tag>
      <Tag color="purple">Difficulty {chunk.difficulty}</Tag>
      {chunk.topic ? <Tag color="cyan">{chunk.topic.name}</Tag> : null}
      {chunk.review ? (
        <Tag color={chunk.review.masteryScore < 50 ? "volcano" : "green"}>
          Mastery {chunk.review.masteryScore}
        </Tag>
      ) : (
        <Tag>No review yet</Tag>
      )}
    </Space>
  );

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Chunk Library
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Search, review, and maintain your IELTS chunk inventory with admin-safe CRUD.
        </Typography.Text>
      </div>

      <Card className="table-card">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div className="responsive-toolbar">
            <Input.Search
              className="responsive-toolbar__grow"
              allowClear
              placeholder="Search chunk, meaning, topic, or example"
              onChange={(event) => setSearch(event.target.value)}
            />
            {canManage ? (
              <div className="responsive-toolbar__actions">
                <Button icon={<DownloadOutlined />} href="/api/admin/chunks/export">
                  Export CSV
                </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import CSV
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreateDrawer}
                >
                  Add chunk
                </Button>
              </div>
            ) : null}
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
              dataSource={filteredChunks}
              pagination={{
                defaultPageSize: 8,
                align: "center",
                showSizeChanger: true,
                pageSizeOptions: [8, 10, 20, 50, 100],
              }}
              renderItem={(record) => (
                <List.Item>
                  <Card size="small" title={<span className="wrap-anywhere">{record.chunk}</span>}>
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      {renderChunkMeta(record)}
                      <div>
                        <Typography.Text strong>Meaning</Typography.Text>
                        <div className="wrap-anywhere">{record.meaningVi}</div>
                      </div>
                      <div>
                        <Typography.Text strong>Example</Typography.Text>
                        <div className="wrap-anywhere">{record.example}</div>
                      </div>
                      <ChunkCoachTrigger
                        chunkId={record.id}
                        chunkLabel={record.chunk}
                        disabled={!aiTutorEnabled}
                        block
                      />
                      {canManage ? (
                        <div className="mobile-actions">
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => openEditDrawer(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Archive this chunk and preserve study history?"
                            onConfirm={() => handleDelete(record.id)}
                          >
                            <Button danger icon={<DeleteOutlined />} loading={pending}>
                              Archive
                            </Button>
                          </Popconfirm>
                        </div>
                      ) : null}
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Table
              rowKey="id"
              dataSource={filteredChunks}
              pagination={{
                defaultPageSize: 8,
                showSizeChanger: true,
                pageSizeOptions: [8, 10, 20, 50, 100],
              }}
              scroll={{ x: 960 }}
              columns={[
                {
                  title: "Chunk",
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong className="wrap-anywhere">
                        {record.chunk}
                      </Typography.Text>
                      {renderChunkMeta(record)}
                    </Space>
                  ),
                },
                {
                  title: "Meaning",
                  dataIndex: "meaningVi",
                  render: (value) => <span className="wrap-anywhere">{value}</span>,
                },
                {
                  title: "Example",
                  dataIndex: "example",
                  render: (value) => <span className="wrap-anywhere">{value}</span>,
                },
                {
                  title: "Review",
                  render: (_, record) =>
                    record.review ? (
                      <Tag color={record.review.masteryScore < 50 ? "volcano" : "green"}>
                        Mastery {record.review.masteryScore}
                      </Tag>
                    ) : (
                      <Tag>No review yet</Tag>
                    ),
                },
                canManage
                  ? {
                      title: "Actions",
                      render: (_, record) => (
                        <Space>
                          <ChunkCoachTrigger
                            chunkId={record.id}
                            chunkLabel={record.chunk}
                            disabled={!aiTutorEnabled}
                            size="small"
                          />
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditDrawer(record)}
                          />
                          <Popconfirm
                            title="Archive this chunk and preserve study history?"
                            onConfirm={() => handleDelete(record.id)}
                          >
                            <Button
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              loading={pending}
                            />
                          </Popconfirm>
                        </Space>
                      ),
                    }
                  : {},
              ]}
            />
          )}
        </Space>
      </Card>

      <Drawer
        title={editingChunk ? "Edit chunk" : "Create chunk"}
        width={isMobile ? "100%" : 520}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          <Button
            type="primary"
            onClick={() => void submitChunk()}
            loading={pending}
            className="full-width-mobile"
          >
            Save
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="chunk" label="Chunk" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="meaningVi"
            label="Meaning in Vietnamese"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="example" label="Example sentence" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="wrongExamples" label="Wrong examples">
            <Input.TextArea rows={3} placeholder="One per line" />
          </Form.Item>
          <Form.Item name="topicId" label="Topic">
            <Select
              allowClear
              options={topics.map((topic) => ({
                label: topic.name,
                value: topic.id,
              }))}
            />
          </Form.Item>
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            style={{ width: "100%" }}
            size={16}
          >
            <Form.Item
              name="difficulty"
              label="Difficulty"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="bandLevel"
              label="Band level"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={4} max={9} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item name="grammarPattern" label="Grammar pattern">
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Input placeholder="Comma separated" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
