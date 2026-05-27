"use client";

import { GoogleOutlined, LogoutOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { signIn, signOut } from "next-auth/react";
import { useTransition } from "react";

export function GoogleSignInButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      icon={<GoogleOutlined />}
      loading={pending}
      disabled={disabled}
      size="large"
      type="primary"
      onClick={() =>
        startTransition(async () => {
          await signIn("google", { callbackUrl: "/dashboard" });
        })
      }
    >
      Continue with Google
    </Button>
  );
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      icon={<LogoutOutlined />}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: "/" });
        })
      }
    >
      Logout
    </Button>
  );
}
