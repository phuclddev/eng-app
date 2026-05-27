import { redirect } from "next/navigation";
import { Card, Space, Typography } from "antd";

import { GoogleSignInButton } from "@/components/ui/auth-buttons";
import { isGoogleAuthConfigured } from "@/lib/env";
import { getAuthSession } from "@/server/auth";

export default async function SignInPage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect(session.user.status === "APPROVED" ? "/dashboard" : `/auth/pending?status=${session.user.status}`);
  }

  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <Card style={{ maxWidth: 560, margin: "0 auto" }}>
          <Space direction="vertical" size={18}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Sign in
            </Typography.Title>
            <Typography.Text type="secondary">
              Use your Google account to request access to the private IELTS chunk platform.
            </Typography.Text>
            <GoogleSignInButton disabled={!isGoogleAuthConfigured()} />
          </Space>
        </Card>
      </section>
    </main>
  );
}
