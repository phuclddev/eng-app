import { encode } from "next-auth/jwt";
import type { Page } from "@playwright/test";

const baseUrl = "http://127.0.0.1:10000";
const sessionCookieName = "next-auth.session-token";
const secret = process.env.NEXTAUTH_SECRET ?? "development-secret-change-me";

export async function signInAsApprovedLearner(page: Page) {
  const value = await encode({
    secret,
    token: {
      sub: "e2e-approved-user",
      id: "e2e-approved-user",
      name: "E2E Learner",
      email: "e2e-learner@example.com",
      role: "USER",
      status: "APPROVED",
    },
  });

  await page.context().addCookies([
    {
      name: sessionCookieName,
      value,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export function trackConsoleIssues(page: Page) {
  const issues: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      issues.push(`${message.type()}: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  return issues;
}

export async function expectNoHorizontalScroll(page: Page) {
  return page.evaluate(() => {
    const bodyWidth = document.body.scrollWidth;
    const rootWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;

    return {
      bodyWidth,
      rootWidth,
      viewportWidth,
      hasHorizontalScroll:
        bodyWidth > viewportWidth + 1 || rootWidth > viewportWidth + 1,
    };
  });
}
