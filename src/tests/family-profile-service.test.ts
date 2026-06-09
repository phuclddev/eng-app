import { describe, expect, it } from "vitest";

import { BOOTSTRAP_ADMIN_EMAIL } from "@/server/bootstrap-admin";
import {
  DEFAULT_FAMILY_PROFILE_TITLE,
  GENERIC_FAMILY_PROFILE_TITLE,
  buildInitialFamilyProfileSeed,
} from "@/server/family/default-family-profile";
import { buildFamilyProfileUpsertArgs } from "@/server/family/family-profile-helpers";

describe("family profile service helpers", () => {
  it("uses the imported Phuc family profile for the bootstrap admin", () => {
    const seed = buildInitialFamilyProfileSeed(BOOTSTRAP_ADMIN_EMAIL);

    expect(seed.title).toBe(DEFAULT_FAMILY_PROFILE_TITLE);
    expect(seed.profileMarkdown).toContain("Phuc Family Digital Twin Profile");
    expect(seed.profileMarkdown).toContain("Kiwi");
    expect(seed.profileMarkdown).toContain("Vivi");
  });

  it("uses a generic template for other approved users", () => {
    const seed = buildInitialFamilyProfileSeed("someone@example.com");

    expect(seed.title).toBe(GENERIC_FAMILY_PROFILE_TITLE);
    expect(seed.profileMarkdown).toContain("My Family English Profile");
    expect(seed.profileMarkdown).toContain("Common Family Scenarios");
  });

  it("builds an idempotent upsert payload keyed by userId", () => {
    const args = buildFamilyProfileUpsertArgs({
      userId: "user-123",
      email: BOOTSTRAP_ADMIN_EMAIL,
    });

    expect(args.where).toEqual({
      userId: "user-123",
    });
    expect(args.create).toMatchObject({
      userId: "user-123",
      title: DEFAULT_FAMILY_PROFILE_TITLE,
      isActive: true,
    });
    expect(args.update).toMatchObject({
      title: DEFAULT_FAMILY_PROFILE_TITLE,
      isActive: true,
    });
  });

  it("prefers explicit profile edits over the seeded defaults", () => {
    const args = buildFamilyProfileUpsertArgs({
      userId: "user-456",
      email: BOOTSTRAP_ADMIN_EMAIL,
      title: "Custom Family Profile",
      profileMarkdown: "# Custom family context",
    });

    expect(args.create.title).toBe("Custom Family Profile");
    expect(args.create.profileMarkdown).toBe("# Custom family context");
    expect(args.update.title).toBe("Custom Family Profile");
    expect(args.update.profileMarkdown).toBe("# Custom family context");
  });
});
