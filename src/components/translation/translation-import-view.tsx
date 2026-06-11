"use client";

import {
  CloudUploadOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  List,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import Link from "next/link";
import { useState } from "react";

import type { TranslationImportSummary } from "@/lib/types";

export function TranslationImportView() {
  const { message } = App.useApp();
  const [file, setFile] = useState<UploadFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TranslationImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file?.originFileObj) {
      message.warning("Choose a CSV file first.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file.originFileObj);

      const response = await fetch("/api/admin/translation/import", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        summary?: TranslationImportSummary;
        message?: string;
      };

      if (!response.ok) {
        if (data.summary) {
          setSummary(data.summary);
        }
        throw new Error(data.message ?? "Translation import failed.");
      }

      if (data.summary) {
        setSummary(data.summary);
        message.success("Translation CSV imported successfully.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Translation import failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Translation Recall — Import
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Admin-only. Upload a UTF-8 CSV file with headers:{" "}
          <Typography.Text code>title, topic, bandLevel, englishText, vietnameseText</Typography.Text>
          . Sentences for the same title/topic are grouped into one script. XLSX is not yet
          supported — export to CSV first.
        </Typography.Text>
      </div>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Upload
            accept=".csv,.CSV,text/csv"
            beforeUpload={(uploadFile) => {
              setFile({
                uid: uploadFile.uid,
                name: uploadFile.name,
                originFileObj: uploadFile,
              });
              return false;
            }}
            onRemove={() => {
              setFile(null);
              return true;
            }}
            fileList={file ? [file] : []}
            maxCount={1}
          >
            <Button icon={<CloudUploadOutlined />}>Choose CSV</Button>
          </Upload>
          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <CloudUploadOutlined />}
            loading={loading}
            disabled={loading || !file}
            onClick={() => void handleUpload()}
          >
            Upload translation CSV
          </Button>
          {errorMessage ? (
            <Alert type="warning" showIcon message={errorMessage} />
          ) : null}
        </Space>
      </Card>

      {summary ? (
        <Card title="Last import summary">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap size={24}>
              <Statistic title="Rows processed" value={summary.totalRows} />
              <Statistic title="Scripts created" value={summary.scriptsCreated} />
              <Statistic title="Scripts updated" value={summary.scriptsUpdated} />
              <Statistic title="Sentences saved" value={summary.sentencesCreated} />
            </Space>
            {summary.errors.length === 0 ? (
              <Tag color="green">No row errors.</Tag>
            ) : (
              <List
                size="small"
                header={<Typography.Text strong>Row errors</Typography.Text>}
                dataSource={summary.errors}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text>
                      {item.rowNumber ? `Row ${item.rowNumber}: ` : ""}
                      {item.message}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            )}
            <Button>
              <Link href="/translation">Open Translation Recall</Link>
            </Button>
          </Space>
        </Card>
      ) : null}
    </Space>
  );
}
