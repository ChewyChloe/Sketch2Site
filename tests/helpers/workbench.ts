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
