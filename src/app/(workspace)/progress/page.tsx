import { ProgressView } from "@/components/dashboard/progress-view";
import { getProgressSnapshot } from "@/server/data/dashboard";
import { requireApprovedSession } from "@/server/auth";

export default async function ProgressPage() {
  const session = await requireApprovedSession();
  const snapshot = await getProgressSnapshot(session.user.id);

  return <ProgressView snapshot={snapshot} />;
}
