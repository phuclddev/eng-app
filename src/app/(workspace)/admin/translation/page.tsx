import { TranslationImportView } from "@/components/translation/translation-import-view";
import { requireAdminSession } from "@/server/auth";

export default async function AdminTranslationImportPage() {
  await requireAdminSession();
  return <TranslationImportView />;
}
