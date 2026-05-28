import { UserRole, UserStatus } from "@prisma/client";

export const BOOTSTRAP_ADMIN_EMAIL = "dinhphuc.luu@garena.vn";
export const BOOTSTRAP_ADMIN_NAME = "Dinh Phuc Luu";

type BootstrapAdminProfile = {
  image?: null | string;
  name?: null | string;
};

type BootstrapAdminUserDelegate = {
  upsert(args: {
    create: {
      approvedAt: Date;
      blockedAt: null;
      email: string;
      image: null | string;
      name: string;
      role: UserRole;
      status: UserStatus;
    };
    update: {
      approvedAt: Date;
      blockedAt: null;
      image?: null | string;
      name?: string;
      role: UserRole;
      status: UserStatus;
    };
    where: {
      email: string;
    };
  }): Promise<unknown>;
};

function normalizeOptionalName(name?: null | string) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function isBootstrapAdminEmail(email?: null | string) {
  return email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}

export function buildBootstrapAdminUpsertArgs(
  profile: BootstrapAdminProfile = {},
  now = new Date(),
) {
  const normalizedName = normalizeOptionalName(profile.name);
  const normalizedImage =
    typeof profile.image === "string" ? profile.image : profile.image ?? null;

  return {
    where: {
      email: BOOTSTRAP_ADMIN_EMAIL,
    },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: now,
      blockedAt: null,
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(profile.image !== undefined ? { image: normalizedImage } : {}),
    },
    create: {
      email: BOOTSTRAP_ADMIN_EMAIL,
      name: normalizedName ?? BOOTSTRAP_ADMIN_NAME,
      image: normalizedImage,
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: now,
      blockedAt: null,
    },
  };
}

export async function ensureBootstrapAdminUser(
  userDelegate: BootstrapAdminUserDelegate,
  profile: BootstrapAdminProfile = {},
) {
  return userDelegate.upsert(buildBootstrapAdminUpsertArgs(profile));
}
