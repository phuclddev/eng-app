import { buildInitialFamilyProfileSeed } from "@/server/family/default-family-profile";

export function buildCompactFamilyProfileSummary(profileMarkdown: string) {
  return profileMarkdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

export function buildFamilyProfileUpsertArgs(input: {
  email?: null | string;
  title?: string;
  profileMarkdown?: string;
  userId: string;
}) {
  const initial = buildInitialFamilyProfileSeed(input.email);

  return {
    where: {
      userId: input.userId,
    },
    update: {
      title: input.title ?? initial.title,
      profileMarkdown: input.profileMarkdown ?? initial.profileMarkdown,
      isActive: true,
    },
    create: {
      userId: input.userId,
      title: input.title ?? initial.title,
      profileMarkdown: input.profileMarkdown ?? initial.profileMarkdown,
      isActive: true,
    },
  };
}
