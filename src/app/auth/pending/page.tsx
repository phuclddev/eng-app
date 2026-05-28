import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/ui/auth-buttons";

const descriptions = {
  PENDING: "Your account is waiting for admin approval before study routes unlock.",
  BLOCKED: "Your access is currently blocked. Contact the administrator for clarification.",
};

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  if (params.status === "APPROVED") {
    redirect("/dashboard");
  }

  const status = params.status === "BLOCKED" ? "BLOCKED" : "PENDING";

  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <div className="auth-card auth-card-wide">
          <div className="auth-stack">
            <span
              className={
                status === "BLOCKED"
                  ? "auth-status-badge auth-status-badge-blocked"
                  : "auth-status-badge"
              }
            >
              {status}
            </span>
            <h1>Access status</h1>
            <p className="auth-copy">{descriptions[status]}</p>
            <div className="auth-actions">
              <SignOutButton />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
