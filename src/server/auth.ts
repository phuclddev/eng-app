import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import {
  getApprovalStatusPath,
  getSignInPath,
} from "@/lib/auth-routing";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { authOptions } from "@/server/auth-options";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireSignedInSession() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(getSignInPath(undefined, { auto: true }));
  }

  return session;
}

export async function requireApprovedSession() {
  const session = await requireSignedInSession();

  if (session.user.status !== "APPROVED") {
    redirect(getApprovalStatusPath(session.user.status));
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireApprovedSession();

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}

export async function requireApprovedApiSession() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  if (session.user.status !== "APPROVED") {
    throw new ForbiddenError("Your account is not approved for studying yet.");
  }

  return session;
}

export async function requireAdminApiSession() {
  const session = await requireApprovedApiSession();

  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  return session;
}
