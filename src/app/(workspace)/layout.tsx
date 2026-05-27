import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireApprovedSession } from "@/server/auth";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireApprovedSession();

  return <AppShell user={session.user}>{children}</AppShell>;
}
