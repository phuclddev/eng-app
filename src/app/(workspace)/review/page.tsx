import { PracticeRunner } from "@/components/practice/practice-runner";
import { isAiTutorConfigured } from "@/lib/env";
import { getPracticeDeckForMode } from "@/server/data/practice";
import { requireApprovedSession } from "@/server/auth";

export default async function ReviewPage() {
  const session = await requireApprovedSession();
  const deck = await getPracticeDeckForMode(session.user.id, "REVIEW");

  return (
    <PracticeRunner
      aiTutorEnabled={isAiTutorConfigured()}
      deck={deck}
      mode="REVIEW"
      title="Review"
      description="Clear your due queue with confidence-aware spaced repetition."
    />
  );
}
