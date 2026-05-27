import { PracticeRunner } from "@/components/practice/practice-runner";
import { getPracticeDeckForMode } from "@/server/data/practice";
import { requireApprovedSession } from "@/server/auth";

export default async function ReviewPage() {
  const session = await requireApprovedSession();
  const deck = await getPracticeDeckForMode(session.user.id, "REVIEW");

  return (
    <PracticeRunner
      deck={deck}
      mode="REVIEW"
      title="Review"
      description="Clear your due queue with confidence-aware spaced repetition."
    />
  );
}
