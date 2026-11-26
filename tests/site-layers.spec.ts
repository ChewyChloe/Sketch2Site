import { test, expect } from "@playwright/test";
import { choose } from "./helpers/select";
import { buildSite, openPanel } from "./helpers/workbench";
// The site's 圖層 list and the toolbar that floats above the picked element.
test("layers list and floating toolbar on the site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await buildSite(page);
  await page.getByRole("button", { name: "使用此版本" }).click();
  const frame = page.getByTestId("preview-frame");

  // 圖層: readable names, layout wrappers hidden until asked for.
  await openPanel(page, "圖層");
  const layers = page.getByRole("region", { name: "圖層" });
  const row = layers.locator(".layer-name").filter({ hasText: "我們的堅持" }).first();
  await expect(row).toBeVisible();
  await expect(layers.locator(".layer-row.structural")).toHaveCount(0);
  await layers.getByLabel("顯示版面結構").check();
  expect(await layers.locator(".layer-row.structural").count()).toBeGreaterThan(0);
  await layers.getByLabel("顯示版面結構").uncheck();
  // Collapsing a section hides its rows.
  const section = layers.locator(".layer-row.kind-section").first();
  const before = await layers.locator(".layer-row").count();
  await section.locator(".layer-toggle").click();
  expect(await layers.locator(".layer-row").count()).toBeLessThan(before);
  await section.locator(".layer-toggle").click();
  // Hover outlines the element on the page; click selects it and keeps the list open.
  const heading = layers.locator(".layer-row.kind-heading .layer-name").filter({ hasText: "我們的堅持" });
  const id = await heading.getAttribute("data-component-id");
  await heading.hover();
  await expect(frame.locator(`[data-page-id="${id}"]`)).toHaveClass(/layer-hover/);
  await heading.click();
  await expect(frame.locator(`[data-page-id="${id}"]`)).toHaveAttribute("data-page-selected", "true");
  await expect(page.getByRole("tab", { name: "圖層", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(heading).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/site-layers.png" });

  // Floating toolbar: text style straight on the site, undoable.
  await page.getByRole("button", { name: "工具", exact: true }).click();
  const target = frame.getByRole("heading", { name: "我們的堅持" });
  await target.click();
  const bar = page.getByRole("toolbar", { name: "直接修改這個元件" });
  await expect(bar).toBeVisible();
  const box = await bar.boundingBox(), t = await target.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(t!.y + 1);
  // Headings start bold; 粗體 shows that and turns it off.
  const bold = bar.getByRole("button", { name: "粗體" });
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await bold.click();
  await expect(target).toHaveCSS("font-weight", "400");
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await bar.getByRole("button", { name: "斜體" }).click();
  await expect(target).toHaveCSS("font-style", "italic");
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(target).toHaveCSS("font-style", "normal");
  await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
  await expect(target).toHaveCSS("font-weight", "800");
  // Pictures get frame and filter.
  const img = frame.locator(".rendered-page img").first();
  await img.click();
  await expect(bar.getByLabel("相框")).toBeVisible();
  await choose(bar.getByLabel("相框"), "circle");
  await expect(frame.locator('[data-frame="circle"]')).toHaveCount(1);
  await expect(frame.locator('[data-frame="circle"] img')).toHaveJSProperty("complete", true);
  await page.screenshot({ path: "test-results/site-toolbar-image.png" });
  // 註解 opens the note box for anything else.
  await bar.getByRole("button", { name: /^註解：說說這個/ }).click();
  await expect(page.getByRole("dialog", { name: /註解：修改這個/ })).toBeVisible();
  await expect(bar).toBeHidden();
  expect(errors).toEqual([]);
});
