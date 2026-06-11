import { FamilyHomeView } from "@/components/family/family-home-view";
import { requireApprovedSession } from "@/server/auth";
import { getFamilyChunkSnapshot } from "@/server/family/family-chunk-service";
import { getFamilyConversationSummary } from "@/server/family/family-conversation-service";
import { buildFamilyDashboardSnapshot } from "@/server/family/family-dashboard-service";
import { getOrCreateFamilyProfile } from "@/server/family/family-profile-service";
import { getFamilyScenarioSummary } from "@/server/family/family-scenario-service";

export default async function FamilyHomePage() {
  const session = await requireApprovedSession();
  const [profile, scenarioSnapshot, conversationSnapshot, chunkSnapshot, dashboard] =
    await Promise.all([
      getOrCreateFamilyProfile({
        userId: session.user.id,
        email: session.user.email,
      }),
      getFamilyScenarioSummary({
        userId: session.user.id,
        email: session.user.email,
      }),
      getFamilyConversationSummary({
        userId: session.user.id,
      }),
      getFamilyChunkSnapshot({
        userId: session.user.id,
      }),
      buildFamilyDashboardSnapshot({
        userId: session.user.id,
      }),
    ]);

  return (
    <FamilyHomeView
      profile={profile}
      scenarioCount={scenarioSnapshot.totalActiveScenarios}
      conversationCount={conversationSnapshot.totalConversations}
      chunkCount={chunkSnapshot.totalApprovedChunks}
      dashboard={dashboard}
    />
  );
}
