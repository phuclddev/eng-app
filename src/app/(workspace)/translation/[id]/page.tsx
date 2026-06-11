import { TranslationScriptView } from "@/components/translation/translation-script-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { getTranslationScriptForUser } from "@/server/translation/translation-script-service";

export default async function TranslationScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireApprovedSession();
  const resolved = await params;
  const script = await getTranslationScriptForUser({
    userId: session.user.id,
    scriptId: resolved.id,
  });

  return (
    <TranslationScriptView
      script={script}
      aiEnabled={isAiTutorConfigured()}
    />
  );
}
