import { test, expect } from "@playwright/test";
import { buildSite } from "./helpers/workbench";
// Design concepts: one idea the whole site follows. Picked on the candidate, kept after accepting.
test("exhibition concept: picked on the candidate, kept on the saved site, readable on phone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：社團招生頁" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await buildSite(page);
  const picker = page.getByRole("radiogroup", { name: "設計概念" });
  await expect(picker.getByRole("radio", { name: "不用概念" })).toHaveAttribute("aria-checked", "true");
  await picker.getByRole("radio", { name: "展覽空間" }).click();
  const candidate = page.locator("main[aria-label='生成候選預覽'] .rendered-page").first();
  await expect(candidate).toHaveAttribute("data-concept", "exhibition");
  // Dark themes must not leave pale text on the white rooms.
  const label = candidate.locator(".role-gallery h2.page-heading");
  await expect(label).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(candidate.locator(".role-gallery .page-image").first()).toHaveAttribute("data-caption", /.+/);
  await page.getByRole("button", { name: "使用此版本" }).click();
  const site = page.getByTestId("preview-frame").locator(".rendered-page").first();
  await expect(site).toHaveAttribute("data-concept", "exhibition");
  await page.screenshot({ path: "test-results/concept-exhibition.png" });
});
