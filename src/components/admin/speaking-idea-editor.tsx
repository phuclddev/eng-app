"use client";

import {
  CheckOutlined,
  LoadingOutlined,
  PlusOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  IELTS_TASK_TYPE_LABELS,
  SPEAKING_IDEA_STATUS_LABELS,
  SPEAKING_IDEA_SUPPORT_TYPE_LABELS,
} from "@/lib/constants";
import { SpeakingIdeaAnswerGeneratorPanel } from "@/components/admin/speaking-idea-answer-generator-panel";
import type {
  IdeaQuestionMappingSuggestion,
  SpeakingIdeaQuestionOption,
  SpeakingIdeaRecord,
  SpeakingIdeaStatus,
} from "@/lib/types";
import { saveSpeakingIdeaAction, setSpeakingIdeaStatusAction } from "@/server/actions/admin";

function buildInitialValues(idea?: SpeakingIdeaRecord | null) {
  if (!idea) {
    return {
      popularityScore: 3,
      reuseScore: 3,
      status: "DRAFT",
      variants: [],
      supports: [],
      patterns: [],
      questionMaps: [],
    };
  }

  return {
    id: idea.id,
    title: idea.title,
    shortLabel: idea.shortLabel,
    descriptionVi: idea.descriptionVi,
    descriptionEn: idea.descriptionEn,
    popularityScore: idea.popularityScore,
    reuseScore: idea.reuseScore,
    status: idea.status,
    variants: idea.variants.map((variant) => ({
      id: variant.id,
      bandLevel: variant.bandLevel,
      phrase: variant.phrase,
      exampleSentence: variant.exampleSentence,
    })),
    supports: idea.supports.map((support) => ({
      id: support.id,
      supportType: support.supportType,
      text: support.text,
      example: support.example,
    })),
    patterns: idea.patterns.map((pattern) => ({
      id: pattern.id,
      patternText: pattern.patternText,
      variablesJson: pattern.variablesJson
        ? JSON.stringify(pattern.variablesJson, null, 2)
        : "",
      exampleAnswer: pattern.exampleAnswer,
    })),
    questionMaps: idea.questionMaps.map((questionMap) => ({
      id: questionMap.id,
      speakingQuestionId: questionMap.speakingQuestion.id,
      relevanceScore: questionMap.relevanceScore,
      isPrimary: questionMap.isPrimary,
      aiReason: questionMap.aiReason,
    })),
  };
}

export function SpeakingIdeaEditor({
  idea,
  questionOptions,
}: {
  idea?: SpeakingIdeaRecord | null;
  questionOptions: SpeakingIdeaQuestionOption[];
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<IdeaQuestionMappingSuggestion[]>([]);
  const [answerQuestionTarget, setAnswerQuestionTarget] = useState<SpeakingIdeaQuestionOption | null>(null);
  const values = Form.useWatch([], form) ?? buildInitialValues(idea);

  const questionSelectOptions = useMemo(
    () =>
      questionOptions.map((question) => ({
        label: `${IELTS_TASK_TYPE_LABELS[question.taskType]} · ${question.topic}${
          question.subTopic ? ` · ${question.subTopic}` : ""
        }`,
        value: question.id,
      })),
    [questionOptions],
  );

  const linkedQuestionLookup = useMemo(
    () => new Map(questionOptions.map((question) => [question.id, question])),
    [questionOptions],
  );

  const save = async () => {
    const nextValues = await form.validateFields();

    startTransition(async () => {
      const result = await saveSpeakingIdeaAction(nextValues);

      if (!result.ok || !result.idea) {
        message.error(result.message);
        return;
      }

      message.success(result.message);

      if (!idea) {
        router.push(`/admin/ideas/${result.idea.id}`);
        return;
      }

      router.refresh();
    });
  };

  const updateStatus = (status: SpeakingIdeaStatus) => {
    if (!idea) {
      form.setFieldValue("status", status);
      return;
    }

    startStatusTransition(async () => {
      const result = await setSpeakingIdeaStatusAction({
        ideaId: idea.id,
        status,
      });

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      form.setFieldValue("status", status);
      message.success(result.message);
      router.refresh();
    });
  };

  const suggestQuestions = async () => {
    if (!idea) {
      message.info("Create the idea first before asking AI for question matches.");
      return;
    }

    setSuggestLoading(true);
    try {
      const response = await fetch("/api/admin/ideas/suggest-question-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "IDEA_TO_QUESTIONS",
          ideaId: idea.id,
          limit: 6,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        suggestions?: IdeaQuestionMappingSuggestion[];
        message?: string;
      };

      if (!response.ok || !data.suggestions) {
        throw new Error(data.message ?? "Could not suggest matching questions.");
      }

      setSuggestions(data.suggestions);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not suggest matching questions.",
      );
    } finally {
      setSuggestLoading(false);
    }
  };

  const addSuggestedQuestionToForm = (suggestion: IdeaQuestionMappingSuggestion) => {
    const current = Array.isArray(values.questionMaps) ? values.questionMaps : [];
    if (current.some((mapping: { speakingQuestionId?: string }) => mapping.speakingQuestionId === suggestion.targetId)) {
      message.info("This question is already linked.");
      return;
    }

    const next = [
      ...current.map((mapping: { isPrimary?: boolean }) =>
        suggestion.isPrimary ? { ...mapping, isPrimary: false } : mapping,
      ),
      {
        speakingQuestionId: suggestion.targetId,
        relevanceScore: suggestion.relevanceScore,
        isPrimary: suggestion.isPrimary,
        aiReason: suggestion.aiReason ?? undefined,
      },
    ];

    form.setFieldValue("questionMaps", next);
    message.success("Suggested question added to the draft form.");
  };

  return (
    <div className="stacked-view">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {idea ? idea.title : "New Speaking Idea"}
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Build reusable IELTS Speaking reasoning blocks that admins can later link to multiple
            prompts without changing chunk review or practice logic.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button>
            <Link href="/admin/ideas">Back to ideas</Link>
          </Button>
          {idea ? (
            <Button>
              <Link href={`/admin/ideas/${idea.id}/study-map`}>Open study map</Link>
            </Button>
          ) : null}
          <Button type="primary" loading={pending} onClick={() => void save()}>
            {idea ? "Save changes" : "Create idea"}
          </Button>
        </Space>
      </div>

      <Card
        title="Idea overview"
        extra={
          <Space wrap>
            <Tag
              color={
                values.status === "ACTIVE"
                  ? "green"
                  : values.status === "ARCHIVED"
                    ? "default"
                    : "gold"
              }
            >
              {SPEAKING_IDEA_STATUS_LABELS[
                (values.status as SpeakingIdeaStatus) ?? "DRAFT"
              ]}
            </Tag>
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={statusPending}
              onClick={() => updateStatus("ACTIVE")}
            >
              Activate
            </Button>
            <Button
              size="small"
              icon={<UndoOutlined />}
              loading={statusPending}
              onClick={() => updateStatus("DRAFT")}
            >
              Draft
            </Button>
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              loading={statusPending}
              onClick={() => updateStatus("ARCHIVED")}
            >
              Archive
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={buildInitialValues(idea)}
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>

          <div className="family-form-grid">
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input maxLength={191} placeholder="Saving time" />
            </Form.Item>
            <Form.Item
              name="shortLabel"
              label="Short label"
              rules={[{ required: true }]}
            >
              <Input maxLength={80} placeholder="Time-saving" />
            </Form.Item>
            <Form.Item
              name="popularityScore"
              label="Popularity score"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="reuseScore" label="Reuse score" rules={[{ required: true }]}>
              <InputNumber min={1} max={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: "Draft", value: "DRAFT" },
                  { label: "Active", value: "ACTIVE" },
                  { label: "Archived", value: "ARCHIVED" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="descriptionVi"
            label="Vietnamese description"
            rules={[{ required: true }]}
          >
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} />
          </Form.Item>
          <Form.Item
            name="descriptionEn"
            label="English description"
            rules={[{ required: true }]}
          >
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} />
          </Form.Item>

          <Divider>Band Variants</Divider>
          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Variant ${field.name + 1}`}
                    extra={
                      <Button type="link" danger onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    }
                  >
                    <div className="family-form-grid">
                      <Form.Item
                        name={[field.name, "bandLevel"]}
                        label="Band level"
                        rules={[{ required: true }]}
                      >
                        <InputNumber min={4} max={9} step={0.5} style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "phrase"]}
                        label="Phrase"
                        rules={[{ required: true }]}
                      >
                        <Input maxLength={191} />
                      </Form.Item>
                    </div>
                    <Form.Item
                      name={[field.name, "exampleSentence"]}
                      label="Example sentence"
                      rules={[{ required: true }]}
                    >
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                    </Form.Item>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add()} className="full-width-mobile">
                  Add variant
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider>Supporting Points</Divider>
          <Form.List name="supports">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Support ${field.name + 1}`}
                    extra={
                      <Button type="link" danger onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    }
                  >
                    <Form.Item
                      name={[field.name, "supportType"]}
                      label="Support type"
                      rules={[{ required: true }]}
                    >
                      <Select
                        options={Object.entries(SPEAKING_IDEA_SUPPORT_TYPE_LABELS).map(
                          ([value, label]) => ({
                            label,
                            value,
                          }),
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "text"]}
                      label="Support text"
                      rules={[{ required: true }]}
                    >
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, "example"]} label="Example">
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                    </Form.Item>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add()} className="full-width-mobile">
                  Add support point
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider>Answer Patterns</Divider>
          <Form.List name="patterns">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Pattern ${field.name + 1}`}
                    extra={
                      <Button type="link" danger onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    }
                  >
                    <Form.Item
                      name={[field.name, "patternText"]}
                      label="Pattern text"
                      rules={[{ required: true }]}
                    >
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "variablesJson"]}
                      label="Variables JSON"
                      extra='Optional JSON, for example: {"subject":"a busy student"}'
                    >
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "exampleAnswer"]}
                      label="Example answer"
                      rules={[{ required: true }]}
                    >
                      <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
                    </Form.Item>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add()} className="full-width-mobile">
                  Add answer pattern
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider>Linked Questions</Divider>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Button
              icon={suggestLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
              onClick={() => void suggestQuestions()}
              disabled={!idea}
              className="full-width-mobile"
            >
              Suggest matching questions with AI
            </Button>
            {!idea ? (
              <Typography.Text type="secondary">
                Save the idea first to enable AI-assisted question suggestions.
              </Typography.Text>
            ) : null}
            {suggestions.length > 0 ? (
              <Card size="small" title="AI suggested questions">
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {suggestions.map((suggestion) => {
                    const question = questionOptions.find(
                      (item) => item.id === suggestion.targetId,
                    );

                    if (!question) {
                      return null;
                    }

                    return (
                      <Card
                        key={suggestion.targetId}
                        size="small"
                        extra={
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => addSuggestedQuestionToForm(suggestion)}
                          >
                            Add to draft
                          </Button>
                        }
                      >
                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                          <Space wrap>
                            <Tag color="blue">{IELTS_TASK_TYPE_LABELS[question.taskType]}</Tag>
                            <Tag>{question.topic}</Tag>
                            {question.subTopic ? <Tag>{question.subTopic}</Tag> : null}
                            <Tag>Band {question.targetBand.toFixed(1)}</Tag>
                            <Tag>Relevance {suggestion.relevanceScore}/5</Tag>
                            {suggestion.isPrimary ? <Tag color="green">Primary</Tag> : null}
                          </Space>
                          <Typography.Text className="wrap-anywhere">
                            {question.prompt}
                          </Typography.Text>
                          {suggestion.aiReason ? (
                            <Typography.Text type="secondary" className="wrap-anywhere">
                              {suggestion.aiReason}
                            </Typography.Text>
                          ) : null}
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              </Card>
            ) : null}
          </Space>
          <Form.List name="questionMaps">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Question link ${field.name + 1}`}
                    extra={
                      <Button type="link" danger onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    }
                  >
                    <div className="family-form-grid">
                      <Form.Item
                        name={[field.name, "speakingQuestionId"]}
                        label="Speaking question"
                        rules={[{ required: true }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          options={questionSelectOptions}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "relevanceScore"]}
                        label="Relevance score"
                        rules={[{ required: true }]}
                      >
                        <InputNumber min={1} max={5} style={{ width: "100%" }} />
                      </Form.Item>
                    </div>
                    <div className="family-form-grid">
                      <Form.Item
                        name={[field.name, "isPrimary"]}
                        label="Primary mapping"
                      >
                        <Select
                          options={[
                            { label: "Secondary", value: false },
                            { label: "Primary", value: true },
                          ]}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item name={[field.name, "aiReason"]} label="Reason">
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                    </Form.Item>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add()} className="full-width-mobile">
                  Link speaking question
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Card>

      {idea?.aiReason ? (
        <Card title="AI generation note">
          <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 0 }}>
            {idea.aiReason}
          </Typography.Paragraph>
        </Card>
      ) : null}

      <Card title="Current overview">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <Typography.Title level={4} style={{ marginBottom: 4 }}>
              {values.title || "Untitled idea"}
            </Typography.Title>
            <Space wrap>
              <Tag>{values.shortLabel || "No short label yet"}</Tag>
              <Tag>Popularity {values.popularityScore ?? 0}/5</Tag>
              <Tag>Reuse {values.reuseScore ?? 0}/5</Tag>
            </Space>
          </div>
          <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 0 }}>
            {values.descriptionVi || "No Vietnamese description yet."}
          </Typography.Paragraph>
          <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 0 }}>
            {values.descriptionEn || "No English description yet."}
          </Typography.Paragraph>
        </Space>
      </Card>

      <div className={isMobile ? "stacked-view" : "question-bank-layout"}>
        <Card title={`Variants (${values.variants?.length ?? 0})`}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {(values.variants ?? []).length === 0 ? (
              <Typography.Text type="secondary">No band variants yet.</Typography.Text>
            ) : (
              (values.variants ?? []).map(
                (
                  variant: {
                    bandLevel?: number;
                    exampleSentence?: string;
                    phrase?: string;
                  },
                  index: number,
                ) => (
                  <Card key={`${variant.phrase}-${index}`} size="small">
                    <Typography.Text strong>
                      Band {variant.bandLevel ?? "?"}: {variant.phrase}
                    </Typography.Text>
                    <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 0 }}>
                      {variant.exampleSentence}
                    </Typography.Paragraph>
                  </Card>
                ),
              )
            )}
          </Space>
        </Card>

        <Card title={`Support Points (${values.supports?.length ?? 0})`}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {(values.supports ?? []).length === 0 ? (
              <Typography.Text type="secondary">No supporting points yet.</Typography.Text>
            ) : (
              (values.supports ?? []).map(
                (
                  support: {
                    example?: null | string;
                    supportType?: string;
                    text?: string;
                  },
                  index: number,
                ) => (
                  <Card key={`${support.text}-${index}`} size="small">
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Tag>
                        {support.supportType
                          ? SPEAKING_IDEA_SUPPORT_TYPE_LABELS[
                              support.supportType as keyof typeof SPEAKING_IDEA_SUPPORT_TYPE_LABELS
                            ]
                          : "Support"}
                      </Tag>
                      <Typography.Text className="wrap-anywhere">
                        {support.text}
                      </Typography.Text>
                      {support.example ? (
                        <Typography.Text type="secondary" className="wrap-anywhere">
                          Example: {support.example}
                        </Typography.Text>
                      ) : null}
                    </Space>
                  </Card>
                ),
              )
            )}
          </Space>
        </Card>
      </div>

      <div className={isMobile ? "stacked-view" : "question-bank-layout"}>
        <Card title={`Answer Patterns (${values.patterns?.length ?? 0})`}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {(values.patterns ?? []).length === 0 ? (
              <Typography.Text type="secondary">No answer patterns yet.</Typography.Text>
            ) : (
              (values.patterns ?? []).map(
                (
                  pattern: {
                    exampleAnswer?: string;
                    patternText?: string;
                    variablesJson?: string;
                  },
                  index: number,
                ) => (
                  <Card key={`${pattern.patternText}-${index}`} size="small">
                    <Typography.Text strong className="wrap-anywhere">
                      {pattern.patternText}
                    </Typography.Text>
                    {pattern.variablesJson ? (
                      <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 8 }}>
                        Variables: {pattern.variablesJson}
                      </Typography.Paragraph>
                    ) : null}
                    <Typography.Paragraph className="wrap-anywhere" style={{ marginBottom: 0 }}>
                      {pattern.exampleAnswer}
                    </Typography.Paragraph>
                  </Card>
                ),
              )
            )}
          </Space>
        </Card>

        <Card title={`Linked Questions (${values.questionMaps?.length ?? 0})`}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {(values.questionMaps ?? []).length === 0 ? (
              <Typography.Text type="secondary">No linked questions yet.</Typography.Text>
            ) : (
              (values.questionMaps ?? []).map(
                (
                  questionMap: {
                    aiReason?: null | string;
                    isPrimary?: boolean;
                    relevanceScore?: number;
                    speakingQuestionId?: string;
                  },
                  index: number,
                ) => {
                  const question = questionMap.speakingQuestionId
                    ? linkedQuestionLookup.get(questionMap.speakingQuestionId)
                    : undefined;

                  return (
                    <Card key={`${questionMap.speakingQuestionId}-${index}`} size="small">
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space wrap>
                          <Tag color={questionMap.isPrimary ? "green" : "default"}>
                            {questionMap.isPrimary ? "Primary" : "Secondary"}
                          </Tag>
                          <Tag>Relevance {questionMap.relevanceScore ?? 0}/5</Tag>
                          {question ? (
                            <Tag>
                              {IELTS_TASK_TYPE_LABELS[question.taskType]}
                            </Tag>
                          ) : null}
                        </Space>
                        <Typography.Text strong className="wrap-anywhere">
                          {question?.prompt ?? "Question not found"}
                        </Typography.Text>
                        <Typography.Text type="secondary" className="wrap-anywhere">
                          {[question?.topic, question?.subTopic].filter(Boolean).join(" · ")}
                        </Typography.Text>
                        {idea && question ? (
                          <Button
                            size="small"
                            onClick={() => setAnswerQuestionTarget(question)}
                            className="full-width-mobile"
                          >
                            Generate Answer
                          </Button>
                        ) : null}
                        {questionMap.aiReason ? (
                          <Typography.Text type="secondary" className="wrap-anywhere">
                            Reason: {questionMap.aiReason}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    </Card>
                  );
                },
              )
            )}
          </Space>
        </Card>
      </div>

      <Modal
        open={Boolean(answerQuestionTarget && idea)}
        onCancel={() => setAnswerQuestionTarget(null)}
        footer={null}
        width={840}
        destroyOnHidden
        title={
          answerQuestionTarget
            ? `Generate Answer · ${answerQuestionTarget.topic}`
            : "Generate Answer"
        }
      >
        {answerQuestionTarget && idea ? (
          <SpeakingIdeaAnswerGeneratorPanel
            idea={{
              id: idea.id,
              title: idea.title,
              shortLabel: idea.shortLabel,
              status: idea.status,
              reuseScore: idea.reuseScore,
              popularityScore: idea.popularityScore,
            }}
            question={answerQuestionTarget}
          />
        ) : null}
      </Modal>
    </div>
  );
}
