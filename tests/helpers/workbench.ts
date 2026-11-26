import { expect, type Page } from "@playwright/test";
export async function pageAction(page: Page, name: string) {
  if (!(await page.getByRole("button", { name, exact: true }).isVisible()))
    await page
      .locator(".workbench-menu > summary")
      .filter({ hasText: "頁面" })
      .click();
  await page.getByRole("button", { name, exact: true }).click();
}
export async function viewAction(page: Page, name: string) {
  if (!(await page.getByRole("button", { name, exact: true }).isVisible()))
    await page
      .locator(".workbench-menu > summary")
      .filter({ hasText: "檢視" })
      .click();
  await page.getByRole("button", { name, exact: true }).click();
}
export async function openPanel(
  page: Page,
  tab: "元件" | "動畫" | "屬性" = "屬性",
) {
  const button = page.getByRole("button", { name: "工具", exact: true });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  await page.getByRole("tab", { name: tab, exact: true }).click();
}
export async function editSelection(page: Page) {
  await openPanel(page, "屬性");
  await expect(
    page.getByRole("region", { name: "頁面元素編輯" }),
  ).toBeVisible();
}
export async function addFade(page: Page) {
  await openPanel(page, "動畫");
  await page.getByRole("button", { name: "淡入", exact: true }).click();
  await openPanel(page, "屬性");
}
export async function setFadeDuration(page: Page, value: string) {
  const input = page.getByLabel("動畫時長（毫秒）");
  await input.fill(value);
  await input.blur();
}
export async function cancelSelection(page: Page) {
  if (
    await page
      .getByRole("button", { name: "取消選取", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "取消選取", exact: true }).click();
  else await page.keyboard.press("Escape");
}

// Enter the existing website editor explicitly; Preview now previews a populated draft.
export async function openWebsiteWorkspace(page: Page) {
  // The stored site is opened from the home page (我的工作區 → 開啟網站工作區).
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await page.getByRole("button", { name: "開啟網站工作區", exact: true }).click();
}
/** Starts a new project from a home-page template (replaces the old 草稿選單 samples). */
export async function useTemplate(page: Page, name: string) {
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  // Starting a project switches to it with a page reload; wait until the new draft is ready.
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("article", { name: "範本：" + name }).getByRole("button", { name: /用這個範本開始/ }).click(),
  ]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
}
/** Builds the site from the draft (local layout when AI is not set up). */
export async function buildSite(page: Page) {
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
}
/** Uses the built site; when a site already exists, confirms replacing it. */
export async function useThisVersion(page: Page) {
  const candidate = page.getByRole("main", { name: "生成候選預覽" });
  await candidate.getByRole("button", { name: "使用此版本", exact: true }).click();
  const replace = candidate.getByRole("button", { name: "取代網站" });
  // Either the site is used right away, or the replace confirmation appears.
  for (let i = 0; i < 50 && (await candidate.count()); i++) {
    if (await replace.isVisible().catch(() => false)) { await replace.click(); break; }
    await page.waitForTimeout(100);
  }
  await expect(candidate).toHaveCount(0);
}
