import { SpeakingIdeaMapView } from "@/components/admin/speaking-idea-map-view";
import { requireAdminSession } from "@/server/auth";
import { listSpeakingIdeas } from "@/server/data/speaking-ideas";

export default async function SpeakingIdeaMapPage() {
  await requireAdminSession();

  const ideas = await listSpeakingIdeas();

  return <SpeakingIdeaMapView ideas={ideas} />;
}
