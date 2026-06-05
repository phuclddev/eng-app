"use client";

import {
  LoadingOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  SendOutlined,
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
  List,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import { AiStructuredSections } from "@/components/ai/ai-structured-sections";
import {
  AI_SIMULATOR_PART_LABELS,
  IELTS_TASK_TYPE_LABELS,
} from "@/lib/constants";
import type {
  AiSimulatorPart,
  AiSimulatorSessionRecord,
  IeltsQuestionPromptOption,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function SpeakingSimulatorView({
  enabled,
  initialPromptOptions,
  initialSessions,
}: {
  enabled: boolean;
  initialPromptOptions: IeltsQuestionPromptOption[];
  initialSessions: AiSimulatorSessionRecord[];
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    initialSessions[0]?.id,
  );
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [reply, setReply] = useState("");

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const selectedPart = Form.useWatch("part", form) as AiSimulatorPart | undefined;
  const filteredPromptOptions =
    selectedPart && selectedPart !== "MIXED"
      ? initialPromptOptions.filter((option) => option.taskType === selectedPart)
      : initialPromptOptions;

  const upsertSession = (session: AiSimulatorSessionRecord) => {
    setSessions((currentSessions) => {
      const existing = currentSessions.find((item) => item.id === session.id);

      if (!existing) {
        return [session, ...currentSessions];
      }

      return [
        session,
        ...currentSessions.filter((item) => item.id !== session.id),
      ];
    });
    setActiveSessionId(session.id);
  };

  const startSimulator = async () => {
    const values = await form.validateFields();
    setStarting(true);
    setError(undefined);

    try {
      const response = await fetch("/api/ai-tutor/speaking-simulator/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as AiSimulatorSessionRecord & {
        message?: string;
      };

      if (!response.ok || !data.id) {
        throw new Error(data.message ?? "Could not start the speaking simulator.");
      }

      upsertSession(data);
      setReply("");
      message.success("Speaking simulator started.");
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "Could not start the speaking simulator.";
      setError(nextError);
      message.error(nextError);
    } finally {
      setStarting(false);
    }
  };

  const sendReply = async () => {
    if (!activeSession || !reply.trim()) {
      return;
    }

    setSending(true);
    setError(undefined);

    try {
      const response = await fetch("/api/ai-tutor/speaking-simulator/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: reply.trim(),
        }),
      });
      const data = (await response.json()) as AiSimulatorSessionRecord & {
        message?: string;
      };

      if (!response.ok || !data.id) {
        throw new Error(data.message ?? "Could not continue the speaking simulator.");
      }

      upsertSession(data);
      setReply("");
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "Could not continue the speaking simulator.";
      setError(nextError);
      message.error(nextError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Speaking Simulator
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Practice a text-based IELTS Speaking interview with one examiner question at a time.
        </Typography.Text>
      </div>

      {!enabled ? (
        <Alert
          type="warning"
          showIcon
          message="Speaking Simulator is not configured"
          description="Set AI chatflow environment variables on the server before using this feature."
        />
      ) : null}

      {error ? (
        <Alert type="warning" showIcon message="AI Simulator issue" description={error} />
      ) : null}

      <div className="simulator-layout">
        <Card title="Start a simulator session">
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              part: "PART_1",
              numberOfTurns: 5,
              targetBand: 6.5,
            }}
          >
            <Form.Item
              name="part"
              label="Speaking part"
              rules={[{ required: true, message: "Please choose a speaking part." }]}
            >
              <Select
                options={[
                  { label: AI_SIMULATOR_PART_LABELS.PART_1, value: "PART_1" },
                  { label: AI_SIMULATOR_PART_LABELS.PART_2, value: "PART_2" },
                  { label: AI_SIMULATOR_PART_LABELS.PART_3, value: "PART_3" },
                  { label: AI_SIMULATOR_PART_LABELS.MIXED, value: "MIXED" },
                ]}
              />
            </Form.Item>

            <Form.Item name="questionId" label="Speaking prompt from the question bank">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={filteredPromptOptions.map((option) => ({
                  label: `${IELTS_TASK_TYPE_LABELS[option.taskType]} · ${option.topic} · ${option.prompt}`,
                  value: option.id,
                }))}
              />
            </Form.Item>

            <Form.Item name="topic" label="Custom topic (optional)">
              <Input placeholder="For example: Hometown, Education, Travel" />
            </Form.Item>

            <Form.Item name="prompt" label="Custom prompt (optional)">
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="Optional. Use this if you want a custom speaking prompt."
              />
            </Form.Item>

            <Space
              direction={isMobile ? "vertical" : "horizontal"}
              size={16}
              style={{ width: "100%" }}
            >
              <Form.Item name="targetBand" label="Target band" style={{ flex: 1 }}>
                <InputNumber min={4} max={9} step={0.5} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item name="numberOfTurns" label="Learner turns" style={{ flex: 1 }}>
                <InputNumber min={3} max={8} style={{ width: "100%" }} />
              </Form.Item>
            </Space>

            <Button
              type="primary"
              icon={starting ? <LoadingOutlined /> : <PlayCircleOutlined />}
              onClick={() => void startSimulator()}
              loading={starting}
              disabled={!enabled}
              className="full-width-mobile"
            >
              Start simulator
            </Button>
          </Form>
        </Card>

        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card title="Recent sessions">
            {sessions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No simulator sessions yet."
              />
            ) : (
              <List
                dataSource={sessions}
                renderItem={(session) => (
                  <List.Item
                    className={[
                      "question-list-item",
                      session.id === activeSessionId ? "question-list-item-active" : "",
                    ].join(" ").trim()}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color="blue">{AI_SIMULATOR_PART_LABELS[session.part]}</Tag>
                          <Tag color={session.status === "ACTIVE" ? "green" : "default"}>
                            {session.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text className="wrap-anywhere">
                            {session.topic ?? session.prompt ?? "General speaking simulation"}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            Updated: {formatDateTime(session.updatedAt)}
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card
            title="Examiner conversation"
            extra={
              activeSession ? (
                <Tag color={activeSession.status === "ACTIVE" ? "green" : "default"}>
                  Turn {activeSession.currentTurn}/{activeSession.numberOfTurns}
                </Tag>
              ) : null
            }
          >
            {!activeSession ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Start or select a simulator session to begin."
              />
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="blue">{AI_SIMULATOR_PART_LABELS[activeSession.part]}</Tag>
                  {activeSession.topic ? <Tag>{activeSession.topic}</Tag> : null}
                  {activeSession.targetBand ? (
                    <Tag color="purple">Band {activeSession.targetBand.toFixed(1)}</Tag>
                  ) : null}
                </Space>

                {activeSession.prompt ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Prompt focus"
                    description={activeSession.prompt}
                  />
                ) : null}

                <List
                  className="ai-tutor-chat__messages"
                  dataSource={activeSession.messages}
                  renderItem={(item) => (
                    <List.Item className="ai-tutor-chat__item">
                      <Card
                        size="small"
                        className={[
                          "ai-tutor-chat__bubble",
                          item.role === "LEARNER"
                            ? "ai-tutor-chat__bubble-user"
                            : "ai-tutor-chat__bubble-assistant",
                        ].join(" ")}
                      >
                        <Space size={8} style={{ marginBottom: 8 }}>
                          {item.role === "LEARNER" ? (
                            <MessageOutlined />
                          ) : (
                            <RobotOutlined />
                          )}
                          <Typography.Text strong>
                            {item.role === "LEARNER"
                              ? "You"
                              : item.role === "FEEDBACK"
                                ? "Final feedback"
                                : "Examiner"}
                          </Typography.Text>
                        </Space>
                        <Typography.Paragraph
                          className="wrap-anywhere"
                          style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
                        >
                          {item.content}
                        </Typography.Paragraph>
                      </Card>
                    </List.Item>
                  )}
                />

                {activeSession.finalFeedbackSections?.length ? (
                  <AiStructuredSections sections={activeSession.finalFeedbackSections} />
                ) : activeSession.status === "COMPLETED" && activeSession.finalFeedback ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Final feedback"
                    description={
                      <Typography.Paragraph
                        className="wrap-anywhere"
                        style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
                      >
                        {activeSession.finalFeedback}
                      </Typography.Paragraph>
                    }
                  />
                ) : null}

                {activeSession.status === "ACTIVE" ? (
                  <div className="simulator-composer-sticky">
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Input.TextArea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder="Type your speaking answer here."
                        autoSize={{ minRows: 4, maxRows: 8 }}
                      />
                      <Button
                        type="primary"
                        icon={sending ? <LoadingOutlined /> : <SendOutlined />}
                        onClick={() => void sendReply()}
                        loading={sending}
                        disabled={!enabled || reply.trim().length === 0}
                        className="full-width-mobile"
                      >
                        Send answer
                      </Button>
                    </Space>
                  </div>
                ) : null}
              </Space>
            )}
          </Card>
        </Space>
      </div>
    </div>
  );
}
