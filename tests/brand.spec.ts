import { choose } from "./helpers/select";
import { test, expect } from "@playwright/test";
// Brand kit: colours, fonts and a logo set once and applied to the generated site.
test("brand kit colours, fonts and logo reach the site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：首屏介紹" }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  const kit = page.getByRole("dialog", { name: "品牌模板設定" });
  await expect(kit).toBeVisible();
  // Picking a main colour fills in the other three roles, each with a contrast check.
  await kit.getByRole("button", { name: "主色用 #ffc53d" }).click();
  for (const role of ["副色", "強調色", "中性色"]) await expect(kit.locator(".brand-role").filter({ hasText: role }).locator(".brand-contrast")).toContainText("清楚");
  // Yellow on a white page is too faint for a button edge (needs 3:1); the fix darkens it.
  const main = kit.locator(".brand-role").filter({ hasText: "主色" });
  await expect(main.locator(".brand-contrast")).toContainText("太淡");
  await main.getByRole("button", { name: "幫我調清楚" }).click();
  await expect(main.locator(".brand-contrast")).toContainText("清楚");
  await kit.getByLabel("主色", { exact: true }).fill("#ffc53d");
  await choose(kit.getByLabel("標題中文字型"), "serif");
  await choose(kit.getByLabel("標題英文字型"), "serif");
  await choose(kit.getByLabel("內文中文字型"), "rounded");
  await choose(kit.getByLabel("內文英文字型"), "geometric");
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
  // English first (Georgia), then the Chinese serif for Chinese characters.
  await expect(site.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /^Georgia.*(Serif|Songti|MingLiU)/);
  await expect(site).toHaveCSS("font-family", /^"Avenir Next".*Huninn/);
  await page.screenshot({ path: "test-results/brand-site.png" });
  // Clearing the kit is one undo step away.
  await page.getByRole("button", { name: "返回草稿" }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  await kit.getByRole("button", { name: "全部清除" }).click();
  await expect(kit.getByRole("button", { name: "主色用 #ffc53d" })).toBeVisible();
  await kit.getByRole("button", { name: "完成" }).click();
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  await expect(kit.getByRole("button", { name: "依主色重新配色" })).toBeVisible();
  expect(errors).toEqual([]);
});

// Palette library: ready-made sets in groups, and colours read from the author's own picture.
test("palette library and colours from a picture", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const uploads: string[] = [];
  page.on("request", (r) => { if (r.method() !== "GET") uploads.push(r.url()); });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：首屏介紹" }).click();
  await page.getByRole("button", { name: "品牌", exact: true }).click();
  const kit = page.getByRole("dialog", { name: "品牌模板設定" });
  const library = kit.getByRole("group", { name: "配色庫" });
  await library.getByRole("tab", { name: "溫暖" }).click();
  await expect(library.locator(".palette-card")).toHaveCount(3);
  await library.getByRole("button", { name: "使用配色：焦糖拿鐵" }).click();
  await expect(library.getByRole("button", { name: "使用配色：焦糖拿鐵" })).toHaveAttribute("aria-pressed", "true");
  const allClear = async () => { for (const role of ["主色", "副色", "強調色", "中性色"]) await expect(kit.locator(".brand-role").filter({ hasText: role }).locator(".brand-contrast")).toContainText("清楚"); };
  await allClear();
  await expect(kit.locator(".brand-preview-button")).toHaveCSS("background-color", "rgb(154, 91, 47)");
  await page.screenshot({ path: "test-results/palette-library-1440.png" });
  await kit.getByLabel("選一張圖片取色").setInputFiles("public/assets/samples/camera.jpg");
  await expect(library.getByRole("status")).toContainText("已用圖片的顏色配好");
  await expect(library.getByRole("button", { name: "使用配色：你的圖片" })).toHaveAttribute("aria-pressed", "true");
  await allClear();
  // The picture is read in the browser only.
  expect(uploads).toEqual([]);
  for (const w of [768, 390]) {
    await page.setViewportSize({ width: w, height: 844 });
    await library.scrollIntoViewIfNeeded();
    const grid = await library.locator(".palette-grid").boundingBox(), panel = await kit.boundingBox();
    expect(grid!.x + grid!.width).toBeLessThanOrEqual(panel!.x + panel!.width);
    await page.screenshot({ path: `test-results/palette-library-${w}.png` });
  }
});
