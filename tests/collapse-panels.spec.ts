import { test, expect } from "@playwright/test";
// Collapsing the side panels gives the canvas the whole width: no empty column is left on the right.
test("collapsed side panels leave no empty column on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 760 });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "收合側欄" }).click();
  await expect(page.getByRole("complementary", { name: "物件檢查器" })).toHaveCount(0);
  const tabs = await page.locator(".neo-workspace").evaluate((e) => getComputedStyle(e).gridTemplateColumns);
  expect(tabs.split(" ")).toHaveLength(1);
  const canvas = await page.locator(".canvas-wrap").boundingBox();
  // Centred: the gap on the left matches the gap on the right.
  expect(Math.abs(canvas!.x - (1920 - canvas!.x - canvas!.width))).toBeLessThan(24);
  await page.getByRole("button", { name: "展開側欄" }).click();
  await expect(page.getByRole("complementary", { name: "物件檢查器" })).toBeVisible();
});
