import { FamilyProfileEditor } from "@/components/family/family-profile-editor";
import { requireApprovedSession } from "@/server/auth";
import { getOrCreateFamilyProfile } from "@/server/family/family-profile-service";

export default async function FamilyProfilePage() {
  const session = await requireApprovedSession();
  const profile = await getOrCreateFamilyProfile({
    userId: session.user.id,
    email: session.user.email,
  });

  return <FamilyProfileEditor profile={profile} />;
}
