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
  Form,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import {
  FAMILY_CONVERSATION_LENGTH_LABELS,
  IELTS_TASK_TYPE_LABELS,
  QUESTION_CHUNK_USAGE_ROLE_LABELS,
  TRANSLATION_FROM_QUESTION_LENGTHS,
} from "@/lib/constants";
import type {
  GeneratedAnswerLength,
  IeltsQuestionRecord,
  SpeakingIdeaGeneratedAnswerResponse,
  SpeakingIdeaOption,
} from "@/lib/types";

export function SpeakingIdeaAnswerGeneratorPanel({
  idea,
  question,
}: {
  idea: SpeakingIdeaOption;
  question: IeltsQuestionRecord | {
    id: string;
    taskType: IeltsQuestionRecord["taskType"];
    topic: string;
    subTopic: string | null;
    prompt: string;
    targetBand: number;
  };
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [state, setState] = useState<{
    error?: string;
    loading: boolean;
    result?: SpeakingIdeaGeneratedAnswerResponse;
  }>({
    loading: false,
  });

  const generate = async () => {
    const values = await form.validateFields();

    setState((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }));

    try {
      const response = await fetch("/api/admin/ideas/generate-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: question.id,
          ideaId: idea.id,
          targetBand: values.targetBand,
          length: values.length,
        }),
      });
      const data = (await response.json()) as
        | (SpeakingIdeaGeneratedAnswerResponse & { message?: string })
        | { message?: string };

      if (!response.ok || !("answer" in data) || !data.answer) {
        throw new Error(data.message ?? "AI could not generate an answer from this idea.");
      }

      setState({
        loading: false,
        result: data,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "AI could not generate an answer from this idea.",
        loading: false,
      }));
    }
  };

  const copyAnswer = async () => {
    if (!state.result?.answer.answerMarkdown) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not available on this browser.");
      }

      await navigator.clipboard.writeText(state.result.answer.answerMarkdown);
      message.success("Generated answer copied.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not copy the answer.");
    }
  };

  return (
    <Card
      size="small"
      title="Answer From Reusable Idea"
      className="ai-inline-response"
      extra={
        <Space wrap>
          {state.result ? (
            <Button icon={<CopyOutlined />} onClick={() => void copyAnswer()}>
              Copy answer
            </Button>
          ) : null}
          <Button
            type="primary"
            icon={state.loading ? <LoadingOutlined /> : <RobotOutlined />}
            onClick={() => void generate()}
            loading={state.loading}
            className="full-width-mobile"
          >
            {state.result ? "Regenerate Answer" : "Generate Answer"}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Build a natural {IELTS_TASK_TYPE_LABELS[question.taskType]} answer that uses the idea{" "}
          <strong>{idea.title}</strong> without drifting into Writing style.
        </Typography.Text>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            targetBand: question.targetBand,
            length: "MEDIUM" satisfies GeneratedAnswerLength,
          }}
        >
          <div className="family-form-grid">
            <Form.Item
              name="targetBand"
              label="Target band"
              rules={[{ required: true }]}
            >
              <InputNumber min={4} max={9} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="length"
              label="Length"
              rules={[{ required: true }]}
            >
              <Select
                options={TRANSLATION_FROM_QUESTION_LENGTHS.map((value) => ({
                  label: FAMILY_CONVERSATION_LENGTH_LABELS[value],
                  value,
                }))}
              />
            </Form.Item>
          </div>
        </Form>

        {state.error ? (
          <Alert
            type="warning"
            showIcon
            message="AI answer generation is unavailable"
            description={state.error}
          />
        ) : null}

        {state.result ? (
          <>
            <Space wrap>
              <Tag color="purple">Band {state.result.answer.targetBand.toFixed(1)}</Tag>
              <Tag>{FAMILY_CONVERSATION_LENGTH_LABELS[state.result.answer.length]}</Tag>
              <Tag>{state.result.selectedChunkCount} candidate chunks</Tag>
              <Tag color="green">{state.result.usedChunks.length} detected in answer</Tag>
            </Space>

            <AiMarkdownMessage content={state.result.answer.answerMarkdown} />

            {state.result.usedChunks.length > 0 ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>Detected used chunks</Typography.Text>
                <Space wrap>
                  {state.result.usedChunks.map((chunk) => (
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
