import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  signInAsApprovedLearner,
  trackConsoleIssues,
} from "./helpers/session";

test.describe("mobile learner smoke", () => {
  test.beforeEach(async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width > 767, "Mobile viewport only");
    await signInAsApprovedLearner(page);
  });

  test("dashboard uses compact navigation without learner-page overflow", async ({
    page,
  }) => {
    const consoleIssues = trackConsoleIssues(page);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeVisible();

    const layout = await expectNoHorizontalScroll(page);
    expect(layout.hasHorizontalScroll).toBe(false);
    expect(consoleIssues).toEqual([]);
  });

  test("practice stays readable on mobile", async ({ page }) => {
    const consoleIssues = trackConsoleIssues(page);

    await page.goto("/practice");
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.locator("body")).toContainText(/Practice|No chunks are available for this mode yet\./);

    const layout = await expectNoHorizontalScroll(page);
    expect(layout.hasHorizontalScroll).toBe(false);
    expect(consoleIssues).toEqual([]);
  });

  test("review stays readable on mobile", async ({ page }) => {
    const consoleIssues = trackConsoleIssues(page);

    await page.goto("/review");
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.locator("body")).toContainText(/Review|No chunks are available for this mode yet\./);

    const layout = await expectNoHorizontalScroll(page);
    expect(layout.hasHorizontalScroll).toBe(false);
    expect(consoleIssues).toEqual([]);
  });

  test("chunks render in a mobile-safe layout", async ({ page }) => {
    const consoleIssues = trackConsoleIssues(page);

    await page.goto("/chunks");
    await expect(page.getByRole("heading", { name: "Chunk Library" })).toBeVisible();
    await expect(page.getByPlaceholder("Search chunk, meaning, topic, or example")).toBeVisible();

    const layout = await expectNoHorizontalScroll(page);
    expect(layout.hasHorizontalScroll).toBe(false);
    expect(consoleIssues).toEqual([]);
  });
});
