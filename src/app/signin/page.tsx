import { redirect } from "next/navigation";

import {
  AutoGoogleSignIn,
  GoogleSignInButton,
} from "@/components/ui/auth-buttons";
import {
  DEFAULT_AUTH_CALLBACK_PATH,
  getAuthenticatedEntryPath,
  normalizeCallbackPath,
} from "@/lib/auth-routing";
import { isGoogleAuthConfigured } from "@/lib/env";
import { getAuthSession } from "@/server/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    auto?: string;
    callbackUrl?: string;
  }>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;

  if (session?.user?.id) {
    redirect(getAuthenticatedEntryPath(session.user.status));
  }

  const callbackUrl = normalizeCallbackPath(
    params.callbackUrl,
    DEFAULT_AUTH_CALLBACK_PATH,
  );
  const googleEnabled = isGoogleAuthConfigured();
  const autoStart = params.auto === "true" && googleEnabled;

  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <div className="auth-card">
          <AutoGoogleSignIn callbackUrl={callbackUrl} enabled={autoStart} />
          <div className="auth-stack">
            <h1>{autoStart ? "Redirecting to Google" : "Sign in"}</h1>
            <p className="auth-copy">
              {autoStart
                ? "Your session entry is being handed to Google authentication."
                : "Use your Google account to request access to the private IELTS chunk platform."}
            </p>
            <div className="auth-actions">
              <GoogleSignInButton
                callbackUrl={callbackUrl}
                disabled={!googleEnabled}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
