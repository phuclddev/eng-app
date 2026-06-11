"use client";

import {
  CopyOutlined,
  DeleteOutlined,
  LoadingOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Grid,
  List,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import { FAMILY_CHILD_FOCUS_LABELS } from "@/lib/constants";
import type {
  FamilyChildFocus,
  FamilyChunkExtractionResponse,
  FamilyConversationGenerationResponse,
  FamilyConversationRecord,
  FamilyScenarioRecord,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { deleteFamilyConversationAction } from "@/server/actions/family";

function sortConversations(conversations: FamilyConversationRecord[]) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function FamilyConversationsView({
  aiTutorEnabled,
  conversations: initialConversations,
  scenarios,
}: {
  aiTutorEnabled: boolean;
  conversations: FamilyConversationRecord[];
  scenarios: FamilyScenarioRecord[];
}) {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [form] = Form.useForm();
  const [conversations, setConversations] = useState(() =>
    sortConversations(initialConversations),
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(
    initialConversations[0]?.id,
  );
  const [scenarioFilter, setScenarioFilter] = useState<string | undefined>();
  const [childFilter, setChildFilter] = useState<FamilyChildFocus | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [extractingConversationId, setExtractingConversationId] = useState<string | undefined>();
  const [extractionErrors, setExtractionErrors] = useState<Record<string, string | undefined>>({});
  const [extractionSummaries, setExtractionSummaries] = useState<
    Record<string, FamilyChunkExtractionResponse["summary"] | undefined>
  >({});

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const matchesScenario = scenarioFilter
          ? conversation.scenarioId === scenarioFilter
          : true;
        const matchesChild = childFilter ? conversation.childFocus === childFilter : true;

        return matchesScenario && matchesChild;
      }),
    [childFilter, conversations, scenarioFilter],
  );

  const selectedConversation =
    filteredConversations.find((conversation) => conversation.id === selectedConversationId) ??
    filteredConversations[0];

  const generate = async () => {
    const values = await form.validateFields();
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/family/conversations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as
        | (FamilyConversationGenerationResponse & { message?: string })
        | { message?: string };

      if (!response.ok || !("conversation" in data) || !data.conversation) {
        throw new Error(data.message ?? "Could not generate the family conversation.");
      }

      setConversations((current) => sortConversations([data.conversation, ...current]));
      setSelectedConversationId(data.conversation.id);
      message.success("Family conversation generated successfully.");
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not generate the family conversation.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyConversation = async (conversation: FamilyConversationRecord) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not available on this browser.");
      }

      await navigator.clipboard.writeText(conversation.conversationMarkdown);
      message.success("Conversation copied.");
    } catch (copyError) {
      message.error(
        copyError instanceof Error ? copyError.message : "Could not copy the conversation.",
      );
    }
  };

  const removeConversation = async (conversation: FamilyConversationRecord) => {
    const result = await deleteFamilyConversationAction({
      conversationId: conversation.id,
    });

    if (!result.ok) {
      message.error(result.message);
      return;
    }

    const nextConversations = conversations.filter((item) => item.id !== conversation.id);
    setConversations(nextConversations);
    setSelectedConversationId(nextConversations[0]?.id);
    message.success(result.message);
  };

  const extractChunks = async (conversation: FamilyConversationRecord) => {
    setExtractingConversationId(conversation.id);
    setExtractionErrors((current) => ({
      ...current,
      [conversation.id]: undefined,
    }));

    try {
      const response = await fetch("/api/family/chunks/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversation.id,
        }),
      });
      const data = (await response.json()) as
        | FamilyChunkExtractionResponse
        | { message?: string };

      if (!response.ok || !("summary" in data) || !data.summary) {
        throw new Error(
          ("message" in data ? data.message : undefined) ??
            "Could not extract family chunks.",
        );
      }

      setExtractionSummaries((current) => ({
        ...current,
        [conversation.id]: data.summary,
      }));
      message.success("Family chunks extracted successfully.");
    } catch (extractionError) {
      setExtractionErrors((current) => ({
        ...current,
        [conversation.id]:
          extractionError instanceof Error
            ? extractionError.message
            : "Could not extract family chunks.",
      }));
    } finally {
      setExtractingConversationId(undefined);
    }
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Conversations
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Generate private daily-life conversations from family scenarios and keep them separate
          from IELTS AI Tutor workflows.
        </Typography.Text>
      </div>

      <Card title="Generate conversation">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {!aiTutorEnabled ? (
            <Alert
              type="info"
              showIcon
              message="AI Tutor is not configured on this environment."
            />
          ) : null}

          {scenarios.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="No active scenarios are available."
              description="Create or reactivate a family scenario before generating a conversation."
            />
          ) : null}

          {error ? (
            <Alert
              type="warning"
              showIcon
              message="Family conversation is unavailable"
              description={error}
            />
          ) : null}

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              scenarioId: scenarios[0]?.id,
              childFocus: scenarios[0]?.childFocus ?? "BOTH",
              conversationLength: "MEDIUM",
              targetLevel: "NATURAL",
              vietnameseSupport: true,
            }}
          >
            <div className="family-form-grid">
              <Form.Item name="scenarioId" label="Scenario" rules={[{ required: true }]}>
                <Select
                  options={scenarios.map((scenario) => ({
                    label: `${scenario.title} · ${scenario.category}`,
                    value: scenario.id,
                  }))}
                />
              </Form.Item>
              <Form.Item name="childFocus" label="Child focus" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: "Kiwi", value: "KIWI" },
                    { label: "Vivi", value: "VIVI" },
                    { label: "Both", value: "BOTH" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="conversationLength"
                label="Conversation length"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: "Short", value: "SHORT" },
                    { label: "Medium", value: "MEDIUM" },
                    { label: "Long", value: "LONG" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="targetLevel" label="Target level" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: "Basic", value: "BASIC" },
                    { label: "Natural", value: "NATURAL" },
                    { label: "Advanced", value: "ADVANCED" },
                  ]}
                />
              </Form.Item>
            </div>
            <Form.Item name="vietnameseSupport" label="Vietnamese notes">
              <Select
                options={[
                  { label: "Include Vietnamese notes", value: true },
                  { label: "English only", value: false },
                ]}
              />
            </Form.Item>
          </Form>

          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
            loading={loading}
            onClick={() => void generate()}
            disabled={!aiTutorEnabled || scenarios.length === 0}
            className="full-width-mobile"
          >
            Generate Conversation
          </Button>
        </Space>
      </Card>

      <div className={isMobile ? "stacked-view" : "family-conversation-layout"}>
        <Card title="Conversation library">
          <div className="responsive-toolbar">
            <div className="responsive-toolbar__actions">
              <Select
                allowClear
                placeholder="Filter by scenario"
                value={scenarioFilter}
                onChange={(value) => setScenarioFilter(value)}
                options={scenarios.map((scenario) => ({
                  label: scenario.title,
                  value: scenario.id,
                }))}
                style={{ minWidth: isMobile ? "100%" : 220 }}
              />
              <Select
                allowClear
                placeholder="Filter by child"
                value={childFilter}
                onChange={(value) => setChildFilter(value)}
                options={[
                  { label: "Kiwi", value: "KIWI" },
                  { label: "Vivi", value: "VIVI" },
                  { label: "Both", value: "BOTH" },
                ]}
                style={{ minWidth: isMobile ? "100%" : 180 }}
              />
            </div>
          </div>

          {filteredConversations.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No family conversations match the current filters."
              style={{ marginBlock: 32 }}
            />
          ) : (
            <List
              className="mobile-card-list"
              dataSource={filteredConversations}
              renderItem={(conversation) => (
                <List.Item key={conversation.id}>
                  <Card
                    hoverable
                    className={
                      selectedConversation?.id === conversation.id
                        ? "family-conversation-card family-conversation-card--active"
                        : "family-conversation-card"
                    }
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      <div>
                        <Typography.Text strong className="wrap-anywhere">
                          {conversation.title}
                        </Typography.Text>
                        <div>
                          <Typography.Text type="secondary">
                            {formatDateTime(conversation.updatedAt)}
                          </Typography.Text>
                        </div>
                      </div>
                      <Space wrap>
                        <Tag>{conversation.scenario.category}</Tag>
                        <Tag color="blue">
                          {FAMILY_CHILD_FOCUS_LABELS[conversation.childFocus]}
                        </Tag>
                      </Space>
                      <div className="mobile-actions">
                        <Button
                          icon={<CopyOutlined />}
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyConversation(conversation);
                          }}
                          className="full-width-mobile"
                        >
                          Copy
                        </Button>
                        <Popconfirm
                          title="Delete this conversation?"
                          description="This removes the saved conversation from your private family library."
                          onConfirm={() => void removeConversation(conversation)}
                          okText="Delete"
                        >
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(event) => event.stopPropagation()}
                            className="full-width-mobile"
                          >
                            Delete
                          </Button>
                        </Popconfirm>
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          title={selectedConversation ? "Conversation detail" : "Conversation detail"}
          extra={
            selectedConversation ? (
              <Space wrap>
                <Tag>{selectedConversation.scenario.title}</Tag>
                <Tag color="blue">
                  {FAMILY_CHILD_FOCUS_LABELS[selectedConversation.childFocus]}
                </Tag>
                <Button
                  type="primary"
                  icon={
                    extractingConversationId === selectedConversation.id ? (
                      <LoadingOutlined />
                    ) : (
                      <RobotOutlined />
                    )
                  }
                  loading={extractingConversationId === selectedConversation.id}
                  onClick={() => void extractChunks(selectedConversation)}
                  disabled={!aiTutorEnabled}
                  className="full-width-mobile"
                >
                  Extract Chunks
                </Button>
                <Button className="full-width-mobile">
                  <Link
                    href={`/family/conversations/${selectedConversation.id}/recall`}
                  >
                    Practice Recall
                  </Link>
                </Button>
              </Space>
            ) : null
          }
        >
          {selectedConversation ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {extractionErrors[selectedConversation.id] ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Chunk extraction is unavailable"
                  description={extractionErrors[selectedConversation.id]}
                />
              ) : null}
              {extractionSummaries[selectedConversation.id] ? (
                <Alert
                  type="success"
                  showIcon
                  message="Family chunk extraction completed"
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text>
                        Created {extractionSummaries[selectedConversation.id]?.created ?? 0} new
                        chunks and skipped{" "}
                        {extractionSummaries[selectedConversation.id]?.skippedDuplicates ?? 0}{" "}
                        duplicates.
                      </Typography.Text>
                      <Link href="/family/chunks?status=SUGGESTED">
                        Review suggested chunks
                      </Link>
                    </Space>
                  }
                />
              ) : null}
              <Space wrap>
                <Tag>{selectedConversation.scenario.category}</Tag>
                <Tag>{formatDateTime(selectedConversation.updatedAt)}</Tag>
              </Space>
              <AiMarkdownMessage content={selectedConversation.conversationMarkdown} />
            </Space>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select a conversation to read it in full."
              style={{ marginBlock: 32 }}
            />
          )}
        </Card>
      </div>

    </div>
  );
}
