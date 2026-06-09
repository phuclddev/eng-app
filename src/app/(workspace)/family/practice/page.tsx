import { FamilyPlaceholderView } from "@/components/family/family-placeholder-view";
import { requireApprovedSession } from "@/server/auth";

export default async function FamilyPracticePage() {
  await requireApprovedSession();

  return (
    <FamilyPlaceholderView
      title="Family Practice"
      description="Family conversation practice will be implemented here with separate progress tracking and no impact on IELTS review metrics."
      plannedItems={[
        "Vietnamese to English recall for family chunks",
        "Fill-in-the-blank family dialogues",
        "Choose the natural response",
        "Continue the conversation practice",
      ]}
    />
  );
}
