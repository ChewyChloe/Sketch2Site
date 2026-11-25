import { test, expect } from "@playwright/test";
// Brand kit: colours, fonts and a logo set once and applied to the generated site.
test("brand kit colours, fonts and logo reach the site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/generation/status", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：首屏介紹" }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  const kit = page.getByRole("dialog", { name: "品牌工具組" });
  await expect(kit).toBeVisible();
  // One click on a suggestion makes it the main colour.
  await kit.getByRole("button", { name: "加入 #ffc53d" }).click();
  await expect(kit.getByRole("button", { name: "主色 #ffc53d" })).toBeVisible();
  await kit.getByLabel("挑選要加入的顏色").fill("#0d74ce");
  await kit.getByRole("button", { name: "加入顏色" }).click();
  await kit.getByLabel("標題字型").selectOption("serif");
  await kit.getByLabel("內文字型").selectOption("rounded");
  await kit.getByLabel("上傳標誌圖片").setInputFiles("public/assets/samples/camera.jpg");
  await expect(kit.getByRole("button", { name: "使用這張圖當標誌" })).toHaveAttribute("aria-pressed", "true");
  await expect(kit.locator(".brand-preview-button")).toHaveCSS("background-color", "rgb(255, 197, 61)");
  await page.screenshot({ path: "test-results/brand-kit.png" });
  await kit.getByRole("button", { name: "完成" }).click();
  // Brand colours lead the text colour palette.
  await page.locator('[data-testid="canvas-node"].heading').click();
  await page.getByRole("button", { name: "文字顏色" }).click();
  await expect(page.locator(".tt-swatches button").first()).toHaveAccessibleName("顏色 #ffc53d");
  await page.keyboard.press("Escape");
  // The site uses the brand: accent colour with readable ink, fonts and the logo.
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  const site = page.locator("main[aria-label='生成候選預覽'] .rendered-page").first();
  await expect(site.locator(".page-button").first()).toHaveCSS("background-color", "rgb(255, 197, 61)");
  await expect(site.locator(".page-button").first()).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(site.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /Serif|Songti|MingLiU|serif/);
  await page.screenshot({ path: "test-results/brand-site.png" });
  // Clearing the kit is one undo step away.
  await page.getByRole("button", { name: "返回草稿" }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  await kit.getByRole("button", { name: "全部清除" }).click();
  await expect(kit.getByRole("button", { name: "主色 #ffc53d" })).toHaveCount(0);
  await kit.getByRole("button", { name: "完成" }).click();
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  await expect(kit.getByRole("button", { name: "主色 #ffc53d" })).toBeVisible();
  expect(errors).toEqual([]);
});
