import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardSnapshot } from "@/server/data/dashboard";
import { requireApprovedSession } from "@/server/auth";

export default async function DashboardPage() {
  const session = await requireApprovedSession();
  const snapshot = await getDashboardSnapshot(session.user.id);

  return <DashboardView snapshot={snapshot} />;
}
