"use client";

import {
  LoadingOutlined,
  ReadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import { SpeakingSampleAnswerPanel } from "@/components/ai/speaking-sample-answer-panel";
import {
  getDefaultSpeakingReviewRequest,
} from "@/lib/ai-tutor";
import { AiStructuredSections } from "@/components/ai/ai-structured-sections";
import { ChunkCoachTrigger } from "@/components/ai/chunk-coach-trigger";
import {
  IELTS_SKILL_LABELS,
  IELTS_TASK_TYPE_LABELS,
  QUESTION_CHUNK_USAGE_ROLE_LABELS,
  TRANSLATION_FROM_QUESTION_LENGTHS,
} from "@/lib/constants";
import { normalizeAiTextForDisplay } from "@/lib/text-cleanup";
import type {
  AiTutorStructuredFeedbackSection,
  IeltsQuestionRecord,
  IeltsTaskType,
  TranslationFromQuestionLength,
  TranslationRecallFromQuestionResponse,
  TranslationRecallQuestionStat,
} from "@/lib/types";

const LENGTH_LABELS: Record<TranslationFromQuestionLength, string> = {
  SHORT: "Short",
  MEDIUM: "Medium",
  LONG: "Long",
};

export function QuestionBankView({
  aiTutorEnabled,
  questions,
  translationStats,
}: {
  aiTutorEnabled: boolean;
  questions: IeltsQuestionRecord[];
  translationStats: TranslationRecallQuestionStat[];
}) {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [search, setSearch] = useState("");
  const [taskType, setTaskType] = useState<IeltsTaskType | undefined>();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>(
    questions[0]?.id,
  );
  const [questionTutorStates, setQuestionTutorStates] = useState<
    Record<
      string,
      {
        answer?: string;
        conversationId?: string;
        error?: string;
        loading: boolean;
        structuredFeedback?: AiTutorStructuredFeedbackSection[];
      }
    >
  >({});
  const [questionDraftAnswers, setQuestionDraftAnswers] = useState<Record<string, string>>({});
  const [questionMissingChunkStates, setQuestionMissingChunkStates] = useState<
    Record<
      string,
      {
        answer?: string;
        error?: string;
        loading: boolean;
        sections?: AiTutorStructuredFeedbackSection[];
      }
    >
  >({});
  const [translationStatsByQuestion, setTranslationStatsByQuestion] = useState(
    () =>
      new Map(
        translationStats.map((stat) => [stat.questionId, stat]),
      ),
  );
  const [translationModalQuestionId, setTranslationModalQuestionId] = useState<
    string | null
  >(null);
  const [translationLength, setTranslationLength] =
    useState<TranslationFromQuestionLength>("MEDIUM");
  const [translationTargetBand, setTranslationTargetBand] = useState<number | null>(null);
  const [translationIncludeChunkLibrary, setTranslationIncludeChunkLibrary] =
    useState(true);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationResult, setTranslationResult] =
    useState<TranslationRecallFromQuestionResponse | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const translationModalQuestion = useMemo(
    () =>
      translationModalQuestionId
        ? questions.find((question) => question.id === translationModalQuestionId) ??
          null
        : null,
    [questions, translationModalQuestionId],
  );

  const runTranslationGeneration = async (input: {
    speakingQuestionId: string;
    regenerate: boolean;
  }) => {
    setTranslationLoading(true);
    setTranslationError(null);

    try {
      const response = await fetch("/api/translation-recall/from-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakingQuestionId: input.speakingQuestionId,
          targetBand: translationTargetBand ?? undefined,
          length: translationLength,
          includeChunkLibrary: translationIncludeChunkLibrary,
          regenerate: input.regenerate,
        }),
      });
      const data = (await response.json()) as
        | TranslationRecallFromQuestionResponse
        | { message?: string; error?: string };

      if (!response.ok || !("script" in data)) {
        const errorMessage =
          (data as { message?: string }).message ??
          "Could not create Translation Recall script.";
        throw new Error(errorMessage);
      }

      setTranslationResult(data);

      setTranslationStatsByQuestion((current) => {
        const next = new Map(current);
        const existing = next.get(input.speakingQuestionId) ?? {
          questionId: input.speakingQuestionId,
          scriptCount: 0,
          latestScriptId: null,
        };
        const scriptCount = data.duplicate
          ? Math.max(existing.scriptCount, 1)
          : existing.scriptCount + 1;
        next.set(input.speakingQuestionId, {
          questionId: input.speakingQuestionId,
          scriptCount,
          latestScriptId: data.script.id,
        });
        return next;
      });

      if (data.duplicate) {
        message.info("A Translation Recall script already exists for this question.");
      } else {
        message.success("Translation Recall script created.");
      }
    } catch (error) {
      setTranslationError(
        error instanceof Error
          ? error.message
          : "Could not create Translation Recall script.",
      );
    } finally {
      setTranslationLoading(false);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesTask = taskType ? question.taskType === taskType : true;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [question.prompt, question.topic, question.subTopic ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesTask && matchesSearch;
  });

  const selectedQuestion =
    filteredQuestions.find((question) => question.id === selectedQuestionId) ??
    filteredQuestions[0];
  const activeQuestionId = selectedQuestion?.id;
  const currentTutorState = activeQuestionId
    ? questionTutorStates[activeQuestionId]
    : undefined;
  const currentMissingChunksState = activeQuestionId
    ? questionMissingChunkStates[activeQuestionId]
    : undefined;
  const currentDraftAnswer = activeQuestionId
    ? questionDraftAnswers[activeQuestionId] ?? ""
    : "";

  const askTutor = async (question: IeltsQuestionRecord) => {
    const draftAnswer = questionDraftAnswers[question.id]?.trim() ?? "";

    if (!aiTutorEnabled || draftAnswer.length === 0) {
      return;
    }

    setQuestionTutorStates((currentStates) => ({
      ...currentStates,
      [question.id]: {
        ...currentStates[question.id],
        error: undefined,
        loading: true,
      },
    }));

    try {
      const response = await fetch("/api/ai-tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: getDefaultSpeakingReviewRequest(),
          conversationId: questionTutorStates[question.id]?.conversationId,
          purpose: "SPEAKING_COACH",
          context: {
            kind: "SPEAKING_ANSWER_REVIEW",
            speakingPart: question.taskType,
            topic: question.topic,
            subTopic: question.subTopic,
            prompt: question.prompt,
            recommendedChunks: question.recommendations.map((recommendation) => ({
              chunk: recommendation.chunk.chunk,
              meaningVi: recommendation.chunk.meaningVi,
              usageRole: recommendation.usageRole,
              exampleSentence: recommendation.exampleSentence,
            })),
            userAnswer: draftAnswer,
          },
        }),
      });
      const data = (await response.json()) as {
        answer?: string;
        conversationId?: string;
        message?: string;
        structuredFeedback?: AiTutorStructuredFeedbackSection[];
      };

      if (!response.ok || !data.answer || !data.conversationId) {
        throw new Error(data.message ?? "AI Tutor could not coach this prompt.");
      }

      const safeAnswer = data.answer;
      const safeConversationId = data.conversationId;

      setQuestionTutorStates((currentStates) => ({
        ...currentStates,
        [question.id]: {
          answer: safeAnswer,
          conversationId: safeConversationId,
          error: undefined,
          loading: false,
          structuredFeedback: data.structuredFeedback,
        },
      }));
    } catch (error) {
      setQuestionTutorStates((currentStates) => ({
        ...currentStates,
        [question.id]: {
          ...currentStates[question.id],
          error:
            error instanceof Error
              ? error.message
              : "AI Tutor could not coach this prompt.",
          loading: false,
        },
      }));
    }
  };

  const askMissingChunks = async (question: IeltsQuestionRecord) => {
    const draftAnswer = questionDraftAnswers[question.id]?.trim() ?? "";

    if (!aiTutorEnabled || draftAnswer.length === 0) {
      return;
    }

    setQuestionMissingChunkStates((currentStates) => ({
      ...currentStates,
      [question.id]: {
        ...currentStates[question.id],
        error: undefined,
        loading: true,
      },
    }));

    try {
      const response = await fetch("/api/ai-tutor/missing-chunks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: question.prompt,
          recommendedChunks: question.recommendations.map((recommendation) => ({
            chunk: recommendation.chunk.chunk,
            meaningVi: recommendation.chunk.meaningVi,
            usageRole: recommendation.usageRole,
            exampleSentence: recommendation.exampleSentence,
          })),
          userAnswer: draftAnswer,
          topic: question.topic,
          part: question.taskType,
        }),
      });
      const data = (await response.json()) as {
        answer?: string;
        message?: string;
        sections?: AiTutorStructuredFeedbackSection[];
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.message ?? "AI could not suggest missing chunks.");
      }

      setQuestionMissingChunkStates((currentStates) => ({
        ...currentStates,
        [question.id]: {
          answer: data.answer,
          error: undefined,
          loading: false,
          sections: data.sections,
        },
      }));
    } catch (error) {
      setQuestionMissingChunkStates((currentStates) => ({
        ...currentStates,
        [question.id]: {
          ...currentStates[question.id],
          error:
            error instanceof Error
              ? error.message
              : "AI could not suggest missing chunks.",
          loading: false,
        },
      }));
    }
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Question Bank
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Pick an IELTS speaking question and review the recommended chunks before answering.
        </Typography.Text>
      </div>

      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div className="responsive-toolbar">
          <Input.Search
            className="responsive-toolbar__grow"
            allowClear
            placeholder="Search question, topic, or sub-topic"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select<IeltsTaskType>
            className={isMobile ? "full-width-mobile" : undefined}
            allowClear
            placeholder="Filter by speaking part"
            value={taskType}
            onChange={(value) => setTaskType(value)}
            style={isMobile ? undefined : { width: 220 }}
            options={[
              { label: IELTS_TASK_TYPE_LABELS.PART_1, value: "PART_1" },
              { label: IELTS_TASK_TYPE_LABELS.PART_2, value: "PART_2" },
              { label: IELTS_TASK_TYPE_LABELS.PART_3, value: "PART_3" },
            ]}
          />
        </div>

        <div className="question-bank-layout">
          <Card title="Questions">
            {filteredQuestions.length === 0 ? (
              <Empty
                description="No questions match your current filters."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={filteredQuestions}
                renderItem={(question) => (
                  <List.Item
                    onClick={() => setSelectedQuestionId(question.id)}
                    className={[
                      "question-list-item",
                      question.id === activeQuestionId ? "question-list-item-active" : "",
                    ].join(" ").trim()}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color="blue">
                            {IELTS_TASK_TYPE_LABELS[question.taskType]}
                          </Tag>
                          <Tag>{question.topic}</Tag>
                          {question.subTopic ? <Tag>{question.subTopic}</Tag> : null}
                          {(() => {
                            const count =
                              translationStatsByQuestion.get(question.id)
                                ?.scriptCount ?? 0;
                            return count > 0 ? (
                              <Tag color="green" icon={<ReadOutlined />}>
                                {count} translation script{count === 1 ? "" : "s"}
                              </Tag>
                            ) : null;
                          })()}
                        </Space>
                      }
                      description={
                        <Typography.Text className="wrap-anywhere">
                          {question.prompt}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title="Recommended chunks">
            {!selectedQuestion ? (
              <Empty
                description="Select a question to inspect its recommended chunks."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="geekblue">
                    {IELTS_SKILL_LABELS[selectedQuestion.skill]}
                  </Tag>
                  <Tag color="cyan">
                    {IELTS_TASK_TYPE_LABELS[selectedQuestion.taskType]}
                  </Tag>
                  <Tag>Difficulty {selectedQuestion.difficulty}</Tag>
                  <Tag color="purple">Band {selectedQuestion.targetBand.toFixed(1)}</Tag>
                  <Tag>{selectedQuestion.topic}</Tag>
                  {selectedQuestion.subTopic ? <Tag>{selectedQuestion.subTopic}</Tag> : null}
                </Space>

                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedQuestion.prompt}
                </Typography.Title>

                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Typography.Text strong>Your speaking answer</Typography.Text>
                  <Input.TextArea
                    value={currentDraftAnswer}
                    onChange={(event) =>
                      setQuestionDraftAnswers((currentAnswers) => ({
                        ...currentAnswers,
                        [selectedQuestion.id]: event.target.value,
                      }))
                    }
                    placeholder="Speak naturally, then type your answer here for AI feedback."
                    autoSize={{ minRows: 5, maxRows: 10 }}
                  />
                </Space>

                <div className="mobile-actions">
                  <Button
                    icon={
                      currentTutorState?.loading ? <LoadingOutlined /> : <RobotOutlined />
                    }
                    onClick={() => void askTutor(selectedQuestion)}
                    disabled={
                      !aiTutorEnabled ||
                      currentTutorState?.loading ||
                      currentDraftAnswer.trim().length === 0
                    }
                    loading={currentTutorState?.loading}
                    className="full-width-mobile"
                  >
                    {currentTutorState?.answer ? "Ask Tutor again" : "Ask Tutor for feedback"}
                  </Button>
                  <Button
                    icon={
                      currentMissingChunksState?.loading ? (
                        <LoadingOutlined />
                      ) : (
                        <RobotOutlined />
                      )
                    }
                    onClick={() => void askMissingChunks(selectedQuestion)}
                    disabled={
                      !aiTutorEnabled ||
                      currentMissingChunksState?.loading ||
                      currentDraftAnswer.trim().length === 0
                    }
                    loading={currentMissingChunksState?.loading}
                    className="full-width-mobile"
                  >
                    {currentMissingChunksState?.answer
                      ? "Suggest missing chunks again"
                      : "Suggest missing chunks"}
                  </Button>
                </div>

                {!aiTutorEnabled ? (
                  <Alert
                    type="info"
                    showIcon
                    message="AI Tutor is not configured on this environment."
                  />
                ) : null}

                {currentTutorState?.error ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="AI Tutor is unavailable"
                    description={currentTutorState.error}
                  />
                ) : null}

                {currentTutorState?.structuredFeedback?.length ? (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Typography.Text strong>AI Tutor speaking feedback</Typography.Text>
                    <AiStructuredSections sections={currentTutorState.structuredFeedback} />
                  </Space>
                ) : currentTutorState?.answer ? (
                  <Card size="small" className="ai-inline-response">
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Typography.Text strong>AI Tutor feedback</Typography.Text>
                      <AiMarkdownMessage content={currentTutorState.answer} />
                    </Space>
                  </Card>
                ) : null}

                {currentMissingChunksState?.error ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Missing chunk recommendation is unavailable"
                    description={currentMissingChunksState.error}
                  />
                ) : null}

                {currentMissingChunksState?.sections?.length ? (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Typography.Text strong>Missing chunk recommendation</Typography.Text>
                    <AiStructuredSections sections={currentMissingChunksState.sections} />
                  </Space>
                ) : currentMissingChunksState?.answer ? (
                  <Card size="small" className="ai-inline-response">
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Typography.Text strong>Missing chunk recommendation</Typography.Text>
                      <AiMarkdownMessage content={currentMissingChunksState.answer} />
                    </Space>
                  </Card>
                ) : null}

                <SpeakingSampleAnswerPanel
                  aiTutorEnabled={aiTutorEnabled}
                  question={selectedQuestion}
                />

                <Card
                  size="small"
                  title="Translation Recall Lab"
                  extra={
                    translationStatsByQuestion.get(selectedQuestion.id)
                      ?.scriptCount ? (
                      <Tag color="green">
                        {
                          translationStatsByQuestion.get(selectedQuestion.id)
                            ?.scriptCount
                        }{" "}
                        existing
                      </Tag>
                    ) : null
                  }
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Typography.Text type="secondary" className="wrap-anywhere">
                      Auto-generate an English sample answer + aligned Vietnamese translation and
                      save it into Translation Recall Lab.
                    </Typography.Text>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        disabled={!aiTutorEnabled}
                        onClick={() => {
                          setTranslationModalQuestionId(selectedQuestion.id);
                          setTranslationLength("MEDIUM");
                          setTranslationTargetBand(selectedQuestion.targetBand);
                          setTranslationIncludeChunkLibrary(true);
                          setTranslationResult(null);
                          setTranslationError(null);
                        }}
                      >
                        Create Translation Recall Script
                      </Button>
                      {translationStatsByQuestion.get(selectedQuestion.id)
                        ?.latestScriptId ? (
                        <Button>
                          <Link
                            href={`/translation/${translationStatsByQuestion.get(selectedQuestion.id)?.latestScriptId ?? ""}`}
                          >
                            Open latest script
                          </Link>
                        </Button>
                      ) : null}
                    </Space>
                    {!aiTutorEnabled ? (
                      <Tag color="warning">AI not configured</Tag>
                    ) : null}
                  </Space>
                </Card>

                {selectedQuestion.supportingPoints.length > 0 ? (
                  <div>
                    <Typography.Text strong>Prompt support</Typography.Text>
                    <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                      {selectedQuestion.supportingPoints.map((point) => (
                        <li key={point}>
                          <Typography.Text>{point}</Typography.Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedQuestion.recommendations.length === 0 ? (
                  <Empty
                    description="No recommended chunks have been mapped to this question yet."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    dataSource={selectedQuestion.recommendations}
                    renderItem={(recommendation) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space wrap>
                              <Typography.Text strong>
                                {recommendation.chunk.chunk}
                              </Typography.Text>
                              <Tag color="gold">
                                {QUESTION_CHUNK_USAGE_ROLE_LABELS[recommendation.usageRole]}
                              </Tag>
                              {recommendation.chunk.topic ? (
                                <Tag>{recommendation.chunk.topic}</Tag>
                              ) : null}
                              <ChunkCoachTrigger
                                chunkId={recommendation.chunk.id}
                                chunkLabel={recommendation.chunk.chunk}
                                disabled={!aiTutorEnabled}
                                size="small"
                              />
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={6}>
                          <Typography.Text type="secondary">
                                {recommendation.chunk.meaningVi}
                              </Typography.Text>
                              <Typography.Text className="wrap-anywhere">
                                Example chunk usage: {recommendation.chunk.example}
                              </Typography.Text>
                              {recommendation.exampleSentence ? (
                                <Typography.Text className="wrap-anywhere">
                                  Suggested response sentence: {recommendation.exampleSentence}
                                </Typography.Text>
                              ) : null}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            )}
          </Card>
        </div>
      </Space>

      <Modal
        open={Boolean(translationModalQuestionId)}
        title="Create Translation Recall Script"
        onCancel={() => {
          setTranslationModalQuestionId(null);
          setTranslationResult(null);
          setTranslationError(null);
        }}
        footer={null}
        destroyOnHidden
        width={isMobile ? "100%" : 720}
      >
        {translationModalQuestion ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="blue">
                {IELTS_TASK_TYPE_LABELS[translationModalQuestion.taskType]}
              </Tag>
              <Tag>{translationModalQuestion.topic}</Tag>
              <Tag color="purple">
                Band {(translationTargetBand ?? translationModalQuestion.targetBand).toFixed(1)}
              </Tag>
            </Space>
            <Typography.Text className="wrap-anywhere">
              {translationModalQuestion.prompt}
            </Typography.Text>

            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space wrap>
                <Typography.Text strong>Length</Typography.Text>
                <Select<TranslationFromQuestionLength>
                  value={translationLength}
                  onChange={(value) => setTranslationLength(value)}
                  options={TRANSLATION_FROM_QUESTION_LENGTHS.map((value) => ({
                    value,
                    label: LENGTH_LABELS[value],
                  }))}
                  style={{ width: 140 }}
                  disabled={translationLoading}
                />
                <Typography.Text strong>Target band</Typography.Text>
                <InputNumber
                  value={
                    translationTargetBand ?? translationModalQuestion.targetBand
                  }
                  min={4}
                  max={9}
                  step={0.5}
                  disabled={translationLoading}
                  onChange={(value) =>
                    setTranslationTargetBand(
                      typeof value === "number" ? value : null,
                    )
                  }
                />
              </Space>
              <Space>
                <Button
                  size="small"
                  type={translationIncludeChunkLibrary ? "primary" : "default"}
                  onClick={() => setTranslationIncludeChunkLibrary(true)}
                  disabled={translationLoading}
                >
                  Use chunk library
                </Button>
                <Button
                  size="small"
                  type={!translationIncludeChunkLibrary ? "primary" : "default"}
                  onClick={() => setTranslationIncludeChunkLibrary(false)}
                  disabled={translationLoading}
                >
                  Recommended chunks only
                </Button>
              </Space>
            </Space>

            <Space wrap>
              <Button
                type="primary"
                icon={
                  translationLoading ? <LoadingOutlined /> : <ThunderboltOutlined />
                }
                loading={translationLoading}
                disabled={translationLoading || !aiTutorEnabled}
                onClick={() =>
                  void runTranslationGeneration({
                    speakingQuestionId: translationModalQuestion.id,
                    regenerate: false,
                  })
                }
              >
                {translationResult?.duplicate
                  ? "Reuse existing script"
                  : "Generate script"}
              </Button>
              {translationResult ? (
                <Button
                  icon={
                    translationLoading ? <LoadingOutlined /> : <ThunderboltOutlined />
                  }
                  loading={translationLoading}
                  disabled={translationLoading || !aiTutorEnabled}
                  onClick={() =>
                    void runTranslationGeneration({
                      speakingQuestionId: translationModalQuestion.id,
                      regenerate: true,
                    })
                  }
                >
                  Generate another version
                </Button>
              ) : null}
            </Space>

            {translationError ? (
              <Alert type="warning" showIcon message={translationError} />
            ) : null}

            {translationResult ? (
              <Card
                size="small"
                title={normalizeAiTextForDisplay(translationResult.script.title)}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space wrap>
                    <Tag color="cyan">
                      Band {translationResult.script.bandLevel.toFixed(1)}
                    </Tag>
                    <Tag>v{translationResult.script.version}</Tag>
                    <Tag>{translationResult.script.sentenceCount} sentences</Tag>
                    {translationResult.duplicate ? (
                      <Tag color="gold">Existing</Tag>
                    ) : (
                      <Tag color="green">Created</Tag>
                    )}
                    {translationResult.fallbackUsed ? (
                      <Tag color="orange">Fallback split</Tag>
                    ) : null}
                  </Space>
                  {translationResult.usedChunks.length > 0 ? (
                    <Space wrap>
                      <Typography.Text strong>Chunks used</Typography.Text>
                      {translationResult.usedChunks.map((chunk) => (
                        <Tag key={chunk.id} color="purple">
                          {chunk.chunk}
                        </Tag>
                      ))}
                    </Space>
                  ) : null}
                  {translationResult.warnings.length > 0 ? (
                    <Alert
                      type="info"
                      showIcon
                      message="Notes"
                      description={
                        <ul style={{ paddingLeft: 18, margin: 0 }}>
                          {translationResult.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      }
                    />
                  ) : null}
                  <Space wrap>
                    <Button type="primary" icon={<ReadOutlined />}>
                      <Link href={`/translation/${translationResult.script.id}`}>
                        Open in Translation Recall
                      </Link>
                    </Button>
                  </Space>
                </Space>
              </Card>
            ) : null}
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
