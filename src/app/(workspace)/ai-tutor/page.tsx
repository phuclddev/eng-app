import { AiTutorChat } from "@/components/ai/ai-tutor-chat";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";

export default async function AiTutorPage() {
  await requireApprovedSession();

  return <AiTutorChat enabled={isAiTutorConfigured()} />;
}
