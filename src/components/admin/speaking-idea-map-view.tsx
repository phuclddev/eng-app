"use client";

import "@xyflow/react/dist/style.css";

import {
  AimOutlined,
  EyeOutlined,
  FullscreenOutlined,
  PartitionOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Switch,
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
  useReactFlow,
} from "@xyflow/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  IELTS_TASK_TYPE_LABELS,
  SPEAKING_IDEA_STATUS_LABELS,
} from "@/lib/constants";
import {
  buildSpeakingIdeaMindMapScene,
  type SpeakingIdeaMapGraphNode,
  type SpeakingIdeaMapMode,
} from "@/lib/speaking-idea-map";
import type { IeltsTaskType, SpeakingIdeaRecord, SpeakingIdeaStatus } from "@/lib/types";

type FlowNodeData = SpeakingIdeaMapGraphNode;

function getNodeHandleLayout(kind: SpeakingIdeaMapGraphNode["kind"]) {
  if (kind === "root") {
    return {
      source: [Position.Left, Position.Right, Position.Top, Position.Bottom] as const,
      target: [] as const,
    };
  }

  if (kind === "branch") {
    return {
      source: [Position.Left, Position.Right, Position.Top, Position.Bottom] as const,
      target: [Position.Left, Position.Right, Position.Top, Position.Bottom] as const,
    };
  }

  return {
    source: [] as const,
    target: [Position.Left, Position.Right, Position.Top, Position.Bottom] as const,
  };
}

function MindMapNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const handles = getNodeHandleLayout(data.kind);

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
        className={`speaking-idea-flow-node speaking-idea-flow-node--${data.kind} speaking-idea-flow-node--${data.nodeSize}${data.category ? ` speaking-idea-flow-node--${data.category}` : ""}`}
        style={
          {
            width: data.width,
            minHeight: data.height,
            "--idea-accent": data.accentColor,
          } as CSSProperties
        }
      >
        {handles.target.map((position) => (
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
          <Typography.Paragraph
            className="speaking-idea-flow-node__body wrap-anywhere"
            ellipsis={{ rows: data.kind === "root" ? 3 : 2 }}
          >
            {data.body}
          </Typography.Paragraph>
        ) : null}

        {data.meta ? (
          <div className="speaking-idea-flow-node__meta">
            {Object.entries(data.meta)
              .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
              .slice(0, data.kind === "idea" || data.kind === "root" ? 4 : 2)
              .map(([key, value]) => (
                <span key={key} className="speaking-idea-flow-node__pill">
                  {String(value)}
                </span>
              ))}
          </div>
        ) : null}

        {handles.source.map((position) => (
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

function FlowPanel({
  mode,
  hiddenIdeaCount,
  selectedIdeaTitle,
  onBackToOverview,
  onExpandWithAi,
}: {
  mode: SpeakingIdeaMapMode;
  hiddenIdeaCount: number;
  selectedIdeaTitle?: string;
  onBackToOverview: () => void;
  onExpandWithAi: () => void;
}) {
  const reactFlow = useReactFlow();

  const fit = useCallback(() => {
    void reactFlow.fitView({ padding: 0.22, duration: 280 });
  }, [reactFlow]);

  useEffect(() => {
    fit();
  }, [fit, mode, selectedIdeaTitle]);

  return (
    <>
      <Controls position="top-right" showInteractive={false} fitViewOptions={{ padding: 0.22, duration: 280 }} />
      <Panel position="top-left">
        <Space wrap>
          <Button icon={<FullscreenOutlined />} onClick={fit}>
            Fit view
          </Button>
          <Button icon={<PartitionOutlined />} onClick={fit}>
            Reset layout
          </Button>
          {mode === "FOCUS" ? (
            <>
              <Button onClick={onBackToOverview}>Back to overview</Button>
              <Button icon={<RobotOutlined />} onClick={onExpandWithAi}>
                Expand this idea with AI
              </Button>
            </>
          ) : null}
          {mode === "OVERVIEW" && hiddenIdeaCount > 0 ? (
            <Typography.Text type="secondary">
              {hiddenIdeaCount} idea(s) hidden. Narrow filters to focus faster.
            </Typography.Text>
          ) : null}
        </Space>
      </Panel>
    </>
  );
}

function SpeakingIdeaMapCanvas({
  flowNodes,
  flowEdges,
  mode,
  hiddenIdeaCount,
  selectedIdeaTitle,
  onNodeAction,
  onBackToOverview,
  onExpandWithAi,
}: {
  flowNodes: Node<FlowNodeData>[];
  flowEdges: Array<{ id: string; source: string; target: string }>;
  mode: SpeakingIdeaMapMode;
  hiddenIdeaCount: number;
  selectedIdeaTitle?: string;
  onNodeAction: (node: FlowNodeData) => void;
  onBackToOverview: () => void;
  onExpandWithAi: () => void;
}) {
  return (
    <div className={`speaking-idea-flow-shell speaking-idea-flow-shell--${mode.toLowerCase()}`}>
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
        fitViewOptions={{ padding: 0.22, duration: 280 }}
        minZoom={0.25}
        maxZoom={1.9}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.5,
          },
        }}
        onNodeClick={(_event, node) => onNodeAction(node.data)}
        nodesDraggable={false}
        elementsSelectable
        selectionOnDrag={false}
        panOnDrag
        panOnScroll
        zoomOnScroll
        className="speaking-idea-flow"
      >
        <Background gap={28} size={1} color="#dbe2ea" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          nodeColor={(node) => (node.data?.accentColor as string) ?? "#1d4ed8"}
          maskColor="rgba(250, 252, 255, 0.78)"
          className="speaking-idea-flow__minimap"
        />
        <FlowPanel
          mode={mode}
          hiddenIdeaCount={hiddenIdeaCount}
          selectedIdeaTitle={selectedIdeaTitle}
          onBackToOverview={onBackToOverview}
          onExpandWithAi={onExpandWithAi}
        />
      </ReactFlow>
    </div>
  );
}

export function SpeakingIdeaMapView({
  ideas,
}: {
  ideas: SpeakingIdeaRecord[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string | undefined>();
  const [status, setStatus] = useState<SpeakingIdeaStatus | "ALL">("ACTIVE");
  const [minReuseScore, setMinReuseScore] = useState<number | undefined>(3);
  const [questionPart, setQuestionPart] = useState<IeltsTaskType | "ALL">("ALL");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>();
  const [memorizeView, setMemorizeView] = useState(false);

  const mode: SpeakingIdeaMapMode = selectedIdeaId ? "FOCUS" : "OVERVIEW";

  const scene = useMemo(
    () =>
      buildSpeakingIdeaMindMapScene({
        ideas,
        mode,
        selectedIdeaId: selectedIdeaId ?? null,
        memorizeView,
        overviewLimit: 24,
        filters: {
          search,
          topic,
          status,
          minReuseScore,
          questionPart,
        },
      }),
    [ideas, memorizeView, minReuseScore, mode, questionPart, search, selectedIdeaId, status, topic],
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

  const handleNodeAction = (node: FlowNodeData) => {
    if (mode === "OVERVIEW" && node.kind === "idea") {
      setSelectedIdeaId(node.id);
      return;
    }

    if (node.kind === "root" && node.href) {
      router.push(node.href);
      return;
    }

    if (node.kind === "leaf" && node.href) {
      router.push(node.href);
    }
  };

  const showNoIdeas = scene.totalIdeas === 0;

  return (
    <div className="stacked-view">
      <div className="page-header-inline">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Speaking Idea Mind Map
          </Typography.Title>
          <Typography.Text type="secondary" className="wrap-anywhere">
            Use overview to spot the most reusable ideas, then click one idea to open a
            memorization-oriented canvas with short phrases, answer logic, applicable questions,
            and reusable speaking patterns.
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
              placeholder="Search idea title, branch logic, chunks, or linked prompts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="responsive-toolbar__actions">
            <Segmented
              value={mode}
              options={[
                { label: "Overview", value: "OVERVIEW" },
                { label: "Focus", value: "FOCUS", disabled: !selectedIdeaId },
              ]}
              onChange={(value) => {
                if (value === "OVERVIEW") {
                  setSelectedIdeaId(undefined);
                  setMemorizeView(false);
                }
              }}
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
                value={selectedIdeaId}
                placeholder="Select an idea"
                onChange={(value) => setSelectedIdeaId(value)}
                options={scene.ideaOptions.map((idea) => ({
                  label: `${idea.title} · ${idea.shortLabel}`,
                  value: idea.id,
                }))}
                style={{ minWidth: 260 }}
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
              <Button>
                <Link href="/admin/ideas">Generate ideas with AI</Link>
              </Button>
            </Space>
          </Empty>
        </Card>
      ) : (
        <Card
          title={
            mode === "OVERVIEW"
              ? "Overview map"
              : `Focus map${scene.selectedIdeaTitle ? ` · ${scene.selectedIdeaTitle}` : ""}`
          }
          extra={
            mode === "FOCUS" ? (
              <Space wrap>
                <Typography.Text type="secondary">Memorize View</Typography.Text>
                <Switch checked={memorizeView} onChange={setMemorizeView} />
                <Button onClick={() => setSelectedIdeaId(undefined)}>Back to overview</Button>
                {scene.selectedIdeaId ? (
                  <Button type="primary">
                    <Link href={`/admin/ideas/${scene.selectedIdeaId}`}>Open idea detail</Link>
                  </Button>
                ) : null}
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Click one core idea node to enter memorization focus mode.
              </Typography.Text>
            )
          }
          bodyStyle={{ padding: 0 }}
        >
          {mode === "FOCUS" && !scene.selectedIdeaId ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select a core idea from the dropdown or click an idea in overview to open the deep memorization map."
              style={{ marginBlock: 48 }}
            />
          ) : (
            <ReactFlowProvider>
              <SpeakingIdeaMapCanvas
                flowNodes={flowNodes}
                flowEdges={flowEdges}
                mode={mode}
                hiddenIdeaCount={scene.hiddenIdeaCount}
                selectedIdeaTitle={scene.selectedIdeaTitle}
                onNodeAction={handleNodeAction}
                onBackToOverview={() => {
                  setSelectedIdeaId(undefined);
                  setMemorizeView(false);
                }}
                onExpandWithAi={() => {
                  message.info(
                    "AI expansion preview for missing variants, support logic, chunks, and applicable questions is the next step. It is intentionally not auto-saving yet.",
                  );
                }}
              />
            </ReactFlowProvider>
          )}
        </Card>
      )}
    </div>
  );
}
