"use client";

import { Card, Empty, Grid, Input, List, Select, Space, Tag, Typography } from "antd";
import { useState } from "react";

import {
  IELTS_SKILL_LABELS,
  IELTS_TASK_TYPE_LABELS,
  QUESTION_CHUNK_USAGE_ROLE_LABELS,
} from "@/lib/constants";
import type { IeltsQuestionRecord, IeltsTaskType } from "@/lib/types";

export function QuestionBankView({
  questions,
}: {
  questions: IeltsQuestionRecord[];
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [search, setSearch] = useState("");
  const [taskType, setTaskType] = useState<IeltsTaskType | undefined>();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>(
    questions[0]?.id,
  );

  const filteredQuestions = questions.filter((question) => {
    const matchesTask = taskType ? question.taskType === taskType : true;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [question.prompt, question.topic, question.subTopic ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesTask && matchesSearch;
  });

  const selectedQuestion =
    filteredQuestions.find((question) => question.id === selectedQuestionId) ??
    filteredQuestions[0];
  const activeQuestionId = selectedQuestion?.id;

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Question Bank
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Pick an IELTS speaking question and review the recommended chunks before answering.
        </Typography.Text>
      </div>

      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div className="responsive-toolbar">
          <Input.Search
            className="responsive-toolbar__grow"
            allowClear
            placeholder="Search question, topic, or sub-topic"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select<IeltsTaskType>
            className={isMobile ? "full-width-mobile" : undefined}
            allowClear
            placeholder="Filter by speaking part"
            value={taskType}
            onChange={(value) => setTaskType(value)}
            style={isMobile ? undefined : { width: 220 }}
            options={[
              { label: IELTS_TASK_TYPE_LABELS.PART_1, value: "PART_1" },
              { label: IELTS_TASK_TYPE_LABELS.PART_2, value: "PART_2" },
              { label: IELTS_TASK_TYPE_LABELS.PART_3, value: "PART_3" },
            ]}
          />
        </div>

        <div className="question-bank-layout">
          <Card title="Questions">
            {filteredQuestions.length === 0 ? (
              <Empty
                description="No questions match your current filters."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={filteredQuestions}
                renderItem={(question) => (
                  <List.Item
                    onClick={() => setSelectedQuestionId(question.id)}
                    className={[
                      "question-list-item",
                      question.id === activeQuestionId ? "question-list-item-active" : "",
                    ].join(" ").trim()}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color="blue">
                            {IELTS_TASK_TYPE_LABELS[question.taskType]}
                          </Tag>
                          <Tag>{question.topic}</Tag>
                          {question.subTopic ? <Tag>{question.subTopic}</Tag> : null}
                        </Space>
                      }
                      description={
                        <Typography.Text className="wrap-anywhere">
                          {question.prompt}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title="Recommended chunks">
            {!selectedQuestion ? (
              <Empty
                description="Select a question to inspect its recommended chunks."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="geekblue">
                    {IELTS_SKILL_LABELS[selectedQuestion.skill]}
                  </Tag>
                  <Tag color="cyan">
                    {IELTS_TASK_TYPE_LABELS[selectedQuestion.taskType]}
                  </Tag>
                  <Tag>Difficulty {selectedQuestion.difficulty}</Tag>
                  <Tag color="purple">Band {selectedQuestion.targetBand.toFixed(1)}</Tag>
                  <Tag>{selectedQuestion.topic}</Tag>
                  {selectedQuestion.subTopic ? <Tag>{selectedQuestion.subTopic}</Tag> : null}
                </Space>

                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedQuestion.prompt}
                </Typography.Title>

                {selectedQuestion.supportingPoints.length > 0 ? (
                  <div>
                    <Typography.Text strong>Prompt support</Typography.Text>
                    <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                      {selectedQuestion.supportingPoints.map((point) => (
                        <li key={point}>
                          <Typography.Text>{point}</Typography.Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedQuestion.recommendations.length === 0 ? (
                  <Empty
                    description="No recommended chunks have been mapped to this question yet."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    dataSource={selectedQuestion.recommendations}
                    renderItem={(recommendation) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space wrap>
                              <Typography.Text strong>
                                {recommendation.chunk.chunk}
                              </Typography.Text>
                              <Tag color="gold">
                                {QUESTION_CHUNK_USAGE_ROLE_LABELS[recommendation.usageRole]}
                              </Tag>
                              {recommendation.chunk.topic ? (
                                <Tag>{recommendation.chunk.topic}</Tag>
                              ) : null}
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={6}>
                          <Typography.Text type="secondary">
                                {recommendation.chunk.meaningVi}
                              </Typography.Text>
                              <Typography.Text className="wrap-anywhere">
                                Example chunk usage: {recommendation.chunk.example}
                              </Typography.Text>
                              {recommendation.exampleSentence ? (
                                <Typography.Text className="wrap-anywhere">
                                  Suggested response sentence: {recommendation.exampleSentence}
                                </Typography.Text>
                              ) : null}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            )}
          </Card>
        </div>
      </Space>
    </div>
  );
}
