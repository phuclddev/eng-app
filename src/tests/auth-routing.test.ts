import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_CALLBACK_PATH,
  getAuthenticatedEntryPath,
  getRootEntryPath,
  getSignInPath,
  normalizeCallbackPath,
} from "@/lib/auth-routing";

describe("auth routing helpers", () => {
  it("sends unauthenticated users at root straight into auto sign-in", () => {
    expect(getRootEntryPath(null)).toBe(
      `${getSignInPath(DEFAULT_AUTH_CALLBACK_PATH, { auto: true })}`,
    );
  });

  it("routes authenticated users by approval status", () => {
    expect(getAuthenticatedEntryPath("APPROVED")).toBe("/dashboard");
    expect(getAuthenticatedEntryPath("PENDING")).toBe(
      "/auth/pending?status=PENDING",
    );
    expect(getAuthenticatedEntryPath("BLOCKED")).toBe(
      "/auth/pending?status=BLOCKED",
    );
  });

  it("keeps callback URLs internal", () => {
    expect(normalizeCallbackPath("/admin")).toBe("/admin");
    expect(normalizeCallbackPath("https://example.com/evil")).toBe(
      DEFAULT_AUTH_CALLBACK_PATH,
    );
    expect(normalizeCallbackPath("//example.com/evil")).toBe(
      DEFAULT_AUTH_CALLBACK_PATH,
    );
  });
});
