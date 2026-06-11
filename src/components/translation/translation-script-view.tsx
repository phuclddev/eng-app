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

import { TranslationScriptForm } from "@/components/translation/translation-script-form";

import {
  TRANSLATION_RECALL_CONFIDENCES,
  TRANSLATION_RECALL_CONFIDENCE_LABELS,
} from "@/lib/constants";
import type {
  TranslationAiChunkExtractResponse,
  TranslationRecallConfidence,
  TranslationRecallUsedChunkRecord,
  TranslationScriptRecord,
  TranslationSentenceRecord,
} from "@/lib/types";

type Mode = "REVEAL" | "SPEAKING";

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

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {scriptRecord.title}
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
              ]}
            />
          </Space>
          <Typography.Text type="secondary" className="wrap-anywhere">
            {mode === "REVEAL"
              ? "Vietnamese is shown by default. Hover the English line on desktop, or tap it on mobile, to reveal. Highlight any English phrase to extract a chunk."
              : "Vietnamese is shown by default. Try saying the English aloud, then reveal it and rate yourself Easy / Medium / Hard."}
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
        return (
          <Card key={sentence.id} title={`Sentence ${sentence.orderIndex + 1}`}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Typography.Text strong>Vietnamese</Typography.Text>
                <Typography.Paragraph
                  style={{ margin: 0 }}
                  className="wrap-anywhere"
                >
                  {sentence.vietnameseText}
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
                      ? highlightChunks(sentence.englishText, usedChunks)
                      : sentence.englishText}
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
