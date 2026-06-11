import { FamilyInsightsView } from "@/components/family/family-insights-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { buildFamilyInsightsSnapshot } from "@/server/family/family-insights-service";

export default async function FamilyInsightsPage() {
  const session = await requireApprovedSession();
  const snapshot = await buildFamilyInsightsSnapshot({
    userId: session.user.id,
  });

  return (
    <FamilyInsightsView
      snapshot={snapshot}
      aiEnabled={isAiTutorConfigured()}
    />
  );
}
