"use client";

import {
  CopyOutlined,
  DownloadOutlined,
  ExpandOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Card, Space, Typography } from "antd";
import type { MermaidConfig } from "mermaid";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const mermaidConfig: MermaidConfig = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "neutral",
  fontFamily: "Inter, Segoe UI, sans-serif",
  suppressErrorRendering: true,
};

type RendererProps = {
  title?: string;
  sourceText: string;
  exportBaseName: string;
  emptyDescription?: string;
  sourceType?: "MERMAID" | "PLANTUML_TEXT";
  extraActions?: ReactNode;
  showSourceCopy?: boolean;
  studyHref?: string;
  printEnabled?: boolean;
  className?: string;
};

function getSvgMarkup(svgContainer: HTMLDivElement | null, fallback: string) {
  const svg = svgContainer?.querySelector("svg");
  return svg ? svg.outerHTML : fallback;
}

function triggerDownload(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadSvg(filename: string, svgMarkup: string) {
  triggerDownload(filename, svgMarkup, "image/svg+xml;charset=utf-8");
}

async function downloadPng(filename: string, svgMarkup: string) {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not render SVG as PNG."));
    image.src = url;
  });

  const width = image.width || 1600;
  const height = image.height || 1200;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(url);
    throw new Error("PNG export is not available in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const pngBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png");
  });

  URL.revokeObjectURL(url);

  if (!pngBlob) {
    throw new Error("Could not convert the mind map into PNG.");
  }

  triggerDownload(filename, pngBlob, "image/png");
}

function printSvg(svgMarkup: string, title: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1400,height=900");
  if (!popup) {
    throw new Error("Unable to open the print window.");
  }

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { margin: 0; padding: 24px; font-family: Inter, Segoe UI, sans-serif; background: #ffffff; }
          svg { width: 100%; height: auto; }
        </style>
      </head>
      <body>${svgMarkup}</body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

export function SpeakingIdeaMindMapRenderer({
  title,
  sourceText,
  exportBaseName,
  emptyDescription = "No mind map source available yet.",
  sourceType = "MERMAID",
  extraActions,
  showSourceCopy = false,
  studyHref,
  printEnabled = false,
  className,
}: RendererProps) {
  const { message } = App.useApp();
  const renderId = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalizedSource = useMemo(() => sourceText.trim(), [sourceText]);
  const sourceUnsupported =
    Boolean(normalizedSource) && sourceType !== "MERMAID";
  const effectiveError = sourceUnsupported
    ? "Only Mermaid mind map source is supported in this preview right now."
    : error;
  const effectiveSvgMarkup =
    normalizedSource && !sourceUnsupported ? svgMarkup : "";

  useEffect(() => {
    let cancelled = false;

    if (!normalizedSource || sourceType !== "MERMAID") {
      return;
    }

    void import("mermaid")
      .then(async (module) => {
        const mermaid = module.default;
        mermaid.initialize(mermaidConfig);
        const { svg } = await mermaid.render(`mindmap-${renderId}`, normalizedSource);
        if (cancelled) {
          return;
        }
        setError(null);
        setSvgMarkup(svg);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setSvgMarkup("");
        setError(nextError instanceof Error ? nextError.message : "Invalid Mermaid source.");
      })
      .finally(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [normalizedSource, renderId, sourceType]);

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(normalizedSource);
      message.success("Mind map source copied.");
    } catch {
      message.error("Could not copy the source.");
    }
  };

  const handleDownloadSvg = async () => {
    if (!effectiveSvgMarkup) {
      message.info("Render the mind map first before exporting.");
      return;
    }

    await downloadSvg(
      `${exportBaseName}.svg`,
      getSvgMarkup(containerRef.current, effectiveSvgMarkup),
    );
  };

  const handleDownloadPng = async () => {
    if (!effectiveSvgMarkup) {
      message.info("Render the mind map first before exporting.");
      return;
    }

    try {
      await downloadPng(
        `${exportBaseName}.png`,
        getSvgMarkup(containerRef.current, effectiveSvgMarkup),
      );
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not export PNG.");
    }
  };

  const handlePrint = () => {
    if (!effectiveSvgMarkup) {
      message.info("Render the mind map first before printing.");
      return;
    }

    try {
      printSvg(getSvgMarkup(containerRef.current, effectiveSvgMarkup), title ?? exportBaseName);
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not print the mind map.");
    }
  };

  return (
    <Card
      className={className}
      title={title ?? "Mind map preview"}
      extra={
        <Space wrap>
          {showSourceCopy ? (
            <Button icon={<CopyOutlined />} onClick={() => void handleCopySource()}>
              Copy source
            </Button>
          ) : null}
          <Button icon={<DownloadOutlined />} onClick={() => void handleDownloadSvg()}>
            Download SVG
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void handleDownloadPng()}>
            Download PNG
          </Button>
          {printEnabled ? (
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              Print
            </Button>
          ) : null}
          {studyHref ? (
            <Button icon={<ExpandOutlined />}>
              <Link href={studyHref}>Open study page</Link>
            </Button>
          ) : null}
          {extraActions}
        </Space>
      }
    >
      {!normalizedSource ? (
        <Typography.Text type="secondary">{emptyDescription}</Typography.Text>
      ) : (
        <div className="stacked-view">
          {effectiveError ? (
            <Alert
              type="error"
              showIcon
              message="Mind map source could not be rendered."
              description={effectiveError}
            />
          ) : null}

          <div className="speaking-idea-study-map">
            <div
              ref={containerRef}
              className="speaking-idea-study-map__canvas"
              dangerouslySetInnerHTML={
                effectiveSvgMarkup ? { __html: effectiveSvgMarkup } : undefined
              }
            />
          </div>
        </div>
      )}
    </Card>
  );
}
