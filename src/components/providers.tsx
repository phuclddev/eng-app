"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#0f766e",
            colorInfo: "#0f766e",
            colorSuccess: "#15803d",
            colorWarning: "#d97706",
            colorError: "#b91c1c",
            colorBgLayout: "transparent",
            colorBgContainer: "rgba(255, 255, 255, 0.88)",
            colorBorderSecondary: "rgba(15, 23, 42, 0.08)",
            borderRadius: 18,
            fontFamily: "var(--font-plex-sans)",
          },
          components: {
            Layout: {
              headerBg: "transparent",
              siderBg: "rgba(9, 20, 35, 0.92)",
              bodyBg: "transparent",
            },
            Card: {
              bodyPadding: 20,
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
