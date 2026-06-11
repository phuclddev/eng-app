"use client";

import {
  EditOutlined,
  EyeOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReadOutlined,
  RobotOutlined,
  SoundOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import {
  FAMILY_CHILD_FOCUS_LABELS,
  FAMILY_CHUNK_CHILD_FOCUS,
  FAMILY_CHUNK_CHILD_FOCUS_LABELS,
  FAMILY_SPEAKER_ROLES,
  FAMILY_SPEAKER_ROLE_LABELS,
} from "@/lib/constants";
import type {
  FamilyChunkChildFocus,
  FamilyConversationRecallLineRecord,
  FamilyConversationRecallScript,
  FamilySpeakerRole,
} from "@/lib/types";
import { saveFamilyChunkAction } from "@/server/actions/family";

type LineState = {
  answer: string;
  status: "IDLE" | "LOADING" | "DONE" | "ERROR";
  score?: number | null;
  feedback?: string;
  missingChunks?: Array<{ chunk: string; meaningVi: string | null }>;
  originalEnglish?: string;
  revealed?: boolean;
  errorMessage?: string;
};

type ChunkDraft = {
  text: string;
  meaningVi: string;
  usageContext: string;
  speakerRole: FamilySpeakerRole;
  childFocus: FamilyChunkChildFocus;
  scenarioCategory: string;
  difficulty: number;
  frequencyScore: number;
  personalizationScore: number;
  exampleSentence: string;
  sourceConversationId: string;
};

function detectSpeakerRole(speaker: string): FamilySpeakerRole {
  const lower = speaker.trim().toLowerCase();
  if (lower.startsWith("dad") || lower.includes("father") || lower.startsWith("phuc")) {
    return "FATHER";
  }
  if (lower.startsWith("mom") || lower.includes("mother")) {
    return "MOTHER";
  }
  if (
    lower.startsWith("kiwi") ||
    lower.startsWith("vivi") ||
    lower.includes("child")
  ) {
    return "CHILD";
  }
  if (lower.includes("grand")) {
    return "GRANDPARENT";
  }
  return "GENERAL";
}

function detectChildFocus(speaker: string): FamilyChunkChildFocus {
  const lower = speaker.trim().toLowerCase();
  if (lower.startsWith("kiwi")) return "KIWI";
  if (lower.startsWith("vivi")) return "VIVI";
  return "GENERAL";
}

export function FamilyConversationRecallView({
  script,
  aiEnabled,
}: {
  script: FamilyConversationRecallScript;
  aiEnabled: boolean;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [lines, setLines] = useState(script.lines);
  const [hasRecall, setHasRecall] = useState(script.hasRecall);
  const [lineStates, setLineStates] = useState<Record<string, LineState>>(
    () => {
      const initial: Record<string, LineState> = {};
      for (const line of script.lines) {
        initial[line.id] = {
          answer: line.latestAttempt?.userAnswer ?? "",
          status: line.latestAttempt ? "DONE" : "IDLE",
          score: line.latestAttempt?.score ?? undefined,
          feedback: line.latestAttempt?.feedbackMarkdown,
          missingChunks: [],
          originalEnglish: undefined,
          revealed: false,
        };
      }
      return initial;
    },
  );
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChunkDraft | null>(null);
  const [chunkSavePending, startChunkSaveTransition] = useTransition();

  const updateLine = (lineId: string, partial: Partial<LineState>) => {
    setLineStates((current) => {
      const previous: LineState = current[lineId] ?? {
        answer: "",
        status: "IDLE",
      };
      return { ...current, [lineId]: { ...previous, ...partial } };
    });
  };

  const runCreateRecall = async (regenerate: boolean) => {
    if (!aiEnabled) {
      message.warning("AI is not configured on this server.");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const response = await fetch(
        `/api/family/conversations/${script.conversationId}/create-recall`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate }),
        },
      );
      const data = (await response.json()) as {
        created?: number;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message ?? "Could not create recall practice.");
      }
      message.success(
        regenerate
          ? "Recall lines regenerated."
          : "Recall practice ready.",
      );
      router.refresh();
      setHasRecall(true);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Could not create recall practice.",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const runCompare = async (line: FamilyConversationRecallLineRecord) => {
    const state: LineState = lineStates[line.id] ?? {
      answer: "",
      status: "IDLE",
    };
    if (!state.answer.trim()) {
      message.warning("Type your English answer first.");
      return;
    }
    updateLine(line.id, { status: "LOADING", errorMessage: undefined });
    try {
      const response = await fetch(
        `/api/family/conversations/${script.conversationId}/recall/compare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineId: line.id,
            userAnswer: state.answer,
          }),
        },
      );
      const data = (await response.json()) as {
        attempt?: { id: string; score: number | null; feedbackMarkdown: string };
        originalEnglish?: string;
        missingChunks?: Array<{ chunk: string; meaningVi: string | null }>;
        message?: string;
      };
      if (!response.ok || !data.attempt) {
        throw new Error(data.message ?? "Could not compare your answer.");
      }
      updateLine(line.id, {
        status: "DONE",
        score: data.attempt.score,
        feedback: data.attempt.feedbackMarkdown,
        missingChunks: data.missingChunks ?? [],
        originalEnglish: data.originalEnglish ?? line.englishText,
      });
      setLines((current) =>
        current.map((row) =>
          row.id === line.id
            ? {
                ...row,
                latestAttempt: {
                  id: data.attempt!.id,
                  conversationId: script.conversationId,
                  lineId: line.id,
                  mode: "LINE",
                  userAnswer: state.answer,
                  score: data.attempt!.score,
                  feedbackMarkdown: data.attempt!.feedbackMarkdown,
                  createdAt: new Date().toISOString(),
                },
                attemptCount: row.attemptCount + 1,
              }
            : row,
        ),
      );
    } catch (error) {
      updateLine(line.id, {
        status: "ERROR",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Could not compare your answer.",
      });
    }
  };

  const openMissingChunkDraft = (
    line: FamilyConversationRecallLineRecord,
    chunk: { chunk: string; meaningVi: string | null },
  ) => {
    setDraft({
      text: chunk.chunk,
      meaningVi: chunk.meaningVi ?? "",
      usageContext: line.englishText,
      speakerRole: detectSpeakerRole(line.speaker),
      childFocus: detectChildFocus(line.speaker),
      scenarioCategory: script.scenarioTitle,
      difficulty: 2,
      frequencyScore: 3,
      personalizationScore: 4,
      exampleSentence: line.englishText,
      sourceConversationId: script.conversationId,
    });
  };

  const saveDraft = () => {
    if (!draft) {
      return;
    }
    if (draft.text.trim().length < 2 || draft.meaningVi.trim().length < 2) {
      message.warning("Chunk and Vietnamese meaning are required.");
      return;
    }
    startChunkSaveTransition(async () => {
      const result = await saveFamilyChunkAction({
        text: draft.text.trim(),
        meaningVi: draft.meaningVi.trim(),
        usageContext: draft.usageContext.trim() || draft.exampleSentence,
        speakerRole: draft.speakerRole,
        childFocus: draft.childFocus,
        scenarioCategory: draft.scenarioCategory,
        difficulty: draft.difficulty,
        frequencyScore: draft.frequencyScore,
        personalizationScore: draft.personalizationScore,
        exampleSentence: draft.exampleSentence,
        notes: null,
        sourceConversationId: draft.sourceConversationId,
        status: "SUGGESTED",
      });

      if (!result.ok) {
        message.error(result.message);
        return;
      }
      message.success(result.message);
      setDraft(null);
    });
  };

  if (!hasRecall) {
    return (
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Family Conversation Recall
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Turn this saved family conversation into a Vietnamese → English recall practice.
            Vietnamese stays visible, the English stays hidden until you reveal it, and AI grades
            your spoken family English.
          </Typography.Text>
        </div>

        <Card title={script.title} extra={<Tag color="blue">{script.scenarioTitle}</Tag>}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text>
              No recall lines yet. Tap below to ask AI to parse the conversation into aligned
              Vietnamese + English lines for practice.
            </Typography.Text>
            <Space wrap>
              <Button
                type="primary"
                icon={createLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
                loading={createLoading}
                disabled={createLoading || !aiEnabled}
                onClick={() => void runCreateRecall(false)}
              >
                Create Recall Practice
              </Button>
              <Button>
                <Link href="/family/conversations">Back to conversations</Link>
              </Button>
            </Space>
            {createError ? (
              <Alert type="warning" showIcon message={createError} />
            ) : null}
          </Space>
        </Card>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {script.title}
        </Typography.Title>
        <Space wrap>
          <Tag color="blue">{script.scenarioTitle}</Tag>
          <Tag color="purple">{FAMILY_CHILD_FOCUS_LABELS[script.childFocus]}</Tag>
          <Tag>{lines.length} lines</Tag>
        </Space>
      </div>

      <Card>
        <Space wrap>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Vietnamese is visible by default. Type your English answer, tap Compare with AI, then
            reveal the original. Missing useful phrases can be saved straight to your family
            chunks.
          </Typography.Text>
          <Popconfirm
            title="Regenerate recall lines?"
            description="This replaces the current recall lines for everyone using this conversation."
            onConfirm={() => void runCreateRecall(true)}
            okText="Regenerate"
            okButtonProps={{ loading: createLoading }}
          >
            <Button icon={<ThunderboltOutlined />} disabled={createLoading || !aiEnabled}>
              Regenerate recall lines
            </Button>
          </Popconfirm>
        </Space>
        {createError ? (
          <Alert type="warning" showIcon message={createError} style={{ marginTop: 12 }} />
        ) : null}
      </Card>

      {lines.length === 0 ? (
        <Card>
          <Empty
            description="No recall lines available yet."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => void runCreateRecall(false)}
              loading={createLoading}
              disabled={createLoading || !aiEnabled}
            >
              Create Recall Practice
            </Button>
          </Empty>
        </Card>
      ) : (
        lines.map((line) => {
          const state: LineState = lineStates[line.id] ?? {
            answer: "",
            status: "IDLE",
          };
          const isRevealed = state.revealed ?? false;
          return (
            <Card
              key={line.id}
              title={
                <Space wrap>
                  <Tag color="cyan">{line.speaker}</Tag>
                  <Typography.Text strong>Line {line.orderIndex + 1}</Typography.Text>
                  {line.attemptCount > 0 ? (
                    <Tag color="default">{line.attemptCount} attempt{line.attemptCount === 1 ? "" : "s"}</Tag>
                  ) : null}
                  {line.latestAttempt?.score !== null &&
                  line.latestAttempt?.score !== undefined ? (
                    <Tag
                      color={
                        line.latestAttempt.score >= 80
                          ? "green"
                          : line.latestAttempt.score >= 60
                            ? "blue"
                            : line.latestAttempt.score >= 40
                              ? "gold"
                              : "red"
                      }
                    >
                      Latest score {line.latestAttempt.score}/100
                    </Tag>
                  ) : null}
                </Space>
              }
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <div>
                  <Typography.Text strong>Vietnamese</Typography.Text>
                  <Typography.Paragraph
                    style={{ margin: 0 }}
                    className="wrap-anywhere"
                  >
                    {line.vietnameseText}
                  </Typography.Paragraph>
                </div>
                <Input.TextArea
                  autoSize={{ minRows: isMobile ? 3 : 2, maxRows: 6 }}
                  placeholder="Your English answer"
                  value={state.answer}
                  onChange={(event) =>
                    updateLine(line.id, { answer: event.target.value })
                  }
                />
                <Space wrap>
                  <Button
                    type="primary"
                    icon={
                      state.status === "LOADING" ? <LoadingOutlined /> : <RobotOutlined />
                    }
                    loading={state.status === "LOADING"}
                    disabled={state.status === "LOADING" || !aiEnabled}
                    onClick={() => void runCompare(line)}
                    className="full-width-mobile"
                  >
                    {state.status === "DONE" ? "Compare again" : "Compare with AI"}
                  </Button>
                  <Button
                    icon={isRevealed ? <EyeOutlined /> : <SoundOutlined />}
                    onClick={() => updateLine(line.id, { revealed: !isRevealed })}
                    className="full-width-mobile"
                  >
                    {isRevealed ? "Hide original" : "Reveal original"}
                  </Button>
                  {state.status === "DONE" ? (
                    <Button
                      onClick={() =>
                        updateLine(line.id, {
                          status: "IDLE",
                          answer: "",
                          score: undefined,
                          feedback: undefined,
                          missingChunks: undefined,
                          originalEnglish: undefined,
                          revealed: false,
                        })
                      }
                      className="full-width-mobile"
                    >
                      Try again
                    </Button>
                  ) : null}
                </Space>

                {isRevealed ? (
                  <Alert
                    type="success"
                    showIcon
                    message="Original English"
                    description={
                      <Typography.Paragraph
                        style={{ margin: 0 }}
                        className="wrap-anywhere"
                      >
                        {line.englishText}
                      </Typography.Paragraph>
                    }
                  />
                ) : null}

                {state.status === "ERROR" && state.errorMessage ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="AI comparison failed"
                    description={state.errorMessage}
                  />
                ) : null}

                {state.status === "DONE" && state.feedback ? (
                  <Card size="small" title="Family coach feedback">
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <AiMarkdownMessage content={state.feedback} />
                      {state.missingChunks && state.missingChunks.length > 0 ? (
                        <div>
                          <Typography.Text strong>Save useful phrases</Typography.Text>
                          <Space wrap style={{ marginTop: 6 }}>
                            {state.missingChunks.map((chunk) => (
                              <Button
                                key={chunk.chunk}
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => openMissingChunkDraft(line, chunk)}
                              >
                                {chunk.chunk}
                              </Button>
                            ))}
                          </Space>
                        </div>
                      ) : null}
                    </Space>
                  </Card>
                ) : null}
              </Space>
            </Card>
          );
        })
      )}

      <Modal
        open={Boolean(draft)}
        title="Save to Family Chunk Library"
        onCancel={() => {
          if (!chunkSavePending) {
            setDraft(null);
          }
        }}
        onOk={saveDraft}
        okText="Save as Suggested"
        okButtonProps={{
          icon: chunkSavePending ? <LoadingOutlined /> : <EditOutlined />,
          loading: chunkSavePending,
          disabled: chunkSavePending,
        }}
        destroyOnHidden
      >
        {draft ? (
          <Form layout="vertical">
            <Form.Item label="Chunk" required>
              <Input
                value={draft.text}
                onChange={(event) =>
                  setDraft({ ...draft, text: event.target.value })
                }
              />
            </Form.Item>
            <Form.Item label="Vietnamese meaning" required>
              <Input
                value={draft.meaningVi}
                onChange={(event) =>
                  setDraft({ ...draft, meaningVi: event.target.value })
                }
              />
            </Form.Item>
            <Form.Item label="Usage context">
              <Input.TextArea
                value={draft.usageContext}
                autoSize={{ minRows: 2, maxRows: 5 }}
                onChange={(event) =>
                  setDraft({ ...draft, usageContext: event.target.value })
                }
              />
            </Form.Item>
            <Form.Item label="Speaker role">
              <Select<FamilySpeakerRole>
                value={draft.speakerRole}
                onChange={(value) => setDraft({ ...draft, speakerRole: value })}
                options={FAMILY_SPEAKER_ROLES.map((role) => ({
                  value: role,
                  label: FAMILY_SPEAKER_ROLE_LABELS[role],
                }))}
              />
            </Form.Item>
            <Form.Item label="Child focus">
              <Select<FamilyChunkChildFocus>
                value={draft.childFocus}
                onChange={(value) => setDraft({ ...draft, childFocus: value })}
                options={FAMILY_CHUNK_CHILD_FOCUS.map((focus) => ({
                  value: focus,
                  label: FAMILY_CHUNK_CHILD_FOCUS_LABELS[focus],
                }))}
              />
            </Form.Item>
            <Form.Item label="Scenario category">
              <Input
                value={draft.scenarioCategory}
                onChange={(event) =>
                  setDraft({ ...draft, scenarioCategory: event.target.value })
                }
              />
            </Form.Item>
            <Form.Item label="Example sentence">
              <Input.TextArea
                value={draft.exampleSentence}
                autoSize={{ minRows: 2, maxRows: 5 }}
                onChange={(event) =>
                  setDraft({ ...draft, exampleSentence: event.target.value })
                }
              />
            </Form.Item>
            <Space wrap>
              <Form.Item label="Difficulty" style={{ marginBottom: 0 }}>
                <InputNumber
                  min={1}
                  max={5}
                  value={draft.difficulty}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      difficulty: typeof value === "number" ? value : draft.difficulty,
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Frequency" style={{ marginBottom: 0 }}>
                <InputNumber
                  min={1}
                  max={5}
                  value={draft.frequencyScore}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      frequencyScore:
                        typeof value === "number" ? value : draft.frequencyScore,
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Personalization" style={{ marginBottom: 0 }}>
                <InputNumber
                  min={1}
                  max={5}
                  value={draft.personalizationScore}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      personalizationScore:
                        typeof value === "number"
                          ? value
                          : draft.personalizationScore,
                    })
                  }
                />
              </Form.Item>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              The chunk will be saved as Suggested. You can approve it later under{" "}
              <Link href="/family/chunks">/family/chunks</Link>.
            </Typography.Text>
          </Form>
        ) : null}
      </Modal>

      <Card>
        <Space wrap>
          <Button>
            <Link href="/family/conversations">Back to conversations</Link>
          </Button>
          <Button icon={<ReadOutlined />}>
            <Link href="/family/chunks?status=SUGGESTED">Open family chunks</Link>
          </Button>
        </Space>
      </Card>
    </Space>
  );
}
