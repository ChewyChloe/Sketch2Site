import { useThisVersion } from "./helpers/workbench";
import { test, expect } from "@playwright/test";
// Edits on the generated site flow back to the draft, and updating the site keeps them.
test("site edits survive going back to the draft and updating the site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click();
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await useThisVersion(page);
  const frame = page.getByTestId("preview-frame");
  // Tweak the site: bigger heading, ocean colours, and new wording.
  await frame.getByRole("heading", { name: "我們的堅持" }).click();
  await page.getByRole("button", { name: "註解：說說這個標題要怎麼改" }).click();
  const bubble = page.getByRole("dialog", { name: "註解：修改這個標題" });
  await bubble.getByLabel("想怎麼改這個元件").fill("標題大一點，換成藍色，改成「我們在乎的事」");
  await bubble.getByRole("button", { name: "改", exact: true }).click();
  await expect(frame.getByRole("heading", { level: 1, name: "我們在乎的事" })).toBeVisible();
  // Back in the draft, the new wording is already there.
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await expect(page.getByTestId("canvas-node").filter({ hasText: "我們在乎的事" })).toHaveCount(1);
  // Change the draft, then return to the site: it offers an update.
  const cta = page.locator('[data-testid="canvas-node"].heading').filter({ hasText: "今天就來坐坐" });
  await cta.dblclick();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("今天見");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await expect(page.getByText("草稿有新的變更，網站還沒更新")).toBeVisible();
  await page.getByRole("button", { name: "更新網站" }).click();
  await expect(page.getByText(/已保留你在網站上的 \d+ 項版面修改/)).toBeVisible();
  await useThisVersion(page);
  // The draft change arrived and the earlier site tweaks are still there.
  await expect(frame.getByRole("heading", { name: "今天見" })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 1, name: "我們在乎的事" })).toBeVisible();
  await expect(frame.locator(".rendered-page")).toHaveAttribute("data-theme", "ocean");
  await expect(page.getByText("草稿有新的變更，網站還沒更新")).toHaveCount(0);
  expect(errors).toEqual([]);
});
