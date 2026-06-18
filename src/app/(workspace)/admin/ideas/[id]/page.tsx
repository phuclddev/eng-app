import { notFound } from "next/navigation";

import { SpeakingIdeaEditor } from "@/components/admin/speaking-idea-editor";
import { requireAdminSession } from "@/server/auth";
import {
  getSpeakingIdeaById,
  getSpeakingIdeaQuestionOptions,
} from "@/server/data/speaking-ideas";

export default async function SpeakingIdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const [idea, questionOptions] = await Promise.all([
    getSpeakingIdeaById(id),
    getSpeakingIdeaQuestionOptions(),
  ]);

  if (!idea) {
    notFound();
  }

  return <SpeakingIdeaEditor idea={idea} questionOptions={questionOptions} />;
}
