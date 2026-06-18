"use client";

import "@xyflow/react/dist/style.css";

import {
  AimOutlined,
  CompressOutlined,
  EyeOutlined,
  FullscreenOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Radio,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import type { Node, NodeProps } from "@xyflow/react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IELTS_TASK_TYPE_LABELS,
  SPEAKING_IDEA_STATUS_LABELS,
} from "@/lib/constants";
import {
  buildSpeakingIdeaMindMapScene,
  type SpeakingIdeaMapMode,
  type SpeakingIdeaMapGraphNode,
  type SpeakingIdeaMapNodeKind,
} from "@/lib/speaking-idea-map";
import type { IeltsTaskType, SpeakingIdeaRecord, SpeakingIdeaStatus } from "@/lib/types";

type FlowNodeData = SpeakingIdeaMapGraphNode;

function getHandleLayout(kind: SpeakingIdeaMapNodeKind) {
  switch (kind) {
    case "idea":
      return {
        source: [Position.Left, Position.Right] as const,
        target: [] as const,
      };
    case "branch":
      return {
        source: [Position.Left, Position.Right] as const,
        target: [Position.Left, Position.Right] as const,
      };
    default:
      return {
        source: [] as const,
        target: [Position.Left, Position.Right] as const,
      };
  }
}

function MindMapNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const handleLayout = getHandleLayout(data.kind);

  return (
    <Tooltip
      title={
        <div style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
          {data.tooltip ?? data.body ?? data.label}
        </div>
      }
      mouseEnterDelay={0.15}
    >
      <div
        className={`speaking-idea-flow-node speaking-idea-flow-node--${data.kind} speaking-idea-flow-node--${data.nodeSize}`}
        style={
          {
            width: data.width,
            minHeight: data.height,
            "--idea-accent": data.accentColor,
          } as CSSProperties
        }
      >
        {handleLayout.target.map((position) => (
          <Handle
            key={`target-${position}`}
            type="target"
            position={position}
            className="speaking-idea-flow-node__handle"
          />
        ))}

        <div className="speaking-idea-flow-node__header">
          <Typography.Text strong className="wrap-anywhere">
            {data.label}
          </Typography.Text>
          {data.secondaryLabel ? (
            <Typography.Text type="secondary" className="wrap-anywhere">
              {data.secondaryLabel}
            </Typography.Text>
          ) : null}
        </div>

        {data.body ? (
          <Typography.Paragraph className="speaking-idea-flow-node__body wrap-anywhere" ellipsis={{ rows: data.kind === "idea" ? 3 : 4 }}>
            {data.body}
          </Typography.Paragraph>
        ) : null}

        {data.meta ? (
          <div className="speaking-idea-flow-node__meta">
            {Object.entries(data.meta)
              .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
              .slice(0, data.kind === "idea" ? 4 : 2)
              .map(([key, value]) => (
                <span key={key} className="speaking-idea-flow-node__pill">
                  {String(value)}
                </span>
              ))}
          </div>
        ) : null}

        {handleLayout.source.map((position) => (
          <Handle
            key={`source-${position}`}
            type="source"
            position={position}
            className="speaking-idea-flow-node__handle"
          />
        ))}
      </div>
    </Tooltip>
  );
}

const nodeTypes = {
  mapNode: MindMapNode,
};

function SpeakingIdeaMapCanvas({
  flowNodes,
  flowEdges,
  onReset,
  onFit,
  hiddenIdeaCount,
}: {
  flowNodes: Node<FlowNodeData>[];
  flowEdges: {
    id: string;
    source: string;
    target: string;
  }[];
  onReset: () => void;
  onFit: () => void;
  hiddenIdeaCount: number;
}) {
  const router = useRouter();

  return (
    <div className="speaking-idea-flow-shell">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges.map((edge) => ({
          ...edge,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.5,
          },
        }))}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, duration: 250 }}
        minZoom={0.35}
        maxZoom={1.8}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.5,
          },
        }}
        onNodeClick={(_event, node) => {
          if (node.data.href) {
            router.push(node.data.href);
          }
        }}
        nodesDraggable={false}
        elementsSelectable
        panOnScroll
        className="speaking-idea-flow"
      >
        <Background gap={28} size={1} color="#dbe2ea" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          nodeColor={(node) => (node.data?.accentColor as string) ?? "#1d4ed8"}
          maskColor="rgba(250, 252, 255, 0.75)"
          className="speaking-idea-flow__minimap"
        />
        <Controls
          position="top-right"
          showInteractive={false}
          fitViewOptions={{ padding: 0.18, duration: 250 }}
        />
        <Panel position="top-left">
          <Space wrap>
            <Button icon={<CompressOutlined />} onClick={onFit}>
              Fit view
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onReset}>
              Reset layout
            </Button>
            {hiddenIdeaCount > 0 ? (
              <Typography.Text type="secondary">
                {hiddenIdeaCount} idea(s) hidden in overview. Narrow filters or switch to focus.
              </Typography.Text>
            ) : null}
          </Space>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function SpeakingIdeaMapView({
  ideas,
}: {
  ideas: SpeakingIdeaRecord[];
}) {
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string | undefined>();
  const [status, setStatus] = useState<SpeakingIdeaStatus | "ALL">("ACTIVE");
  const [minReuseScore, setMinReuseScore] = useState<number | undefined>(3);
  const [questionPart, setQuestionPart] = useState<IeltsTaskType | "ALL">("ALL");
  const [mode, setMode] = useState<SpeakingIdeaMapMode>("OVERVIEW");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>();
  const [flowKey, setFlowKey] = useState(0);

  const scene = useMemo(
    () =>
      buildSpeakingIdeaMindMapScene({
        ideas,
        mode,
        selectedIdeaId,
        overviewLimit: 24,
        filters: {
          search,
          topic,
          status,
          minReuseScore,
          questionPart,
        },
      }),
    [ideas, minReuseScore, mode, questionPart, search, selectedIdeaId, status, topic],
  );

  const flowNodes = useMemo<Node<FlowNodeData>[]>(
    () =>
      scene.nodes.map((node) => ({
        id: node.id,
        type: "mapNode",
        position: node.position,
        data: node,
        draggable: false,
        selectable: true,
      })),
    [scene.nodes],
  );

  const flowEdges = useMemo(
    () =>
      scene.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    [scene.edges],
  );

  const showNoIdeas = scene.totalIdeas === 0;
  const showNoFocusSelection = mode === "FOCUS" && !scene.selectedIdeaId;

  return (
    <div className="stacked-view">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Speaking Idea Mind Map
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Explore reusable IELTS Speaking ideas as a real map. Use overview for fast coverage,
            then switch to single-idea focus to memorize variants, support points, and linked
            questions without the cramped card grid.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<EyeOutlined />}>
            <Link href="/admin/ideas">Back to list</Link>
          </Button>
          <Button icon={<AimOutlined />}>
            <Link href="/admin/ideas/coverage">Coverage dashboard</Link>
          </Button>
          <Button type="primary">
            <Link href="/admin/ideas/new">New idea</Link>
          </Button>
        </Space>
      </div>

      <Card title="Mind map controls">
        <div className="responsive-toolbar">
          <div className="responsive-toolbar__grow">
            <Input.Search
              allowClear
              placeholder="Search title, description, support point, or linked prompt"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="responsive-toolbar__actions">
            <Radio.Group
              value={mode}
              onChange={(event) => {
                const nextMode = event.target.value as SpeakingIdeaMapMode;
                setMode(nextMode);
                setFlowKey((current) => current + 1);
              }}
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: "Overview", value: "OVERVIEW" },
                { label: "Single Idea Focus", value: "FOCUS" },
              ]}
            />
            <Select
              value={status}
              onChange={(value) => setStatus(value)}
              options={[
                { label: "All statuses", value: "ALL" },
                { label: SPEAKING_IDEA_STATUS_LABELS.ACTIVE, value: "ACTIVE" },
                { label: SPEAKING_IDEA_STATUS_LABELS.DRAFT, value: "DRAFT" },
                { label: SPEAKING_IDEA_STATUS_LABELS.ARCHIVED, value: "ARCHIVED" },
              ]}
              style={{ minWidth: 160 }}
            />
            <Select
              allowClear
              placeholder="Topic"
              value={topic}
              onChange={(value) => setTopic(value)}
              options={scene.topicOptions.map((option) => ({ label: option, value: option }))}
              style={{ minWidth: 170 }}
            />
            <Select
              value={typeof minReuseScore === "number" ? minReuseScore : "ALL"}
              onChange={(value) =>
                setMinReuseScore(value === "ALL" ? undefined : Number(value))
              }
              options={[
                { label: "All reuse scores", value: "ALL" },
                { label: "3+ reuse", value: 3 },
                { label: "4+ reuse", value: 4 },
                { label: "5 reuse", value: 5 },
              ]}
              style={{ minWidth: 170 }}
            />
            <Select
              value={questionPart}
              onChange={(value) => setQuestionPart(value)}
              options={[
                { label: "All question parts", value: "ALL" },
                { label: IELTS_TASK_TYPE_LABELS.PART_1, value: "PART_1" },
                { label: IELTS_TASK_TYPE_LABELS.PART_2, value: "PART_2" },
                { label: IELTS_TASK_TYPE_LABELS.PART_3, value: "PART_3" },
              ]}
              style={{ minWidth: 190 }}
            />
            {mode === "FOCUS" ? (
              <Select
                allowClear
                placeholder="Select an idea"
                value={scene.selectedIdeaId ?? selectedIdeaId}
                onChange={(value) => {
                  setSelectedIdeaId(value);
                  setFlowKey((current) => current + 1);
                }}
                options={scene.ideaOptions.map((idea) => ({
                  label: `${idea.title} · ${idea.shortLabel}`,
                  value: idea.id,
                }))}
                style={{ minWidth: 240 }}
              />
            ) : null}
          </div>
        </div>
      </Card>

      {showNoIdeas ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No speaking ideas match the current filters."
            style={{ marginBlock: 32 }}
          >
            <Space wrap>
              <Button type="primary">
                <Link href="/admin/ideas/new">Create idea</Link>
              </Button>
              <Button
                icon={<NodeIndexOutlined />}
                onClick={() => {
                  message.info("Use the idea list page to generate new draft ideas with AI.");
                }}
              >
                <Link href="/admin/ideas">Generate ideas with AI</Link>
              </Button>
            </Space>
          </Empty>
        </Card>
      ) : showNoFocusSelection ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Select one idea to open the full branch map for variants, support points, linked questions, and patterns."
            style={{ marginBlock: 32 }}
          />
        </Card>
      ) : (
        <Card
          title={
            mode === "OVERVIEW"
              ? "Overview map"
              : `Focus map${scene.selectedIdeaTitle ? ` · ${scene.selectedIdeaTitle}` : ""}`
          }
          extra={
            <Space wrap>
              <Typography.Text type="secondary">
                {mode === "OVERVIEW"
                  ? `${scene.nodes.length} idea node(s)`
                  : `${scene.nodes.length} node(s) / ${scene.edges.length} branch edge(s)`}
              </Typography.Text>
              <Button icon={<FullscreenOutlined />} onClick={() => setFlowKey((current) => current + 1)}>
                Refit canvas
              </Button>
            </Space>
          }
          bodyStyle={{ padding: 0 }}
        >
          <ReactFlowProvider>
            <SpeakingIdeaMapCanvas
              key={flowKey}
              flowNodes={flowNodes}
              flowEdges={flowEdges}
              hiddenIdeaCount={scene.hiddenIdeaCount}
              onFit={() => setFlowKey((current) => current + 1)}
              onReset={() => {
                if (mode === "FOCUS" && scene.selectedIdeaId) {
                  setSelectedIdeaId(scene.selectedIdeaId);
                }
                setFlowKey((current) => current + 1);
              }}
            />
          </ReactFlowProvider>
        </Card>
      )}
    </div>
  );
}
