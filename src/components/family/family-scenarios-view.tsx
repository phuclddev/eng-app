"use client";

import {
  CheckOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState, useTransition } from "react";

import {
  FAMILY_CHILD_FOCUS_LABELS,
  FAMILY_CHUNK_CHILD_FOCUS,
  FAMILY_CHUNK_CHILD_FOCUS_LABELS,
  FAMILY_SCENARIO_GENERATE_DEFAULT_COUNT,
  FAMILY_SCENARIO_GENERATE_MAX_COUNT,
  FAMILY_SCENARIO_SOURCE_LABELS,
  FAMILY_SCENARIO_STATUSES,
  FAMILY_SCENARIO_STATUS_LABELS,
} from "@/lib/constants";
import type {
  FamilyChunkChildFocus,
  FamilyScenarioGenerateSummary,
  FamilyScenarioRecord,
  FamilyScenarioStatus,
} from "@/lib/types";
import {
  bulkSetFamilyScenarioStatusAction,
  saveFamilyScenarioAction,
  setFamilyScenarioStatusAction,
} from "@/server/actions/family";

function sortScenarios(scenarios: FamilyScenarioRecord[]) {
  return [...scenarios].sort((left, right) => {
    if (left.status !== right.status) {
      const order: FamilyScenarioStatus[] = ["SUGGESTED", "APPROVED", "ARCHIVED"];
      return order.indexOf(left.status) - order.indexOf(right.status);
    }
    return left.title.localeCompare(right.title);
  });
}

export function FamilyScenariosView({
  scenarios: initialScenarios,
  aiEnabled,
}: {
  scenarios: FamilyScenarioRecord[];
  aiEnabled: boolean;
}) {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [childFilter, setChildFilter] = useState<FamilyScenarioRecord["childFocus"] | undefined>();
  const [sourceFilter, setSourceFilter] = useState<
    FamilyScenarioRecord["source"] | undefined
  >();
  const [statusTab, setStatusTab] = useState<FamilyScenarioStatus>("APPROVED");
  const [scenarios, setScenarios] = useState(() => sortScenarios(initialScenarios));
  const [editingScenarioId, setEditingScenarioId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(
    FAMILY_SCENARIO_GENERATE_DEFAULT_COUNT,
  );
  const [generateChildFocus, setGenerateChildFocus] = useState<
    FamilyChunkChildFocus | undefined
  >();
  const [generateCategory, setGenerateCategory] = useState("");
  const [generateIncludeContext, setGenerateIncludeContext] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSummary, setGenerateSummary] =
    useState<FamilyScenarioGenerateSummary | null>(null);

  const categoryOptions = useMemo(
    () =>
      [...new Set(scenarios.map((scenario) => scenario.category))]
        .sort((left, right) => left.localeCompare(right))
        .map((category) => ({
          label: category,
          value: category,
        })),
    [scenarios],
  );

  const scenariosForTab = useMemo(
    () => scenarios.filter((scenario) => scenario.status === statusTab),
    [scenarios, statusTab],
  );

  const filteredScenarios = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scenariosForTab.filter((scenario) => {
      const matchesSearch =
        query.length === 0 ||
        [
          scenario.title,
          scenario.category,
          scenario.description,
          ...(scenario.suggestedGoals ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesCategory = categoryFilter
        ? scenario.category === categoryFilter
        : true;
      const matchesChild = childFilter
        ? scenario.childFocus === childFilter
        : true;
      const matchesSource = sourceFilter
        ? scenario.source === sourceFilter
        : true;

      return matchesSearch && matchesCategory && matchesChild && matchesSource;
    });
  }, [categoryFilter, childFilter, scenariosForTab, search, sourceFilter]);

  const counts = useMemo(() => {
    return {
      SUGGESTED: scenarios.filter((s) => s.status === "SUGGESTED").length,
      APPROVED: scenarios.filter((s) => s.status === "APPROVED").length,
      ARCHIVED: scenarios.filter((s) => s.status === "ARCHIVED").length,
    } as Record<FamilyScenarioStatus, number>;
  }, [scenarios]);

  const resetForm = () => {
    setEditingScenarioId(undefined);
    form.resetFields();
    form.setFieldsValue({
      childFocus: "BOTH",
      difficulty: 2,
      isActive: true,
      status: "APPROVED",
    });
  };

  const startEdit = (scenario: FamilyScenarioRecord) => {
    setEditingScenarioId(scenario.id);
    form.setFieldsValue({
      id: scenario.id,
      title: scenario.title,
      category: scenario.category,
      childFocus: scenario.childFocus,
      description: scenario.description,
      difficulty: scenario.difficulty,
      isActive: scenario.isActive,
      status: scenario.status,
    });
  };

  const mergeScenario = (next: FamilyScenarioRecord) =>
    sortScenarios([next, ...scenarios.filter((scenario) => scenario.id !== next.id)]);

  const mergeScenarios = (updates: FamilyScenarioRecord[]) => {
    const byId = new Map(updates.map((scenario) => [scenario.id, scenario]));
    return sortScenarios(
      scenarios.map((scenario) => byId.get(scenario.id) ?? scenario),
    );
  };

  const submit = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveFamilyScenarioAction(values);

      if (!result.ok || !result.scenario) {
        message.error(result.message);
        return;
      }

      setScenarios(mergeScenario(result.scenario));
      message.success(result.message);
      resetForm();
    });
  };

  const changeStatus = (
    scenario: FamilyScenarioRecord,
    status: FamilyScenarioStatus,
  ) => {
    startTransition(async () => {
      const result = await setFamilyScenarioStatusAction({
        scenarioId: scenario.id,
        status,
      });

      if (!result.ok || !result.scenario) {
        message.error(result.message);
        return;
      }

      setScenarios(mergeScenario(result.scenario));
      message.success(result.message);
    });
  };

  const bulkChange = (status: FamilyScenarioStatus) => {
    if (selectedIds.size === 0) {
      message.info("Select at least one scenario first.");
      return;
    }

    startTransition(async () => {
      const result = await bulkSetFamilyScenarioStatusAction({
        scenarioIds: [...selectedIds],
        status,
      });

      if (!result.ok || !result.scenarios) {
        message.error(result.message);
        return;
      }

      setScenarios(mergeScenarios(result.scenarios));
      setSelectedIds(new Set());
      message.success(result.message);
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runGenerate = async () => {
    setGenerateLoading(true);
    setGenerateError(null);
    setGenerateSummary(null);

    try {
      const response = await fetch("/api/family/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: generateCount,
          childFocus: generateChildFocus,
          category: generateCategory.trim() || undefined,
          includeExistingContext: generateIncludeContext,
        }),
      });
      const data = (await response.json()) as {
        summary?: FamilyScenarioGenerateSummary;
        message?: string;
      };

      if (!response.ok || !data.summary) {
        throw new Error(data.message ?? "Could not generate scenarios.");
      }

      setGenerateSummary(data.summary);
      if (data.summary.scenarios.length > 0) {
        setScenarios(
          sortScenarios([
            ...data.summary.scenarios,
            ...scenarios.filter(
              (scenario) =>
                !data.summary?.scenarios.some((next) => next.id === scenario.id),
            ),
          ]),
        );
        setStatusTab("SUGGESTED");
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Could not generate scenarios.",
      );
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Scenarios
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Manage private family-life situations for Kiwi, Vivi, and daily parent-child English
          practice. AI-generated scenarios start as Suggested for review.
        </Typography.Text>
      </div>

      <Card>
        <Space wrap>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => {
              setGenerateOpen(true);
              setGenerateError(null);
              setGenerateSummary(null);
            }}
            disabled={!aiEnabled}
          >
            Generate Scenarios with AI
          </Button>
          {!aiEnabled ? <Tag color="warning">AI not configured</Tag> : null}
          <Typography.Text type="secondary">
            Suggested: {counts.SUGGESTED} · Approved: {counts.APPROVED} · Archived:{" "}
            {counts.ARCHIVED}
          </Typography.Text>
        </Space>
      </Card>

      <Card title={editingScenarioId ? "Edit scenario" : "Create scenario"}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            childFocus: "BOTH",
            difficulty: 2,
            isActive: true,
            status: "APPROVED",
          }}
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <div className="family-form-grid">
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input maxLength={191} placeholder="Bedtime struggle" />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Input maxLength={120} placeholder="Bedtime" />
            </Form.Item>
            <Form.Item name="childFocus" label="Child focus" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: "Kiwi", value: "KIWI" },
                  { label: "Vivi", value: "VIVI" },
                  { label: "Both", value: "BOTH" },
                ]}
              />
            </Form.Item>
            <Form.Item name="difficulty" label="Difficulty" rules={[{ required: true }]}>
              <Select
                options={[1, 2, 3, 4, 5].map((value) => ({
                  label: `Level ${value}`,
                  value,
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={FAMILY_SCENARIO_STATUSES.map((status) => ({
                  label: FAMILY_SCENARIO_STATUS_LABELS[status],
                  value: status,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="isActive"
              label="Active for AI generation"
              valuePropName="checked"
            >
              <Checkbox>Active</Checkbox>
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true }]}
            extra="Describe the real family moment, likely tension, and what natural English practice should sound like."
          >
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} />
          </Form.Item>

          <div className="mobile-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={pending}
              onClick={() => void submit()}
              className="full-width-mobile"
            >
              {editingScenarioId ? "Save scenario" : "Create scenario"}
            </Button>
            {editingScenarioId ? (
              <Button onClick={resetForm} className="full-width-mobile">
                Cancel edit
              </Button>
            ) : null}
          </div>
        </Form>
      </Card>

      <Card title="Scenario library">
        <Tabs
          activeKey={statusTab}
          onChange={(key) => {
            setStatusTab(key as FamilyScenarioStatus);
            setSelectedIds(new Set());
          }}
          items={FAMILY_SCENARIO_STATUSES.map((status) => ({
            key: status,
            label: `${FAMILY_SCENARIO_STATUS_LABELS[status]} (${counts[status]})`,
          }))}
        />

        <div className="responsive-toolbar">
          <div className="responsive-toolbar__grow">
            <Input.Search
              placeholder="Search by title, category, or description"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="responsive-toolbar__actions">
            <Select
              allowClear
              placeholder="Filter by category"
              value={categoryFilter}
              options={categoryOptions}
              onChange={(value) => setCategoryFilter(value)}
              style={{ minWidth: isMobile ? "100%" : 180 }}
            />
            <Select
              allowClear
              placeholder="Filter by child"
              value={childFilter}
              onChange={(value) => setChildFilter(value)}
              options={[
                { label: "Kiwi", value: "KIWI" },
                { label: "Vivi", value: "VIVI" },
                { label: "Both", value: "BOTH" },
              ]}
              style={{ minWidth: isMobile ? "100%" : 180 }}
            />
            <Select
              allowClear
              placeholder="Filter by source"
              value={sourceFilter}
              onChange={(value) => setSourceFilter(value)}
              options={[
                { label: "AI", value: "AI" },
                { label: "Manual", value: "MANUAL" },
              ]}
              style={{ minWidth: isMobile ? "100%" : 160 }}
            />
          </div>
        </div>

        {statusTab === "SUGGESTED" && selectedIds.size > 0 ? (
          <Space wrap style={{ marginBlock: 12 }}>
            <Typography.Text strong>{selectedIds.size} selected</Typography.Text>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={pending}
              onClick={() => bulkChange("APPROVED")}
            >
              Bulk approve
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              loading={pending}
              onClick={() => bulkChange("ARCHIVED")}
            >
              Bulk archive
            </Button>
            <Button onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </Space>
        ) : null}

        {filteredScenarios.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              statusTab === "SUGGESTED"
                ? "No suggested scenarios yet. Tap Generate Scenarios with AI."
                : statusTab === "ARCHIVED"
                  ? "No archived scenarios."
                  : "No approved scenarios match the current filters."
            }
            style={{ marginBlock: 32 }}
          />
        ) : (
          <List
            className="mobile-card-list"
            dataSource={filteredScenarios}
            renderItem={(scenario) => (
              <List.Item key={scenario.id}>
                <Card
                  className="table-card"
                  title={
                    <Space wrap>
                      {statusTab === "SUGGESTED" ? (
                        <Checkbox
                          checked={selectedIds.has(scenario.id)}
                          onChange={() => toggleSelect(scenario.id)}
                        />
                      ) : null}
                      <span>{scenario.title}</span>
                    </Space>
                  }
                  extra={
                    <Space wrap>
                      <Tag
                        color={
                          scenario.status === "APPROVED"
                            ? "green"
                            : scenario.status === "SUGGESTED"
                              ? "gold"
                              : "default"
                        }
                      >
                        {FAMILY_SCENARIO_STATUS_LABELS[scenario.status]}
                      </Tag>
                      <Tag color={scenario.source === "AI" ? "purple" : "default"}>
                        {FAMILY_SCENARIO_SOURCE_LABELS[scenario.source]}
                      </Tag>
                      <Tag>{scenario.category}</Tag>
                      <Tag color="blue">
                        {FAMILY_CHILD_FOCUS_LABELS[scenario.childFocus]}
                      </Tag>
                      <Tag>Difficulty {scenario.difficulty}</Tag>
                    </Space>
                  }
                >
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    {scenario.status === "ARCHIVED" ? (
                      <Alert
                        type="warning"
                        showIcon
                        message="This scenario is archived and will not be available for new AI conversation generation."
                      />
                    ) : null}
                    <Typography.Text className="wrap-anywhere">
                      {scenario.description}
                    </Typography.Text>
                    {scenario.suggestedGoals.length > 0 ? (
                      <div>
                        <Typography.Text strong>Suggested goals</Typography.Text>
                        <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                          {scenario.suggestedGoals.map((goal) => (
                            <li key={goal}>
                              <Typography.Text className="wrap-anywhere">{goal}</Typography.Text>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {scenario.suggestedChunks.length > 0 ? (
                      <div>
                        <Typography.Text strong>Suggested chunks</Typography.Text>
                        <Space wrap style={{ marginTop: 6 }}>
                          {scenario.suggestedChunks.map((chunk) => (
                            <Tag key={chunk} color="purple">
                              {chunk}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    ) : null}
                    {scenario.aiReason ? (
                      <Alert
                        type="info"
                        showIcon
                        message="AI reasoning"
                        description={
                          <span className="wrap-anywhere">{scenario.aiReason}</span>
                        }
                      />
                    ) : null}
                    <div className="mobile-actions">
                      {scenario.status === "SUGGESTED" ? (
                        <>
                          <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => changeStatus(scenario, "APPROVED")}
                            loading={pending}
                            className="full-width-mobile"
                          >
                            Approve
                          </Button>
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => startEdit(scenario)}
                            className="full-width-mobile"
                          >
                            Edit then approve
                          </Button>
                          <Popconfirm
                            title="Archive this suggested scenario?"
                            onConfirm={() => changeStatus(scenario, "ARCHIVED")}
                          >
                            <Button icon={<StopOutlined />} danger className="full-width-mobile">
                              Archive
                            </Button>
                          </Popconfirm>
                        </>
                      ) : scenario.status === "APPROVED" ? (
                        <>
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => startEdit(scenario)}
                            className="full-width-mobile"
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Archive this scenario?"
                            onConfirm={() => changeStatus(scenario, "ARCHIVED")}
                          >
                            <Button icon={<StopOutlined />} danger className="full-width-mobile">
                              Archive
                            </Button>
                          </Popconfirm>
                        </>
                      ) : (
                        <Button
                          icon={<UndoOutlined />}
                          onClick={() => changeStatus(scenario, "APPROVED")}
                          loading={pending}
                          className="full-width-mobile"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        open={generateOpen}
        title="Generate scenarios with AI"
        onCancel={() => {
          if (!generateLoading) {
            setGenerateOpen(false);
          }
        }}
        footer={null}
        destroyOnHidden
        width={isMobile ? "100%" : 640}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text type="secondary" className="wrap-anywhere">
            AI will read your active Family Profile and suggest realistic scenarios. New scenarios
            start as Suggested for review; duplicates are skipped.
          </Typography.Text>

          <Space wrap>
            <Typography.Text strong>How many</Typography.Text>
            <InputNumber
              min={1}
              max={FAMILY_SCENARIO_GENERATE_MAX_COUNT}
              value={generateCount}
              onChange={(value) =>
                setGenerateCount(
                  typeof value === "number"
                    ? value
                    : FAMILY_SCENARIO_GENERATE_DEFAULT_COUNT,
                )
              }
            />
            <Typography.Text strong>Child focus</Typography.Text>
            <Select
              allowClear
              placeholder="Any"
              value={generateChildFocus}
              onChange={(value) =>
                setGenerateChildFocus(value as FamilyChunkChildFocus | undefined)
              }
              options={FAMILY_CHUNK_CHILD_FOCUS.map((value) => ({
                value,
                label: FAMILY_CHUNK_CHILD_FOCUS_LABELS[value],
              }))}
              style={{ width: 140 }}
            />
          </Space>

          <Space style={{ width: "100%" }}>
            <Typography.Text strong>Category bias</Typography.Text>
            <Input
              placeholder="Optional (e.g. Bedtime, Conflict)"
              maxLength={120}
              value={generateCategory}
              onChange={(event) => setGenerateCategory(event.target.value)}
            />
          </Space>

          <Checkbox
            checked={generateIncludeContext}
            onChange={(event) => setGenerateIncludeContext(event.target.checked)}
          >
            Include existing scenario titles so AI can avoid duplicates
          </Checkbox>

          <Button
            type="primary"
            icon={generateLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
            onClick={() => void runGenerate()}
            loading={generateLoading}
            disabled={generateLoading || !aiEnabled}
          >
            Generate
          </Button>

          {generateError ? (
            <Alert type="warning" showIcon message={generateError} />
          ) : null}

          {generateSummary ? (
            <Card size="small" title="Generation summary">
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Typography.Text>
                  Created {generateSummary.created} · skipped {generateSummary.skippedDuplicates}{" "}
                  duplicates
                </Typography.Text>
                {generateSummary.warnings.length > 0 ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Notes"
                    description={
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {generateSummary.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    }
                  />
                ) : null}
                <Typography.Text type="secondary" className="wrap-anywhere">
                  Open the Suggested tab to review, edit, approve, or archive.
                </Typography.Text>
              </Space>
            </Card>
          ) : null}
        </Space>
      </Modal>
    </div>
  );
}
