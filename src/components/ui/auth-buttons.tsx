"use client";

import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef, useTransition } from "react";

import { DEFAULT_AUTH_CALLBACK_PATH } from "@/lib/auth-routing";

export function GoogleSignInButton({
  callbackUrl = DEFAULT_AUTH_CALLBACK_PATH,
  disabled = false,
}: {
  callbackUrl?: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="auth-button"
      aria-busy={pending}
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          await signIn("google", { callbackUrl });
        })
      }
    >
      {pending ? "Connecting..." : "Continue with Google"}
    </button>
  );
}

export function AutoGoogleSignIn({
  callbackUrl = DEFAULT_AUTH_CALLBACK_PATH,
  enabled,
}: {
  callbackUrl?: string;
  enabled: boolean;
}) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) {
      return;
    }

    startedRef.current = true;
    void signIn("google", { callbackUrl });
  }, [callbackUrl, enabled]);

  return null;
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="auth-button auth-button-secondary"
      aria-busy={pending}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: "/" });
        })
      }
    >
      {pending ? "Signing out..." : "Logout"}
    </button>
  );
}
