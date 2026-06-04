"use client";

import {
  CheckCircleOutlined,
  LoadingOutlined,
  RightCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Grid,
  Input,
  Progress,
  Radio,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CONFIDENCE_LABELS,
  EXERCISE_LABELS,
} from "@/lib/constants";
import {
  buildPracticeSummary,
  evaluateExerciseAnswer,
} from "@/lib/practice";
import type {
  ConfidenceLevel,
  PracticeAnswerPayload,
  PracticeDeck,
  PracticeMode,
} from "@/lib/types";

type SubmissionSummary = ReturnType<typeof buildPracticeSummary>;

export function PracticeRunner({
  deck,
  mode,
  title,
  description,
}: {
  deck: PracticeDeck;
  mode: PracticeMode;
  title: string;
  description: string;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const router = useRouter();
  const { message } = App.useApp();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("MEDIUM");
  const [answers, setAnswers] = useState<PracticeAnswerPayload[]>([]);
  const [stepStartedAt, setStepStartedAt] = useState(() => Date.now());
  const [startedAt] = useState(() => new Date().toISOString());
  const [checked, setChecked] = useState<{
    isCorrect: boolean;
    responseMs: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);

  const exercise = deck.exercises[index];

  if (deck.exercises.length === 0) {
    return (
      <Card>
        <Empty
          description="No chunks are available for this mode yet."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary">
            <Link href="/chunks">Open chunk library</Link>
          </Button>
        </Empty>
      </Card>
    );
  }

  if (summary) {
    return (
      <Card>
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Session complete
          </Typography.Title>
          <div className="practice-summary-grid">
            <div className="practice-summary-stat">
              <Statistic title="Correct answers" value={summary.correctAnswers} />
            </div>
            <div className="practice-summary-stat">
              <Statistic title="Total questions" value={summary.totalQuestions} />
            </div>
            <div className="practice-summary-stat">
              <Statistic title="Accuracy" value={summary.accuracyRate} suffix="%" />
            </div>
            <div className="practice-summary-stat">
              <Statistic title="Avg response" value={summary.averageResponseMs} suffix="ms" />
            </div>
          </div>
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            size={12}
            style={{ width: "100%" }}
          >
            <Button
              type="primary"
              className="full-width-mobile"
              onClick={() => {
                router.refresh();
                setSummary(null);
                setAnswers([]);
                setIndex(0);
                setAnswer("");
                setChecked(null);
                setStepStartedAt(Date.now());
              }}
            >
              Start another round
            </Button>
            <Button className="full-width-mobile">
              <Link href="/progress">View progress</Link>
            </Button>
          </Space>
        </Space>
      </Card>
    );
  }

  const submitCurrentAnswer = async () => {
    if (!checked) {
      const isCorrect = evaluateExerciseAnswer(exercise, answer);
      setChecked({
        isCorrect,
        responseMs: Date.now() - stepStartedAt,
      });
      return;
    }

    const currentAnswer: PracticeAnswerPayload = {
      chunkId: exercise.chunkId,
      exerciseType: exercise.type,
      prompt: exercise.prompt,
      expectedAnswer: exercise.expectedAnswer,
      userAnswer: answer,
      isCorrect: checked.isCorrect,
      responseMs: checked.responseMs,
      confidence,
      feedback: checked.isCorrect
        ? "Correct retrieval."
        : `Expected answer: ${exercise.expectedAnswer}`,
    };
    const nextAnswers = [...answers, currentAnswer];

    if (index < deck.exercises.length - 1) {
      setAnswers(nextAnswers);
      setIndex(index + 1);
      setAnswer("");
      setChecked(null);
      setConfidence("MEDIUM");
      setStepStartedAt(Date.now());
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/practice/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        startedAt,
        answers: nextAnswers,
      }),
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      message.error(data.message ?? "Could not save this session.");
      return;
    }

    setSummary(data.summary as SubmissionSummary);
    router.refresh();
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          {description}
        </Typography.Text>
      </div>

      <Card className="practice-runner__card">
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Progress
            percent={Math.round(((index + (checked ? 1 : 0)) / deck.exercises.length) * 100)}
            strokeColor="#0f766e"
          />

          <Space wrap>
            <Tag color="cyan">{EXERCISE_LABELS[exercise.type]}</Tag>
            {exercise.topic ? <Tag color="blue">{exercise.topic}</Tag> : null}
            <Tag color="purple" className="practice-runner__chunk">
              {exercise.chunk}
            </Tag>
          </Space>

          <Typography.Title level={4} style={{ margin: 0 }} className="practice-runner__prompt">
            {exercise.prompt}
          </Typography.Title>

          {exercise.type === "MULTIPLE_CHOICE" ? (
            <Radio.Group
              className="practice-runner__options"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            >
              <Space direction="vertical">
                {exercise.options?.map((option) => (
                  <Radio key={option} value={option} className="wrap-anywhere">
                    {option}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          ) : (
            <Input.TextArea
              className="practice-runner__answer"
              autoSize={{
                minRows: exercise.type === "CREATE_SENTENCE" ? (isMobile ? 6 : 5) : isMobile ? 4 : 3,
                maxRows: exercise.type === "CREATE_SENTENCE" ? 12 : 8,
              }}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer"
            />
          )}

          {exercise.hint ? (
            <Alert
              type="info"
              showIcon
              message="Hint"
              description={<span className="practice-runner__copy">{exercise.hint}</span>}
            />
          ) : null}

          {checked ? (
            <Alert
              type={checked.isCorrect ? "success" : "warning"}
              showIcon
              message={checked.isCorrect ? "Correct" : "Needs review"}
              description={
                <span className="practice-runner__feedback">
                  Model chunk: {exercise.expectedAnswer}
                </span>
              }
            />
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
              disabled={!answer.trim()}
              loading={submitting}
              className="full-width-mobile"
            >
              {checked
                ? index === deck.exercises.length - 1
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
