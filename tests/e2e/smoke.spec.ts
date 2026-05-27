import { expect, test } from "@playwright/test";

test("public landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("IELTS Chunk Trainer")).toBeVisible();
});
