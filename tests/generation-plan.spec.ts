import { expect, test } from "@playwright/test";
import { useTemplate } from "./helpers/workbench";

test("editing the review writes section layout and order into actual generation", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, route => route.fulfill({ json: { configured: false } }));
  await page.goto("/?draft");
  await useTemplate(page, "巷口咖啡小店");
  await page.getByRole("button", { name: "描述網站" }).click();
  const panel = page.getByRole("dialog", { name: "描述你的網站" });
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  const row = panel.getByRole("listitem", { name: "我們的堅持" });
  await row.getByRole("button", { name: "上移" }).click();
  await expect(row).toContainText("順序已指定");
  await row.getByText("區塊布局", { exact: true }).click();
  await row.getByRole("button", { name: /垂直排列/ }).click();
  await row.getByRole("checkbox", { name: "滿版寬度" }).check();
  await expect(row).toContainText("布局已指定");
  await panel.getByRole("button", { name: "確認生成" }).click();
  const candidate = page.getByRole("main", { name: "生成候選預覽" });
  const sections = candidate.locator(".preview-frame .page-main > .page-section");
  await expect(sections.first()).toContainText("我們的堅持");
  await expect(sections.first()).toHaveAttribute("data-section-bleed", "");
  await expect(sections.first().locator('[data-section-arrangement="stack"]')).toBeVisible();
  await expect(sections.first()).toContainText("自家烘豆");
});
