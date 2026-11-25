import { test, expect } from "@playwright/test";
import { openPanel, editSelection } from "./helpers/workbench";
const phase = process.env.DESIGN_CAPTURE === "before" ? "before" : "after";
for (const width of [1440, 768, 375])
  test(`design inspection: draft, properties, animation and preview ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const outbound: string[] = [];
    await page.route("https://**/*", (r) => {
      outbound.push(r.request().url());
      return r.abort();
    });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    if (width < 1000)
      await page.getByRole("button", { name: "展開側欄", exact: true }).click();
    await page.screenshot({
      path: `test-results/design-${phase}-empty-${width}.png`,
      fullPage: true,
    });
    if (width === 1440) {
      await page
        .getByRole("button", { name: "新增文字", exact: true })
        .dragTo(page.getByTestId("canvas"), {
          targetPosition: { x: 180, y: 140 },
        });
      await expect(page.getByTestId("canvas-node")).toHaveCount(1);
      await page.getByRole("button", { name: "還原", exact: true }).click();
      await expect(page.getByTestId("canvas-node")).toHaveCount(0);
    }
    await page
      .locator(".workbench-menu > summary")
      .filter({ hasText: "草稿選單" })
      .click();
    await page
      .getByRole("button", { name: "載入個人作品集", exact: true })
      .click();
    await page.screenshot({
      path: `test-results/design-${phase}-draft-${width}.png`,
      fullPage: true,
    });
    if (width < 1000)
      await page.getByRole("button", { name: "收合側欄", exact: true }).click();
    await page.getByTestId("canvas-node").first().click();
    if (width < 1000)
      await page.getByRole("button", { name: "展開側欄", exact: true }).click();
    await page.getByRole("tab", { name: "編輯元素" }).click();
    await page.screenshot({
      path: `test-results/design-${phase}-draft-properties-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
    await page
      .locator(".workbench-menu > summary")
      .filter({ hasText: "草稿選單" })
      .click();
    await page
      .getByRole("button", { name: "立即排版", exact: true })
      .click();
    await page.getByRole("button", { name: "使用此版本", exact: true }).click();
    await page.getByRole("button", { name: "選取", exact: true }).click();
    await page.locator(".preview-frame h1").click();
    await editSelection(page);
    await page.screenshot({
      path: `test-results/design-${phase}-properties-${width}.png`,
      fullPage: true,
    });
    await openPanel(page, "動畫");
    await page.screenshot({
      path: `test-results/design-${phase}-animations-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "淡入", exact: true }).click();
    await expect(page.locator(".preview-frame h1")).toHaveAttribute(
      "data-effects",
      "fade-in",
    );
    await page.getByRole("button", { name: "關閉工具面板" }).click();
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(outbound).toEqual([]);
  });
