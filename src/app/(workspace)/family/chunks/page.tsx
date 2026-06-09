import { FamilyChunksView } from "@/components/family/family-chunks-view";
import { requireApprovedSession } from "@/server/auth";
import { listFamilyChunks } from "@/server/family/family-chunk-service";

export default async function FamilyChunksPage() {
  const session = await requireApprovedSession();
  const chunks = await listFamilyChunks({
    userId: session.user.id,
  });

  return <FamilyChunksView chunks={chunks} />;
}
