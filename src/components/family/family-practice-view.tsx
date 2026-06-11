"use client";

import {
  CheckCircleOutlined,
  LoadingOutlined,
  RightCircleOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Grid,
  Input,
  Progress,
  Radio,
  Row,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import {
  CONFIDENCE_LABELS,
  FAMILY_CHUNK_CHILD_FOCUS_LABELS,
  FAMILY_PRACTICE_EXERCISE_LABELS,
  FAMILY_PRACTICE_MODE_LABELS,
  FAMILY_SPEAKER_ROLE_LABELS,
} from "@/lib/constants";
import {
  buildFamilyPracticeSummary,
  evaluateFamilyExerciseAnswer,
} from "@/lib/family-practice";
import type {
  ConfidenceLevel,
  FamilyDashboardSnapshot,
  FamilyPracticeAnswerPayload,
  FamilyPracticeDeck,
  FamilyPracticeMode,
  FamilyScenarioRecord,
} from "@/lib/types";

type SubmissionSummary = ReturnType<typeof buildFamilyPracticeSummary>;

type DeckState = {
  mode: FamilyPracticeMode;
  deck: FamilyPracticeDeck;
  loading: boolean;
  error?: string;
};

export function FamilyPracticeView({
  initialDeck,
  dashboard,
  recommendedScenario,
  aiFeedbackEnabled,
}: {
  initialDeck: FamilyPracticeDeck;
  dashboard: FamilyDashboardSnapshot;
  recommendedScenario: FamilyScenarioRecord | null;
  aiFeedbackEnabled: boolean;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const router = useRouter();
  const { message } = App.useApp();

  const [deckState, setDeckState] = useState<DeckState>({
    mode: initialDeck.mode,
    deck: initialDeck,
    loading: false,
  });
  const [stage, setStage] = useState<"OVERVIEW" | "RUNNER" | "SUMMARY">(
    "OVERVIEW",
  );
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("MEDIUM");
  const [answers, setAnswers] = useState<FamilyPracticeAnswerPayload[]>([]);
  const [stepStartedAt, setStepStartedAt] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [checked, setChecked] = useState<{
    isCorrect: boolean;
    responseTimeMs: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{
    loading: boolean;
    answer?: string;
    error?: string;
  }>({ loading: false });

  const exercises = deckState.deck.exercises;
  const exercise = exercises[index];

  const headerStats = useMemo(
    () => [
      {
        title: "Approved chunks",
        value: dashboard.totalApprovedChunks,
      },
      {
        title: "Due reviews",
        value: dashboard.dueReviews,
      },
      {
        title: "Weekly accuracy",
        value: dashboard.weeklyAccuracy,
        suffix: "%",
      },
      {
        title: "Streak",
        value: dashboard.familyStreakDays,
        suffix: " days",
      },
    ],
    [dashboard],
  );

  const loadDeck = async (mode: FamilyPracticeMode) => {
    setDeckState((current) => ({
      ...current,
      mode,
      loading: true,
      error: undefined,
    }));

    try {
      const response = await fetch("/api/family/practice/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });
      const data = (await response.json()) as {
        deck?: FamilyPracticeDeck;
        message?: string;
      };

      if (!response.ok || !data.deck) {
        throw new Error(data.message ?? "Could not load family practice.");
      }

      setDeckState({
        mode,
        deck: data.deck,
        loading: false,
      });
    } catch (error) {
      setDeckState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load family practice.",
      }));
    }
  };

  const beginSession = () => {
    if (exercises.length === 0) {
      message.info("Approve some family chunks before practicing.");
      return;
    }

    setStage("RUNNER");
    setIndex(0);
    setAnswer("");
    setChecked(null);
    setAnswers([]);
    setSummary(null);
    setStartedAt(new Date().toISOString());
    setStepStartedAt(Date.now());
    setConfidence("MEDIUM");
    setAiFeedback({ loading: false });
  };

  const restart = async () => {
    setStage("OVERVIEW");
    setSummary(null);
    setAnswers([]);
    setIndex(0);
    setAnswer("");
    setChecked(null);
    setAiFeedback({ loading: false });
    await loadDeck(deckState.mode);
    router.refresh();
  };

  const submitSession = async (nextAnswers: FamilyPracticeAnswerPayload[]) => {
    setSubmitting(true);

    const response = await fetch("/api/family/practice/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: deckState.mode,
        startedAt,
        answers: nextAnswers,
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      summary?: SubmissionSummary;
      message?: string;
    };

    setSubmitting(false);

    if (!response.ok || !data.summary) {
      message.error(data.message ?? "Could not save the family practice session.");
      return;
    }

    setSummary(data.summary);
    setStage("SUMMARY");
    router.refresh();
  };

  const submitCurrentAnswer = async () => {
    if (!exercise) {
      return;
    }

    if (!checked) {
      const isCorrect = evaluateFamilyExerciseAnswer(exercise, answer);
      setChecked({
        isCorrect,
        responseTimeMs: Date.now() - stepStartedAt,
      });
      return;
    }

    const currentAnswer: FamilyPracticeAnswerPayload = {
      familyChunkId: exercise.familyChunkId,
      exerciseType: exercise.type,
      prompt: exercise.prompt,
      expectedAnswer: exercise.expectedAnswer,
      userAnswer: answer,
      isCorrect: checked.isCorrect,
      responseTimeMs: checked.responseTimeMs,
      confidenceLevel: confidence,
      feedback: checked.isCorrect
        ? "Natural family answer."
        : `Model chunk: ${exercise.expectedAnswer}`,
    };
    const nextAnswers = [...answers, currentAnswer];

    if (index < exercises.length - 1) {
      setAnswers(nextAnswers);
      setIndex(index + 1);
      setAnswer("");
      setChecked(null);
      setAiFeedback({ loading: false });
      setConfidence("MEDIUM");
      setStepStartedAt(Date.now());
      return;
    }

    await submitSession(nextAnswers);
  };

  const askFamilyAi = async () => {
    if (
      !aiFeedbackEnabled ||
      !exercise ||
      exercise.type !== "CONTINUE_CONVERSATION" ||
      !answer.trim()
    ) {
      return;
    }

    setAiFeedback({ loading: true });

    try {
      const response = await fetch("/api/family/practice/ai-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familyChunkId: exercise.familyChunkId,
          prompt: exercise.prompt,
          userAnswer: answer,
        }),
      });
      const data = (await response.json()) as {
        answer?: string;
        message?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.message ?? "Family AI feedback is not available.");
      }

      setAiFeedback({
        loading: false,
        answer: data.answer,
      });
    } catch (error) {
      setAiFeedback({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Family AI feedback is not available.",
      });
    }
  };

  if (stage === "SUMMARY" && summary) {
    return (
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Family practice complete
            </Typography.Title>
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Statistic title="Correct" value={summary.correctAnswers} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="Total" value={summary.totalQuestions} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="Accuracy"
                  value={summary.accuracyRate}
                  suffix="%"
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="Avg response"
                  value={summary.averageResponseMs}
                  suffix="ms"
                />
              </Col>
            </Row>
            <Space
              direction={isMobile ? "vertical" : "horizontal"}
              size={12}
              style={{ width: "100%" }}
            >
              <Button
                type="primary"
                className="full-width-mobile"
                onClick={() => void restart()}
              >
                Practice again
              </Button>
              <Button className="full-width-mobile">
                <Link href="/family/chunks">Open family chunks</Link>
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    );
  }

  if (stage === "RUNNER" && exercise) {
    const exerciseLabel = FAMILY_PRACTICE_EXERCISE_LABELS[exercise.type];
    const speakerLabel = FAMILY_SPEAKER_ROLE_LABELS[exercise.speakerRole];
    const childLabel = FAMILY_CHUNK_CHILD_FOCUS_LABELS[exercise.childFocus];
    const showOptions = exercise.type === "NATURAL_RESPONSE";
    const isLongInput = exercise.type === "CONTINUE_CONVERSATION";
    const canAskAi =
      aiFeedbackEnabled &&
      exercise.type === "CONTINUE_CONVERSATION" &&
      Boolean(checked) &&
      answer.trim().length > 0;

    return (
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Family Practice
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            {FAMILY_PRACTICE_MODE_LABELS[deckState.mode]} · isolated from IELTS practice metrics.
          </Typography.Text>
        </div>

        <Card>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Progress
              percent={Math.round(
                ((index + (checked ? 1 : 0)) / exercises.length) * 100,
              )}
              strokeColor="#0f766e"
            />
            <Space wrap>
              <Tag color="cyan">{exerciseLabel}</Tag>
              <Tag color="blue">{speakerLabel}</Tag>
              <Tag color="purple">{childLabel}</Tag>
              <Tag>{exercise.scenarioCategory}</Tag>
            </Space>

            <Typography.Title
              level={4}
              style={{ margin: 0 }}
              className="wrap-anywhere"
            >
              {exercise.prompt}
            </Typography.Title>

            {showOptions ? (
              <Radio.Group
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {exercise.options?.map((option) => (
                    <Radio key={option} value={option} className="wrap-anywhere">
                      {option}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            ) : (
              <Input.TextArea
                autoSize={{
                  minRows: isLongInput ? (isMobile ? 6 : 5) : isMobile ? 4 : 3,
                  maxRows: isLongInput ? 12 : 8,
                }}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={
                  isLongInput
                    ? "Continue the family conversation in 2-3 sentences"
                    : "Type your family answer"
                }
              />
            )}

            {exercise.hint ? (
              <Alert
                type="info"
                showIcon
                message="Hint"
                description={
                  <span className="wrap-anywhere">{exercise.hint}</span>
                }
              />
            ) : null}

            {checked ? (
              <Alert
                type={checked.isCorrect ? "success" : "warning"}
                showIcon
                message={
                  checked.isCorrect ? "Natural family answer" : "Try again later"
                }
                description={
                  <span className="wrap-anywhere">
                    Model chunk: {exercise.expectedAnswer}
                  </span>
                }
              />
            ) : null}

            {canAskAi ? (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Button
                  icon={
                    aiFeedback.loading ? <LoadingOutlined /> : <RobotOutlined />
                  }
                  onClick={() => void askFamilyAi()}
                  loading={aiFeedback.loading}
                  disabled={aiFeedback.loading}
                  className="full-width-mobile"
                >
                  {aiFeedback.answer ? "Ask AI again" : "Ask AI"}
                </Button>
                {aiFeedback.error ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Family AI feedback is unavailable"
                    description={aiFeedback.error}
                  />
                ) : null}
                {aiFeedback.answer ? (
                  <Card size="small" className="ai-inline-response">
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Typography.Text strong>Family coach feedback</Typography.Text>
                      <AiMarkdownMessage content={aiFeedback.answer} />
                    </Space>
                  </Card>
                ) : null}
              </Space>
            ) : null}

            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Typography.Text strong>Confidence after answering</Typography.Text>
              <Segmented
                block
                value={confidence}
                onChange={(value) => setConfidence(value as ConfidenceLevel)}
                options={[
                  { label: CONFIDENCE_LABELS.EASY, value: "EASY" },
                  { label: CONFIDENCE_LABELS.MEDIUM, value: "MEDIUM" },
                  { label: CONFIDENCE_LABELS.HARD, value: "HARD" },
                ]}
              />
            </Space>

            <div className="practice-runner__sticky">
              <Button
                type="primary"
                size="large"
                icon={
                  submitting ? (
                    <LoadingOutlined />
                  ) : checked ? (
                    <RightCircleOutlined />
                  ) : (
                    <CheckCircleOutlined />
                  )
                }
                onClick={() => void submitCurrentAnswer()}
                disabled={!answer.trim() || submitting}
                loading={submitting}
                className="full-width-mobile"
              >
                {checked
                  ? index === exercises.length - 1
                    ? "Finish session"
                    : "Next question"
                  : "Check answer"}
              </Button>
            </div>
          </Space>
        </Card>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Practice
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Practice approved family chunks with separate progress tracking. Family practice never
          changes IELTS chunk library, IELTS review schedules, or IELTS dashboard metrics.
        </Typography.Text>
      </div>

      <Card>
        <Row gutter={[16, 16]}>
          {headerStats.map((stat) => (
            <Col key={stat.title} xs={12} md={6}>
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="Choose today's practice">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Segmented
            block
            value={deckState.mode}
            onChange={(value) => void loadDeck(value as FamilyPracticeMode)}
            disabled={deckState.loading}
            options={[
              { label: FAMILY_PRACTICE_MODE_LABELS.DAILY, value: "DAILY" },
              { label: FAMILY_PRACTICE_MODE_LABELS.REVIEW, value: "REVIEW" },
              { label: FAMILY_PRACTICE_MODE_LABELS.MIXED, value: "MIXED" },
            ]}
          />

          {deckState.error ? (
            <Alert
              type="warning"
              showIcon
              message="Could not load family practice"
              description={deckState.error}
            />
          ) : null}

          {exercises.length === 0 ? (
            <Empty
              description={
                deckState.mode === "REVIEW"
                  ? "No family reviews are due right now. Try Daily practice or extract more chunks."
                  : "Approve family chunks before starting family practice."
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary">
                <Link href="/family/chunks">Open family chunks</Link>
              </Button>
            </Empty>
          ) : (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Text>
                {exercises.length} family chunks queued · {deckState.deck.totalDue} due across all
                approved chunks.
              </Typography.Text>
              <Button
                type="primary"
                size="large"
                onClick={beginSession}
                loading={deckState.loading}
                disabled={deckState.loading}
                className="full-width-mobile"
              >
                Start family practice
              </Button>
            </Space>
          )}
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Recommended scenario">
            {recommendedScenario ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>{recommendedScenario.title}</Typography.Text>
                <Space wrap>
                  <Tag color="blue">{recommendedScenario.category}</Tag>
                  <Tag color="purple">
                    {FAMILY_CHUNK_CHILD_FOCUS_LABELS[recommendedScenario.childFocus]}
                  </Tag>
                </Space>
                <Typography.Text type="secondary" className="wrap-anywhere">
                  {recommendedScenario.description}
                </Typography.Text>
                <Button>
                  <Link href="/family/scenarios">Open scenarios</Link>
                </Button>
              </Space>
            ) : (
              <Empty
                description="Create a family scenario first to unlock practice content."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button>
                  <Link href="/family/scenarios">Open scenarios</Link>
                </Button>
              </Empty>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Quick practice">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Typography.Text type="secondary" className="wrap-anywhere">
                Jump into a small focused session using the highest-priority approved chunks for
                today. Family streak: {dashboard.familyStreakDays} day
                {dashboard.familyStreakDays === 1 ? "" : "s"}.
              </Typography.Text>
              <Button
                type="primary"
                onClick={beginSession}
                disabled={exercises.length === 0 || deckState.loading}
                className="full-width-mobile"
              >
                Quick start
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
