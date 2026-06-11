import { FamilyScenariosView } from "@/components/family/family-scenarios-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { listFamilyScenarios } from "@/server/family/family-scenario-service";

export default async function FamilyScenariosPage() {
  const session = await requireApprovedSession();
  const scenarios = await listFamilyScenarios({
    userId: session.user.id,
    email: session.user.email,
  });

  return (
    <FamilyScenariosView
      scenarios={scenarios}
      aiEnabled={isAiTutorConfigured()}
    />
  );
}
