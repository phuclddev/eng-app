import { FamilyRoleplayView } from "@/components/family/family-roleplay-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { listFamilyRoleplaySessions } from "@/server/family/family-roleplay-service";
import { listActiveFamilyScenarios } from "@/server/family/family-scenario-service";

export default async function FamilyRoleplayPage() {
  const session = await requireApprovedSession();

  const [scenarios, sessions] = await Promise.all([
    listActiveFamilyScenarios({
      userId: session.user.id,
      email: session.user.email,
    }),
    listFamilyRoleplaySessions({ userId: session.user.id }),
  ]);

  return (
    <FamilyRoleplayView
      scenarios={scenarios}
      sessions={sessions}
      aiEnabled={isAiTutorConfigured()}
    />
  );
}
