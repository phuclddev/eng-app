import { notFound } from "next/navigation";

import { SpeakingIdeaStudyMapView } from "@/components/admin/speaking-idea-study-map-view";
import { requireAdminSession } from "@/server/auth";
import { getSpeakingIdeaById } from "@/server/data/speaking-ideas";

export default async function SpeakingIdeaStudyMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const idea = await getSpeakingIdeaById(id);

  if (!idea) {
    notFound();
  }

  return <SpeakingIdeaStudyMapView idea={idea} />;
}
