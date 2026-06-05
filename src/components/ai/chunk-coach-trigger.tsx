"use client";

import { LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Grid, Space, Typography } from "antd";
import { useState } from "react";

import { AiStructuredSections } from "@/components/ai/ai-structured-sections";
import type { AiTutorStructuredFeedbackSection } from "@/lib/types";

export function ChunkCoachTrigger({
  chunkId,
  chunkLabel,
  disabled = false,
  block = false,
  size,
  type,
}: {
  chunkId: string;
  chunkLabel: string;
  disabled?: boolean;
  block?: boolean;
  size?: "small" | "middle" | "large";
  type?: "default" | "primary" | "text" | "link";
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>();
  const [sections, setSections] = useState<AiTutorStructuredFeedbackSection[]>();
  const [error, setError] = useState<string>();

  const loadCoach = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/ai-tutor/chunk-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunkId,
        }),
      });
      const data = (await response.json()) as {
        answer?: string;
        sections?: AiTutorStructuredFeedbackSection[];
        message?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.message ?? "AI Chunk Coach is unavailable.");
      }

      setAnswer(data.answer);
      setSections(data.sections);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI Chunk Coach is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);

    if (!answer && !loading) {
      void loadCoach();
    }
  };

  return (
    <>
      <Button
        icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
        onClick={handleOpen}
        disabled={disabled}
        loading={loading}
        block={block}
        size={size}
        type={type}
      >
        Explain with AI
      </Button>

      <Drawer
        title={`AI Chunk Coach: ${chunkLabel}`}
        width={isMobile ? "100%" : 560}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Button
            icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
            onClick={() => void loadCoach()}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Get concise IELTS Speaking guidance for when to use this chunk naturally.
          </Typography.Text>

          {error ? (
            <Alert
              type="warning"
              showIcon
              message="AI Chunk Coach is unavailable"
              description={error}
            />
          ) : null}

          {sections?.length ? (
            <AiStructuredSections sections={sections} />
          ) : answer ? (
            <Alert
              type="info"
              showIcon
              message="AI explanation"
              description={
                <Typography.Paragraph
                  className="wrap-anywhere"
                  style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
                >
                  {answer}
                </Typography.Paragraph>
              }
            />
          ) : null}
        </Space>
      </Drawer>
    </>
  );
}
