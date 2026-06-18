"use client";

import {
  BulbOutlined,
  LoadingOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Grid,
  Modal,
  Progress,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  IELTS_TASK_TYPE_LABELS,
} from "@/lib/constants";
import type {
  IdeaQuestionMappingSuggestion,
  SpeakingIdeaCoverageQuestion,
  SpeakingIdeaCoverageSnapshot,
  SpeakingIdeaOption,
} from "@/lib/types";

export function SpeakingIdeaCoverageView({
  snapshot,
}: {
  snapshot: SpeakingIdeaCoverageSnapshot;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [suggestingQuestionId, setSuggestingQuestionId] = useState<string | null>(null);
  const [suggestionsTarget, setSuggestionsTarget] = useState<SpeakingIdeaCoverageQuestion | null>(null);
  const [suggestions, setSuggestions] = useState<Array<
    IdeaQuestionMappingSuggestion & {
      idea?: SpeakingIdeaOption;
    }
  >>([]);
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);

  const topIdeasColumns = useMemo(
    () => [
      {
        title: "Idea",
        key: "idea",
        render: (record: SpeakingIdeaCoverageSnapshot["topIdeas"][number]) => (
          <Space direction="vertical" size={2}>
            <Link href={`/admin/ideas/${record.id}`}>{record.title}</Link>
            <Typography.Text type="secondary">{record.shortLabel}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Reuse",
        dataIndex: "reuseScore",
        width: 110,
        render: (value: number) => `${value}/5`,
      },
      {
        title: "Linked Questions",
        dataIndex: "linkedQuestionsCount",
        width: 150,
      },
      {
        title: "Generated Answers",
        dataIndex: "generatedAnswersCount",
        width: 150,
        render: (value: number) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{value}</Typography.Text>
            {value === 0 ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Generate-only phase
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
    ],
    [],
  );

  const suggestIdeasForQuestion = async (question: SpeakingIdeaCoverageQuestion) => {
    setSuggestingQuestionId(question.id);
    try {
      const response = await fetch("/api/admin/ideas/suggest-question-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QUESTION_TO_IDEAS",
          questionId: question.id,
          limit: 6,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        suggestions?: Array<IdeaQuestionMappingSuggestion & { idea?: SpeakingIdeaOption }>;
        message?: string;
      };

      if (!response.ok || !data.suggestions) {
        throw new Error(data.message ?? "Could not suggest ideas for this question.");
      }

      const enriched = data.suggestions.map((suggestion) => ({
        ...suggestion,
        idea: snapshot.topIdeas.find((idea) => idea.id === suggestion.targetId)
          ? {
              id: suggestion.targetId,
              title:
                snapshot.topIdeas.find((idea) => idea.id === suggestion.targetId)?.title ?? "Idea",
              shortLabel:
                snapshot.topIdeas.find((idea) => idea.id === suggestion.targetId)?.shortLabel ??
                "Idea",
              status: "ACTIVE" as const,
              reuseScore:
                snapshot.topIdeas.find((idea) => idea.id === suggestion.targetId)?.reuseScore ?? 3,
              popularityScore:
                snapshot.topIdeas.find((idea) => idea.id === suggestion.targetId)?.popularityScore ??
                3,
            }
          : undefined,
      }));

      setSuggestionsTarget(question);
      setSuggestions(enriched);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not suggest ideas for this question.",
      );
    } finally {
      setSuggestingQuestionId(null);
    }
  };

  const applySuggestion = async (
    question: SpeakingIdeaCoverageQuestion,
    suggestion: IdeaQuestionMappingSuggestion,
  ) => {
    try {
      const response = await fetch("/api/admin/ideas/map-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: suggestion.targetId,
          questionId: question.id,
          relevanceScore: suggestion.relevanceScore,
          isPrimary: suggestion.isPrimary,
          aiReason: suggestion.aiReason,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not apply suggested mapping.");
      }

      message.success(data.message ?? "Suggested mapping created.");
      setSuggestions((current) => current.filter((item) => item.targetId !== suggestion.targetId));
      router.refresh();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not apply suggested mapping.",
      );
    }
  };

  const generateIdeasForTopic = async (topic: string) => {
    setGeneratingTopic(topic);
    try {
      const response = await fetch("/api/admin/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          count: 5,
          targetBand: 6.5,
          includeExistingContext: true,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        summary?: {
          created: number;
          skippedDuplicates: number;
        };
        message?: string;
      };

      if (!response.ok || !data.summary) {
        throw new Error(data.message ?? "Could not generate more ideas for this topic.");
      }

      message.success(
        `Generated ${data.summary.created} draft idea(s) for ${topic}. Skipped ${data.summary.skippedDuplicates} duplicate(s).`,
      );
      router.refresh();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not generate more ideas for this topic.",
      );
    } finally {
      setGeneratingTopic(null);
    }
  };

  const weakTopicColumns = [
    {
      title: "Topic",
      dataIndex: "topic",
    },
    {
      title: "Questions",
      dataIndex: "questionCount",
      width: 110,
    },
    {
      title: "Mapped",
      dataIndex: "mappedCount",
      width: 110,
    },
    {
      title: "Coverage",
      key: "coveragePercent",
      width: 180,
      render: (record: SpeakingIdeaCoverageSnapshot["weakTopics"][number]) => (
        <Progress percent={record.coveragePercent} size="small" />
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 180,
      render: (record: SpeakingIdeaCoverageSnapshot["weakTopics"][number]) => (
        <Button
          icon={generatingTopic === record.topic ? <LoadingOutlined /> : <RobotOutlined />}
          loading={generatingTopic === record.topic}
          onClick={() => void generateIdeasForTopic(record.topic)}
        >
          Generate more ideas
        </Button>
      ),
    },
  ];

  return (
    <div className="stacked-view">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Speaking Idea Coverage
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Track which reusable ideas cover the Question Bank well and which speaking prompts still
            need stronger idea support.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<BulbOutlined />}>
            <Link href="/admin/ideas">Idea library</Link>
          </Button>
          <Button icon={<BulbOutlined />}>
            <Link href="/admin/ideas/map">Open mind map</Link>
          </Button>
        </Space>
      </div>

      <div className={isMobile ? "stacked-view" : "metric-grid metric-grid-compact"}>
        <Card><Statistic title="Total active ideas" value={snapshot.totalActiveIdeas} /></Card>
        <Card><Statistic title="Total mapped questions" value={snapshot.totalMappedQuestions} /></Card>
        <Card><Statistic title="Questions without ideas" value={snapshot.questionsWithoutIdeas} /></Card>
        <Card><Statistic title="Ideas with no linked questions" value={snapshot.ideasWithNoLinkedQuestions} /></Card>
      </div>

      <Card title="Part Coverage">
        <div className={isMobile ? "stacked-view" : "metric-grid metric-grid-compact"}>
          {snapshot.coverageByPart.map((part) => (
            <Card key={part.taskType} size="small">
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                <Typography.Text strong>{IELTS_TASK_TYPE_LABELS[part.taskType]}</Typography.Text>
                <Progress percent={part.coveragePercent} />
                <Space wrap>
                  <Tag>{part.mappedCount} mapped</Tag>
                  <Tag color="orange">{part.unmappedCount} unmapped</Tag>
                </Space>
              </Space>
            </Card>
          ))}
        </div>
      </Card>

      <Card title="Top reusable ideas">
        <Table
          rowKey="id"
          columns={topIdeasColumns}
          dataSource={snapshot.topIdeas}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </Card>

      <Card title="Unmapped questions">
        {snapshot.unmappedQuestions.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All approved questions already have at least one active idea." />
        ) : (
          <Table
            rowKey="id"
            dataSource={snapshot.unmappedQuestions}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 960 }}
            columns={[
              {
                title: "Part",
                dataIndex: "taskType",
                width: 140,
                render: (value: SpeakingIdeaCoverageQuestion["taskType"]) =>
                  IELTS_TASK_TYPE_LABELS[value],
              },
              {
                title: "Topic",
                dataIndex: "topic",
                width: 160,
              },
              {
                title: "Prompt",
                dataIndex: "prompt",
                render: (value: string) => <Typography.Text className="wrap-anywhere">{value}</Typography.Text>,
              },
              {
                title: "Action",
                key: "action",
                width: 220,
                render: (record: SpeakingIdeaCoverageQuestion) => (
                  <Button
                    icon={suggestingQuestionId === record.id ? <LoadingOutlined /> : <RobotOutlined />}
                    loading={suggestingQuestionId === record.id}
                    onClick={() => void suggestIdeasForQuestion(record)}
                  >
                    Suggest Ideas with AI
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card title="Weak topics">
        <Table
          rowKey="topic"
          columns={weakTopicColumns}
          dataSource={snapshot.weakTopics}
          pagination={false}
          scroll={{ x: 860 }}
        />
      </Card>

      <Modal
        open={Boolean(suggestionsTarget)}
        onCancel={() => {
          setSuggestionsTarget(null);
          setSuggestions([]);
        }}
        footer={null}
        width={760}
        destroyOnHidden
        title={suggestionsTarget ? `AI suggestions · ${suggestionsTarget.topic}` : "AI suggestions"}
      >
        {suggestionsTarget ? (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message={suggestionsTarget.prompt}
              description={`${IELTS_TASK_TYPE_LABELS[suggestionsTarget.taskType]} · ${suggestionsTarget.topic}${
                suggestionsTarget.subTopic ? ` · ${suggestionsTarget.subTopic}` : ""
              }`}
            />

            {suggestions.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No new AI suggestions are available for this question." />
            ) : (
              suggestions.map((suggestion) => (
                <Card
                  key={suggestion.targetId}
                  size="small"
                  extra={
                    <Button
                      type="primary"
                      onClick={() => void applySuggestion(suggestionsTarget, suggestion)}
                    >
                      Add mapping
                    </Button>
                  }
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space wrap>
                      <Tag>{suggestion.idea?.title ?? suggestion.targetId}</Tag>
                      <Tag>Relevance {suggestion.relevanceScore}/5</Tag>
                      {suggestion.isPrimary ? <Tag color="green">Primary</Tag> : null}
                    </Space>
                    {suggestion.idea ? (
                      <Typography.Text type="secondary">
                        {suggestion.idea.shortLabel} · Reuse {suggestion.idea.reuseScore}/5 · Popularity{" "}
                        {suggestion.idea.popularityScore}/5
                      </Typography.Text>
                    ) : null}
                    {suggestion.aiReason ? (
                      <Typography.Text className="wrap-anywhere">{suggestion.aiReason}</Typography.Text>
                    ) : null}
                  </Space>
                </Card>
              ))
            )}
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
