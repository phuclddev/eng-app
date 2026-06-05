"use client";

import {
  LoadingOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import { getAiTutorStarterPrompt } from "@/lib/ai-tutor";
import { AI_TUTOR_PURPOSE_LABELS } from "@/lib/constants";
import type { AiTutorPurpose } from "@/lib/types";

type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function AiTutorChat({
  enabled,
}: {
  enabled: boolean;
}) {
  const [purpose, setPurpose] = useState<AiTutorPurpose>("GENERAL_CHAT");
  const [conversationId, setConversationId] = useState<string>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const placeholder = getAiTutorStarterPrompt(purpose);

  const resetConversation = (nextPurpose?: AiTutorPurpose) => {
    setConversationId(undefined);
    setMessages([]);
    setMessage("");
    setError(undefined);

    if (nextPurpose) {
      setPurpose(nextPurpose);
    }
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!enabled || loading || trimmedMessage.length === 0) {
      return;
    }

    const userMessage: TutorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedMessage,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setMessage("");
    setError(undefined);
    setLoading(true);

    try {
      const response = await fetch("/api/ai-tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationId,
          purpose,
        }),
      });
      const body = (await response.json()) as {
        answer?: string;
        conversationId?: string;
        message?: string;
      };

      if (!response.ok || !body.answer || !body.conversationId) {
        throw new Error(body.message ?? "AI Tutor could not answer right now.");
      }

      const safeAnswer = body.answer;
      const safeConversationId = body.conversationId;

      setConversationId(safeConversationId);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: safeAnswer,
        },
      ]);
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "AI Tutor could not answer right now.";
      setError(nextError);
      setMessages((currentMessages) => currentMessages.filter((item) => item.id !== userMessage.id));
      setMessage(trimmedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          AI Tutor
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Ask for concise IELTS Speaking coaching, chunk explanations, or sentence correction.
        </Typography.Text>
      </div>

      {!enabled ? (
        <Alert
          type="warning"
          showIcon
          message="AI Tutor is not configured"
          description="Set AI_CHATFLOW_URL and AI_CHATFLOW_TOKEN on the server before using this feature."
        />
      ) : null}

      <Card className="ai-tutor-chat">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div className="responsive-toolbar">
            <Select<AiTutorPurpose>
              value={purpose}
              onChange={(value) => resetConversation(value)}
              style={{ minWidth: 220 }}
              options={[
                {
                  label: AI_TUTOR_PURPOSE_LABELS.GENERAL_CHAT,
                  value: "GENERAL_CHAT",
                },
                {
                  label: AI_TUTOR_PURPOSE_LABELS.SENTENCE_CORRECTION,
                  value: "SENTENCE_CORRECTION",
                },
                {
                  label: AI_TUTOR_PURPOSE_LABELS.SPEAKING_COACH,
                  value: "SPEAKING_COACH",
                },
                {
                  label: AI_TUTOR_PURPOSE_LABELS.CHUNK_EXPLANATION,
                  value: "CHUNK_EXPLANATION",
                },
              ]}
            />
            <Button
              icon={<PlusOutlined />}
              onClick={() => resetConversation()}
              className="full-width-mobile"
              disabled={loading}
            >
              New conversation
            </Button>
          </div>

          {messages.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Start a conversation to get guided IELTS Speaking support."
            />
          ) : (
            <List
              className="ai-tutor-chat__messages"
              dataSource={messages}
              renderItem={(item) => (
                <List.Item className="ai-tutor-chat__item">
                  <Card
                    size="small"
                    className={[
                      "ai-tutor-chat__bubble",
                      item.role === "assistant"
                        ? "ai-tutor-chat__bubble-assistant"
                        : "ai-tutor-chat__bubble-user",
                    ].join(" ")}
                  >
                    <Space size={8} style={{ marginBottom: 8 }}>
                      {item.role === "assistant" ? <RobotOutlined /> : <UserOutlined />}
                      <Typography.Text strong>
                        {item.role === "assistant" ? "AI Tutor" : "You"}
                      </Typography.Text>
                    </Space>
                    {item.role === "assistant" ? (
                      <AiMarkdownMessage content={item.text} />
                    ) : (
                      <Typography.Paragraph
                        className="wrap-anywhere"
                        style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
                      >
                        {item.text}
                      </Typography.Paragraph>
                    )}
                  </Card>
                </List.Item>
              )}
            />
          )}

          {error ? (
            <Alert type="error" showIcon message="Could not reach AI Tutor" description={error} />
          ) : null}

          <Tag color="cyan" className="wrap-anywhere">
            {AI_TUTOR_PURPOSE_LABELS[purpose]}
          </Tag>

          <Input.TextArea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={placeholder}
            autoSize={{ minRows: 4, maxRows: 10 }}
            disabled={!enabled || loading}
          />

          <div className="mobile-actions">
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined /> : <SendOutlined />}
              onClick={() => void handleSend()}
              disabled={!enabled || message.trim().length === 0}
              loading={loading}
              className="full-width-mobile"
            >
              Send to AI Tutor
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}
