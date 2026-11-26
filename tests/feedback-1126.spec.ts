import { test, expect } from "@playwright/test";
// User feedback 2026-11-26: step tabs on the home page, 晨光 retired, project card hover,
// rows above the live preview squeezed, and a strip of page showing above the sticky site nav.
test("home page has no step tabs; project card hover has no band", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await expect(page.getByRole("group", { name: "工作區模式" })).toBeVisible();
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await expect(page.getByRole("group", { name: "工作區模式" })).toBeHidden();
  const open = page.locator(".home-project-open").first();
  await open.hover();
  await expect(open).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("晨光 is not offered; rows keep their height; the site nav sticks to the very top", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  const cards = page.getByRole("radiogroup", { name: "三個方向" }).getByRole("radio");
  await expect(cards).toHaveCount(3);
  expect((await cards.evaluateAll((es) => es.map((e) => e.getAttribute("aria-label")))).join()).not.toContain("晨光");
  await page.getByText("細調：構圖、設計概念、主題").click();
  await expect(page.getByRole("radiogroup", { name: "網站主題" }).getByRole("radio", { name: "晨光" })).toHaveCount(0);
  const chip = page.getByRole("group", { name: "互動功能" }).getByRole("button").first();
  expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(30);
  const scroller = page.locator("main[aria-label='生成候選預覽'] .preview-scroll");
  await scroller.evaluate((e) => (e.scrollTop = 1600));
  await page.waitForTimeout(300);
  const nav = page.locator("main[aria-label='生成候選預覽'] .preview-frame .page-nav").first();
  const [navTop, top] = [(await nav.boundingBox())!.y, (await scroller.boundingBox())!.y];
  expect(Math.abs(navTop - top)).toBeLessThanOrEqual(1);
});
