import { FamilyConversationsView } from "@/components/family/family-conversations-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { listFamilyConversations } from "@/server/family/family-conversation-service";
import { listActiveFamilyScenarios } from "@/server/family/family-scenario-service";

export default async function FamilyConversationsPage() {
  const session = await requireApprovedSession();
  const [scenarios, conversations] = await Promise.all([
    listActiveFamilyScenarios({
      userId: session.user.id,
      email: session.user.email,
    }),
    listFamilyConversations({
      userId: session.user.id,
    }),
  ]);

  return (
    <FamilyConversationsView
      aiTutorEnabled={isAiTutorConfigured()}
      conversations={conversations}
      scenarios={scenarios}
    />
  );
}
