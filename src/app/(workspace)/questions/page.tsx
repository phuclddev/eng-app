import { QuestionBankView } from "@/components/questions/question-bank-view";
import { isAiTutorConfigured } from "@/lib/env";
import { getQuestionBank } from "@/server/data/questions";
import { requireApprovedSession } from "@/server/auth";
import { getTranslationScriptStatsForQuestions } from "@/server/translation/translation-script-service";

export default async function QuestionBankPage() {
  await requireApprovedSession();
  const questions = await getQuestionBank();
  const translationStats = await getTranslationScriptStatsForQuestions({
    questionIds: questions.map((question) => question.id),
  });

  return (
    <QuestionBankView
      aiTutorEnabled={isAiTutorConfigured()}
      questions={questions}
      translationStats={translationStats}
    />
  );
}
