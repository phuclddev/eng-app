"use client";

import {
  CheckOutlined,
  EditOutlined,
  InboxOutlined,
  SaveOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  FAMILY_CHUNK_CHILD_FOCUS_LABELS,
  FAMILY_CHUNK_STATUS_LABELS,
  FAMILY_SPEAKER_ROLE_LABELS,
} from "@/lib/constants";
import type {
  FamilyChunkRecord,
  FamilyChunkStatus,
} from "@/lib/types";
import {
  bulkSetFamilyChunkStatusAction,
  saveFamilyChunkAction,
  setFamilyChunkStatusAction,
} from "@/server/actions/family";

function sortChunks(chunks: FamilyChunkRecord[]) {
  return [...chunks].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function mergeChunk(current: FamilyChunkRecord[], nextChunk: FamilyChunkRecord) {
  return sortChunks([
    nextChunk,
    ...current.filter((chunk) => chunk.id !== nextChunk.id),
  ]);
}

function mergeChunks(current: FamilyChunkRecord[], nextChunks: FamilyChunkRecord[]) {
  const nextById = new Map(nextChunks.map((chunk) => [chunk.id, chunk]));

  return sortChunks(
    current.map((chunk) => nextById.get(chunk.id) ?? chunk).concat(
      nextChunks.filter((chunk) => !current.some((item) => item.id === chunk.id)),
    ),
  );
}

function getInitialStatus(searchParams: URLSearchParams) {
  const value = searchParams.get("status");

  if (
    value === "SUGGESTED" ||
    value === "APPROVED" ||
    value === "ARCHIVED"
  ) {
    return value;
  }

  return "SUGGESTED" satisfies FamilyChunkStatus;
}

export function FamilyChunksView({
  chunks: initialChunks,
}: {
  chunks: FamilyChunkRecord[];
}) {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [form] = Form.useForm();
  const [chunks, setChunks] = useState(() => sortChunks(initialChunks));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FamilyChunkStatus>(() =>
    getInitialStatus(searchParams),
  );
  const [childFilter, setChildFilter] = useState<FamilyChunkRecord["childFocus"] | undefined>();
  const [speakerFilter, setSpeakerFilter] = useState<
    FamilyChunkRecord["speakerRole"] | undefined
  >();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [editingChunkId, setEditingChunkId] = useState<string | undefined>();
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const categoryOptions = useMemo(
    () =>
      [...new Set(chunks.map((chunk) => chunk.scenarioCategory))]
        .sort((left, right) => left.localeCompare(right))
        .map((category) => ({
          label: category,
          value: category,
        })),
    [chunks],
  );

  const counts = useMemo(
    () => ({
      SUGGESTED: chunks.filter((chunk) => chunk.status === "SUGGESTED").length,
      APPROVED: chunks.filter((chunk) => chunk.status === "APPROVED").length,
      ARCHIVED: chunks.filter((chunk) => chunk.status === "ARCHIVED").length,
    }),
    [chunks],
  );

  const filteredChunks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return chunks.filter((chunk) => {
      const matchesStatus = chunk.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        [
          chunk.text,
          chunk.meaningVi,
          chunk.usageContext,
          chunk.scenarioCategory,
          chunk.exampleSentence ?? "",
          chunk.notes ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesChild = childFilter ? chunk.childFocus === childFilter : true;
      const matchesSpeaker = speakerFilter ? chunk.speakerRole === speakerFilter : true;
      const matchesCategory = categoryFilter
        ? chunk.scenarioCategory === categoryFilter
        : true;

      return (
        matchesStatus &&
        matchesSearch &&
        matchesChild &&
        matchesSpeaker &&
        matchesCategory
      );
    });
  }, [categoryFilter, childFilter, chunks, search, speakerFilter, statusFilter]);

  const selectedVisibleIds = useMemo(
    () =>
      filteredChunks
        .map((chunk) => chunk.id)
        .filter((chunkId) => selectedChunkIds.includes(chunkId)),
    [filteredChunks, selectedChunkIds],
  );

  const resetForm = () => {
    setEditingChunkId(undefined);
    form.resetFields();
    form.setFieldsValue({
      speakerRole: "GENERAL",
      childFocus: "GENERAL",
      difficulty: 2,
      frequencyScore: 3,
      personalizationScore: 3,
      status: "SUGGESTED",
    });
  };

  const startEdit = (chunk: FamilyChunkRecord) => {
    setEditingChunkId(chunk.id);
    form.setFieldsValue({
      id: chunk.id,
      text: chunk.text,
      meaningVi: chunk.meaningVi,
      usageContext: chunk.usageContext,
      speakerRole: chunk.speakerRole,
      childFocus: chunk.childFocus,
      scenarioCategory: chunk.scenarioCategory,
      difficulty: chunk.difficulty,
      frequencyScore: chunk.frequencyScore,
      personalizationScore: chunk.personalizationScore,
      exampleSentence: chunk.exampleSentence,
      notes: chunk.notes,
      sourceConversationId: chunk.sourceConversationId,
      status: chunk.status,
    });
  };

  const submit = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveFamilyChunkAction(values);

      if (!result.ok || !result.chunk) {
        message.error(result.message);
        return;
      }

      setChunks((current) => mergeChunk(current, result.chunk));
      message.success(result.message);
      resetForm();
    });
  };

  const updateStatus = (chunkId: string, status: FamilyChunkStatus) => {
    startTransition(async () => {
      const result = await setFamilyChunkStatusAction({
        chunkId,
        status,
      });

      if (!result.ok || !result.chunk) {
        message.error(result.message);
        return;
      }

      setChunks((current) => mergeChunk(current, result.chunk));
      setSelectedChunkIds((current) => current.filter((id) => id !== chunkId));
      message.success(result.message);
    });
  };

  const runBulkStatus = (status: FamilyChunkStatus) => {
    if (selectedVisibleIds.length === 0) {
      message.warning("Select at least one visible family chunk first.");
      return;
    }

    startTransition(async () => {
      const result = await bulkSetFamilyChunkStatusAction({
        chunkIds: selectedVisibleIds,
        status,
      });

      if (!result.ok || !result.chunks) {
        message.error(result.message);
        return;
      }

      setChunks((current) => mergeChunks(current, result.chunks));
      setSelectedChunkIds((current) =>
        current.filter((id) => !selectedVisibleIds.includes(id)),
      );
      message.success(result.message);
    });
  };

  const toggleSelectAllVisible = () => {
    if (
      selectedVisibleIds.length === filteredChunks.length &&
      filteredChunks.length > 0
    ) {
      setSelectedChunkIds((current) =>
        current.filter((id) => !filteredChunks.some((chunk) => chunk.id === id)),
      );
      return;
    }

    setSelectedChunkIds((current) => [
      ...new Set([...current, ...filteredChunks.map((chunk) => chunk.id)]),
    ]);
  };

  const changeStatusFilter = (nextStatus: string) => {
    const safeStatus =
      nextStatus === "APPROVED" || nextStatus === "ARCHIVED"
        ? nextStatus
        : "SUGGESTED";

    setStatusFilter(safeStatus);
    setSelectedChunkIds([]);
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", safeStatus);
    router.replace(`/family/chunks?${params.toString()}`);
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Chunks
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Review private daily-life chunks extracted from family conversations without mixing them
          into the IELTS chunk library.
        </Typography.Text>
      </div>

      <Card title={editingChunkId ? "Edit family chunk" : "Add family chunk"}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            speakerRole: "GENERAL",
            childFocus: "GENERAL",
            difficulty: 2,
            frequencyScore: 3,
            personalizationScore: 3,
            status: "SUGGESTED",
          }}
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="sourceConversationId" hidden>
            <Input />
          </Form.Item>

          <div className="family-form-grid">
            <Form.Item name="text" label="Chunk text" rules={[{ required: true }]}>
              <Input maxLength={191} placeholder="Let's keep moving" />
            </Form.Item>
            <Form.Item
              name="meaningVi"
              label="Vietnamese meaning"
              rules={[{ required: true }]}
            >
              <Input maxLength={255} placeholder="Mình đi tiếp thôi" />
            </Form.Item>
            <Form.Item
              name="speakerRole"
              label="Speaker role"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries(FAMILY_SPEAKER_ROLE_LABELS).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                )}
              />
            </Form.Item>
            <Form.Item
              name="childFocus"
              label="Child focus"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries(FAMILY_CHUNK_CHILD_FOCUS_LABELS).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                )}
              />
            </Form.Item>
            <Form.Item
              name="scenarioCategory"
              label="Scenario category"
              rules={[{ required: true }]}
            >
              <Input maxLength={120} placeholder="Morning routine" />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={Object.entries(FAMILY_CHUNK_STATUS_LABELS).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                )}
              />
            </Form.Item>
            <Form.Item name="difficulty" label="Difficulty" rules={[{ required: true }]}>
              <Select
                options={[1, 2, 3, 4, 5].map((value) => ({
                  label: `Level ${value}`,
                  value,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="frequencyScore"
              label="Frequency score"
              rules={[{ required: true }]}
            >
              <Select
                options={[1, 2, 3, 4, 5].map((value) => ({
                  label: `${value}/5`,
                  value,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="personalizationScore"
              label="Personalization score"
              rules={[{ required: true }]}
            >
              <Select
                options={[1, 2, 3, 4, 5].map((value) => ({
                  label: `${value}/5`,
                  value,
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="usageContext"
            label="Usage context"
            rules={[{ required: true }]}
            extra="Explain when Phuc should use this chunk in a real family situation."
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
          </Form.Item>
          <Form.Item name="exampleSentence" label="Example sentence">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>

          <div className="mobile-actions">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={pending}
              onClick={() => void submit()}
              className="full-width-mobile"
            >
              {editingChunkId ? "Save family chunk" : "Create family chunk"}
            </Button>
            {editingChunkId ? (
              <Button onClick={resetForm} className="full-width-mobile">
                Cancel edit
              </Button>
            ) : null}
          </div>
        </Form>
      </Card>

      <Card title="Chunk review queue">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Tabs
            activeKey={statusFilter}
            onChange={changeStatusFilter}
            items={[
              {
                key: "SUGGESTED",
                label: `Suggested (${counts.SUGGESTED})`,
              },
              {
                key: "APPROVED",
                label: `Approved (${counts.APPROVED})`,
              },
              {
                key: "ARCHIVED",
                label: `Archived (${counts.ARCHIVED})`,
              },
            ]}
          />

          <div className="responsive-toolbar">
            <div className="responsive-toolbar__grow">
              <Input.Search
                allowClear
                placeholder="Search by chunk, meaning, context, or notes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="responsive-toolbar__actions">
              <Select
                allowClear
                placeholder="Child focus"
                value={childFilter}
                onChange={(value) => setChildFilter(value)}
                options={Object.entries(FAMILY_CHUNK_CHILD_FOCUS_LABELS).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                )}
                style={{ minWidth: isMobile ? "100%" : 170 }}
              />
              <Select
                allowClear
                placeholder="Speaker role"
                value={speakerFilter}
                onChange={(value) => setSpeakerFilter(value)}
                options={Object.entries(FAMILY_SPEAKER_ROLE_LABELS).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                )}
                style={{ minWidth: isMobile ? "100%" : 170 }}
              />
              <Select
                allowClear
                placeholder="Scenario category"
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value)}
                options={categoryOptions}
                style={{ minWidth: isMobile ? "100%" : 200 }}
              />
            </div>
          </div>

          <div className="responsive-toolbar">
            <div className="responsive-toolbar__grow">
              <Typography.Text type="secondary">
                {selectedVisibleIds.length} selected in the current view
              </Typography.Text>
            </div>
            <div className="responsive-toolbar__actions">
              <Button onClick={toggleSelectAllVisible} className="full-width-mobile">
                {selectedVisibleIds.length === filteredChunks.length &&
                filteredChunks.length > 0
                  ? "Clear visible selection"
                  : "Select visible"}
              </Button>
              <Button
                icon={<CheckOutlined />}
                onClick={() => runBulkStatus("APPROVED")}
                className="full-width-mobile"
              >
                Approve selected
              </Button>
              <Popconfirm
                title="Archive selected family chunks?"
                description="Archived chunks stay private and can be restored later."
                onConfirm={() => runBulkStatus("ARCHIVED")}
                okText="Archive"
              >
                <Button
                  danger
                  icon={<InboxOutlined />}
                  className="full-width-mobile"
                >
                  Archive selected
                </Button>
              </Popconfirm>
            </div>
          </div>

          {filteredChunks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No family chunks match the current filters."
              style={{ marginBlock: 32 }}
            />
          ) : (
            <List
              className="mobile-card-list"
              dataSource={filteredChunks}
              renderItem={(chunk) => (
                <List.Item key={chunk.id}>
                  <Card
                    className="table-card family-chunk-card"
                    title={
                      <Space wrap>
                        <Checkbox
                          checked={selectedChunkIds.includes(chunk.id)}
                          onChange={(event) => {
                            setSelectedChunkIds((current) =>
                              event.target.checked
                                ? [...new Set([...current, chunk.id])]
                                : current.filter((id) => id !== chunk.id),
                            );
                          }}
                        />
                        <Typography.Text strong className="wrap-anywhere">
                          {chunk.text}
                        </Typography.Text>
                      </Space>
                    }
                    extra={
                      <Space wrap>
                        <Tag color={chunk.status === "APPROVED" ? "green" : chunk.status === "ARCHIVED" ? "default" : "gold"}>
                          {FAMILY_CHUNK_STATUS_LABELS[chunk.status]}
                        </Tag>
                        {chunk.sourceConversationId ? <Tag>Extracted</Tag> : <Tag>Manual</Tag>}
                      </Space>
                    }
                  >
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Typography.Text strong className="wrap-anywhere">
                        {chunk.meaningVi}
                      </Typography.Text>
                      <Typography.Text type="secondary" className="wrap-anywhere">
                        {chunk.usageContext}
                      </Typography.Text>
                      {chunk.exampleSentence ? (
                        <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 0 }}>
                          Example: {chunk.exampleSentence}
                        </Typography.Paragraph>
                      ) : null}
                      {chunk.notes ? (
                        <Typography.Text type="secondary" className="wrap-anywhere">
                          Notes: {chunk.notes}
                        </Typography.Text>
                      ) : null}

                      <Space wrap>
                        <Tag>{FAMILY_SPEAKER_ROLE_LABELS[chunk.speakerRole]}</Tag>
                        <Tag>{FAMILY_CHUNK_CHILD_FOCUS_LABELS[chunk.childFocus]}</Tag>
                        <Tag>{chunk.scenarioCategory}</Tag>
                        <Tag>Difficulty {chunk.difficulty}/5</Tag>
                        <Tag>Frequency {chunk.frequencyScore}/5</Tag>
                        <Tag>Personalization {chunk.personalizationScore}/5</Tag>
                      </Space>

                      <div className="mobile-actions">
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => startEdit(chunk)}
                          className="full-width-mobile"
                        >
                          Edit
                        </Button>
                        {chunk.status !== "APPROVED" ? (
                          <Button
                            icon={<CheckOutlined />}
                            onClick={() => updateStatus(chunk.id, "APPROVED")}
                            className="full-width-mobile"
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button
                            icon={<UndoOutlined />}
                            onClick={() => updateStatus(chunk.id, "SUGGESTED")}
                            className="full-width-mobile"
                          >
                            Move to suggested
                          </Button>
                        )}
                        {chunk.status !== "ARCHIVED" ? (
                          <Popconfirm
                            title="Archive this family chunk?"
                            description="Archived chunks stay out of future family practice until restored."
                            onConfirm={() => updateStatus(chunk.id, "ARCHIVED")}
                            okText="Archive"
                          >
                            <Button
                              danger
                              icon={<StopOutlined />}
                              className="full-width-mobile"
                            >
                              Archive
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Button
                            icon={<UndoOutlined />}
                            onClick={() => updateStatus(chunk.id, "SUGGESTED")}
                            className="full-width-mobile"
                          >
                            Restore to suggested
                          </Button>
                        )}
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>
    </div>
  );
}
