import { TranslationListView } from "@/components/translation/translation-list-view";
import { requireApprovedSession } from "@/server/auth";
import { listTranslationScripts } from "@/server/translation/translation-script-service";

export default async function TranslationScriptsPage() {
  const session = await requireApprovedSession();
  const scripts = await listTranslationScripts({ userId: session.user.id });

  return (
    <TranslationListView
      scripts={scripts}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}
