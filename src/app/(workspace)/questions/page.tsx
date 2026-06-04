import { QuestionBankView } from "@/components/questions/question-bank-view";
import { getQuestionBank } from "@/server/data/questions";
import { requireApprovedSession } from "@/server/auth";

export default async function QuestionBankPage() {
  await requireApprovedSession();
  const questions = await getQuestionBank();

  return <QuestionBankView questions={questions} />;
}
