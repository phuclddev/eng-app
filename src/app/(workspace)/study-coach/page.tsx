import { AiStudyCoachView } from "@/components/ai/ai-study-coach-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { getAiStudyCoachSnapshot } from "@/server/ai/study-coach-service";

export default async function StudyCoachPage() {
  const session = await requireApprovedSession();
  const enabled = isAiTutorConfigured();
  const snapshot = enabled
    ? await getAiStudyCoachSnapshot({
        userId: session.user.id,
      })
    : null;

  return <AiStudyCoachView enabled={enabled} initialSnapshot={snapshot} />;
}
