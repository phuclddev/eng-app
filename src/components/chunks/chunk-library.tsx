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
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { deleteChunkAction, saveChunkAction } from "@/server/actions/admin";
import type { ChunkRecord, TopicOption } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

export function ChunkLibrary({
  chunks,
  topics,
  canManage,
}: {
  chunks: ChunkRecord[];
  topics: TopicOption[];
  canManage: boolean;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState<ChunkRecord | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

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

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/chunks/import", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      message.error(data.message ?? "Import failed.");
      return;
    }

    message.success(`Imported ${data.imported} rows.`);
    router.refresh();
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Chunk Library
        </Typography.Title>
        <Typography.Text type="secondary">
          Search, review, and maintain your IELTS chunk inventory with admin-safe CRUD.
        </Typography.Text>
      </div>

      <Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
            <Input.Search
              allowClear
              placeholder="Search chunk, meaning, topic, or example"
              onChange={(event) => setSearch(event.target.value)}
              style={{ maxWidth: 420 }}
            />
            {canManage ? (
              <Space wrap>
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
              </Space>
            ) : null}
          </Space>

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

          <Table
            rowKey="id"
            dataSource={filteredChunks}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: "Chunk",
                render: (_, record) => (
                  <Space direction="vertical" size={4}>
                    <Typography.Text strong>{record.chunk}</Typography.Text>
                    <Space wrap>
                      <Tag color="blue">Band {record.bandLevel.toFixed(1)}</Tag>
                      <Tag color="purple">Difficulty {record.difficulty}</Tag>
                      {record.topic ? <Tag color="cyan">{record.topic.name}</Tag> : null}
                    </Space>
                  </Space>
                ),
              },
              {
                title: "Meaning",
                dataIndex: "meaningVi",
              },
              {
                title: "Example",
                dataIndex: "example",
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
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditDrawer(record)}
                        />
                        <Popconfirm
                          title="Delete this chunk?"
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
        </Space>
      </Card>

      <Drawer
        title={editingChunk ? "Edit chunk" : "Create chunk"}
        width={520}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          <Button type="primary" onClick={() => void submitChunk()} loading={pending}>
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
          <Space style={{ width: "100%" }} size={16}>
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
