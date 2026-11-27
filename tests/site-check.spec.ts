import { test, expect } from "@playwright/test";
import { openWebsiteWorkspace, pageAction } from "./helpers/workbench";

// Pre-launch check: problems listed in plain words, each one jumps to the element, and an
// export with problems asks first.
const uid = (n: number) => `74000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const styleOf = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" });
const site = (fixed: boolean) => ({
  schemaVersion: 2, metadata: { title: fixed ? "小島咖啡" : "未命名草稿", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
  sections: [{ id: uid(1), type: "section", style: styleOf(), effects: [], children: [
    { id: uid(2), type: "heading", level: 1, content: fixed ? "小島咖啡，每天現烘" : "例如：輸入你的標題", style: styleOf(), effects: [] },
    { id: uid(3), type: "image", src: "/assets/samples/cafe.jpg", alt: fixed ? "店裡的吧台" : "照片", style: styleOf(), effects: [] },
    { id: uid(4), type: "button", content: "預約座位", href: fixed ? "https://booking.island-coffee.tw/" : "https://example.com/", style: styleOf(), effects: [] },
  ] }],
});
async function load(page: import("@playwright/test").Page, fixed: boolean) {
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "site.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(site(fixed))) });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
}

test("lists problems in plain words and jumps to the element", async ({ page }) => {
  await load(page, false);
  await pageAction(page, "上線前檢查");
  const panel = page.getByRole("dialog", { name: "上線前檢查" });
  await expect(panel.getByRole("status")).toContainText("個要修正");
  for (const t of ["網站名稱還沒取", "圖片沒有說明文字", "按鈕連到範例網址", "還有範本文字沒改"]) await expect(panel).toContainText(t);
  await panel.screenshot({ path: "test-results/site-check.png" });
  await panel.getByRole("button", { name: "前往：按鈕連到範例網址" }).click();
  await expect(panel).toBeHidden();
  // The button is now the selection: its properties are open.
  await expect(page.locator('.preview-frame [data-page-id="' + uid(4) + '"]')).toBeInViewport();
  await expect(page.locator("#preview-inspector")).toContainText("預約座位");
});

test("export with problems asks first; 仍要匯出 still downloads", async ({ page }) => {
  await load(page, false);
  await pageAction(page, "匯出 React 專案");
  const panel = page.getByRole("dialog", { name: "上線前檢查" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "先去修改" }).click();
  await expect(panel).toBeHidden();
  await pageAction(page, "匯出 React 專案");
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "仍要匯出" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
});

test("a finished page passes and exports straight away", async ({ page }) => {
  await load(page, true);
  await pageAction(page, "上線前檢查");
  await expect(page.getByRole("dialog", { name: "上線前檢查" }).getByRole("status")).toHaveText("沒有發現問題，可以上線");
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await pageAction(page, "匯出 React 專案");
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
});
