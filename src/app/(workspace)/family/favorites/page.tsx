import { FamilyFavoritesView } from "@/components/family/family-favorites-view";
import { requireApprovedSession } from "@/server/auth";
import { listFamilyFavoritesForUser } from "@/server/family/family-favorites-service";

export default async function FamilyFavoritesPage() {
  const session = await requireApprovedSession();
  const favorites = await listFamilyFavoritesForUser({
    userId: session.user.id,
  });

  return <FamilyFavoritesView initialFavorites={favorites} />;
}
