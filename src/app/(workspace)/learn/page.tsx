import { LearnTodayView } from "@/components/dashboard/learn-today-view";
import { getDashboardSnapshot } from "@/server/data/dashboard";
import { getPracticeDeckForMode } from "@/server/data/practice";
import { requireApprovedSession } from "@/server/auth";

export default async function LearnTodayPage() {
  const session = await requireApprovedSession();
  const [snapshot, deck] = await Promise.all([
    getDashboardSnapshot(session.user.id),
    getPracticeDeckForMode(session.user.id, "MIXED"),
  ]);

  return (
    <LearnTodayView
      dueReviews={snapshot.dueReviews}
      totalChunks={snapshot.totalChunks}
      plannedQuestions={deck.exercises.length}
    />
  );
}
