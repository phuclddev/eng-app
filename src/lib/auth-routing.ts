import type { UserStatus } from "@/lib/types";

export const DEFAULT_AUTH_CALLBACK_PATH = "/dashboard";
export const SIGN_IN_ROUTE = "/signin";

export function normalizeCallbackPath(
  callbackUrl?: null | string,
  fallback = DEFAULT_AUTH_CALLBACK_PATH,
) {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback;
  }

  return callbackUrl;
}

export function getSignInPath(
  callbackUrl = DEFAULT_AUTH_CALLBACK_PATH,
  options?: { auto?: boolean },
) {
  const params = new URLSearchParams({
    callbackUrl: normalizeCallbackPath(callbackUrl),
  });

  if (options?.auto) {
    params.set("auto", "true");
  }

  return `${SIGN_IN_ROUTE}?${params.toString()}`;
}

export function getApprovalStatusPath(status?: null | UserStatus) {
  const resolvedStatus = status === "BLOCKED" ? "BLOCKED" : "PENDING";
  return `/auth/pending?status=${resolvedStatus}`;
}

export function getAuthenticatedEntryPath(status?: null | UserStatus) {
  if (status === "APPROVED") {
    return DEFAULT_AUTH_CALLBACK_PATH;
  }

  return getApprovalStatusPath(status);
}

export function getRootEntryPath(user?: {
  id?: string;
  status?: null | UserStatus;
} | null) {
  if (!user?.id) {
    return getSignInPath(DEFAULT_AUTH_CALLBACK_PATH, { auto: true });
  }

  return getAuthenticatedEntryPath(user.status);
}
