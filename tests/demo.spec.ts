import { test, expect, type Page } from "@playwright/test";
import {
  pageAction,
  openPanel,
  editSelection,
  viewAction,
} from "./helpers/workbench";
import { writeFile } from "node:fs/promises";
async function draftAction(page: Page, name: string) {
  await page
    .locator(".workbench-menu > summary")
    .filter({ hasText: "草稿選單" })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function measurements(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      app: rect(".topbar"),
      tools: rect(".visual-tools"),
      visibleCanvas: rect(".preview-scroll"),
      documentWidth: document.documentElement.scrollWidth,
    };
  });
}
for (const width of [1440, 768, 375])
  test(`review 1: explicit offline demo end-to-end at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const unexpected: string[] = [];
    // The demo must work even with all backend endpoints unavailable.
    await page.route("**/api/**", (r) => {
      // The read-only "is AI set up?" probe sends no draft data and creates no session;
      // it is aborted too, and the demo must still work.
      if (!r.request().url().endsWith("/api/generation/ready")) unexpected.push(r.request().url());
      return r.abort();
    });
    await page.route("https://**/*", (r) => {
      unexpected.push(r.request().url());
      return r.abort();
    });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await draftAction(page, "載入個人作品集");
    await expect(page.getByTestId("canvas-node")).toHaveCount(6);
    await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
    await draftAction(page, "智慧排版（非 AI）");
    await expect(
      page.getByText("智慧排版（非 AI）", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/review1-candidate-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "使用此版本", exact: true }).click();
    await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
    await page.getByRole("button", { name: "選取", exact: true }).click();
    const heading = page.locator(".preview-frame h1");
    await heading.click();
    const stableId = await heading.getAttribute("data-page-id");
    await editSelection(page);
    await page.getByLabel("標題文字").fill("清楚呈現我的作品");
    await page.getByRole("button", { name: "套用", exact: true }).click();
    await expect(heading).toHaveText("清楚呈現我的作品");
    await expect(heading).toHaveAttribute("data-page-id", stableId!);
    await openPanel(page, "動畫");
    const effect = page.locator(
      '.preview-inspector [data-effect-id="fade-in"]',
    );
    if (width === 1440) await effect.dragTo(heading);
    else
      await effect.getByRole("button", { name: "淡入", exact: true }).click();
    await expect(heading).toHaveAttribute("data-effects", "fade-in");
    await page.getByRole("button", { name: "撤銷修改" }).click();
    await expect(heading).toHaveAttribute("data-effects", "");
    await page.getByRole("button", { name: "重做修改" }).click();
    await expect(heading).toHaveAttribute("data-effects", "fade-in");
    await page.getByRole("button", { name: "關閉工具面板" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-page-selected]")).toHaveCount(0);
    await page.getByRole("button", { name: "畫筆", exact: true }).click();
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + 8, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 25, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(1);
    await page.getByRole("button", { name: "清除註記", exact: true }).click();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(0);
    await page.getByRole("button", { name: "瀏覽", exact: true }).click();
    await viewAction(page, "手機");
    await expect(page.locator(".preview-frame")).toHaveClass(/mobile/);
    await viewAction(page, "桌面");
    await pageAction(page, "重新載入頁面");
    await expect(heading).toHaveText("清楚呈現我的作品");
    await expect(heading).toHaveAttribute("data-effects", "fade-in");
    const metrics = await measurements(page);
    expect(metrics.documentWidth).toBeLessThanOrEqual(width);
    expect(metrics.visibleCanvas.height).toBeGreaterThan(700);
    await writeFile(
      `test-results/review1-${width}.json`,
      JSON.stringify(metrics, null, 2),
    );
    await page.screenshot({
      path: `test-results/review1-${width}.png`,
      fullPage: true,
    });
    const download = page.waitForEvent("download");
    await pageAction(page, "匯出 React 專案");
    await expect
      .poll(async () => Boolean((await download).suggestedFilename()))
      .toBe(true);
    expect(unexpected).toEqual([]);
  });
for (const name of ["活動介紹", "不規則草稿", "動畫草稿"])
  test(`repeatable ${name} sample and Undo preserve original draft`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await draftAction(page, "載入" + name);
    await expect(page.getByTestId("canvas-node")).not.toHaveCount(0);
    await page.getByRole("button", { name: "還原", exact: true }).click();
    await expect(page.getByTestId("canvas-node")).toHaveCount(0);
    await page.getByRole("button", { name: "重做", exact: true }).click();
    await draftAction(page, "智慧排版（非 AI）");
    await expect(
      page.getByText("智慧排版（非 AI）", { exact: true }),
    ).toBeVisible();
    if (name === "動畫草稿")
      await expect(
        page
          .getByRole("main", { name: "生成候選預覽" })
          .locator('.preview-frame [data-effects]:not([data-effects=""])'),
      ).toHaveCount(5);
    await page.getByRole("button", { name: "使用此版本", exact: true }).click();
    await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  });
