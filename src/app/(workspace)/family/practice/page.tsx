import { FamilyPracticeView } from "@/components/family/family-practice-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { buildFamilyDashboardSnapshot } from "@/server/family/family-dashboard-service";
import { buildFamilyPracticeDeckForUser } from "@/server/family/family-practice-service";
import { listActiveFamilyScenarios } from "@/server/family/family-scenario-service";

export default async function FamilyPracticePage() {
  const session = await requireApprovedSession();

  const [dashboard, deck, scenarios] = await Promise.all([
    buildFamilyDashboardSnapshot({ userId: session.user.id }),
    buildFamilyPracticeDeckForUser({
      userId: session.user.id,
      mode: "DAILY",
    }),
    listActiveFamilyScenarios({
      userId: session.user.id,
      email: session.user.email,
    }),
  ]);

  const recommendedScenario = scenarios[0] ?? null;

  return (
    <FamilyPracticeView
      initialDeck={deck}
      dashboard={dashboard}
      recommendedScenario={recommendedScenario}
      aiFeedbackEnabled={isAiTutorConfigured()}
    />
  );
}
