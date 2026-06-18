import { SpeakingIdeaListView } from "@/components/admin/speaking-idea-list-view";
import { requireAdminSession } from "@/server/auth";
import { listSpeakingIdeas } from "@/server/data/speaking-ideas";

export default async function SpeakingIdeasPage() {
  await requireAdminSession();
  const ideas = await listSpeakingIdeas();

  return <SpeakingIdeaListView ideas={ideas} />;
}
