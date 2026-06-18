"use client";

import { EyeOutlined, NodeIndexOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  IELTS_TASK_TYPE_LABELS,
  SPEAKING_IDEA_STATUS_LABELS,
} from "@/lib/constants";
import {
  buildSpeakingIdeaMindMap,
  type SpeakingIdeaMapFilters,
} from "@/lib/speaking-idea-map";
import type { IeltsTaskType, SpeakingIdeaRecord, SpeakingIdeaStatus } from "@/lib/types";

export function SpeakingIdeaMapView({
  ideas,
}: {
  ideas: SpeakingIdeaRecord[];
}) {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string | undefined>();
  const [status, setStatus] = useState<SpeakingIdeaStatus | "ALL">("ACTIVE");
  const [minReuseScore, setMinReuseScore] = useState<number | undefined>(3);
  const [questionPart, setQuestionPart] = useState<IeltsTaskType | "ALL">("ALL");

  const { topicOptions, nodes } = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();
    const baseModel = buildSpeakingIdeaMindMap(ideas, {
      topic,
      status,
      minReuseScore,
      questionPart,
    } satisfies SpeakingIdeaMapFilters);

    if (!trimmedSearch) {
      return baseModel;
    }

    return {
      topicOptions: baseModel.topicOptions,
      nodes: baseModel.nodes.filter((node) =>
        [node.title, node.shortLabel, node.descriptionVi, node.descriptionEn]
          .join(" ")
          .toLowerCase()
          .includes(trimmedSearch),
      ),
    };
  }, [ideas, minReuseScore, questionPart, search, status, topic]);

  return (
    <div className="stacked-view">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Speaking Idea Map
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Visualize reusable IELTS Speaking ideas, their support branches, and the prompts they
            can serve before you write sample answers or map chunks.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<EyeOutlined />}>
            <Link href="/admin/ideas">Back to list</Link>
          </Button>
          <Button type="primary">
            <Link href="/admin/ideas/new">New idea</Link>
          </Button>
        </Space>
      </div>

      <Card title="Mind map filters">
        <div className="responsive-toolbar">
          <div className="responsive-toolbar__grow">
            <Input.Search
              allowClear
              placeholder="Search idea title or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="responsive-toolbar__actions">
            <Select
              value={status}
              onChange={(value) => setStatus(value)}
              options={[
                { label: "All statuses", value: "ALL" },
                { label: "Active", value: "ACTIVE" },
                { label: "Draft", value: "DRAFT" },
                { label: "Archived", value: "ARCHIVED" },
              ]}
              style={{ minWidth: 160 }}
            />
            <Select
              allowClear
              placeholder="Topic"
              value={topic}
              onChange={(value) => setTopic(value)}
              options={topicOptions.map((option) => ({ label: option, value: option }))}
              style={{ minWidth: 170 }}
            />
            <Select
              value={typeof minReuseScore === "number" ? minReuseScore : "ALL"}
              onChange={(value) =>
                setMinReuseScore(value === "ALL" ? undefined : Number(value))
              }
              options={[
                { label: "All reuse scores", value: "ALL" },
                { label: "3+ reuse", value: 3 },
                { label: "4+ reuse", value: 4 },
                { label: "5 reuse", value: 5 },
              ]}
              style={{ minWidth: 170 }}
            />
            <Select
              value={questionPart}
              onChange={(value) => setQuestionPart(value)}
              options={[
                { label: "All question parts", value: "ALL" },
                { label: IELTS_TASK_TYPE_LABELS.PART_1, value: "PART_1" },
                { label: IELTS_TASK_TYPE_LABELS.PART_2, value: "PART_2" },
                { label: IELTS_TASK_TYPE_LABELS.PART_3, value: "PART_3" },
              ]}
              style={{ minWidth: 190 }}
            />
          </div>
        </div>
      </Card>

      {nodes.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No idea nodes match the current filters."
            style={{ marginBlock: 32 }}
          />
        </Card>
      ) : (
        <div className="idea-map-grid">
          {nodes.map((node) => (
            <Card
              key={node.id}
              className={`idea-map-card idea-map-card--${node.nodeSize}`}
              title={
                <div className="idea-map-card__title">
                  <div className={`idea-map-node idea-map-node--${node.nodeSize}`}>
                    <span>{node.shortLabel}</span>
                  </div>
                  <div>
                    <Typography.Text strong className="wrap-anywhere">
                      {node.title}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary" className="wrap-anywhere">
                        {node.descriptionEn}
                      </Typography.Text>
                    </div>
                  </div>
                </div>
              }
              extra={
                <Tag
                  color={
                    node.status === "ACTIVE"
                      ? "green"
                      : node.status === "DRAFT"
                        ? "gold"
                        : "default"
                  }
                >
                  {SPEAKING_IDEA_STATUS_LABELS[node.status]}
                </Tag>
              }
            >
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="blue">Reuse {node.reuseScore}/5</Tag>
                  <Tag color="purple">Popularity {node.popularityScore}/5</Tag>
                  <Tag color="cyan">{node.questionCount} linked question(s)</Tag>
                </Space>

                <div className="idea-map-branches">
                  <div className="idea-map-branch">
                    <Typography.Text strong>Band variants</Typography.Text>
                    <div className="idea-map-branch-list">
                      {node.variants.length === 0 ? (
                        <Typography.Text type="secondary">No variants yet</Typography.Text>
                      ) : (
                        node.variants.map((variant) => (
                          <div key={variant.id} className="idea-map-leaf">
                            <Tag>Band {variant.bandLevel}</Tag>
                            <span className="wrap-anywhere">{variant.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="idea-map-branch">
                    <Typography.Text strong>Support points</Typography.Text>
                    <div className="idea-map-branch-list">
                      {node.supports.length === 0 ? (
                        <Typography.Text type="secondary">No support points yet</Typography.Text>
                      ) : (
                        node.supports.map((support) => (
                          <div key={support.id} className="idea-map-leaf">
                            <Tag color="geekblue">{support.supportType}</Tag>
                            <span className="wrap-anywhere">{support.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="idea-map-branch">
                    <Typography.Text strong>Linked questions</Typography.Text>
                    <div className="idea-map-branch-list">
                      {node.questions.length === 0 ? (
                        <Typography.Text type="secondary">No linked questions yet</Typography.Text>
                      ) : (
                        node.questions.map((question) => (
                          <div key={question.id} className="idea-map-leaf">
                            <Tag color={question.isPrimary ? "green" : "default"}>
                              {IELTS_TASK_TYPE_LABELS[question.taskType]}
                            </Tag>
                            <span className="wrap-anywhere">{question.topic}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="idea-map-footer">
                  <Space wrap>
                    {node.topics.map((nodeTopic) => (
                      <Tag key={nodeTopic}>{nodeTopic}</Tag>
                    ))}
                  </Space>
                  <Button type="primary" icon={<NodeIndexOutlined />}>
                    <Link href={node.href}>Open idea detail</Link>
                  </Button>
                </div>
              </Space>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
