"use client";

import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  CheckOutlined,
  LoadingOutlined,
  PlusOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { SpeakingSampleAnswerPanel } from "@/components/ai/speaking-sample-answer-panel";
import { SpeakingIdeaAnswerGeneratorPanel } from "@/components/admin/speaking-idea-answer-generator-panel";
import {
  IELTS_QUESTION_GENERATE_DEFAULT_COUNT,
  IELTS_QUESTION_GENERATE_MAX_COUNT,
  IELTS_QUESTION_SOURCE_LABELS,
  IELTS_QUESTION_STATUSES,
  IELTS_QUESTION_STATUS_LABELS,
  IELTS_TASK_TYPE_LABELS,
  QUESTION_CHUNK_USAGE_ROLES,
  QUESTION_CHUNK_USAGE_ROLE_LABELS,
} from "@/lib/constants";
import type {
  ChunkOption,
  IdeaQuestionMappingSuggestion,
  IeltsQuestionGenerationSummary,
  IeltsQuestionRecord,
  IeltsQuestionStatus,
  QuestionChunkUsageRole,
  SpeakingIdeaOption,
} from "@/lib/types";
import { saveQuestionChunkMappingsAction } from "@/server/actions/admin";

type IdeaRecommendation = NonNullable<IeltsQuestionRecord["ideaRecommendations"]>[number];

export function QuestionBankAdmin({
  aiTutorEnabled,
  chunkOptions,
  ideaOptions,
  questions,
}: {
  aiTutorEnabled: boolean;
  chunkOptions: ChunkOption[];
  ideaOptions: SpeakingIdeaOption[];
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
  const [statusTab, setStatusTab] = useState<IeltsQuestionStatus>("APPROVED");
  const [questionRows, setQuestionRows] = useState(questions);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSummary, setGenerateSummary] =
    useState<IeltsQuestionGenerationSummary | null>(null);
  const [generatePart, setGeneratePart] = useState<"PART_1" | "PART_2" | "PART_3" | "MIXED">("MIXED");
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateCount, setGenerateCount] = useState(
    IELTS_QUESTION_GENERATE_DEFAULT_COUNT,
  );
  const [generateTargetBand, setGenerateTargetBand] = useState(6.5);
  const [generateIncludeChunks, setGenerateIncludeChunks] = useState(true);
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(
    new Set(),
  );
  const [questionIdeaMaps, setQuestionIdeaMaps] = useState<IdeaRecommendation[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>();
  const [ideaPending, startIdeaTransition] = useTransition();
  const [suggestIdeaLoading, setSuggestIdeaLoading] = useState(false);
  const [suggestedIdeas, setSuggestedIdeas] = useState<IdeaQuestionMappingSuggestion[]>([]);
  const [ideaAnswerTarget, setIdeaAnswerTarget] = useState<{
    idea: SpeakingIdeaOption;
    question: IeltsQuestionRecord;
  } | null>(null);

  const counts = {
    SUGGESTED: questionRows.filter((q) => q.status === "SUGGESTED").length,
    APPROVED: questionRows.filter((q) => q.status === "APPROVED").length,
    ARCHIVED: questionRows.filter((q) => q.status === "ARCHIVED").length,
  } as Record<IeltsQuestionStatus, number>;

  const mergeQuestion = (question: IeltsQuestionRecord) =>
    [question, ...questionRows.filter((row) => row.id !== question.id)];

  const mergeQuestions = (updates: IeltsQuestionRecord[]) => {
    const byId = new Map(updates.map((row) => [row.id, row]));
    return questionRows.map((row) => byId.get(row.id) ?? row);
  };

  const filteredQuestions = questionRows.filter((question) => {
    if (question.status !== statusTab) {
      return false;
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return [question.prompt, question.topic, question.subTopic ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const updateStatus = async (
    question: IeltsQuestionRecord,
    status: IeltsQuestionStatus,
  ) => {
    try {
      const response = await fetch("/api/admin/questions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, status }),
      });
      const data = (await response.json()) as {
        question?: IeltsQuestionRecord;
        message?: string;
      };
      if (!response.ok || !data.question) {
        throw new Error(data.message ?? "Could not update question status.");
      }
      setQuestionRows(mergeQuestion(data.question));
      message.success(`Question moved to ${IELTS_QUESTION_STATUS_LABELS[status]}.`);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Could not update question status.",
      );
    }
  };

  const bulkUpdateStatus = async (status: IeltsQuestionStatus) => {
    if (selectedSuggestedIds.size === 0) {
      message.info("Select at least one suggested question first.");
      return;
    }
    try {
      const response = await fetch("/api/admin/questions/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: [...selectedSuggestedIds],
          status,
        }),
      });
      const data = (await response.json()) as {
        questions?: IeltsQuestionRecord[];
        message?: string;
      };
      if (!response.ok || !data.questions) {
        throw new Error(data.message ?? "Could not update questions.");
      }
      setQuestionRows(mergeQuestions(data.questions));
      setSelectedSuggestedIds(new Set());
      message.success(
        `${data.questions.length} questions moved to ${IELTS_QUESTION_STATUS_LABELS[status]}.`,
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not update questions.",
      );
    }
  };

  const runGenerate = async () => {
    setGenerateLoading(true);
    setGenerateError(null);
    setGenerateSummary(null);

    try {
      const response = await fetch("/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: generatePart,
          topic: generateTopic.trim() || undefined,
          count: generateCount,
          targetBand: generateTargetBand,
          includeRecommendedChunks: generateIncludeChunks,
        }),
      });
      const data = (await response.json()) as {
        summary?: IeltsQuestionGenerationSummary;
        message?: string;
      };

      if (!response.ok || !data.summary) {
        throw new Error(data.message ?? "Could not generate questions.");
      }

      setGenerateSummary(data.summary);

      if (data.summary.questions.length > 0) {
        setQuestionRows((current) => {
          const ids = new Set(data.summary!.questions.map((q) => q.id));
          return [
            ...data.summary!.questions,
            ...current.filter((row) => !ids.has(row.id)),
          ];
        });
        setStatusTab("SUGGESTED");
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Could not generate questions.",
      );
    } finally {
      setGenerateLoading(false);
    }
  };

  const toggleSelectSuggested = (id: string) => {
    setSelectedSuggestedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
    setQuestionIdeaMaps(question.ideaRecommendations ?? []);
    setSelectedIdeaId(undefined);
    setSuggestedIdeas([]);
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

  const syncEditingQuestionIdeas = (
    updater: (current: IdeaRecommendation[]) => IdeaRecommendation[],
  ) => {
    setQuestionIdeaMaps((current) => {
      const next = updater(current);
      if (editingQuestion) {
        const updatedQuestion = {
          ...editingQuestion,
          ideaRecommendations: next,
        };
        setEditingQuestion(updatedQuestion);
        setQuestionRows((currentRows) =>
          currentRows.map((row) => (row.id === updatedQuestion.id ? updatedQuestion : row)),
        );
      }
      return next;
    });
  };

  const createIdeaMapping = (input: {
    ideaId: string;
    relevanceScore: number;
    isPrimary: boolean;
    aiReason?: string | null;
  }) => {
    if (!editingQuestion) {
      return;
    }

    startIdeaTransition(async () => {
      const response = await fetch("/api/admin/ideas/map-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: input.ideaId,
          questionId: editingQuestion.id,
          relevanceScore: input.relevanceScore,
          isPrimary: input.isPrimary,
          aiReason: input.aiReason ?? null,
        }),
      });
      const data = (await response.json()) as {
        mapping?: IdeaRecommendation;
        message?: string;
      };

      if (!response.ok || !data.mapping) {
        message.error(data.message ?? "Could not create idea mapping.");
        return;
      }

      syncEditingQuestionIdeas((current) => {
        const next = input.isPrimary
          ? current.map((mapping) => ({ ...mapping, isPrimary: false }))
          : current;
        return [data.mapping!, ...next];
      });
      setSelectedIdeaId(undefined);
      message.success(data.message ?? "Idea mapping created.");
    });
  };

  const updateIdeaMapping = (
    mapId: string,
    input: {
      relevanceScore?: number;
      isPrimary?: boolean;
      aiReason?: string | null;
    },
  ) => {
    startIdeaTransition(async () => {
      const response = await fetch(`/api/admin/ideas/question-map/${mapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as {
        mapping?: IdeaRecommendation;
        message?: string;
      };

      if (!response.ok || !data.mapping) {
        message.error(data.message ?? "Could not update idea mapping.");
        return;
      }

      syncEditingQuestionIdeas((current) =>
        current.map((mapping) => {
          if (input.isPrimary && mapping.id !== mapId) {
            return { ...mapping, isPrimary: false };
          }
          return mapping.id === mapId ? data.mapping! : mapping;
        }),
      );
      message.success(data.message ?? "Idea mapping updated.");
    });
  };

  const removeIdeaMapping = (mapId: string) => {
    startIdeaTransition(async () => {
      const response = await fetch(`/api/admin/ideas/question-map/${mapId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        message.error(data.message ?? "Could not remove idea mapping.");
        return;
      }

      syncEditingQuestionIdeas((current) => current.filter((mapping) => mapping.id !== mapId));
      message.success(data.message ?? "Idea mapping removed.");
    });
  };

  const suggestIdeasForQuestion = async () => {
    if (!editingQuestion) {
      return;
    }

    setSuggestIdeaLoading(true);
    try {
      const response = await fetch("/api/admin/ideas/suggest-question-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QUESTION_TO_IDEAS",
          questionId: editingQuestion.id,
          limit: 6,
        }),
      });
      const data = (await response.json()) as {
        suggestions?: IdeaQuestionMappingSuggestion[];
        message?: string;
      };

      if (!response.ok || !data.suggestions) {
        throw new Error(data.message ?? "Could not suggest ideas.");
      }

      setSuggestedIdeas(data.suggestions);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not suggest ideas.");
    } finally {
      setSuggestIdeaLoading(false);
    }
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
              icon={<ThunderboltOutlined />}
              type="primary"
              className="full-width-mobile"
              disabled={!aiTutorEnabled}
              onClick={() => {
                setGenerateOpen(true);
                setGenerateError(null);
                setGenerateSummary(null);
              }}
            >
              Generate with AI
            </Button>
            <Button
              className="full-width-mobile"
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import question CSV
            </Button>
          </div>

          <Tabs
            activeKey={statusTab}
            onChange={(key) => {
              setStatusTab(key as IeltsQuestionStatus);
              setSelectedSuggestedIds(new Set());
            }}
            items={IELTS_QUESTION_STATUSES.map((status) => ({
              key: status,
              label: `${IELTS_QUESTION_STATUS_LABELS[status]} (${counts[status]})`,
            }))}
          />

          {statusTab === "SUGGESTED" && selectedSuggestedIds.size > 0 ? (
            <Space wrap>
              <Typography.Text strong>
                {selectedSuggestedIds.size} selected
              </Typography.Text>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => void bulkUpdateStatus("APPROVED")}
              >
                Bulk approve
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => void bulkUpdateStatus("ARCHIVED")}
              >
                Bulk archive
              </Button>
              <Button onClick={() => setSelectedSuggestedIds(new Set())}>
                Clear
              </Button>
            </Space>
          ) : null}

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
              pagination={{
                defaultPageSize: 8,
                align: "center",
                showSizeChanger: true,
                pageSizeOptions: [8, 10, 20, 50, 100],
              }}
              renderItem={(record) => (
                <List.Item>
                  <Card
                    size="small"
                    title={<span className="wrap-anywhere">{record.prompt}</span>}
                  >
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Space wrap>
                        {record.status === "SUGGESTED" ? (
                          <Checkbox
                            checked={selectedSuggestedIds.has(record.id)}
                            onChange={() => toggleSelectSuggested(record.id)}
                          />
                        ) : null}
                        <Tag color="blue">{IELTS_TASK_TYPE_LABELS[record.taskType]}</Tag>
                        <Tag>{record.topic}</Tag>
                        {record.subTopic ? <Tag>{record.subTopic}</Tag> : null}
                        <Tag>Band {record.targetBand.toFixed(1)}</Tag>
                        <Tag>Difficulty {record.difficulty}</Tag>
                        <Tag>{record.mappingCount} chunks</Tag>
                        <Tag
                          color={
                            record.status === "APPROVED"
                              ? "green"
                              : record.status === "SUGGESTED"
                                ? "gold"
                                : "default"
                          }
                        >
                          {IELTS_QUESTION_STATUS_LABELS[record.status]}
                        </Tag>
                        <Tag>{IELTS_QUESTION_SOURCE_LABELS[record.source]}</Tag>
                        {record.source === "AI_GENERATED" ? (
                          <Tag color="purple">
                            Pop {record.popularityScore} · Useful{" "}
                            {record.predictedUsefulnessScore}
                          </Tag>
                        ) : null}
                      </Space>
                      {record.aiReason ? (
                        <Typography.Text
                          type="secondary"
                          className="wrap-anywhere"
                        >
                          {record.aiReason}
                        </Typography.Text>
                      ) : null}
                      <Space wrap>
                        <Button onClick={() => openMappingDrawer(record)}>
                          Edit mappings
                        </Button>
                        {record.status === "SUGGESTED" ? (
                          <>
                            <Button
                              type="primary"
                              icon={<CheckOutlined />}
                              onClick={() => void updateStatus(record, "APPROVED")}
                            >
                              Approve
                            </Button>
                            <Popconfirm
                              title="Archive this suggested question?"
                              onConfirm={() => void updateStatus(record, "ARCHIVED")}
                            >
                              <Button danger icon={<StopOutlined />}>
                                Archive
                              </Button>
                            </Popconfirm>
                          </>
                        ) : record.status === "APPROVED" ? (
                          <Popconfirm
                            title="Archive this question?"
                            onConfirm={() => void updateStatus(record, "ARCHIVED")}
                          >
                            <Button danger icon={<StopOutlined />}>
                              Archive
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Button
                            icon={<UndoOutlined />}
                            onClick={() => void updateStatus(record, "APPROVED")}
                          >
                            Restore
                          </Button>
                        )}
                      </Space>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Table
              rowKey="id"
              dataSource={filteredQuestions}
              pagination={{
                defaultPageSize: 8,
                showSizeChanger: true,
                pageSizeOptions: [8, 10, 20, 50, 100],
              }}
              scroll={{ x: 900 }}
              columns={[
                ...(statusTab === "SUGGESTED"
                  ? [
                      {
                        title: "",
                        key: "select",
                        width: 36,
                        render: (_: unknown, record: IeltsQuestionRecord) => (
                          <Checkbox
                            checked={selectedSuggestedIds.has(record.id)}
                            onChange={() => toggleSelectSuggested(record.id)}
                          />
                        ),
                      },
                    ]
                  : []),
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
                  title: "Status",
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Tag
                        color={
                          record.status === "APPROVED"
                            ? "green"
                            : record.status === "SUGGESTED"
                              ? "gold"
                              : "default"
                        }
                      >
                        {IELTS_QUESTION_STATUS_LABELS[record.status]}
                      </Tag>
                      <Tag>{IELTS_QUESTION_SOURCE_LABELS[record.source]}</Tag>
                      {record.source === "AI_GENERATED" ? (
                        <Tag color="purple">
                          P{record.popularityScore} · U{record.predictedUsefulnessScore}
                        </Tag>
                      ) : null}
                    </Space>
                  ),
                },
                {
                  title: "Mapped chunks",
                  render: (_, record) => record.mappingCount,
                },
                {
                  title: "Actions",
                  render: (_, record) => (
                    <Space wrap>
                      <Button size="small" onClick={() => openMappingDrawer(record)}>
                        Edit mappings
                      </Button>
                      {record.status === "SUGGESTED" ? (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => void updateStatus(record, "APPROVED")}
                          >
                            Approve
                          </Button>
                          <Popconfirm
                            title="Archive this suggested question?"
                            onConfirm={() => void updateStatus(record, "ARCHIVED")}
                          >
                            <Button size="small" danger icon={<StopOutlined />}>
                              Archive
                            </Button>
                          </Popconfirm>
                        </>
                      ) : record.status === "APPROVED" ? (
                        <Popconfirm
                          title="Archive this question?"
                          onConfirm={() => void updateStatus(record, "ARCHIVED")}
                        >
                          <Button size="small" danger icon={<StopOutlined />}>
                            Archive
                          </Button>
                        </Popconfirm>
                      ) : (
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          onClick={() => void updateStatus(record, "APPROVED")}
                        >
                          Restore
                        </Button>
                      )}
                    </Space>
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

            <SpeakingSampleAnswerPanel
              aiTutorEnabled={aiTutorEnabled}
              question={editingQuestion}
            />

            <Card
              size="small"
              title={`Recommended Ideas (${questionIdeaMaps.length})`}
              extra={
                <Button
                  icon={suggestIdeaLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
                  onClick={() => void suggestIdeasForQuestion()}
                  disabled={ideaPending}
                >
                  Suggest ideas
                </Button>
              }
            >
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div className="responsive-toolbar">
                  <Select
                    className="responsive-toolbar__grow"
                    showSearch
                    optionFilterProp="label"
                    placeholder="Add idea manually"
                    value={selectedIdeaId}
                    onChange={(value) => setSelectedIdeaId(value)}
                    options={ideaOptions
                      .filter(
                        (idea) =>
                          !questionIdeaMaps.some((mapping) => mapping.idea.id === idea.id),
                      )
                      .map((idea) => ({
                        label: `${idea.title} (${idea.shortLabel}) · reuse ${idea.reuseScore}/5`,
                        value: idea.id,
                      }))}
                  />
                  <Button
                    type="primary"
                    disabled={!selectedIdeaId}
                    loading={ideaPending}
                    onClick={() =>
                      selectedIdeaId
                        ? createIdeaMapping({
                            ideaId: selectedIdeaId,
                            relevanceScore: 3,
                            isPrimary: questionIdeaMaps.length === 0,
                          })
                        : undefined
                    }
                  >
                    Add idea
                  </Button>
                </div>

                {suggestedIdeas.length > 0 ? (
                  <Card size="small" title="AI suggestions">
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      {suggestedIdeas.map((suggestion) => {
                        const idea = ideaOptions.find((item) => item.id === suggestion.targetId);
                        if (!idea) {
                          return null;
                        }

                        return (
                          <Card
                            key={suggestion.targetId}
                            size="small"
                            extra={
                              <Button
                                size="small"
                                type="primary"
                                loading={ideaPending}
                                onClick={() =>
                                  createIdeaMapping({
                                    ideaId: suggestion.targetId,
                                    relevanceScore: suggestion.relevanceScore,
                                    isPrimary: suggestion.isPrimary,
                                    aiReason: suggestion.aiReason,
                                  })
                                }
                              >
                                Add suggestion
                              </Button>
                            }
                          >
                            <Space direction="vertical" size={6} style={{ width: "100%" }}>
                              <Typography.Text strong>
                                {idea.title} ({idea.shortLabel})
                              </Typography.Text>
                              <Space wrap>
                                <Tag>Reuse {idea.reuseScore}/5</Tag>
                                <Tag>Popularity {idea.popularityScore}/5</Tag>
                                <Tag>Relevance {suggestion.relevanceScore}/5</Tag>
                                {suggestion.isPrimary ? <Tag color="green">Primary</Tag> : null}
                              </Space>
                              {suggestion.aiReason ? (
                                <Typography.Text type="secondary" className="wrap-anywhere">
                                  {suggestion.aiReason}
                                </Typography.Text>
                              ) : null}
                            </Space>
                          </Card>
                        );
                      })}
                    </Space>
                  </Card>
                ) : null}

                {questionIdeaMaps.length === 0 ? (
                  <Empty
                    description="No reusable ideas linked yet."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    {questionIdeaMaps.map((mapping) => (
                      <Card
                        key={mapping.id}
                        size="small"
                        title={`${mapping.idea.title} (${mapping.idea.shortLabel})`}
                        extra={
                          <Popconfirm
                            title="Remove this idea mapping?"
                            onConfirm={() => removeIdeaMapping(mapping.id)}
                          >
                            <Button danger size="small" loading={ideaPending}>
                              Remove
                            </Button>
                          </Popconfirm>
                        }
                      >
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                          <Space wrap>
                            <Tag>{mapping.idea.status}</Tag>
                            <Tag>Reuse {mapping.idea.reuseScore}/5</Tag>
                            <Tag>Popularity {mapping.idea.popularityScore}/5</Tag>
                          </Space>
                          {editingQuestion ? (
                            <Button
                              size="small"
                              onClick={() =>
                                setIdeaAnswerTarget({
                                  idea: mapping.idea,
                                  question: editingQuestion,
                                })
                              }
                              className="full-width-mobile"
                            >
                              Generate Answer From This Idea
                            </Button>
                          ) : null}
                          <div className="family-form-grid">
                            <div>
                              <Typography.Text type="secondary">Primary</Typography.Text>
                              <Select
                                value={mapping.isPrimary}
                                onChange={(value) =>
                                  updateIdeaMapping(mapping.id, { isPrimary: value })
                                }
                                options={[
                                  { label: "Secondary", value: false },
                                  { label: "Primary", value: true },
                                ]}
                              />
                            </div>
                            <div>
                              <Typography.Text type="secondary">Relevance</Typography.Text>
                              <InputNumber
                                min={1}
                                max={5}
                                value={mapping.relevanceScore}
                                onChange={(value) =>
                                  typeof value === "number"
                                    ? updateIdeaMapping(mapping.id, { relevanceScore: value })
                                    : undefined
                                }
                                style={{ width: "100%" }}
                              />
                            </div>
                          </div>
                          <Input.TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            placeholder="Why does this idea fit the question?"
                            defaultValue={mapping.aiReason ?? ""}
                            onBlur={(event) =>
                              updateIdeaMapping(mapping.id, { aiReason: event.target.value || null })
                            }
                          />
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Space>
            </Card>

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

      <Modal
        open={generateOpen}
        title="Generate High-Probability Speaking Questions"
        onCancel={() => {
          if (!generateLoading) {
            setGenerateOpen(false);
          }
        }}
        footer={null}
        destroyOnHidden
        width={isMobile ? "100%" : 720}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text type="secondary" className="wrap-anywhere">
            AI generates original practice questions inspired by common IELTS Speaking topics.
            These are <strong>practice-focused</strong> and not guaranteed to appear on a real
            exam. New questions land in the Suggested tab for review.
          </Typography.Text>

          <Space wrap>
            <Typography.Text strong>Part</Typography.Text>
            <Select<"PART_1" | "PART_2" | "PART_3" | "MIXED">
              value={generatePart}
              onChange={setGeneratePart}
              style={{ width: 140 }}
              options={[
                { label: "Mixed", value: "MIXED" },
                { label: "Part 1", value: "PART_1" },
                { label: "Part 2", value: "PART_2" },
                { label: "Part 3", value: "PART_3" },
              ]}
            />
            <Typography.Text strong>Count</Typography.Text>
            <InputNumber
              min={1}
              max={IELTS_QUESTION_GENERATE_MAX_COUNT}
              value={generateCount}
              onChange={(value) =>
                setGenerateCount(
                  typeof value === "number"
                    ? value
                    : IELTS_QUESTION_GENERATE_DEFAULT_COUNT,
                )
              }
            />
            <Typography.Text strong>Target band</Typography.Text>
            <InputNumber
              min={4}
              max={9}
              step={0.5}
              value={generateTargetBand}
              onChange={(value) =>
                setGenerateTargetBand(typeof value === "number" ? value : 6.5)
              }
            />
          </Space>

          <Space style={{ width: "100%" }}>
            <Typography.Text strong>Topic hint</Typography.Text>
            <Input
              maxLength={120}
              placeholder="Optional (e.g. Hometown, Technology)"
              value={generateTopic}
              onChange={(event) => setGenerateTopic(event.target.value)}
            />
          </Space>

          <Checkbox
            checked={generateIncludeChunks}
            onChange={(event) =>
              setGenerateIncludeChunks(event.target.checked)
            }
          >
            Include recommended chunks (mapped against the Chunk Library when possible)
          </Checkbox>

          <Button
            type="primary"
            icon={generateLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
            onClick={() => void runGenerate()}
            loading={generateLoading}
            disabled={generateLoading || !aiTutorEnabled}
          >
            Generate
          </Button>

          {generateError ? (
            <Alert type="warning" showIcon message={generateError} />
          ) : null}

          {generateSummary ? (
            <Card size="small" title="Generation summary">
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Typography.Text>
                  Created {generateSummary.created} · skipped{" "}
                  {generateSummary.skippedDuplicates} duplicates
                </Typography.Text>
                {generateSummary.warnings.length > 0 ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Notes"
                    description={
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {generateSummary.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    }
                  />
                ) : null}
                {generateSummary.parseErrors.length > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Some rows were dropped"
                    description={
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {generateSummary.parseErrors.map((errorMessage) => (
                          <li key={errorMessage}>{errorMessage}</li>
                        ))}
                      </ul>
                    }
                  />
                ) : null}
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() => {
                      setStatusTab("SUGGESTED");
                      setGenerateOpen(false);
                    }}
                  >
                    Review suggestions
                  </Button>
                  <Button
                    icon={<ThunderboltOutlined />}
                    onClick={() => void runGenerate()}
                    disabled={generateLoading}
                  >
                    Generate more
                  </Button>
                </Space>
              </Space>
            </Card>
          ) : null}
        </Space>
      </Modal>

      <Modal
        open={Boolean(ideaAnswerTarget)}
        onCancel={() => setIdeaAnswerTarget(null)}
        footer={null}
        width={840}
        destroyOnHidden
        title={
          ideaAnswerTarget
            ? `Generate Answer · ${ideaAnswerTarget.idea.title}`
            : "Generate Answer"
        }
      >
        {ideaAnswerTarget ? (
          <SpeakingIdeaAnswerGeneratorPanel
            idea={ideaAnswerTarget.idea}
            question={ideaAnswerTarget.question}
          />
        ) : null}
      </Modal>
    </div>
  );
}
