import { FamilyTodayView } from "@/components/family/family-today-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { getFamilyDailyPlanForUser } from "@/server/family/family-daily-plan-service";
import { listFamilyFavoritesForUser } from "@/server/family/family-favorites-service";

export default async function FamilyTodayPage() {
  const session = await requireApprovedSession();

  const [{ plan, recommendations }, favorites] = await Promise.all([
    getFamilyDailyPlanForUser({
      userId: session.user.id,
      childFocus: "BOTH",
    }),
    listFamilyFavoritesForUser({ userId: session.user.id }),
  ]);

  return (
    <FamilyTodayView
      initialPlan={plan}
      initialRecommendations={recommendations}
      initialFavorites={favorites}
      aiEnabled={isAiTutorConfigured()}
    />
  );
}
