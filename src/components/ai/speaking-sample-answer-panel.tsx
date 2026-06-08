"use client";

import {
  CopyOutlined,
  LoadingOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import {
  IELTS_TASK_TYPE_LABELS,
  QUESTION_CHUNK_USAGE_ROLE_LABELS,
} from "@/lib/constants";
import type { AiSampleAnswerResponse, IeltsQuestionRecord } from "@/lib/types";

export function SpeakingSampleAnswerPanel({
  aiTutorEnabled,
  question,
}: {
  aiTutorEnabled: boolean;
  question: IeltsQuestionRecord;
}) {
  const { message } = App.useApp();
  const [state, setState] = useState<{
    answer?: AiSampleAnswerResponse;
    error?: string;
    loading: boolean;
  }>({
    loading: false,
  });

  const generate = async () => {
    if (!aiTutorEnabled || state.loading) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: undefined,
      loading: true,
    }));

    try {
      const response = await fetch("/api/ai-tutor/sample-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          speakingPromptId: question.id,
          targetBand: question.targetBand,
        }),
      });
      const data = (await response.json()) as
        | (AiSampleAnswerResponse & { message?: string })
        | { message?: string };

      if (!response.ok || !("answer" in data) || !data.answer) {
        throw new Error(data.message ?? "AI could not generate a sample answer.");
      }

      setState({
        answer: data,
        error: undefined,
        loading: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error:
          error instanceof Error
            ? error.message
            : "AI could not generate a sample answer.",
        loading: false,
      }));
    }
  };

  const copyAnswer = async () => {
    if (!state.answer?.answer) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not available on this browser.");
      }

      await navigator.clipboard.writeText(state.answer.answer);
      message.success("Sample answer copied.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not copy the sample answer.",
      );
    }
  };

  return (
    <Card
      size="small"
      className="ai-inline-response"
      title="AI Sample Answer"
      extra={
        <Space wrap>
          {state.answer ? (
            <Button icon={<CopyOutlined />} onClick={() => void copyAnswer()}>
              Copy answer
            </Button>
          ) : null}
          <Button
            type="primary"
            icon={state.loading ? <LoadingOutlined /> : <RobotOutlined />}
            onClick={() => void generate()}
            loading={state.loading}
            disabled={!aiTutorEnabled}
            className="full-width-mobile"
          >
            {state.answer ? "Generate AI Sample Answer Again" : "Generate AI Sample Answer"}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Generate a natural {IELTS_TASK_TYPE_LABELS[question.taskType]} sample answer that reuses
          relevant chunks from the chunk library without forcing awkward phrasing.
        </Typography.Text>

        {!aiTutorEnabled ? (
          <Alert
            type="info"
            showIcon
            message="AI Tutor is not configured on this environment."
          />
        ) : null}

        {state.error ? (
          <Alert
            type="warning"
            showIcon
            message="AI sample answer is unavailable"
            description={state.error}
          />
        ) : null}

        {state.answer ? (
          <>
            <Space wrap>
              <Tag color="purple">Band {state.answer.targetBand.toFixed(1)}</Tag>
              <Tag>{state.answer.selectedChunkCount} candidate chunks</Tag>
              <Tag color="green">{state.answer.usedChunks.length} detected in answer</Tag>
            </Space>

            <AiMarkdownMessage content={state.answer.answer} />

            {state.answer.usedChunks.length > 0 ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>Detected used chunks</Typography.Text>
                <Space wrap>
                  {state.answer.usedChunks.map((chunk) => (
                    <Tag key={chunk.id} color="green" className="wrap-anywhere">
                      {chunk.chunk}
                      {chunk.usageRole
                        ? ` · ${QUESTION_CHUNK_USAGE_ROLE_LABELS[chunk.usageRole]}`
                        : ""}
                    </Tag>
                  ))}
                </Space>
              </Space>
            ) : null}
          </>
        ) : null}
      </Space>
    </Card>
  );
}
