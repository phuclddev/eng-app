import { QuestionBankAdmin } from "@/components/admin/question-bank-admin";
import { getAdminQuestionBankSnapshot } from "@/server/data/questions";
import { requireAdminSession } from "@/server/auth";

export default async function AdminQuestionBankPage() {
  await requireAdminSession();
  const snapshot = await getAdminQuestionBankSnapshot();

  return (
    <QuestionBankAdmin
      questions={snapshot.questions}
      chunkOptions={snapshot.chunks}
    />
  );
}
