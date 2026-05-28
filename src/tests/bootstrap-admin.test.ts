import { UserRole, UserStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_NAME,
  buildBootstrapAdminUpsertArgs,
  ensureBootstrapAdminUser,
} from "@/server/bootstrap-admin";

describe("bootstrap admin", () => {
  it("builds an upsert that always preserves admin approval", () => {
    const now = new Date("2026-05-28T10:00:00.000Z");
    const args = buildBootstrapAdminUpsertArgs(
      {
        name: "Dinh Phuc Luu",
        image: "https://example.com/admin.png",
      },
      now,
    );

    expect(args.where.email).toBe(BOOTSTRAP_ADMIN_EMAIL);
    expect(args.create).toMatchObject({
      email: BOOTSTRAP_ADMIN_EMAIL,
      name: "Dinh Phuc Luu",
      image: "https://example.com/admin.png",
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: now,
      blockedAt: null,
    });
    expect(args.update).toMatchObject({
      name: "Dinh Phuc Luu",
      image: "https://example.com/admin.png",
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: now,
      blockedAt: null,
    });
  });

  it("falls back to the bootstrap admin name when profile name is blank", () => {
    const args = buildBootstrapAdminUpsertArgs({ name: "   " });

    expect(args.create.name).toBe(BOOTSTRAP_ADMIN_NAME);
    expect(args.update).not.toHaveProperty("name");
  });

  it("remains idempotent across repeated upserts", async () => {
    const records = new Map<
      string,
      {
        approvedAt: Date;
        blockedAt: null;
        email: string;
        image: null | string;
        name: string;
        role: UserRole;
        status: UserStatus;
      }
    >();

    const userDelegate = {
      async upsert(args: ReturnType<typeof buildBootstrapAdminUpsertArgs>) {
        const existing = records.get(args.where.email);

        if (existing) {
          const updated = {
            ...existing,
            ...args.update,
            email: args.where.email,
            image: args.update.image ?? existing.image,
            name: args.update.name ?? existing.name,
          };

          records.set(args.where.email, updated);
          return updated;
        }

        records.set(args.where.email, args.create);
        return args.create;
      },
    };

    await ensureBootstrapAdminUser(userDelegate, { name: "Admin Seed" });
    await ensureBootstrapAdminUser(userDelegate, {
      image: "https://example.com/updated.png",
    });

    expect(records.size).toBe(1);
    expect(records.get(BOOTSTRAP_ADMIN_EMAIL)).toMatchObject({
      email: BOOTSTRAP_ADMIN_EMAIL,
      name: "Admin Seed",
      image: "https://example.com/updated.png",
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      blockedAt: null,
    });
  });
});
