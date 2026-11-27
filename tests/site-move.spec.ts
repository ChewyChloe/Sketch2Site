import { test, expect } from "@playwright/test";
import { openWebsiteWorkspace } from "./helpers/workbench";

// Small layout edits on the site without a prompt: drag an element into another section,
// nudge it, copy one element's look to another section or to every element of its kind.
const uid = (n: number) => `76000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const styleOf = (extra = {}) => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full", ...extra });
const site = {
  schemaVersion: 2, metadata: { title: "小島咖啡", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
  sections: [
    { id: uid(1), type: "section", style: styleOf(), effects: [], children: [
      { id: uid(2), type: "heading", level: 2, content: "我們的堅持", style: styleOf({ align: "center" }), text: { bold: true, italic: true }, effects: [] },
      { id: uid(3), type: "paragraph", content: "每天現烘，豆子不放超過兩週。", style: styleOf(), effects: [] },
    ] },
    { id: uid(4), type: "section", style: styleOf(), effects: [], children: [
      { id: uid(5), type: "heading", level: 2, content: "今天就來坐坐", style: styleOf(), effects: [] },
      { id: uid(6), type: "paragraph", content: "週一到週六早上八點開門。", style: styleOf(), effects: [] },
      { id: uid(7), type: "button", content: "預約座位", href: "https://booking.island-coffee.tw/", style: styleOf(), effects: [] },
    ] },
    { id: uid(8), type: "section", style: styleOf(), effects: [], children: [
      { id: uid(9), type: "heading", level: 2, content: "飲品價目", style: styleOf(), effects: [] },
    ] },
  ],
};
const el = (page: import("@playwright/test").Page, n: number) => page.locator(`.preview-frame [data-page-id="${uid(n)}"]`);
const texts = (page: import("@playwright/test").Page, section: number) => el(page, section).locator(":scope [data-page-id]").allInnerTexts();

test.beforeEach(async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "site.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(site)) });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
});

test("drag the button into another section, undo puts it back, reload keeps it", async ({ page }) => {
  await el(page, 7).click();
  const toolbar = page.getByRole("toolbar", { name: "直接修改這個元件" });
  const grip = toolbar.getByRole("button", { name: "拖曳移動" });
  const from = (await grip.boundingBox())!, to = (await el(page, 3).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 40, to.y + to.height - 4, { steps: 8 });
  await expect(page.locator(".site-drop-line")).toBeVisible();
  await page.screenshot({ path: "test-results/site-move-drag.png" });
  await page.mouse.up();
  await expect(el(page, 1).locator(`[data-page-id="${uid(7)}"]`)).toBeVisible();
  expect(await texts(page, 1)).toEqual(["我們的堅持", "每天現烘，豆子不放超過兩週。", "預約座位"]);
  await expect(page.getByRole("status").filter({ hasText: "已移動" })).toBeVisible();
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(el(page, 4).locator(`[data-page-id="${uid(7)}"]`)).toBeVisible();
  await page.getByRole("button", { name: "重做修改", exact: true }).click();
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await page.reload();
  await openWebsiteWorkspace(page);
  expect(await texts(page, 1)).toEqual(["我們的堅持", "每天現烘，豆子不放超過兩週。", "預約座位"]);
});

test("move by one step with the arrows, also a whole section", async ({ page }) => {
  await el(page, 6).click();
  await page.getByRole("toolbar", { name: "直接修改這個元件" }).getByRole("button", { name: "往前移" }).click();
  expect(await texts(page, 4)).toEqual(["週一到週六早上八點開門。", "今天就來坐坐", "預約座位"]);
  await page.getByRole("toolbar", { name: "直接修改這個元件" }).getByRole("button", { name: "往前移" }).click();
  await expect(page.getByRole("status").filter({ hasText: "已經在最前面" })).toBeVisible();
});

test("copy a heading's look to a heading in another section, then to every heading of that size", async ({ page }) => {
  await el(page, 2).click();
  const toolbar = page.getByRole("toolbar", { name: "直接修改這個元件" });
  await toolbar.getByRole("button", { name: "複製樣式" }).click();
  await expect(toolbar.getByRole("button", { name: "點要套用的元件" })).toHaveAttribute("aria-pressed", "true");
  await el(page, 5).click();
  await expect(el(page, 5)).toHaveClass(/align-center/);
  await expect(el(page, 5)).toHaveCSS("font-style", "italic");
  await expect(el(page, 9)).not.toHaveClass(/align-center/);
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(el(page, 5)).not.toHaveClass(/align-center/);
  // Every heading of that level at once, in one undo step.
  await el(page, 2).click();
  await toolbar.getByRole("button", { name: "套用到全部同類（2）" }).click();
  await expect(el(page, 5)).toHaveClass(/align-center/);
  await expect(el(page, 9)).toHaveClass(/align-center/);
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(el(page, 5)).not.toHaveClass(/align-center/);
  await expect(el(page, 9)).not.toHaveClass(/align-center/);
});
