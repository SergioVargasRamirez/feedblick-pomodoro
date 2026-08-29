import { test, expect } from "@playwright/test";

test("home page renders and links to teacher sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Feedblick Pomodoro" })).toBeVisible();
  await page.getByRole("link", { name: "Teacher sign in" }).click();
  await expect(page.getByRole("heading", { name: "Teacher sign in" })).toBeVisible();
});
