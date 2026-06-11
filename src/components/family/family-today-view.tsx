"use client";

import {
  BookOutlined,
  HeartFilled,
  HeartOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Grid,
  List,
  Row,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import {
  FAMILY_CHILD_FOCUS,
  FAMILY_CHILD_FOCUS_LABELS,
  FAMILY_ROLEPLAY_ROLE_LABELS,
} from "@/lib/constants";
import type {
  FamilyChildFocus,
  FamilyDailyPlanRecord,
  FamilyFavoriteRecord,
  FamilyTodayRecommendations,
} from "@/lib/types";

type FavoriteToggleTargetType = "CONVERSATION" | "CHUNK" | "SCENARIO";

export function FamilyTodayView({
  initialPlan,
  initialRecommendations,
  initialFavorites,
  aiEnabled,
}: {
  initialPlan: FamilyDailyPlanRecord | null;
  initialRecommendations: FamilyTodayRecommendations;
  initialFavorites: FamilyFavoriteRecord[];
  aiEnabled: boolean;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();

  const [plan, setPlan] = useState(initialPlan);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [childFocus, setChildFocus] = useState<FamilyChildFocus>(
    initialRecommendations.childFocus,
  );
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | undefined>();
  const [favorites, setFavorites] = useState(initialFavorites);
  const [favoritePending, setFavoritePending] = useState<string | null>(null);

  const favoriteKey = (
    targetType: FavoriteToggleTargetType,
    targetId: string,
  ) => `${targetType}:${targetId}`;
  const favoriteIds = new Set(
    favorites.map((favorite) =>
      favoriteKey(
        favorite.targetType as FavoriteToggleTargetType,
        favorite.targetId,
      ),
    ),
  );

  const isFavorited = (
    targetType: FavoriteToggleTargetType,
    targetId: string,
  ) => favoriteIds.has(favoriteKey(targetType, targetId));

  const loadPlan = async (nextChildFocus: FamilyChildFocus, force = false) => {
    if (!aiEnabled) {
      message.warning("AI is not configured on this server.");
      return;
    }

    setPlanLoading(true);
    setPlanError(undefined);

    try {
      const response = await fetch("/api/family/today/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childFocus: nextChildFocus,
          forceRefresh: force,
        }),
      });
      const data = (await response.json()) as {
        plan?: FamilyDailyPlanRecord;
        recommendations?: FamilyTodayRecommendations;
        message?: string;
      };

      if (!response.ok || !data.plan || !data.recommendations) {
        throw new Error(data.message ?? "Could not generate today's plan.");
      }

      setPlan(data.plan);
      setRecommendations(data.recommendations);
      message.success(
        data.plan.cached ? "Plan loaded from cache." : "Today's plan ready.",
      );
    } catch (error) {
      setPlanError(
        error instanceof Error
          ? error.message
          : "Could not generate today's plan.",
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const onChildFocusChange = async (next: FamilyChildFocus) => {
    setChildFocus(next);
    setRecommendations((current) => ({ ...current, childFocus: next }));

    if (next !== plan?.childFocus) {
      setPlan(null);
    }
  };

  const toggleFavorite = async (input: {
    targetType: FavoriteToggleTargetType;
    targetId: string;
    label: string;
    detail: string | null;
  }) => {
    const key = favoriteKey(input.targetType, input.targetId);
    setFavoritePending(key);

    try {
      const already = favoriteIds.has(key);
      if (already) {
        const response = await fetch("/api/family/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: input.targetType,
            targetId: input.targetId,
          }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { message?: string };
          throw new Error(data.message ?? "Could not remove favorite.");
        }
        setFavorites((current) =>
          current.filter(
            (favorite) =>
              !(
                favorite.targetType === input.targetType &&
                favorite.targetId === input.targetId
              ),
          ),
        );
        message.success("Removed from favorites.");
      } else {
        const response = await fetch("/api/family/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: input.targetType,
            targetId: input.targetId,
          }),
        });
        const data = (await response.json()) as {
          favorite?: FamilyFavoriteRecord;
          message?: string;
        };
        if (!response.ok || !data.favorite) {
          throw new Error(data.message ?? "Could not save favorite.");
        }
        setFavorites((current) => [
          {
            ...data.favorite!,
            label: input.label,
            detail: input.detail,
          },
          ...current,
        ]);
        message.success("Added to favorites.");
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not update favorite.",
      );
    } finally {
      setFavoritePending(null);
    }
  };

  const heroStats = [
    { label: "Due reviews", value: recommendations.dueReviewCount },
    { label: "Weak chunks", value: recommendations.weakChunkCount },
    { label: "Approved chunks", value: recommendations.approvedChunkCount },
    {
      label: "Recommended for today",
      value: recommendations.recommendedChunks.length,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Today&apos;s Family Plan
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Personalized for Phuc&apos;s family English practice. No IELTS metrics mixed in.
        </Typography.Text>
      </div>

      <Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space wrap>
            <Typography.Text strong>Today focus on</Typography.Text>
            <Segmented
              value={childFocus}
              onChange={(value) =>
                void onChildFocusChange(value as FamilyChildFocus)
              }
              options={FAMILY_CHILD_FOCUS.map((focus) => ({
                value: focus,
                label: FAMILY_CHILD_FOCUS_LABELS[focus],
              }))}
            />
          </Space>
          <Row gutter={[16, 16]}>
            {heroStats.map((stat) => (
              <Col key={stat.label} xs={12} md={6}>
                <Statistic title={stat.label} value={stat.value} />
              </Col>
            ))}
          </Row>
          <Space wrap>
            <Button
              type="primary"
              icon={planLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
              onClick={() => void loadPlan(childFocus, true)}
              loading={planLoading}
              disabled={planLoading || !aiEnabled}
              className="full-width-mobile"
            >
              {plan ? "Refresh today's plan" : "Generate today's plan"}
            </Button>
            {!plan && !planLoading ? (
              <Button onClick={() => void loadPlan(childFocus, false)}>
                Load latest plan
              </Button>
            ) : null}
            {!aiEnabled ? (
              <Tag color="warning">AI not configured</Tag>
            ) : null}
          </Space>
          {planError ? (
            <Alert
              type="warning"
              showIcon
              message="Could not generate today's plan"
              description={planError}
            />
          ) : null}
          {plan ? (
            <Card size="small" title="Family coach plan">
              <AiMarkdownMessage content={plan.answer} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {plan.cached
                  ? "Cached for today; refresh to regenerate."
                  : "Freshly generated."}
              </Typography.Text>
            </Card>
          ) : (
            <Alert
              type="info"
              showIcon
              message="No plan yet"
              description="Tap Generate today's plan to get a personalized Markdown coach plan from AI."
            />
          )}
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Today's Scenario"
            extra={
              recommendations.recommendedScenario ? (
                <Button
                  type="text"
                  icon={
                    isFavorited(
                      "SCENARIO",
                      recommendations.recommendedScenario.id,
                    ) ? (
                      <HeartFilled style={{ color: "#eb2f96" }} />
                    ) : (
                      <HeartOutlined />
                    )
                  }
                  loading={
                    favoritePending ===
                    favoriteKey(
                      "SCENARIO",
                      recommendations.recommendedScenario.id,
                    )
                  }
                  onClick={() => {
                    if (!recommendations.recommendedScenario) {
                      return;
                    }
                    void toggleFavorite({
                      targetType: "SCENARIO",
                      targetId: recommendations.recommendedScenario.id,
                      label: recommendations.recommendedScenario.title,
                      detail: recommendations.recommendedScenario.category,
                    });
                  }}
                />
              ) : null
            }
          >
            {recommendations.recommendedScenario ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>
                  {recommendations.recommendedScenario.title}
                </Typography.Text>
                <Space wrap>
                  <Tag color="blue">
                    {recommendations.recommendedScenario.category}
                  </Tag>
                  <Tag color="purple">
                    {
                      FAMILY_CHILD_FOCUS_LABELS[
                        recommendations.recommendedScenario.childFocus
                      ]
                    }
                  </Tag>
                  <Tag>
                    Difficulty {recommendations.recommendedScenario.difficulty}/5
                  </Tag>
                  <Tag color="cyan">
                    {recommendations.recommendedScenario.reason}
                  </Tag>
                </Space>
                <Typography.Paragraph className="wrap-anywhere">
                  {recommendations.recommendedScenario.description}
                </Typography.Paragraph>
                <Button type="primary">
                  <Link href="/family/scenarios">Open scenarios</Link>
                </Button>
              </Space>
            ) : (
              <Empty
                description="Create a family scenario to unlock recommendations."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button>
                  <Link href="/family/scenarios">Open scenarios</Link>
                </Button>
              </Empty>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Today's Conversation"
            extra={
              recommendations.recommendedConversation ? (
                <Button
                  type="text"
                  icon={
                    isFavorited(
                      "CONVERSATION",
                      recommendations.recommendedConversation.id,
                    ) ? (
                      <HeartFilled style={{ color: "#eb2f96" }} />
                    ) : (
                      <HeartOutlined />
                    )
                  }
                  loading={
                    favoritePending ===
                    favoriteKey(
                      "CONVERSATION",
                      recommendations.recommendedConversation.id,
                    )
                  }
                  onClick={() => {
                    if (!recommendations.recommendedConversation) {
                      return;
                    }
                    void toggleFavorite({
                      targetType: "CONVERSATION",
                      targetId: recommendations.recommendedConversation.id,
                      label: recommendations.recommendedConversation.title,
                      detail:
                        recommendations.recommendedConversation.scenarioTitle,
                    });
                  }}
                />
              ) : null
            }
          >
            {recommendations.recommendedConversation ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>
                  {recommendations.recommendedConversation.title}
                </Typography.Text>
                <Tag color="blue">
                  {recommendations.recommendedConversation.scenarioTitle}
                </Tag>
                <Tag color="purple">
                  {
                    FAMILY_CHILD_FOCUS_LABELS[
                      recommendations.recommendedConversation.childFocus
                    ]
                  }
                </Tag>
                <Button type="primary" icon={<BookOutlined />}>
                  <Link href="/family/conversations">Open conversations</Link>
                </Button>
              </Space>
            ) : (
              <Empty
                description="Generate a conversation first."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button>
                  <Link href="/family/conversations">Open conversations</Link>
                </Button>
              </Empty>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Today's Chunks">
            {recommendations.recommendedChunks.length === 0 ? (
              <Empty
                description="Approve more family chunks to unlock daily picks."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button>
                  <Link href="/family/chunks">Open family chunks</Link>
                </Button>
              </Empty>
            ) : (
              <List
                size={isMobile ? "small" : "default"}
                dataSource={recommendations.recommendedChunks}
                renderItem={(chunk) => (
                  <List.Item
                    actions={[
                      <Button
                        key="favorite"
                        type="text"
                        icon={
                          isFavorited("CHUNK", chunk.id) ? (
                            <HeartFilled style={{ color: "#eb2f96" }} />
                          ) : (
                            <HeartOutlined />
                          )
                        }
                        loading={favoritePending === favoriteKey("CHUNK", chunk.id)}
                        onClick={() =>
                          void toggleFavorite({
                            targetType: "CHUNK",
                            targetId: chunk.id,
                            label: chunk.text,
                            detail: chunk.meaningVi,
                          })
                        }
                      />,
                    ]}
                  >
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Space wrap>
                        <Typography.Text strong>{chunk.text}</Typography.Text>
                        <Tag color="cyan">{chunk.reason}</Tag>
                        {chunk.masteryScore !== null ? (
                          <Tag>{chunk.masteryScore}/100 mastery</Tag>
                        ) : (
                          <Tag color="orange">new</Tag>
                        )}
                      </Space>
                      <Typography.Text className="wrap-anywhere">
                        {chunk.meaningVi}
                      </Typography.Text>
                      {chunk.exampleSentence ? (
                        <Typography.Text type="secondary" className="wrap-anywhere">
                          {chunk.exampleSentence}
                        </Typography.Text>
                      ) : null}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Today's Roleplay">
            {recommendations.recommendedRoleplay ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="cyan">
                    You: {FAMILY_ROLEPLAY_ROLE_LABELS[recommendations.recommendedRoleplay.userRole]}
                  </Tag>
                  <Tag color="purple">
                    AI: {FAMILY_ROLEPLAY_ROLE_LABELS[recommendations.recommendedRoleplay.aiRole]}
                  </Tag>
                  <Tag>
                    {
                      FAMILY_CHILD_FOCUS_LABELS[
                        recommendations.recommendedRoleplay.childFocus
                      ]
                    }
                  </Tag>
                </Space>
                <Typography.Text type="secondary" className="wrap-anywhere">
                  {recommendations.recommendedRoleplay.reason}
                </Typography.Text>
                {recommendations.recommendedRoleplay.scenarioTitle ? (
                  <Typography.Text>
                    Scenario: {recommendations.recommendedRoleplay.scenarioTitle}
                  </Typography.Text>
                ) : null}
                <Button type="primary" icon={<RobotOutlined />}>
                  <Link href="/family/roleplay">Start roleplay</Link>
                </Button>
              </Space>
            ) : (
              <Empty
                description="No roleplay recommendation yet."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Today's Review">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Typography.Text>
                {recommendations.dueReviewCount} family chunks are due for review today.
              </Typography.Text>
              <Space wrap>
                <Button type="primary" icon={<ReadOutlined />}>
                  <Link href="/family/practice">Open family practice</Link>
                </Button>
                <Button icon={<PlayCircleOutlined />}>
                  <Link href="/family/practice">Quick start review</Link>
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
