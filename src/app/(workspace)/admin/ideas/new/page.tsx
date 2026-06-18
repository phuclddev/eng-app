import { SpeakingIdeaEditor } from "@/components/admin/speaking-idea-editor";
import { requireAdminSession } from "@/server/auth";
import { getSpeakingIdeaQuestionOptions } from "@/server/data/speaking-ideas";

export default async function NewSpeakingIdeaPage() {
  await requireAdminSession();
  const questionOptions = await getSpeakingIdeaQuestionOptions();

  return <SpeakingIdeaEditor questionOptions={questionOptions} />;
}
