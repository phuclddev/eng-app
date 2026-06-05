import { PracticeRunner } from "@/components/practice/practice-runner";
import { isAiTutorConfigured } from "@/lib/env";
import { getPracticeDeckForMode } from "@/server/data/practice";
import { requireApprovedSession } from "@/server/auth";

export default async function PracticePage() {
  const session = await requireApprovedSession();
  const deck = await getPracticeDeckForMode(session.user.id, "LEARN");

  return (
    <PracticeRunner
      aiTutorEnabled={isAiTutorConfigured()}
      deck={deck}
      mode="LEARN"
      title="Practice"
      description="Build recall through mixed recognition and production prompts."
    />
  );
}
