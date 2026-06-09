"use client";

import {
  EditOutlined,
  PlusOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState, useTransition } from "react";

import {
  FAMILY_CHILD_FOCUS_LABELS,
} from "@/lib/constants";
import type { FamilyScenarioRecord } from "@/lib/types";
import { saveFamilyScenarioAction, setFamilyScenarioActiveStateAction } from "@/server/actions/family";

function sortScenarios(scenarios: FamilyScenarioRecord[]) {
  return [...scenarios].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
}

export function FamilyScenariosView({
  scenarios: initialScenarios,
}: {
  scenarios: FamilyScenarioRecord[];
}) {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [childFilter, setChildFilter] = useState<FamilyScenarioRecord["childFocus"] | undefined>();
  const [scenarios, setScenarios] = useState(() => sortScenarios(initialScenarios));
  const [editingScenarioId, setEditingScenarioId] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

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

  const filteredScenarios = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scenarios.filter((scenario) => {
      const matchesSearch =
        query.length === 0 ||
        [scenario.title, scenario.category, scenario.description]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesCategory = categoryFilter ? scenario.category === categoryFilter : true;
      const matchesChild = childFilter ? scenario.childFocus === childFilter : true;

      return matchesSearch && matchesCategory && matchesChild;
    });
  }, [categoryFilter, childFilter, scenarios, search]);

  const resetForm = () => {
    setEditingScenarioId(undefined);
    form.resetFields();
    form.setFieldsValue({
      childFocus: "BOTH",
      difficulty: 2,
      isActive: true,
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
    });
  };

  const submit = async () => {
    const values = await form.validateFields();

    startTransition(async () => {
      const result = await saveFamilyScenarioAction(values);

      if (!result.ok || !result.scenario) {
        message.error(result.message);
        return;
      }

      setScenarios((current) =>
        sortScenarios([
          result.scenario,
          ...current.filter((scenario) => scenario.id !== result.scenario?.id),
        ]),
      );
      message.success(result.message);
      resetForm();
    });
  };

  const toggleScenario = (scenario: FamilyScenarioRecord, isActive: boolean) => {
    startTransition(async () => {
      const result = await setFamilyScenarioActiveStateAction({
        scenarioId: scenario.id,
        isActive,
      });

      if (!result.ok || !result.scenario) {
        message.error(result.message);
        return;
      }

      setScenarios((current) =>
        sortScenarios(
          current.map((item) => (item.id === result.scenario?.id ? result.scenario : item)),
        ),
      );
      message.success(result.message);
    });
  };

  return (
    <div className="stacked-view">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Scenarios
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Manage private family-life situations for Kiwi, Vivi, and daily parent-child English
          practice without reusing the IELTS Question Bank.
        </Typography.Text>
      </div>

      <Card title={editingScenarioId ? "Edit scenario" : "Create scenario"}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            childFocus: "BOTH",
            difficulty: 2,
            isActive: true,
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
          </div>
        </div>

        {filteredScenarios.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No family scenarios match the current filters."
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
                  title={scenario.title}
                  extra={
                    <Space wrap>
                      <Tag color={scenario.isActive ? "green" : "default"}>
                        {scenario.isActive ? "Active" : "Archived"}
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
                    {!scenario.isActive ? (
                      <Alert
                        type="warning"
                        showIcon
                        message="This scenario is archived and will not be available for new AI conversation generation."
                      />
                    ) : null}
                    <Typography.Text className="wrap-anywhere">
                      {scenario.description}
                    </Typography.Text>
                    <div className="mobile-actions">
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => startEdit(scenario)}
                        className="full-width-mobile"
                      >
                        Edit
                      </Button>
                      {scenario.isActive ? (
                        <Popconfirm
                          title="Archive this scenario?"
                          description="Archived scenarios stay in your library but are removed from active generation choices."
                          onConfirm={() => toggleScenario(scenario, false)}
                          okText="Archive"
                        >
                          <Button
                            icon={<StopOutlined />}
                            danger
                            className="full-width-mobile"
                          >
                            Archive
                          </Button>
                        </Popconfirm>
                      ) : (
                        <Button
                          icon={<UndoOutlined />}
                          onClick={() => toggleScenario(scenario, true)}
                          className="full-width-mobile"
                        >
                          Reactivate
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
    </div>
  );
}
