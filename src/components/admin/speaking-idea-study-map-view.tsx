"use client";

import { ArrowLeftOutlined, EditOutlined, FullscreenOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import Link from "next/link";

import { SpeakingIdeaMindMapRenderer } from "@/components/admin/speaking-idea-mind-map-renderer";
import {
  buildSpeakingIdeaMindMapExportBaseName,
  getSpeakingIdeaMindMapRecord,
} from "@/lib/speaking-idea-mindmap-source";
import type { SpeakingIdeaRecord } from "@/lib/types";

export function SpeakingIdeaStudyMapView({
  idea,
}: {
  idea: SpeakingIdeaRecord;
}) {
  const record = getSpeakingIdeaMindMapRecord(idea);
  const exportBaseName = buildSpeakingIdeaMindMapExportBaseName(idea);

  return (
    <div className="stacked-view stacked-view--wide">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Study Map
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Use this clean study page to memorize one reusable IELTS Speaking idea at a time.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />}>
            <Link href="/admin/ideas/map">Back to map</Link>
          </Button>
          <Button icon={<EditOutlined />}>
            <Link href={`/admin/ideas/${idea.id}`}>Open editor</Link>
          </Button>
          <Button icon={<FullscreenOutlined />} onClick={() => document.documentElement.requestFullscreen?.()}>
            Full screen
          </Button>
        </Space>
      </div>

      <SpeakingIdeaMindMapRenderer
        title={record.renderedTitle || idea.title}
        sourceText={record.sourceText}
        exportBaseName={exportBaseName}
        sourceType={record.sourceType}
        printEnabled
        className="speaking-idea-study-map-card"
      />
    </div>
  );
}
