import { QuestionBankAdmin } from "@/components/admin/question-bank-admin";
import { isAiTutorConfigured } from "@/lib/env";
import { getAdminQuestionBankSnapshot } from "@/server/data/questions";
import { requireAdminSession } from "@/server/auth";

export default async function AdminQuestionBankPage() {
  await requireAdminSession();
  const snapshot = await getAdminQuestionBankSnapshot();

  return (
    <QuestionBankAdmin
      aiTutorEnabled={isAiTutorConfigured()}
      questions={snapshot.questions}
      chunkOptions={snapshot.chunks}
    />
  );
}
