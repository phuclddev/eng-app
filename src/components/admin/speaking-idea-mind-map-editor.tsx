"use client";

import {
  BulbOutlined,
  CopyOutlined,
  RobotOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Typography,
} from "antd";
import { useMemo, useState, useTransition } from "react";

import { SpeakingIdeaMindMapRenderer } from "@/components/admin/speaking-idea-mind-map-renderer";
import {
  buildSpeakingIdeaMindMapExportBaseName,
  formatSpeakingIdeaMindMapSource,
  generateSpeakingIdeaMindMapSource,
} from "@/lib/speaking-idea-mindmap-source";
import type { SpeakingIdeaRecord } from "@/lib/types";
import { saveSpeakingIdeaMindMapAction } from "@/server/actions/admin";

export function SpeakingIdeaMindMapEditor({
  idea,
}: {
  idea: SpeakingIdeaRecord;
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const generatedSource = useMemo(() => generateSpeakingIdeaMindMapSource(idea), [idea]);
  const [sourceText, setSourceText] = useState(idea.mindMapSourceText ?? generatedSource);

  const exportBaseName = useMemo(
    () => buildSpeakingIdeaMindMapExportBaseName(idea),
    [idea],
  );

  const save = () => {
    const normalizedSource = formatSpeakingIdeaMindMapSource(sourceText);

    startTransition(async () => {
      const result = await saveSpeakingIdeaMindMapAction({
        ideaId: idea.id,
        sourceType: "MERMAID",
        sourceText: normalizedSource,
        renderedTitle: idea.mindMapRenderedTitle ?? idea.shortLabel ?? idea.title,
      });

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      setSourceText(normalizedSource);
      message.success(result.message);
    });
  };

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(sourceText);
      message.success("Mind map source copied.");
    } catch {
      message.error("Could not copy the source.");
    }
  };

  return (
    <Card
      title="Mind Map Editor"
      extra={
        <Space wrap>
          <Button icon={<BulbOutlined />} onClick={() => setSourceText(generatedSource)}>
            Generate mind map source
          </Button>
          <Button icon={<RobotOutlined />} onClick={() => message.info("AI improvement preview is the next safe step and is intentionally not auto-saving yet.")}>
            Improve map with AI
          </Button>
          <Button icon={<CopyOutlined />} onClick={() => void copySource()}>
            Copy source
          </Button>
          <Button icon={<SaveOutlined />} type="primary" loading={isPending} onClick={save}>
            Save
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Edit a Mermaid source version of this idea map by hand, keep your own custom study
        structure, and export it as SVG or PNG without changing the underlying speaking-idea
        data.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={11}>
          <Card
            size="small"
            title="Source"
            extra={
              <Space wrap>
                <Button size="small" onClick={() => setSourceText(generatedSource)}>
                  Reset from idea data
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    setSourceText((current) => formatSpeakingIdeaMindMapSource(current))
                  }
                >
                  Format source
                </Button>
              </Space>
            }
          >
            <Input.TextArea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              autoSize={{ minRows: 24, maxRows: 36 }}
              className="speaking-idea-source-editor"
              spellCheck={false}
            />
          </Card>
        </Col>
        <Col xs={24} xl={13}>
          <SpeakingIdeaMindMapRenderer
            title="Live preview"
            sourceText={sourceText}
            exportBaseName={exportBaseName}
            sourceType="MERMAID"
            showSourceCopy
            studyHref={`/admin/ideas/${idea.id}/study-map`}
          />
        </Col>
      </Row>
    </Card>
  );
}
