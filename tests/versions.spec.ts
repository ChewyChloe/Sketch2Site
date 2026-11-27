import { test, expect } from "@playwright/test";
import { openWebsiteWorkspace, pageAction, exportSite } from "./helpers/workbench";

// Site version timeline: saved automatically at export (and AI moments), by hand any time;
// each version has a real thumbnail, can be previewed, compared and restored.
const uid = (n: number) => `75000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const styleOf = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" });
const site = (title: string, heading: string) => ({
  schemaVersion: 2, metadata: { title, language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
  sections: [{ id: uid(1), type: "section", style: styleOf(), effects: [], children: [
    { id: uid(2), type: "heading", level: 1, content: heading, style: styleOf(), effects: [] },
    { id: uid(3), type: "image", src: "/assets/samples/cafe.jpg", alt: "店裡的吧台", style: styleOf(), effects: [] },
  ] }],
});
async function load(page: import("@playwright/test").Page, title: string, heading: string) {
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "site.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(site(title, heading))) });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
}

test("save, preview, compare and restore versions; they survive a reload", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await load(page, "小島咖啡", "最初的標題");
  await pageAction(page, "版本紀錄");
  const panel = page.getByRole("dialog", { name: "網站版本" });
  await expect(panel).toContainText("還沒有版本");
  await panel.getByLabel("版本名稱").fill("最初草稿");
  await panel.getByRole("button", { name: "存成新版本" }).click();
  await expect(panel.getByRole("list", { name: "版本時間軸" }).getByRole("listitem")).toHaveCount(1);
  // The same site again is not saved twice.
  await panel.getByRole("button", { name: "存成新版本" }).click();
  await expect(panel.getByRole("status")).toContainText("和最新的版本一樣");
  await panel.getByRole("button", { name: "關閉版本" }).click();

  // A different site, then an export: saved as 正式發布版 automatically.
  await load(page, "小島咖啡", "改過的標題");
  const download = page.waitForEvent("download");
  await exportSite(page);
  await download;
  await pageAction(page, "版本紀錄");
  const items = panel.getByRole("list", { name: "版本時間軸" }).getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("正式發布版");
  await expect(items.first()).toContainText("匯出");
  // Thumbnails are the real page, scaled down.
  await expect(items.nth(1).locator(".version-thumb")).toContainText("最初的標題");
  await panel.screenshot({ path: "test-results/versions.png" });

  // Preview one, compare it with now, then restore it.
  await items.nth(1).getByRole("button", { name: "預覽", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "最初草稿" })).toBeVisible();
  await expect(panel.getByLabel("預覽：最初草稿")).toContainText("最初的標題");
  await panel.getByRole("button", { name: "和現在比較" }).click();
  const compare = page.getByRole("dialog", { name: "「最初草稿」和現在比較" });
  await expect(compare.locator(".compare-before")).toContainText("最初的標題");
  await expect(compare.locator(".compare-after")).toContainText("改過的標題");
  await compare.getByRole("button", { name: "關閉比較" }).click();
  await panel.getByRole("button", { name: "還原這一版" }).click();
  await expect(panel).toBeHidden();
  const frame = page.getByTestId("preview-frame");
  await expect(frame.getByRole("heading", { name: "最初的標題" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "已還原" })).toBeVisible();
  // Restore is undoable and is itself a version.
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(frame.getByRole("heading", { name: "改過的標題" })).toBeVisible();
  await page.getByRole("button", { name: "重做修改", exact: true }).click();
  await expect(frame.getByRole("heading", { name: "最初的標題" })).toBeVisible();

  // Rename, then reload: the list is still there.
  await pageAction(page, "版本紀錄");
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText("還原：最初草稿");
  await items.nth(1).getByRole("button", { name: "改名" }).click();
  await panel.getByLabel("新的版本名稱").fill("12 月發布版");
  await page.keyboard.press("Enter");
  await expect(items.nth(1)).toContainText("12 月發布版");
  await page.reload();
  await openWebsiteWorkspace(page);
  await pageAction(page, "版本紀錄");
  await expect(panel.getByRole("list", { name: "版本時間軸" }).getByRole("listitem")).toHaveCount(3);
  await expect(panel).toContainText("12 月發布版");
});

test("phone width: the timeline fits without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await load(page, "小島咖啡", "手機上的版本");
  await pageAction(page, "版本紀錄");
  const panel = page.getByRole("dialog", { name: "網站版本" });
  await panel.getByRole("button", { name: "存成新版本" }).click();
  await expect(panel.getByRole("list", { name: "版本時間軸" }).getByRole("listitem")).toHaveCount(1);
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
});
