import { test, expect, type Page } from "@playwright/test";
import { useTemplate, buildSite, useThisVersion } from "./helpers/workbench";
// 導覽列: style choice, item order / names / hiding, side list collapse and the phone menu.
const offline = (page: Page) => page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
async function openNav(page: Page) {
  await page.getByRole("button", { name: "導覽列" }).click();
  return page.getByRole("dialog", { name: "導覽列" });
}
async function build(page: Page) {
  await buildSite(page);
  await useThisVersion(page);
}
test.setTimeout(90_000);

test("nav settings: side list with renamed, reordered and hidden items; undo; reset", async ({ page }) => {
  await offline(page);
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await useTemplate(page, "巷口咖啡小店");
  const dialog = await openNav(page);
  await expect(dialog.getByRole("radio", { name: /頂部固定/ })).toHaveAttribute("aria-checked", "true");
  await dialog.getByRole("radio", { name: /左側目錄/ }).click();
  await expect(dialog.getByRole("radio", { name: /左側目錄/ })).toHaveAttribute("aria-checked", "true");
  // The page title starts hidden; the other headings are listed.
  const rows = dialog.locator(".nav-items li");
  await expect(rows.first()).toHaveClass(/is-hidden/);
  const all = await rows.evaluateAll((els) => els.map((el) => ({ label: (el.querySelector("input") as HTMLInputElement).value.trim(), hidden: el.classList.contains("is-hidden") })));
  const vis = all.flatMap((r, i) => (r.hidden ? [] : [i]));
  expect(vis.length).toBeGreaterThanOrEqual(3);
  // Rename the first shown item, hide the second, and move the third up in front of the first.
  await rows.nth(vis[0]).locator("input").fill("我們的故事");
  await rows.nth(vis[0]).locator("input").press("Enter");
  await dialog.getByRole("button", { name: "隱藏「" + all[vis[1]].label + "」" }).click();
  await expect(dialog.getByRole("button", { name: "顯示「" + all[vis[1]].label + "」" })).toBeVisible();
  for (let i = 0; i < vis[2] - vis[0]; i++) await dialog.getByRole("button", { name: "上移「" + all[vis[2]].label + "」" }).click();
  await dialog.getByRole("button", { name: "完成" }).click();
  await expect(dialog).toHaveCount(0);
  await build(page);
  const nav = page.locator(".preview-frame .page-nav");
  await expect(nav).toHaveClass(/nav-side-left/);
  const links = nav.getByRole("navigation", { name: "頁面導覽" }).getByRole("link");
  await expect(links).toHaveText([all[vis[2]].label, "我們的故事", ...vis.slice(3).map((i) => all[i].label)].slice(0, 8));
  // Collapse and expand the side list.
  await nav.getByRole("button", { name: "收起目錄" }).click();
  await expect(nav).toHaveClass(/is-collapsed/);
  await expect(links.first()).toBeHidden();
  await nav.getByRole("button", { name: "展開目錄" }).click();
  await expect(links.first()).toBeVisible();
  // Back in the draft: reset returns to the automatic menu; undo brings the settings back.
  await page.locator('[aria-label="草稿"]').click();
  const again = await openNav(page);
  await again.getByRole("button", { name: "恢復預設" }).click();
  await expect(again.getByRole("radio", { name: /頂部固定/ })).toHaveAttribute("aria-checked", "true");
  await expect(again.getByRole("button", { name: "恢復預設" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "還原", exact: true }).click();
  const restored = await openNav(page);
  await expect(restored.getByRole("radio", { name: /左側目錄/ })).toHaveAttribute("aria-checked", "true");
});

test("nav styles: floating pill, hidden menu, and the phone menu button", async ({ page }) => {
  await offline(page);
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await useTemplate(page, "巷口咖啡小店");
  let dialog = await openNav(page);
  await dialog.getByRole("radio", { name: /懸浮/ }).click();
  await dialog.getByRole("button", { name: "完成" }).click();
  await build(page);
  await expect(page.locator(".preview-frame .page-nav-float .page-nav.nav-floating")).toBeVisible();
  // Phone preview: the links fold into a 選單 button.
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.locator(".preview-frame .page-nav-menu");
  await expect(menu).toBeVisible();
  const links = page.locator(".preview-frame .page-nav nav");
  await expect(links).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(links).toBeVisible();
  await links.getByRole("link").first().click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  // 不顯示: no menu at all.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[aria-label="草稿"]').click();
  dialog = await openNav(page);
  await dialog.getByRole("radio", { name: /不顯示/ }).click();
  await expect(dialog.locator(".nav-items")).toHaveCount(0);
  await dialog.getByRole("button", { name: "完成" }).click();
  await build(page);
  await expect(page.locator(".preview-frame .rendered-page")).toBeVisible();
  await expect(page.locator(".preview-frame .page-nav")).toHaveCount(0);
});
