"use client";

import { LoadingOutlined, RobotOutlined, SyncOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Space, Typography } from "antd";
import { useState } from "react";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";
import { AiStructuredSections } from "@/components/ai/ai-structured-sections";
import type { AiStudyCoachSnapshotRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function AiStudyCoachView({
  enabled,
  initialSnapshot,
}: {
  enabled: boolean;
  initialSnapshot: AiStudyCoachSnapshotRecord | null;
}) {
  const [snapshot, setSnapshot] = useState<AiStudyCoachSnapshotRecord | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/ai-tutor/study-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          forceRefresh: true,
        }),
      });
      const data = (await response.json()) as AiStudyCoachSnapshotRecord & {
        message?: string;
      };

      if (!response.ok || !data.id) {
        throw new Error(data.message ?? "AI Study Coach is unavailable.");
      }

      setSnapshot(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI Study Coach is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          AI Study Coach
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Get a concise diagnosis and a 7-day IELTS Speaking plan based on your real progress data.
        </Typography.Text>
      </div>

      {!enabled ? (
        <Alert
          type="warning"
          showIcon
          message="AI Study Coach is not configured"
          description="Set AI chatflow environment variables on the server before using this feature."
        />
      ) : null}

      <Card
        title="Latest study plan"
        extra={
          <Button
            icon={loading ? <LoadingOutlined /> : <SyncOutlined />}
            onClick={() => void refresh()}
            loading={loading}
            disabled={!enabled}
          >
            Refresh plan
          </Button>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {error ? (
            <Alert
              type="warning"
              showIcon
              message="AI Study Coach is unavailable"
              description={error}
            />
          ) : null}

          {snapshot ? (
            <>
              <Space wrap>
                <Button
                  icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
                  onClick={() => void refresh()}
                  loading={loading}
                  disabled={!enabled}
                >
                  Regenerate guidance
                </Button>
                <Typography.Text type="secondary">
                  Generated: {formatDateTime(snapshot.generatedAt)}
                </Typography.Text>
                {snapshot.expiresAt ? (
                  <Typography.Text type="secondary">
                    Cached until: {formatDateTime(snapshot.expiresAt)}
                  </Typography.Text>
                ) : null}
              </Space>

              {snapshot.sections?.length ? (
                <AiStructuredSections sections={snapshot.sections} />
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="AI Study Coach response"
                  description={<AiMarkdownMessage content={snapshot.answer} />}
                />
              )}
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message="No study coach snapshot yet"
              description="Generate your first AI study plan to see personalized weaknesses and review priorities."
            />
          )}
        </Space>
      </Card>
    </div>
  );
}
