"use client";

import {
  DeleteOutlined,
  LoadingOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

import { normalizeAiTextForDisplay } from "@/lib/text-cleanup";
import type { TranslationScriptRecord } from "@/lib/types";

type SentencePair = { english: string; vietnamese: string };

type FormValues = {
  title: string;
  topic: string;
  bandLevel: number;
};

function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export type TranslationScriptFormResult = {
  script?: TranslationScriptRecord;
  message?: string;
  ok: boolean;
};

type Mode = "CREATE" | "EDIT";

export function TranslationScriptForm({
  mode,
  open,
  initialScript,
  onClose,
  onSaved,
}: {
  mode: Mode;
  open: boolean;
  initialScript?: TranslationScriptRecord | null;
  onClose: () => void;
  onSaved: (script: TranslationScriptRecord) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [englishText, setEnglishText] = useState("");
  const [vietnameseText, setVietnameseText] = useState("");
  const [pairs, setPairs] = useState<SentencePair[]>([]);
  const [previewActive, setPreviewActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the form state whenever the modal is opened. This is the
  // canonical "controlled modal" pattern; the React 19 lint rule flags the
  // setState calls but they are intentional and bounded by the `open` guard.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "EDIT" && initialScript) {
      form.setFieldsValue({
        title: initialScript.title,
        topic: initialScript.topic,
        bandLevel: initialScript.bandLevel,
      });
      const englishLines = initialScript.sentences.map((s) =>
        normalizeAiTextForDisplay(s.englishText),
      );
      const vietnameseLines = initialScript.sentences.map((s) =>
        normalizeAiTextForDisplay(s.vietnameseText),
      );
      setEnglishText(englishLines.join("\n"));
      setVietnameseText(vietnameseLines.join("\n"));
      setPairs(
        initialScript.sentences.map((sentence) => ({
          english: normalizeAiTextForDisplay(sentence.englishText),
          vietnamese: normalizeAiTextForDisplay(sentence.vietnameseText),
        })),
      );
      setPreviewActive(true);
    } else {
      form.resetFields();
      form.setFieldsValue({ bandLevel: 6 });
      setEnglishText("");
      setVietnameseText("");
      setPairs([]);
      setPreviewActive(false);
    }
    setError(null);
  }, [form, initialScript, mode, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const englishLines = useMemo(() => splitLines(englishText), [englishText]);
  const vietnameseLines = useMemo(
    () => splitLines(vietnameseText),
    [vietnameseText],
  );
  const lineMismatch = englishLines.length !== vietnameseLines.length;

  const buildPairsFromLines = () => {
    if (englishLines.length === 0 || vietnameseLines.length === 0) {
      message.warning("Add English and Vietnamese text first.");
      return;
    }
    const length = Math.max(englishLines.length, vietnameseLines.length);
    const next: SentencePair[] = [];
    for (let index = 0; index < length; index += 1) {
      next.push({
        english: englishLines[index] ?? "",
        vietnamese: vietnameseLines[index] ?? "",
      });
    }
    setPairs(next);
    setPreviewActive(true);
  };

  const buildSingleBlock = () => {
    if (!englishText.trim() || !vietnameseText.trim()) {
      message.warning("Add English and Vietnamese text first.");
      return;
    }
    setPairs([
      {
        english: englishText.trim(),
        vietnamese: vietnameseText.trim(),
      },
    ]);
    setPreviewActive(true);
  };

  const updatePair = (
    index: number,
    field: keyof SentencePair,
    value: string,
  ) => {
    setPairs((current) =>
      current.map((pair, idx) =>
        idx === index ? { ...pair, [field]: value } : pair,
      ),
    );
  };

  const removePair = (index: number) => {
    setPairs((current) => current.filter((_, idx) => idx !== index));
  };

  const addPair = () => {
    setPairs((current) => [...current, { english: "", vietnamese: "" }]);
  };

  const submit = async () => {
    setError(null);
    if (!previewActive || pairs.length === 0) {
      setError(
        "Build the sentence pairs first using Split by line or Save as one block.",
      );
      return;
    }
    const invalid = pairs.find(
      (pair) =>
        pair.english.trim().length < 2 || pair.vietnamese.trim().length < 2,
    );
    if (invalid) {
      setError(
        "Each sentence pair needs both English (>= 2 chars) and Vietnamese (>= 2 chars).",
      );
      return;
    }
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "EDIT" && initialScript
          ? `/api/translation-recall/scripts/${initialScript.id}`
          : "/api/translation-recall/scripts";
      const response = await fetch(url, {
        method: mode === "EDIT" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title.trim(),
          topic: values.topic.trim(),
          bandLevel: values.bandLevel,
          sentences: pairs.map((pair) => ({
            english: pair.english.trim(),
            vietnamese: pair.vietnamese.trim(),
          })),
        }),
      });
      const data = (await response.json()) as {
        script?: TranslationScriptRecord;
        message?: string;
      };

      if (!response.ok || !data.script) {
        throw new Error(data.message ?? "Could not save the script.");
      }

      message.success(
        mode === "EDIT" ? "Script updated." : "Script created.",
      );
      onSaved(data.script);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the script.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "EDIT" ? "Edit translation script" : "Add translation script"}
      onCancel={() => {
        if (!saving) {
          onClose();
        }
      }}
      footer={null}
      width={760}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} initialValues={{ bandLevel: 6 }}>
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: "Title is required." }, { max: 191 }]}
        >
          <Input maxLength={191} placeholder="e.g. Daily Routine" />
        </Form.Item>
        <Form.Item
          label="Topic"
          name="topic"
          rules={[{ required: true, message: "Topic is required." }, { max: 120 }]}
        >
          <Input maxLength={120} placeholder="e.g. Daily Life" />
        </Form.Item>
        <Form.Item label="Band level" name="bandLevel" rules={[{ required: true }]}>
          <InputNumber min={4} max={9} step={0.5} />
        </Form.Item>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Tip: put each sentence on a new line so we can pair the English and Vietnamese lines."
        />

        <Form.Item label="English text" required>
          <Input.TextArea
            value={englishText}
            onChange={(event) => {
              setEnglishText(event.target.value);
              setPreviewActive(false);
            }}
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder={"I usually wake up at six.\nI have a cup of coffee."}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {englishLines.length} non-empty line{englishLines.length === 1 ? "" : "s"}
          </Typography.Text>
        </Form.Item>

        <Form.Item label="Vietnamese text" required>
          <Input.TextArea
            value={vietnameseText}
            onChange={(event) => {
              setVietnameseText(event.target.value);
              setPreviewActive(false);
            }}
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder={"Tôi thường thức dậy lúc 6 giờ.\nTôi uống một tách cà phê."}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {vietnameseLines.length} non-empty line
            {vietnameseLines.length === 1 ? "" : "s"}
          </Typography.Text>
        </Form.Item>

        {lineMismatch && englishLines.length > 0 && vietnameseLines.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Line counts do not match (English: ${englishLines.length}, Vietnamese: ${vietnameseLines.length}).`}
            description="Tap Split by line to load the pairs into the preview table, then fix or remove the mismatched rows. We will not save broken alignment."
          />
        ) : null}

        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={buildPairsFromLines}>
            Split by line preview
          </Button>
          <Button onClick={buildSingleBlock}>Save as one block</Button>
        </Space>

        {previewActive && pairs.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <Space style={{ marginBottom: 8 }} wrap>
              <Typography.Text strong>Sentence preview</Typography.Text>
              <Tag>{pairs.length} pair{pairs.length === 1 ? "" : "s"}</Tag>
              <Button size="small" icon={<PlusOutlined />} onClick={addPair}>
                Add row
              </Button>
            </Space>
            <Table
              rowKey={(_, index) => `pair-${index ?? 0}`}
              size="small"
              dataSource={pairs}
              pagination={false}
              scroll={{ x: 600 }}
              columns={[
                {
                  title: "#",
                  width: 48,
                  render: (_, __, index) => index + 1,
                },
                {
                  title: "English",
                  dataIndex: "english",
                  render: (_, _record, index) => (
                    <Input.TextArea
                      value={pairs[index]?.english ?? ""}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      onChange={(event) =>
                        updatePair(index, "english", event.target.value)
                      }
                    />
                  ),
                },
                {
                  title: "Vietnamese",
                  dataIndex: "vietnamese",
                  render: (_, _record, index) => (
                    <Input.TextArea
                      value={pairs[index]?.vietnamese ?? ""}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      onChange={(event) =>
                        updatePair(index, "vietnamese", event.target.value)
                      }
                    />
                  ),
                },
                {
                  title: "",
                  width: 56,
                  render: (_, _record, index) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removePair(index)}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : null}

        {error ? (
          <Alert
            type="warning"
            showIcon
            message={error}
            style={{ marginTop: 12 }}
          />
        ) : null}

        <Space style={{ marginTop: 16 }} wrap>
          <Button
            type="primary"
            icon={saving ? <LoadingOutlined /> : <SaveOutlined />}
            onClick={() => void submit()}
            loading={saving}
            disabled={saving}
          >
            {mode === "EDIT" ? "Save changes" : "Create script"}
          </Button>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
