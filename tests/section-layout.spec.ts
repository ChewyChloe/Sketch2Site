import { expect, test } from "@playwright/test";
import { buildSite, editSelection, pageAction, viewAction, useTemplate, useThisVersion } from "./helpers/workbench";

test("section geometry is independent of theme and survives history and persistence", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?draft");
  await useTemplate(page, "巷口咖啡小店");
  await buildSite(page);
  const candidate = page.getByRole("main", { name: "生成候選預覽" });
  const fineTune = candidate.getByText("細調：構圖、設計概念、主題", { exact: true });
  if (!(await candidate.getByRole("radio", { name: "編排", exact: true }).isVisible())) await fineTune.click();
  await candidate.getByRole("radio", { name: "編排", exact: true }).click();
  await candidate.getByRole("radio", { name: "瑞士國際主義", exact: true }).click();
  const candidatePage = candidate.locator(".preview-frame .rendered-page");
  await expect(candidatePage).toHaveAttribute("data-compose", "editorial");
  await expect(candidatePage).toHaveAttribute("data-concept", "swiss");
  await expect(candidatePage).not.toHaveAttribute("data-parallax", "");
  const motion = candidate.getByRole("checkbox", { name: "捲動視差" });
  await motion.check();
  await expect(candidatePage).toHaveAttribute("data-parallax", "");
  await motion.uncheck();
  await expect(candidatePage).toHaveAttribute("data-compose", "editorial");
  await useThisVersion(page);

  const frame = page.getByTestId("preview-frame");
  const features = frame.locator(".page-section").filter({ has: page.getByRole("heading", { name: "我們的堅持" }) }).first();
  await page.getByRole("button", { name: "選取", exact: true }).click();
  await features.locator(".page-card").first().click();
  await editSelection(page);
  await page.getByText("區塊布局", { exact: true }).click();
  const layouts = page.getByRole("group", { name: "排列方式" });
  const content = () => features.locator("[data-page-id]").evaluateAll(nodes => nodes.map(node => [
    node.getAttribute("data-page-id"), node.getAttribute("data-effects"),
    node.getAttribute("href"), node.textContent, node.querySelector("img")?.getAttribute("src"),
  ]));
  const original = await content();
  for (const [label, mode] of [["卡片式", "cards"], ["多欄網格", "grid"], ["垂直排列", "stack"]]) {
    await layouts.getByRole("button", { name: new RegExp(label) }).click();
    await expect(features.locator(`[data-section-arrangement="${mode}"]`)).toBeVisible();
    expect(await content()).toEqual(original);
  }
  await layouts.getByRole("button", { name: /分屏/ }).click();
  await expect(page.getByText("分屏需要兩個同層內容項目")).toBeVisible();
  await expect(features.locator('[data-section-arrangement="stack"]')).toBeVisible();
  await layouts.getByRole("button", { name: /大小格拼接/ }).click();
  const bento = features.locator('[data-section-arrangement="bento"]');
  await expect(bento).toHaveCSS("display", "grid");
  await expect(bento.locator(":scope > .page-node").first()).toHaveCSS("grid-column-start", "span 2");
  expect(await content()).toEqual(original);
  await layouts.getByRole("button", { name: /瀑布流/ }).click();
  const masonry = features.locator('[data-section-arrangement="masonry"]');
  await expect(masonry).toHaveCSS("column-count", "3");
  expect(await content()).toEqual(original);
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(bento).toBeVisible();
  await page.getByRole("button", { name: "重做修改" }).click();
  await expect(masonry).toBeVisible();
  await page.getByRole("checkbox", { name: "滿版寬度" }).check();
  await expect(features).toHaveAttribute("data-section-bleed", "");
  await page.getByRole("button", { name: "版面", exact: true }).click();
  await expect(features).toHaveAttribute("data-locked", "layout");
  await viewAction(page, "海洋");
  await expect(frame.locator(".rendered-page")).toHaveAttribute("data-theme", "ocean");
  await expect(masonry).toHaveCSS("column-count", "3");
  expect(await content()).toEqual(original);
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await pageAction(page, "重新載入頁面");
  await expect(masonry).toHaveCSS("column-count", "3");
  await page.getByRole("button", { name: "手機", exact: true }).click();
  await expect(masonry).toHaveCSS("column-count", "1");
  expect(await masonry.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await buildSite(page);
  const rebuilt = candidate.locator(".preview-frame .page-section").filter({ has: page.getByRole("heading", { name: "我們的堅持" }) }).first();
  await expect(rebuilt).toHaveAttribute("data-locked", "layout");
  await expect(rebuilt).toHaveAttribute("data-section-bleed", "");
  await expect(rebuilt.locator('[data-section-arrangement="masonry"]')).toBeVisible();
  await expect(candidatePage).toHaveAttribute("data-theme", "ocean");

});
