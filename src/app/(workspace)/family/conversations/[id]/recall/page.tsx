import { FamilyConversationRecallView } from "@/components/family/family-conversation-recall-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { getFamilyRecallScript } from "@/server/family/family-conversation-recall-service";

export default async function FamilyConversationRecallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireApprovedSession();
  const resolved = await params;
  const script = await getFamilyRecallScript({
    userId: session.user.id,
    conversationId: resolved.id,
  });

  return (
    <FamilyConversationRecallView
      script={script}
      aiEnabled={isAiTutorConfigured()}
    />
  );
}
