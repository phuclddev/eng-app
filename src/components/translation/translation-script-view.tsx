"use client";

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LoadingOutlined,
  RobotOutlined,
  SaveOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import { TranslationScriptForm } from "@/components/translation/translation-script-form";

import {
  TRANSLATION_RECALL_CONFIDENCES,
  TRANSLATION_RECALL_CONFIDENCE_LABELS,
} from "@/lib/constants";
import { normalizeAiTextForDisplay } from "@/lib/text-cleanup";
import type {
  TranslationAiChunkExtractResponse,
  TranslationRecallConfidence,
  TranslationRecallUsedChunkRecord,
  TranslationScriptRecord,
  TranslationSentenceRecord,
} from "@/lib/types";

type Mode = "REVEAL" | "SPEAKING" | "COMPARE";

type CompareState = {
  status: "IDLE" | "LOADING" | "DONE" | "ERROR";
  answer: string;
  score?: number | null;
  feedback?: string;
  missingChunks?: Array<{ chunk: string; meaningVi: string | null }>;
  originalEnglish?: string;
  attemptId?: string;
  errorMessage?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightChunks(
  text: string,
  chunks: TranslationRecallUsedChunkRecord[],
): ReactNode {
  if (chunks.length === 0 || !text) {
    return text;
  }

  const sorted = [...chunks].sort(
    (left, right) => right.chunk.length - left.chunk.length,
  );
  const pattern = new RegExp(
    `(${sorted.map((chunk) => escapeRegExp(chunk.chunk)).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const lower = part.toLowerCase();
    const match = sorted.find((chunk) => chunk.chunk.toLowerCase() === lower);
    if (match) {
      return (
        <mark
          key={`${match.id}-${index}`}
          style={{
            background: "#fff7e6",
            color: "#ad6800",
            padding: "0 4px",
            borderRadius: 4,
            fontWeight: 600,
          }}
          title={`${match.meaningVi}${match.topic ? ` · ${match.topic}` : ""}`}
        >
          {part}
        </mark>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

type ExtractDraft = {
  sentenceId: string;
  englishPhrase: string;
  meaningVi: string;
  example: string;
  usageContext: string;
  suggestedTopic: string;
  bandEstimate: number;
};

export function TranslationScriptView({
  script,
  aiEnabled,
  isAdmin = false,
}: {
  script: TranslationScriptRecord;
  aiEnabled: boolean;
  isAdmin?: boolean;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const router = useRouter();

  const [scriptRecord, setScriptRecord] = useState(script);
  const [sentences, setSentences] = useState(script.sentences);
  const [editOpen, setEditOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const usedChunks = useMemo(
    () => script.usedChunks ?? [],
    [script.usedChunks],
  );
  const [mode, setMode] = useState<Mode>("REVEAL");
  const [compareState, setCompareState] = useState<
    Record<string, CompareState>
  >({});
  const [revealedSentenceIds, setRevealedSentenceIds] = useState<Set<string>>(
    new Set(),
  );
  const [reviewPending, setReviewPending] = useState<string | null>(null);
  const [extractDraft, setExtractDraft] = useState<ExtractDraft | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selection, setSelection] = useState<{
    sentenceId: string;
    englishPhrase: string;
  } | null>(null);

  const toggleReveal = (sentenceId: string) => {
    setRevealedSentenceIds((current) => {
      const next = new Set(current);
      if (next.has(sentenceId)) {
        next.delete(sentenceId);
      } else {
        next.add(sentenceId);
      }
      return next;
    });
  };

  const handleSelectionForSentence = (sentenceId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const text = window.getSelection?.()?.toString().trim() ?? "";
    if (text.length < 2) {
      setSelection(null);
      return;
    }
    setSelection({
      sentenceId,
      englishPhrase: text.slice(0, 191),
    });
  };

  const openManualExtract = () => {
    if (!selection) {
      message.info("Highlight an English phrase in the revealed sentence first.");
      return;
    }
    setExtractDraft({
      sentenceId: selection.sentenceId,
      englishPhrase: selection.englishPhrase,
      meaningVi: "",
      example:
        sentences.find((sentence) => sentence.id === selection.sentenceId)
          ?.englishText ?? selection.englishPhrase,
      usageContext: "",
      suggestedTopic: script.topic,
      bandEstimate: script.bandLevel,
    });
  };

  const runAiExtract = async () => {
    if (!aiEnabled) {
      message.warning("AI is not configured on this server.");
      return;
    }
    if (!selection) {
      message.info("Highlight an English phrase first.");
      return;
    }

    setExtractLoading(true);

    try {
      const response = await fetch("/api/translation/extract-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: selection.sentenceId,
          englishPhrase: selection.englishPhrase,
        }),
      });
      const data = (await response.json()) as {
        extracted?: TranslationAiChunkExtractResponse;
        message?: string;
      };

      if (!response.ok || !data.extracted) {
        throw new Error(data.message ?? "Could not extract this chunk.");
      }

      setExtractDraft({
        sentenceId: selection.sentenceId,
        englishPhrase: data.extracted.chunk,
        meaningVi: data.extracted.meaningVi,
        example: data.extracted.example,
        usageContext: data.extracted.usage,
        suggestedTopic: data.extracted.suggestedTopic ?? script.topic,
        bandEstimate: data.extracted.bandEstimate,
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not extract this chunk.",
      );
    } finally {
      setExtractLoading(false);
    }
  };

  const saveChunk = async () => {
    if (!extractDraft) {
      return;
    }

    if (extractDraft.englishPhrase.trim().length < 2) {
      message.warning("Chunk text is required.");
      return;
    }
    if (extractDraft.meaningVi.trim().length < 2) {
      message.warning("Vietnamese meaning is required.");
      return;
    }
    if (extractDraft.example.trim().length < 5) {
      message.warning("Example sentence is required.");
      return;
    }

    setSaveLoading(true);

    try {
      const response = await fetch("/api/translation/save-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: extractDraft.sentenceId,
          englishPhrase: extractDraft.englishPhrase.trim(),
          meaningVi: extractDraft.meaningVi.trim(),
          example: extractDraft.example.trim(),
          usageContext: extractDraft.usageContext.trim() || undefined,
          suggestedTopic: extractDraft.suggestedTopic.trim() || undefined,
          bandEstimate: extractDraft.bandEstimate,
        }),
      });
      const data = (await response.json()) as {
        mapping?: {
          id: string;
          sentenceId: string;
          englishPhrase: string;
          chunkId: string | null;
        };
        message?: string;
      };

      if (!response.ok || !data.mapping) {
        throw new Error(data.message ?? "Could not save the chunk.");
      }

      const mapping = data.mapping;

      setSentences((current) =>
        current.map((sentence) =>
          sentence.id === mapping.sentenceId
            ? {
                ...sentence,
                savedChunks: [
                  ...sentence.savedChunks.filter(
                    (item) => item.id !== mapping.id,
                  ),
                  {
                    id: mapping.id,
                    englishPhrase: mapping.englishPhrase,
                    chunkId: mapping.chunkId,
                  },
                ],
              }
            : sentence,
        ),
      );

      message.success("Saved to IELTS chunk library.");
      setExtractDraft(null);
      setSelection(null);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not save the chunk.",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const recordReview = async (
    sentenceId: string,
    confidence: TranslationRecallConfidence,
  ) => {
    setReviewPending(sentenceId);
    try {
      const response = await fetch("/api/translation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId,
          confidence,
        }),
      });
      const data = (await response.json()) as {
        sentence?: TranslationSentenceRecord;
        message?: string;
      };

      if (!response.ok || !data.sentence) {
        throw new Error(data.message ?? "Could not save the review.");
      }

      setSentences((current) =>
        current.map((sentence) =>
          sentence.id === sentenceId ? data.sentence! : sentence,
        ),
      );
      message.success(`Marked as ${TRANSLATION_RECALL_CONFIDENCE_LABELS[confidence].toLowerCase()}.`);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not save the review.",
      );
    } finally {
      setReviewPending(null);
    }
  };

  const updateCompareState = (
    sentenceId: string,
    update: Partial<CompareState>,
  ) => {
    setCompareState((current) => {
      const previous: CompareState = current[sentenceId] ?? {
        status: "IDLE",
        answer: "",
      };
      return {
        ...current,
        [sentenceId]: { ...previous, ...update },
      };
    });
  };

  const runCompare = async (sentenceId: string) => {
    const current: CompareState = compareState[sentenceId] ?? {
      status: "IDLE",
      answer: "",
    };
    if (!current.answer || current.answer.trim().length < 2) {
      message.warning("Type your English answer first.");
      return;
    }
    updateCompareState(sentenceId, {
      status: "LOADING",
      errorMessage: undefined,
    });

    try {
      const response = await fetch("/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: scriptRecord.id,
          sentenceId,
          mode: "SENTENCE",
          userAnswer: current.answer,
        }),
      });
      const data = (await response.json()) as {
        attempt?: {
          id: string;
          score: number | null;
          feedbackMarkdown: string;
        };
        originalEnglish?: string;
        missingChunks?: Array<{ chunk: string; meaningVi: string | null }>;
        message?: string;
      };

      if (!response.ok || !data.attempt) {
        throw new Error(data.message ?? "Could not compare your answer.");
      }

      updateCompareState(sentenceId, {
        status: "DONE",
        score: data.attempt.score,
        feedback: data.attempt.feedbackMarkdown,
        missingChunks: data.missingChunks ?? [],
        originalEnglish: data.originalEnglish ?? undefined,
        attemptId: data.attempt.id,
        errorMessage: undefined,
      });
    } catch (error) {
      updateCompareState(sentenceId, {
        status: "ERROR",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Could not compare your answer.",
      });
    }
  };

  const startSaveMissingChunk = (
    sentenceId: string,
    chunk: { chunk: string; meaningVi: string | null },
  ) => {
    const sentenceRow = sentences.find((s) => s.id === sentenceId);
    setExtractDraft({
      sentenceId,
      englishPhrase: chunk.chunk,
      meaningVi: chunk.meaningVi ?? "",
      example: sentenceRow?.englishText ?? chunk.chunk,
      usageContext: "",
      suggestedTopic: scriptRecord.topic,
      bandEstimate: scriptRecord.bandLevel,
    });
  };

  const handleDelete = async () => {
    setDeletePending(true);
    try {
      const response = await fetch(
        `/api/translation-recall/scripts/${scriptRecord.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Could not delete the script.");
      }
      message.success("Translation script deleted.");
      router.push("/translation");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not delete the script.",
      );
    } finally {
      setDeletePending(false);
    }
  };

  const renderCompareBlock = (sentenceId: string, vietnameseText: string) => {
    const state: CompareState = compareState[sentenceId] ?? {
      status: "IDLE",
      answer: "",
    };
    const showRevealedOriginal =
      state.status === "DONE" && revealedSentenceIds.has(sentenceId);

    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Type your own English answer for this Vietnamese sentence, then tap Compare with AI."
          description={
            <Typography.Text type="secondary" className="wrap-anywhere">
              Source: {normalizeAiTextForDisplay(vietnameseText)}
            </Typography.Text>
          }
        />
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="Your English answer"
          value={state.answer}
          onChange={(event) =>
            updateCompareState(sentenceId, { answer: event.target.value })
          }
        />
        <Space wrap>
          <Button
            type="primary"
            icon={state.status === "LOADING" ? <LoadingOutlined /> : <RobotOutlined />}
            loading={state.status === "LOADING"}
            disabled={state.status === "LOADING" || !aiEnabled}
            onClick={() => void runCompare(sentenceId)}
          >
            {state.status === "DONE" ? "Compare again" : "Compare with AI"}
          </Button>
          {state.status === "DONE" ? (
            <Button
              icon={showRevealedOriginal ? <EyeOutlined /> : <SoundOutlined />}
              onClick={() => toggleReveal(sentenceId)}
            >
              {showRevealedOriginal ? "Hide original" : "Reveal original"}
            </Button>
          ) : null}
          {state.status === "DONE" ? (
            <Button
              onClick={() =>
                updateCompareState(sentenceId, {
                  status: "IDLE",
                  answer: "",
                  score: undefined,
                  feedback: undefined,
                  missingChunks: undefined,
                  originalEnglish: undefined,
                  attemptId: undefined,
                  errorMessage: undefined,
                })
              }
            >
              Try again
            </Button>
          ) : null}
        </Space>

        {state.status === "ERROR" && state.errorMessage ? (
          <Alert
            type="warning"
            showIcon
            message="AI comparison failed"
            description={state.errorMessage}
          />
        ) : null}

        {state.status === "DONE" && state.feedback ? (
          <Card size="small" title={
            <Space wrap>
              <Typography.Text strong>Feedback</Typography.Text>
              {typeof state.score === "number" ? (
                <Tag
                  color={
                    state.score >= 80
                      ? "green"
                      : state.score >= 60
                        ? "blue"
                        : state.score >= 40
                          ? "gold"
                          : "red"
                  }
                >
                  Score {state.score}/100
                </Tag>
              ) : null}
            </Space>
          }>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <AiMarkdownMessage content={state.feedback} />
              {state.missingChunks && state.missingChunks.length > 0 ? (
                <div>
                  <Typography.Text strong>Save missing chunks</Typography.Text>
                  <Space wrap style={{ marginTop: 6 }}>
                    {state.missingChunks.map((chunk) => (
                      <Button
                        key={chunk.chunk}
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startSaveMissingChunk(sentenceId, chunk)}
                      >
                        {chunk.chunk}
                      </Button>
                    ))}
                  </Space>
                </div>
              ) : null}
              {showRevealedOriginal && state.originalEnglish ? (
                <Alert
                  type="success"
                  showIcon
                  message="Original English"
                  description={
                    <Typography.Paragraph
                      style={{ margin: 0 }}
                      className="wrap-anywhere"
                    >
                      {normalizeAiTextForDisplay(state.originalEnglish)}
                    </Typography.Paragraph>
                  }
                />
              ) : null}
            </Space>
          </Card>
        ) : null}
      </Space>
    );
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {normalizeAiTextForDisplay(scriptRecord.title)}
        </Typography.Title>
        <Space wrap>
          <Tag color="blue">{scriptRecord.topic}</Tag>
          <Tag color="cyan">Band {scriptRecord.bandLevel.toFixed(1)}</Tag>
          <Tag>{sentences.length} sentences</Tag>
          {isAdmin ? (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              >
                Edit script
              </Button>
              <Popconfirm
                title="Delete this translation script?"
                description="Sentences and saved chunk mappings on this script will also be removed."
                onConfirm={() => void handleDelete()}
                okText="Delete"
                okButtonProps={{ danger: true, loading: deletePending }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deletePending}
                >
                  Delete
                </Button>
              </Popconfirm>
            </>
          ) : null}
        </Space>
      </div>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            <Typography.Text strong>Mode</Typography.Text>
            <Segmented
              value={mode}
              onChange={(value) => setMode(value as Mode)}
              options={[
                { value: "REVEAL", label: "Reveal mode" },
                { value: "SPEAKING", label: "Speaking mode" },
                { value: "COMPARE", label: "Compare with AI" },
              ]}
            />
          </Space>
          <Typography.Text type="secondary" className="wrap-anywhere">
            {mode === "REVEAL"
              ? "Vietnamese is shown by default. Hover the English line on desktop, or tap it on mobile, to reveal. Highlight any English phrase to extract a chunk."
              : mode === "SPEAKING"
                ? "Vietnamese is shown by default. Try saying the English aloud, then reveal it and rate yourself Easy / Medium / Hard."
                : "Type your own English answer for each sentence and tap Compare with AI. The score and feedback come back in Vietnamese. The original English stays hidden until you reveal it."}
          </Typography.Text>
          {usedChunks.length > 0 ? (
            <Space wrap>
              <Typography.Text strong>Chunks highlighted on reveal</Typography.Text>
              {usedChunks.map((chunk) => (
                <Tag key={chunk.id} color="gold" title={chunk.meaningVi}>
                  {chunk.chunk}
                </Tag>
              ))}
            </Space>
          ) : null}
        </Space>
      </Card>

      {sentences.map((sentence) => {
        const isRevealed = revealedSentenceIds.has(sentence.id);
        const cleanVietnamese = normalizeAiTextForDisplay(
          sentence.vietnameseText,
        );
        const cleanEnglish = normalizeAiTextForDisplay(sentence.englishText);
        return (
          <Card key={sentence.id} title={`Sentence ${sentence.orderIndex + 1}`}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Typography.Text strong>Vietnamese</Typography.Text>
                <Typography.Paragraph
                  style={{ margin: 0 }}
                  className="wrap-anywhere"
                >
                  {cleanVietnamese}
                </Typography.Paragraph>
              </div>

              <div>
                <Typography.Text strong>English</Typography.Text>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (mode === "REVEAL" || mode === "SPEAKING") {
                      toggleReveal(sentence.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleReveal(sentence.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (mode === "REVEAL" && !isMobile) {
                      setRevealedSentenceIds((current) => {
                        const next = new Set(current);
                        next.add(sentence.id);
                        return next;
                      });
                    }
                  }}
                  onMouseUp={() => handleSelectionForSentence(sentence.id)}
                  onTouchEnd={() => handleSelectionForSentence(sentence.id)}
                  style={{
                    marginTop: 4,
                    padding: 12,
                    minHeight: 56,
                    borderRadius: 8,
                    cursor: "pointer",
                    backgroundColor: isRevealed
                      ? "#e6fffb"
                      : "#f5f5f5",
                    filter: isRevealed ? "none" : "blur(6px)",
                    userSelect: isRevealed ? "text" : "none",
                    transition: "filter 120ms ease",
                  }}
                >
                  <span
                    className="wrap-anywhere"
                    style={{ fontSize: 16, lineHeight: 1.5 }}
                  >
                    {isRevealed
                      ? highlightChunks(cleanEnglish, usedChunks)
                      : cleanEnglish}
                  </span>
                </div>
                {!isRevealed ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {isMobile ? "Tap to reveal." : "Hover or click to reveal."}
                  </Typography.Text>
                ) : null}
              </div>

              {selection?.sentenceId === sentence.id ? (
                <Alert
                  type="info"
                  showIcon
                  message={`Selected: ${selection.englishPhrase}`}
                  action={
                    <Space wrap>
                      <Button
                        icon={
                          extractLoading ? <LoadingOutlined /> : <RobotOutlined />
                        }
                        onClick={() => void runAiExtract()}
                        loading={extractLoading}
                        disabled={extractLoading || !aiEnabled}
                      >
                        AI extract chunk
                      </Button>
                      <Button icon={<EditOutlined />} onClick={openManualExtract}>
                        Save to chunk library
                      </Button>
                    </Space>
                  }
                />
              ) : null}

              {sentence.savedChunks.length > 0 ? (
                <Space wrap>
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Saved chunks ({sentence.savedChunks.length})
                  </Tag>
                  {sentence.savedChunks.map((mapping) => (
                    <Tag key={mapping.id}>{mapping.englishPhrase}</Tag>
                  ))}
                </Space>
              ) : null}

              {mode === "COMPARE"
                ? renderCompareBlock(sentence.id, sentence.vietnameseText)
                : null}

              {mode === "SPEAKING" ? (
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space wrap>
                    <Button
                      icon={
                        isRevealed ? <EyeOutlined /> : <SoundOutlined />
                      }
                      onClick={() => toggleReveal(sentence.id)}
                    >
                      {isRevealed ? "Hide English" : "Reveal English"}
                    </Button>
                  </Space>
                  <Space wrap>
                    {TRANSLATION_RECALL_CONFIDENCES.map((confidence) => (
                      <Button
                        key={confidence}
                        type={
                          sentence.review?.lastConfidence === confidence
                            ? "primary"
                            : "default"
                        }
                        loading={reviewPending === sentence.id}
                        disabled={reviewPending === sentence.id}
                        onClick={() => void recordReview(sentence.id, confidence)}
                      >
                        {TRANSLATION_RECALL_CONFIDENCE_LABELS[confidence]}
                      </Button>
                    ))}
                  </Space>
                  {sentence.review ? (
                    <Typography.Text type="secondary">
                      Reviewed {sentence.review.reviewCount}× · Easy {sentence.review.easyCount} ·
                      Medium {sentence.review.mediumCount} · Hard{" "}
                      {sentence.review.hardCount}
                    </Typography.Text>
                  ) : null}
                </Space>
              ) : null}
            </Space>
          </Card>
        );
      })}

      <Modal
        title="Save chunk to IELTS library"
        open={Boolean(extractDraft)}
        onCancel={() => setExtractDraft(null)}
        onOk={() => void saveChunk()}
        okText="Save to chunk library"
        okButtonProps={{
          icon: saveLoading ? <LoadingOutlined /> : <SaveOutlined />,
          loading: saveLoading,
          disabled: saveLoading,
        }}
        destroyOnHidden
      >
        {extractDraft ? (
          <Form layout="vertical">
            <Form.Item label="Chunk" required>
              <Input
                value={extractDraft.englishPhrase}
                onChange={(event) =>
                  setExtractDraft({
                    ...extractDraft,
                    englishPhrase: event.target.value,
                  })
                }
              />
            </Form.Item>
            <Form.Item label="Vietnamese meaning" required>
              <Input
                value={extractDraft.meaningVi}
                onChange={(event) =>
                  setExtractDraft({
                    ...extractDraft,
                    meaningVi: event.target.value,
                  })
                }
              />
            </Form.Item>
            <Form.Item label="Example sentence" required>
              <Input.TextArea
                value={extractDraft.example}
                autoSize={{ minRows: 2, maxRows: 5 }}
                onChange={(event) =>
                  setExtractDraft({
                    ...extractDraft,
                    example: event.target.value,
                  })
                }
              />
            </Form.Item>
            <Form.Item label="Usage / notes (optional)">
              <Input.TextArea
                value={extractDraft.usageContext}
                autoSize={{ minRows: 2, maxRows: 4 }}
                onChange={(event) =>
                  setExtractDraft({
                    ...extractDraft,
                    usageContext: event.target.value,
                  })
                }
              />
            </Form.Item>
            <Form.Item label="Suggested topic">
              <Input
                value={extractDraft.suggestedTopic}
                onChange={(event) =>
                  setExtractDraft({
                    ...extractDraft,
                    suggestedTopic: event.target.value,
                  })
                }
              />
            </Form.Item>
            <Form.Item label="Band estimate">
              <InputNumber
                value={extractDraft.bandEstimate}
                min={4}
                max={9}
                step={0.5}
                onChange={(value) =>
                  setExtractDraft({
                    ...extractDraft,
                    bandEstimate:
                      typeof value === "number" ? value : extractDraft.bandEstimate,
                  })
                }
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      {isAdmin ? (
        <TranslationScriptForm
          mode="EDIT"
          open={editOpen}
          initialScript={scriptRecord}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            setScriptRecord(saved);
            setSentences(saved.sentences);
          }}
        />
      ) : null}
    </Space>
  );
}
