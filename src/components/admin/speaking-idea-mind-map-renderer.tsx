"use client";

import {
  CopyOutlined,
  DownloadOutlined,
  ExpandOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Card, Space, Typography } from "antd";
import type { MermaidConfig } from "mermaid";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import {
  downloadTextContent,
  downloadSvgElementAsPng,
  downloadSvgMarkup,
  normalizeSvgMarkupForExport,
  openSvgMarkupInNewTab,
  prepareSvgElementForExport,
} from "@/lib/export-diagram";
import type { SpeakingIdeaMindMapSourceType } from "@/lib/types";

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
  sourceType?: SpeakingIdeaMindMapSourceType;
  extraActions?: ReactNode;
  showSourceCopy?: boolean;
  studyHref?: string;
  printEnabled?: boolean;
  className?: string;
};

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

async function renderPlantumlSource(sourceText: string) {
  const response = await fetch("/api/admin/ideas/plantuml/render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sourceText }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    svg?: string;
    error?: string;
  };

  if (!response.ok || !payload.svg) {
    throw new Error(
      payload.error ||
        "PlantUML rendering is not configured. You can still save, copy, and download the .puml source.",
    );
  }

  return payload.svg;
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
  const [isRendering, setIsRendering] = useState(false);

  const normalizedSource = sourceText.trim();
  const effectiveSvgMarkup = normalizedSource ? svgMarkup : "";

  useEffect(() => {
    let cancelled = false;

    if (!normalizedSource) {
      return;
    }

    const renderDiagram = async () => {
      if (!cancelled) {
        setIsRendering(true);
      }

      if (sourceType === "MERMAID") {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize(mermaidConfig);
        const { svg } = await mermaid.render(`mindmap-${renderId}`, normalizedSource);
        return svg;
      }

      return renderPlantumlSource(normalizedSource);
    };

    void renderDiagram()
      .then((svg) => {
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
        setError(
          nextError instanceof Error
            ? nextError.message
            : sourceType === "PLANTUML"
              ? "Invalid PlantUML source."
              : "Invalid Mermaid source.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedSource, renderId, sourceType]);

  const getPreparedExport = () => {
    if (!effectiveSvgMarkup) {
      return null;
    }

    try {
      const svgElement = containerRef.current?.querySelector("svg");
      return svgElement
        ? prepareSvgElementForExport(svgElement, title ?? exportBaseName)
        : normalizeSvgMarkupForExport(effectiveSvgMarkup, title ?? exportBaseName);
    } catch (nextError) {
      throw new Error(
        nextError instanceof Error
          ? nextError.message
          : "Could not prepare the diagram for export.",
      );
    }
  };

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(normalizedSource);
      message.success("Mind map source copied.");
    } catch {
      message.error("Could not copy the source.");
    }
  };

  const handleDownloadSvg = async () => {
    let preparedExport: ReturnType<typeof getPreparedExport>;

    try {
      preparedExport = getPreparedExport();
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not prepare SVG export.");
      return;
    }

    if (!preparedExport) {
      message.info("Render the mind map first before exporting.");
      return;
    }

    downloadSvgMarkup(`${exportBaseName}.svg`, preparedExport.svgMarkup);
  };

  const handleDownloadPng = async () => {
    let preparedExport: ReturnType<typeof getPreparedExport>;

    try {
      preparedExport = getPreparedExport();
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not prepare PNG export.");
      return;
    }

    if (!preparedExport) {
      message.info("Render the mind map first before exporting.");
      return;
    }

    try {
      await downloadSvgElementAsPng(
        `${exportBaseName}.png`,
        preparedExport.svgMarkup,
        preparedExport.width,
        preparedExport.height,
      );
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not export PNG.");
    }
  };

  const handlePrint = () => {
    let preparedExport: ReturnType<typeof getPreparedExport>;

    try {
      preparedExport = getPreparedExport();
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not prepare the diagram for printing.");
      return;
    }

    if (!preparedExport) {
      message.info("Render the mind map first before printing.");
      return;
    }

    try {
      printSvg(preparedExport.svgMarkup, title ?? exportBaseName);
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not print the mind map.");
    }
  };

  const handleDownloadSource = () => {
    const extension = sourceType === "PLANTUML" ? "puml" : "mmd";
    downloadTextContent(`${exportBaseName}.${extension}`, normalizedSource);
  };

  const handleOpenSvg = () => {
    let preparedExport: ReturnType<typeof getPreparedExport>;

    try {
      preparedExport = getPreparedExport();
    } catch (nextError) {
      message.error(nextError instanceof Error ? nextError.message : "Could not prepare the SVG preview.");
      return;
    }

    if (!preparedExport) {
      message.info("Render the mind map first before opening SVG.");
      return;
    }

    openSvgMarkupInNewTab(preparedExport.svgMarkup);
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
          <Button icon={<NodeIndexOutlined />} onClick={handleDownloadSource}>
            {sourceType === "PLANTUML" ? "Download .puml" : "Download .mmd"}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void handleDownloadSvg()}>
            Download SVG
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void handleDownloadPng()}>
            Download PNG
          </Button>
          <Button icon={<LinkOutlined />} onClick={handleOpenSvg}>
            Open SVG in new tab
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
          {error ? (
            <Alert
              type="error"
              showIcon
              message="Mind map source could not be rendered."
              description={error}
            />
          ) : null}
          {sourceType === "PLANTUML" && !effectiveSvgMarkup && !error ? (
            <Alert
              type="info"
              showIcon
              message="PlantUML preview needs PLANTUML_SERVER_URL. You can still save, copy, and download the .puml source."
            />
          ) : null}
          {isRendering ? (
            <Typography.Text type="secondary">Rendering diagram preview…</Typography.Text>
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
