import { SpeakingIdeaCoverageView } from "@/components/admin/speaking-idea-coverage-view";
import { requireAdminSession } from "@/server/auth";
import { getSpeakingIdeaCoverageSnapshot } from "@/server/data/speaking-ideas";

export default async function SpeakingIdeaCoveragePage() {
  await requireAdminSession();
  const snapshot = await getSpeakingIdeaCoverageSnapshot();

  return <SpeakingIdeaCoverageView snapshot={snapshot} />;
}
