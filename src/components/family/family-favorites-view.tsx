"use client";

import { DeleteOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Empty,
  List,
  Popconfirm,
  Segmented,
  Space,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

import { FAMILY_FAVORITE_TARGET_LABELS } from "@/lib/constants";
import type {
  FamilyFavoriteRecord,
  FamilyFavoriteTargetType,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const TARGET_LINKS: Record<FamilyFavoriteTargetType, string> = {
  CONVERSATION: "/family/conversations",
  CHUNK: "/family/chunks",
  ROLEPLAY: "/family/roleplay",
  SCENARIO: "/family/scenarios",
};

export function FamilyFavoritesView({
  initialFavorites,
}: {
  initialFavorites: FamilyFavoriteRecord[];
}) {
  const { message } = App.useApp();
  const [favorites, setFavorites] = useState(initialFavorites);
  const [filter, setFilter] = useState<FamilyFavoriteTargetType | "ALL">("ALL");
  const [removing, setRemoving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") {
      return favorites;
    }
    return favorites.filter((favorite) => favorite.targetType === filter);
  }, [favorites, filter]);

  const handleRemove = async (favorite: FamilyFavoriteRecord) => {
    setRemoving(favorite.id);
    try {
      const response = await fetch("/api/family/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: favorite.targetType,
          targetId: favorite.targetId,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Could not remove favorite.");
      }
      setFavorites((current) =>
        current.filter((item) => item.id !== favorite.id),
      );
      message.success("Removed from favorites.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not remove favorite.",
      );
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Family Favorites
        </Typography.Title>
        <Typography.Text type="secondary" className="wrap-anywhere">
          Saved family conversations, chunks, scenarios, and roleplay sessions. Private to your
          account.
        </Typography.Text>
      </div>

      <Card
        title={`Favorites (${favorites.length})`}
        extra={
          <Segmented
            value={filter}
            onChange={(value) =>
              setFilter(value as FamilyFavoriteTargetType | "ALL")
            }
            options={[
              { value: "ALL", label: "All" },
              { value: "CONVERSATION", label: "Conversations" },
              { value: "CHUNK", label: "Chunks" },
              { value: "SCENARIO", label: "Scenarios" },
              { value: "ROLEPLAY", label: "Roleplays" },
            ]}
          />
        }
      >
        {filtered.length === 0 ? (
          <Empty
            description="No favorites yet. Save items from the Today's Plan page or family workspace."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary">
              <Link href="/family/today">Open Today&apos;s Plan</Link>
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={filtered}
            renderItem={(favorite) => (
              <List.Item
                key={favorite.id}
                actions={[
                  <Button key="open" type="link">
                    <Link href={TARGET_LINKS[favorite.targetType]}>Open</Link>
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="Remove from favorites?"
                    onConfirm={() => void handleRemove(favorite)}
                    okText="Remove"
                    cancelText="Cancel"
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      loading={removing === favorite.id}
                    >
                      Remove
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={favorite.label ?? favorite.targetId}
                  description={
                    <Space direction="vertical" size={2}>
                      <Space wrap size={4}>
                        <Tag>{FAMILY_FAVORITE_TARGET_LABELS[favorite.targetType]}</Tag>
                        {favorite.detail ? <Tag color="blue">{favorite.detail}</Tag> : null}
                      </Space>
                      <Typography.Text type="secondary">
                        Saved {formatDateTime(favorite.createdAt)}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
