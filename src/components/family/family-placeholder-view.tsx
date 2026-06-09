"use client";

import { Alert, Card, List, Space, Tag, Typography } from "antd";

export function FamilyPlaceholderView({
  description,
  plannedItems,
  title,
}: {
  description: string;
  plannedItems: string[];
  title: string;
}) {
  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          {description}
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        message="Planned next phase"
        description="This Family English page is scaffolded separately from IELTS features and ready for the next implementation phase."
      />

      <Card title="Planned items">
        <List
          dataSource={plannedItems}
          renderItem={(item) => (
            <List.Item>
              <Space wrap>
                <Tag color="blue">Planned</Tag>
                <Typography.Text className="wrap-anywhere">{item}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
