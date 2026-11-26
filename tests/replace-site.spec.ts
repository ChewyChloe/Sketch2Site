import { test, expect } from "@playwright/test";
import { buildSite } from "./helpers/workbench";
// Replacing a site built earlier asks once and can be undone with 換回上一版; the draft is never touched.
test("replacing an existing site: confirm, then 換回上一版", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增標題", exact: true }).click();
  await page.getByLabel("元素內容").fill("第一版標題");
  await buildSite(page);
  const candidate = page.getByRole("main", { name: "生成候選預覽" });
  await expect(candidate.getByText("你的草稿不會被改動")).toBeVisible();
  // First site: used right away, nothing to go back to.
  await candidate.getByRole("button", { name: "使用此版本" }).click();
  await expect(candidate).toHaveCount(0);
  await expect(page.locator(".replace-banner")).toHaveCount(0);
  await expect(page.getByTestId("preview-frame").getByRole("heading", { name: "第一版標題" })).toBeVisible();
  // Change the draft and build again.
  await page.locator('[aria-label="草稿"]').click();
  await page.getByTestId("canvas-node").filter({ hasText: "第一版標題" }).click();
  await page.getByLabel("元素內容").fill("第二版標題");
  await buildSite(page);
  await candidate.getByRole("button", { name: "使用此版本" }).click();
  const confirm = candidate.getByRole("group", { name: "確認取代目前的網站" });
  await expect(confirm).toContainText("會取代目前的網站，之後可以換回上一版");
  await confirm.getByRole("button", { name: "先不要" }).click();
  await expect(confirm).toHaveCount(0);
  await candidate.getByRole("button", { name: "使用此版本" }).click();
  await confirm.getByRole("button", { name: "取代網站" }).click();
  await expect(candidate).toHaveCount(0);
  const frame = page.getByTestId("preview-frame");
  await expect(frame.getByRole("heading", { name: "第二版標題" })).toBeVisible();
  const banner = page.locator(".replace-banner");
  await expect(banner).toContainText("網站已換成新版本，你的草稿沒有改動");
  await banner.getByRole("button", { name: "換回上一版" }).click();
  await expect(frame.getByRole("heading", { name: "第一版標題" })).toBeVisible();
  await expect(banner).toHaveCount(0);
  // The draft keeps its newest text.
  await page.locator('[aria-label="草稿"]').click();
  await expect(page.getByTestId("canvas-node").filter({ hasText: "第二版標題" })).toBeVisible();
});
