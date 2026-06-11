"use client";

import {
  InboxOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import {
  FAMILY_CHILD_FOCUS,
  FAMILY_CHILD_FOCUS_LABELS,
  FAMILY_ROLEPLAY_DEFAULT_TURNS,
  FAMILY_ROLEPLAY_MAX_TURNS,
  FAMILY_ROLEPLAY_MIN_TURNS,
  FAMILY_ROLEPLAY_ROLES,
  FAMILY_ROLEPLAY_ROLE_LABELS,
  FAMILY_ROLEPLAY_STATUS_LABELS,
  FAMILY_TARGET_LEVELS,
  FAMILY_TARGET_LEVEL_LABELS,
} from "@/lib/constants";
import type {
  FamilyChildFocus,
  FamilyRoleplayRole,
  FamilyRoleplaySessionRecord,
  FamilyRoleplaySessionSummary,
  FamilyRoleplayStatus,
  FamilyScenarioRecord,
  FamilyTargetLevel,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type StartFormValues = {
  scenarioId?: string | null;
  userRole: FamilyRoleplayRole;
  aiRole: FamilyRoleplayRole;
  childFocus: FamilyChildFocus;
  targetLevel: FamilyTargetLevel;
  turnsLimit: number;
};

const DEFAULT_FORM: StartFormValues = {
  scenarioId: null,
  userRole: "FATHER",
  aiRole: "KIWI",
  childFocus: "BOTH",
  targetLevel: "NATURAL",
  turnsLimit: FAMILY_ROLEPLAY_DEFAULT_TURNS,
};

export function FamilyRoleplayView({
  scenarios,
  sessions: initialSessions,
  aiEnabled,
}: {
  scenarios: FamilyScenarioRecord[];
  sessions: FamilyRoleplaySessionSummary[];
  aiEnabled: boolean;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();

  const [sessionSummaries, setSessionSummaries] = useState(initialSessions);
  const [statusFilter, setStatusFilter] = useState<FamilyRoleplayStatus | "ALL">(
    "ACTIVE",
  );
  const [activeSession, setActiveSession] =
    useState<FamilyRoleplaySessionRecord | null>(null);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [form, setForm] = useState<StartFormValues>(DEFAULT_FORM);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const filteredSummaries = useMemo(() => {
    if (statusFilter === "ALL") {
      return sessionSummaries;
    }

    return sessionSummaries.filter((session) => session.status === statusFilter);
  }, [sessionSummaries, statusFilter]);

  useEffect(() => {
    if (!transcriptRef.current) {
      return;
    }

    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [activeSession?.messages.length]);

  const mergeSummary = (summary: FamilyRoleplaySessionSummary) => {
    setSessionSummaries((current) => {
      const filtered = current.filter((existing) => existing.id !== summary.id);
      return [summary, ...filtered].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
    });
  };

  const summaryFromRecord = (
    record: FamilyRoleplaySessionRecord,
  ): FamilyRoleplaySessionSummary => ({
    id: record.id,
    title: record.title,
    userRole: record.userRole,
    aiRole: record.aiRole,
    childFocus: record.childFocus,
    targetLevel: record.targetLevel,
    status: record.status,
    turnsLimit: record.turnsLimit,
    turnsTaken: record.turnsTaken,
    scenarioTitle: record.scenario?.title ?? null,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
  });

  const handleStart = async () => {
    if (!aiEnabled) {
      message.warning("Family roleplay AI is not configured on this server.");
      return;
    }

    if (form.userRole === form.aiRole) {
      message.warning("Choose a different AI role.");
      return;
    }

    setStarting(true);
    try {
      const response = await fetch("/api/family/roleplay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: form.scenarioId ?? null,
          userRole: form.userRole,
          aiRole: form.aiRole,
          childFocus: form.childFocus,
          targetLevel: form.targetLevel,
          turnsLimit: form.turnsLimit,
        }),
      });
      const data = (await response.json()) as {
        session?: FamilyRoleplaySessionRecord;
        message?: string;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.message ?? "Could not start family roleplay.");
      }

      setActiveSession(data.session);
      mergeSummary(summaryFromRecord(data.session));
      setDraftMessage("");
      message.success("Family roleplay started.");
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Could not start family roleplay.",
      );
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async () => {
    if (!activeSession || !draftMessage.trim()) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/family/roleplay/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: draftMessage,
        }),
      });
      const data = (await response.json()) as {
        session?: FamilyRoleplaySessionRecord;
        message?: string;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.message ?? "Could not send the message.");
      }

      setActiveSession(data.session);
      mergeSummary(summaryFromRecord(data.session));
      setDraftMessage("");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not send the message.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleFinish = async () => {
    if (!activeSession) {
      return;
    }

    setFinishing(true);
    try {
      const response = await fetch("/api/family/roleplay/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
      const data = (await response.json()) as {
        session?: FamilyRoleplaySessionRecord;
        message?: string;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.message ?? "Could not finish the session.");
      }

      setActiveSession(data.session);
      mergeSummary(summaryFromRecord(data.session));
      message.success("Roleplay finished. Feedback ready.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not finish the session.",
      );
    } finally {
      setFinishing(false);
    }
  };

  const handleResume = async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/family/roleplay/sessions/${sessionId}`,
      );
      const data = (await response.json()) as {
        session?: FamilyRoleplaySessionRecord;
        message?: string;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.message ?? "Could not load the session.");
      }

      setActiveSession(data.session);
      setDraftMessage("");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not load the session.",
      );
    }
  };

  const handleArchive = async (sessionId: string) => {
    try {
      const response = await fetch("/api/family/roleplay/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await response.json()) as {
        session?: FamilyRoleplaySessionSummary;
        message?: string;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.message ?? "Could not archive the session.");
      }

      mergeSummary(data.session);

      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }

      message.success("Session archived.");
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Could not archive the session.",
      );
    }
  };

  const closeSession = () => {
    setActiveSession(null);
    setDraftMessage("");
  };

  const renderTranscript = (session: FamilyRoleplaySessionRecord) => (
    <div
      ref={transcriptRef}
      className="family-roleplay__transcript"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxHeight: isMobile ? "55vh" : "60vh",
        overflowY: "auto",
        paddingRight: 4,
      }}
    >
      {session.messages.length === 0 ? (
        <Empty
          description="No messages yet. Send the first turn."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        session.messages.map((messageItem) => (
          <Card
            key={messageItem.id}
            size="small"
            style={{
              alignSelf:
                messageItem.sender === "USER" ? "flex-end" : "flex-start",
              maxWidth: isMobile ? "92%" : "75%",
              background:
                messageItem.sender === "USER" ? "#e6f4ff" : "#f6ffed",
            }}
          >
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Typography.Text strong>{messageItem.roleLabel}</Typography.Text>
              <Typography.Paragraph
                style={{ margin: 0, whiteSpace: "pre-wrap" }}
                className="wrap-anywhere"
              >
                {messageItem.content}
              </Typography.Paragraph>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Turn {messageItem.turnNumber}
              </Typography.Text>
            </Space>
          </Card>
        ))
      )}
    </div>
  );

  if (activeSession) {
    const turnsExhausted =
      activeSession.turnsTaken >= activeSession.turnsLimit &&
      activeSession.status === "ACTIVE";
    return (
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Family Roleplay
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Practice realistic daily family English. AI stays in character — not an IELTS
            examiner.
          </Typography.Text>
        </div>

        <Card>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="cyan">
                You: {FAMILY_ROLEPLAY_ROLE_LABELS[activeSession.userRole]}
              </Tag>
              <Tag color="purple">
                AI: {FAMILY_ROLEPLAY_ROLE_LABELS[activeSession.aiRole]}
              </Tag>
              <Tag color="blue">
                {FAMILY_CHILD_FOCUS_LABELS[activeSession.childFocus]}
              </Tag>
              <Tag>{FAMILY_TARGET_LEVEL_LABELS[activeSession.targetLevel]}</Tag>
              <Tag color={activeSession.status === "ACTIVE" ? "green" : "default"}>
                {FAMILY_ROLEPLAY_STATUS_LABELS[activeSession.status]}
              </Tag>
              <Tag>
                Turn {activeSession.turnsTaken}/{activeSession.turnsLimit}
              </Tag>
            </Space>

            {activeSession.scenario ? (
              <Typography.Text type="secondary" className="wrap-anywhere">
                Scenario: {activeSession.scenario.title} — {activeSession.scenario.description}
              </Typography.Text>
            ) : null}

            {renderTranscript(activeSession)}

            {turnsExhausted ? (
              <Alert
                type="info"
                showIcon
                message="Turn limit reached"
                description="Finish the session to see Vietnamese coach feedback."
              />
            ) : null}

            {activeSession.status === "ACTIVE" ? (
              <Space
                direction="vertical"
                size={8}
                style={{ width: "100%" }}
              >
                <Input.TextArea
                  value={draftMessage}
                  autoSize={{
                    minRows: isMobile ? 2 : 2,
                    maxRows: 6,
                  }}
                  placeholder={`Reply as ${FAMILY_ROLEPLAY_ROLE_LABELS[activeSession.userRole]}`}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  disabled={sending || finishing}
                />
                <Space
                  direction={isMobile ? "vertical" : "horizontal"}
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Button
                    type="primary"
                    icon={sending ? <LoadingOutlined /> : <SendOutlined />}
                    onClick={() => void handleSend()}
                    loading={sending}
                    disabled={!draftMessage.trim() || sending || finishing}
                    className="full-width-mobile"
                  >
                    Send
                  </Button>
                  <Popconfirm
                    title="Finish this roleplay?"
                    description="The AI will write a Vietnamese coach review and lock the session."
                    onConfirm={() => void handleFinish()}
                    okText="Finish"
                    cancelText="Keep practicing"
                  >
                    <Button
                      icon={
                        finishing ? <LoadingOutlined /> : <StopOutlined />
                      }
                      loading={finishing}
                      disabled={sending || finishing}
                      className="full-width-mobile"
                    >
                      Finish session
                    </Button>
                  </Popconfirm>
                  <Button onClick={closeSession} className="full-width-mobile">
                    Back to list
                  </Button>
                </Space>
              </Space>
            ) : (
              <Space
                direction={isMobile ? "vertical" : "horizontal"}
                size={8}
                style={{ width: "100%" }}
              >
                <Button
                  type="primary"
                  onClick={closeSession}
                  className="full-width-mobile"
                >
                  Back to list
                </Button>
                {activeSession.status !== "ARCHIVED" ? (
                  <Popconfirm
                    title="Archive this session?"
                    onConfirm={() => void handleArchive(activeSession.id)}
                    okText="Archive"
                    cancelText="Cancel"
                  >
                    <Button icon={<InboxOutlined />} className="full-width-mobile">
                      Archive
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            )}

            {activeSession.finalFeedbackMarkdown ? (
              <Card size="small" title="Family coach review">
                <AiMarkdownMessage
                  content={activeSession.finalFeedbackMarkdown}
                />
              </Card>
            ) : null}
          </Space>
        </Card>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Roleplay
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Chat in English with AI playing as Kiwi, Vivi, Mom, or a grandparent. Family
          context only — never IELTS examiner mode.
        </Typography.Text>
      </div>

      <Card title="Start a new roleplay" extra={<Tag color="green">Family English</Tag>}>
        <Form layout="vertical" disabled={starting}>
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item label="Scenario (optional)">
                <Select
                  allowClear
                  showSearch
                  placeholder="Improvise without a scenario"
                  optionFilterProp="label"
                  value={form.scenarioId ?? undefined}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      scenarioId: value ?? null,
                    }))
                  }
                  options={scenarios.map((scenario) => ({
                    value: scenario.id,
                    label: `${scenario.title} · ${scenario.category}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="You play">
                <Select
                  value={form.userRole}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      userRole: value as FamilyRoleplayRole,
                    }))
                  }
                  options={FAMILY_ROLEPLAY_ROLES.map((role) => ({
                    value: role,
                    label: FAMILY_ROLEPLAY_ROLE_LABELS[role],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="AI plays">
                <Select
                  value={form.aiRole}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      aiRole: value as FamilyRoleplayRole,
                    }))
                  }
                  options={FAMILY_ROLEPLAY_ROLES.filter(
                    (role) => role !== form.userRole,
                  ).map((role) => ({
                    value: role,
                    label: FAMILY_ROLEPLAY_ROLE_LABELS[role],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Child focus">
                <Select
                  value={form.childFocus}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      childFocus: value as FamilyChildFocus,
                    }))
                  }
                  options={FAMILY_CHILD_FOCUS.map((focus) => ({
                    value: focus,
                    label: FAMILY_CHILD_FOCUS_LABELS[focus],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Target level">
                <Select
                  value={form.targetLevel}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      targetLevel: value as FamilyTargetLevel,
                    }))
                  }
                  options={FAMILY_TARGET_LEVELS.map((level) => ({
                    value: level,
                    label: FAMILY_TARGET_LEVEL_LABELS[level],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Turn limit">
                <Segmented
                  block
                  value={form.turnsLimit}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      turnsLimit: Number(value),
                    }))
                  }
                  options={[
                    FAMILY_ROLEPLAY_MIN_TURNS,
                    5,
                    FAMILY_ROLEPLAY_DEFAULT_TURNS,
                    10,
                    FAMILY_ROLEPLAY_MAX_TURNS,
                  ].map((turn) => ({ value: turn, label: `${turn} turns` }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Button
            type="primary"
            icon={starting ? <LoadingOutlined /> : <PlusOutlined />}
            onClick={() => void handleStart()}
            loading={starting}
            disabled={!aiEnabled || starting}
            className="full-width-mobile"
          >
            Start roleplay
          </Button>
          {!aiEnabled ? (
            <Alert
              type="warning"
              showIcon
              message="Family roleplay AI is not configured"
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Form>
      </Card>

      <Card
        title="Previous roleplay sessions"
        extra={
          <Segmented
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(value as FamilyRoleplayStatus | "ALL")
            }
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Completed", value: "COMPLETED" },
              { label: "Archived", value: "ARCHIVED" },
              { label: "All", value: "ALL" },
            ]}
          />
        }
      >
        {filteredSummaries.length === 0 ? (
          <Empty
            description="No family roleplay sessions yet for this filter."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={filteredSummaries}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <Button
                    key="resume"
                    icon={<PlayCircleOutlined />}
                    onClick={() => void handleResume(item.id)}
                  >
                    {item.status === "ACTIVE" ? "Resume" : "Open"}
                  </Button>,
                  item.status !== "ARCHIVED" ? (
                    <Popconfirm
                      key="archive"
                      title="Archive this roleplay?"
                      onConfirm={() => void handleArchive(item.id)}
                      okText="Archive"
                      cancelText="Cancel"
                    >
                      <Button icon={<InboxOutlined />} type="text">
                        Archive
                      </Button>
                    </Popconfirm>
                  ) : null,
                ]}
              >
                <List.Item.Meta
                  title={item.title}
                  description={
                    <Space direction="vertical" size={4}>
                      <Space wrap size={4}>
                        <Tag color="cyan">
                          You: {FAMILY_ROLEPLAY_ROLE_LABELS[item.userRole]}
                        </Tag>
                        <Tag color="purple">
                          AI: {FAMILY_ROLEPLAY_ROLE_LABELS[item.aiRole]}
                        </Tag>
                        <Tag>
                          {FAMILY_CHILD_FOCUS_LABELS[item.childFocus]}
                        </Tag>
                        <Tag>
                          {FAMILY_TARGET_LEVEL_LABELS[item.targetLevel]}
                        </Tag>
                        <Tag
                          color={
                            item.status === "ACTIVE"
                              ? "green"
                              : item.status === "COMPLETED"
                                ? "blue"
                                : "default"
                          }
                        >
                          {FAMILY_ROLEPLAY_STATUS_LABELS[item.status]}
                        </Tag>
                      </Space>
                      <Typography.Text type="secondary">
                        {item.scenarioTitle
                          ? `${item.scenarioTitle} · `
                          : "Improvised · "}
                        Turn {item.turnsTaken}/{item.turnsLimit} ·{" "}
                        {formatDateTime(item.updatedAt)}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
