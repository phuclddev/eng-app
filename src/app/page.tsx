import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/ui/auth-buttons";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { isGoogleAuthConfigured } from "@/lib/env";
import { getAuthSession } from "@/server/auth";

export default async function HomePage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    if (session.user.status === "APPROVED") {
      redirect("/dashboard");
    }

    redirect(`/auth/pending?status=${session.user.status}`);
  }

  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <div className="hero-card">
          <span className="eyebrow">Contextual Active Recall IELTS System</span>
          <h1>{APP_NAME}</h1>
          <p>{APP_DESCRIPTION}</p>
          <p>
            Build strong chunk recall through recognition, production, and spaced
            repetition instead of passive memorisation.
          </p>
          <GoogleSignInButton disabled={!isGoogleAuthConfigured()} />
        </div>

        <div className="feature-grid">
          <article>
            <h3>Recognition to production</h3>
            <p>
              Move from quick recognition tasks into sentence rewriting and original production.
            </p>
          </article>
          <article>
            <h3>Review scheduling</h3>
            <p>
              Due dates react to correctness, confidence, response speed, and previous review depth.
            </p>
          </article>
          <article>
            <h3>RBAC workspace</h3>
            <p>
              Approved learners study safely while admins control access, topics, and chunk quality.
            </p>
          </article>
          <article>
            <h3>Focused analytics</h3>
            <p>
              Spot weak topics, low-mastery chunks, and accuracy drops before they solidify.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
