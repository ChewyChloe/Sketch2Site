import { test, expect } from "@playwright/test";
import { openWebsiteWorkspace, pageAction } from "./helpers/workbench";

// Visual Critic: measured on the drawn page; one checked batch of fixes, applied once, undoable.
const uid = (n: number) => `77000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const styleOf = (extra = {}) => ({ gap: "none", padding: "medium", align: "start", tone: "plain", width: "full", ...extra });
const long = "我們每天早上在店裡烘一小批豆子，從生豆挑選、烘焙曲線到靜置天數都自己記錄，讓每一杯咖啡都喝得到剛出爐的香氣，也歡迎你在吧台邊和我們聊聊今天的豆子。".repeat(2);
const site = {
  schemaVersion: 2, metadata: { title: "小島咖啡", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
  sections: [1, 2, 3, 4].map((k) => ({ id: uid(k * 10), type: "section", style: styleOf(), effects: [], children: [
    { id: uid(k * 10 + 1), type: "heading", level: k === 1 ? 1 : 2, content: ["小島咖啡", "我們的豆子", "店裡的座位", "來坐坐"][k - 1], style: styleOf(), effects: [] },
    { id: uid(k * 10 + 2), type: "paragraph", content: k === 2 ? long : "週一到週六早上八點開門。", style: styleOf(), effects: [] },
  ] })),
};

test("finds long lines, a repeated background and crowding; fixes them once, in one undo step", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "site.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(site)) });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await pageAction(page, "上線前檢查");
  const panel = page.getByRole("dialog", { name: "上線前檢查" });
  const critic = panel.getByRole("region", { name: "畫面建議" });
  await expect(critic).toContainText("一行字太長");
  await expect(critic).toContainText("連續三段同一個底色");
  await expect(critic).toContainText("內容擠在一起");
  await critic.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: "test-results/visual-critic.png" });
  const fix = critic.getByRole("button", { name: /一次修正/ });
  await fix.click();
  await expect(fix).toBeDisabled();
  await expect(fix).toHaveText(/已一次修正/);
  await page.keyboard.press("Escape");
  const p2 = page.locator(`.preview-frame [data-page-id="${uid(22)}"]`), s3 = page.locator(`.preview-frame [data-page-id="${uid(20)}"]`);
  await expect(p2).toHaveClass(/width-content/);
  await expect(s3).toHaveClass(/tone-soft/);
  // One undo takes the whole batch back.
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(p2).not.toHaveClass(/width-content/);
  await expect(s3).not.toHaveClass(/tone-soft/);
});
