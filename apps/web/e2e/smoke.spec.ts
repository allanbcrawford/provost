import { expect, test } from "@playwright/test";

test("home page displays Provost", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Provost").first()).toBeVisible();
});
