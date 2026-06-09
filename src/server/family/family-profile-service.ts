import type { FamilyProfileRecord } from "@/lib/types";
import { prisma } from "@/server/prisma";

import { buildFamilyProfileUpsertArgs } from "@/server/family/family-profile-helpers";

export function mapFamilyProfile(profile: {
  id: string;
  userId: string;
  title: string;
  profileMarkdown: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FamilyProfileRecord {
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title,
    profileMarkdown: profile.profileMarkdown,
    isActive: profile.isActive,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function getOrCreateFamilyProfile(input: {
  email?: null | string;
  userId: string;
}) {
  const existing = await prisma.familyProfile.findUnique({
    where: {
      userId: input.userId,
    },
  });

  if (existing) {
    return mapFamilyProfile(existing);
  }

  const created = await prisma.familyProfile.create({
    data: buildFamilyProfileUpsertArgs(input).create,
  });

  return mapFamilyProfile(created);
}

export async function saveFamilyProfile(input: {
  email?: null | string;
  profileMarkdown: string;
  title: string;
  userId: string;
}) {
  const profile = await prisma.familyProfile.upsert({
    ...buildFamilyProfileUpsertArgs(input),
  });

  return mapFamilyProfile(profile);
}

export async function getActiveFamilyProfileForUser(input: {
  userId: string;
}) {
  const profile = await prisma.familyProfile.findFirst({
    where: {
      userId: input.userId,
      isActive: true,
    },
  });

  return profile ? mapFamilyProfile(profile) : null;
}
