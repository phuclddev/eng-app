"use client";

import {
  CloudUploadOutlined,
  PlusOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TranslationScriptForm } from "@/components/translation/translation-script-form";
import type {
  TranslationScriptRecord,
  TranslationScriptSummary,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function TranslationListView({
  scripts,
  isAdmin,
}: {
  scripts: TranslationScriptSummary[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const handleSaved = (script: TranslationScriptRecord) => {
    router.push(`/translation/${script.id}`);
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Translation Recall Lab
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Convert Vietnamese meaning into spoken English. Hover or tap to reveal the English, save
          chunks straight to your IELTS library, then practice silently in Speaking mode.
        </Typography.Text>
      </div>

      {isAdmin ? (
        <Card>
          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddOpen(true)}
            >
              Add Script
            </Button>
            <Button icon={<CloudUploadOutlined />}>
              <Link href="/admin/translation">Import translation CSV</Link>
            </Button>
            <Typography.Text type="secondary">
              CSV headers: title, topic, bandLevel, englishText, vietnameseText. Manual create lets
              you paste sentence pairs one line at a time.
            </Typography.Text>
          </Space>
        </Card>
      ) : null}

      {scripts.length === 0 ? (
        <Card>
          <Empty
            description={
              isAdmin
                ? "No translation scripts yet. Tap Add Script to create one manually, or import a CSV."
                : "No translation scripts yet. Ask an admin to import a CSV or add a script."
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {scripts.map((script) => (
            <Col key={script.id} xs={24} md={12} xl={8}>
              <Card
                title={script.title}
                extra={
                  <Tag color="cyan">Band {script.bandLevel.toFixed(1)}</Tag>
                }
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space wrap>
                    <Tag color="blue">{script.topic}</Tag>
                    <Tag>{script.sentenceCount} sentences</Tag>
                    <Tag color={script.reviewedCount > 0 ? "green" : "default"}>
                      {script.reviewedCount}/{script.sentenceCount} reviewed
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary">
                    Updated {formatDateTime(script.updatedAt)}
                  </Typography.Text>
                  <Button type="primary" icon={<ReadOutlined />}>
                    <Link href={`/translation/${script.id}`}>Open script</Link>
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <TranslationScriptForm
        mode="CREATE"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleSaved}
      />
    </Space>
  );
}
