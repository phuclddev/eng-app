import { expect, test } from "@playwright/test";

test("root sends unauthenticated users into auth entry without console errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await page.waitForURL(/\/signin\?/);
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fdashboard&auto=true/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
