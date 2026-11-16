import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { fixture, id } from "./fixtures/workbench";
import {
  openPanel,
  viewAction,
  pageAction,
  editSelection,
} from "./helpers/workbench";
async function metrics(page: Page, state: string) {
  return page.evaluate((state) => {
    const el = document.querySelector(".preview-scroll")!,
      r = el.getBoundingClientRect(),
      css = getComputedStyle(el),
      panel = document.querySelector(".preview-inspector") as HTMLElement;
    const box = panel.getBoundingClientRect(),
      open = !panel.hidden,
      overlap = open && getComputedStyle(panel).position === "absolute";
    const width =
        r.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
      height =
        r.height - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    const controls = [
      ...document.querySelectorAll(
        ".topbar button,.topbar summary,.visual-tools button,.visual-tools select,.visual-tools summary",
      ),
    ].filter(
      (e) =>
        e.getBoundingClientRect().width && e.getBoundingClientRect().height,
    );
    return {
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      state,
      appBar: document.querySelector(".topbar")!.getBoundingClientRect().height,
      contextBar: document
        .querySelector(".visual-tools")!
        .getBoundingClientRect().height,
      canvasTop: r.top,
      canvasWidth: width,
      canvasHeight: height,
      panelOpen: open,
      panelOverlaysCanvas: overlap,
      unoccludedWidth: overlap
        ? Math.max(0, box.left - r.left - parseFloat(css.paddingLeft))
        : width,
      unoccludedArea: overlap
        ? Math.max(
            0,
            r.width * r.height -
              Math.max(
                0,
                Math.min(r.right, box.right) - Math.max(r.left, box.left),
              ) *
                Math.max(
                  0,
                  Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top),
                ),
          )
        : r.width * r.height,
      fullWidthVisibleHeight:
        overlap && box.top > r.top
          ? Math.min(r.height, box.top - r.top)
          : overlap
            ? 0
            : r.height,
      controlsOverflow: controls.some((e) => {
        const b = e.getBoundingClientRect();
        return b.left < 0 || b.right > innerWidth + 0.5;
      }),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  }, state);
}
for (const width of [1440, 768, 375])
  test(`Phase 6.1 ${width}：面板、拖放、編輯、畫筆與保存實際流程`, async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      if (
        req.method() === "POST" &&
        new URL(req.url()).pathname === "/api/generation"
      )
        external.push("generation");
    });
    await page.route("https://**/*", (route) => {
      external.push(route.request().url());
      return route.abort();
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await expect(
      page.getByRole("heading", { name: "從一個想法開始", exact: true }),
    ).toBeInViewport();
    await page.screenshot({ path: `test-results/phase61-draft-${width}.png` });
    await page.getByRole("button", { name: "預覽", exact: true }).click();
    await page.getByLabel("載入頁面檔案").setInputFiles({
      name: "workbench-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture)),
    });
    await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
    const heading = page.locator(`.preview-frame [data-page-id="${id(2)}"]`);
    await heading.click();
    const selected = await metrics(page, "selected-default");
    expect(selected.controlsOverflow).toBe(false);
    expect(selected.horizontalOverflow).toBe(false);
    expect(selected.contextBar).toBeLessThanOrEqual(49);
    expect(selected.canvasTop).toBeLessThanOrEqual(110);
    expect(selected.canvasHeight).toBeGreaterThan(800);
    await page.screenshot({ path: `test-results/phase61-${width}.png` });
    if (selected.panelOpen)
      await page
        .getByRole("button", { name: "關閉工具面板", exact: true })
        .click();
    const closed = await metrics(page, "panel-closed");
    await openPanel(page, "動畫");
    await expect(
      page.locator("#preview-inspector [data-effect-id]"),
    ).toHaveCount(20);
    await expect(
      page.locator("#preview-inspector .asset-sample .rendered-page"),
    ).toHaveCount(20);
    if (width === 1440) {
      const sample = page.locator(
        '#preview-inspector [data-effect-id="slide-up"] .page-card',
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await sample.hover();
      await expect
        .poll(() => sample.evaluate((el) => el.getAnimations().length))
        .toBeGreaterThan(0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect
        .poll(() => sample.evaluate((el) => el.getAnimations().length))
        .toBe(0);
    }

    await page.screenshot({
      path: `test-results/phase61-animations-${width}.png`,
    });
    const opened = await metrics(page, "animation-panel-open");
    // Real native drag, including the target feedback before releasing the pointer.
    const source = page.locator(
        '#preview-inspector [data-effect-id="slide-up"]',
      );
    // Larger gallery samples require scrolling the chosen material into view first.
    await source.scrollIntoViewIfNeeded();
    await expect(source).toBeInViewport();
    const a = (await source.boundingBox())!,
      b = (await heading.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + 20);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 - 8, a.y + 20, { steps: 3 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.move(b.x + b.width / 2 + 1, b.y + b.height / 2);
    await expect(heading).toHaveAttribute("data-drop-target", "");
    await expect(heading).not.toHaveAttribute("data-drop-invalid", "");
    await page.screenshot({ path: `test-results/phase61-drag-${width}.png` });
    await page.mouse.up();
    await expect(heading).toHaveAttribute("data-effects", "slide-up");
    await editSelection(page);
    await page.getByLabel("標題文字").fill("讓作品清楚地被看見");
    await page.getByLabel("元素對齊").selectOption("center");
    await page.getByLabel("向上滑入時長").fill("700");
    await page.getByRole("button", { name: "套用", exact: true }).click();
    await expect(heading).toHaveText("讓作品清楚地被看見");
    await expect(page.locator(".patch-diff")).not.toHaveAttribute("open", "");
    await page.getByRole("button", { name: "撤銷修改", exact: true }).click();
    await expect(heading).toHaveText("我的設計作品");
    await page.getByRole("button", { name: "重做修改", exact: true }).click();
    await expect(heading).toHaveText("讓作品清楚地被看見");
    await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
    await page
      .getByRole("button", { name: "關閉工具面板", exact: true })
      .click();
    await viewAction(page, "手機");
    expect(
      (await page.getByTestId("preview-frame").boundingBox())!.width,
    ).toBeLessThanOrEqual(375);
    await viewAction(page, "桌面");
    await page.getByRole("button", { name: "畫筆", exact: true }).click();
    const h = (await heading.boundingBox())!,
      cx = h.x + Math.min(180, h.width / 2),
      cy = h.y + h.height / 2,
      rx = Math.min(130, h.width / 2 - 8),
      ry = Math.min(40, h.height / 2 - 4);
    await page.mouse.move(cx + rx, cy);
    await page.mouse.down();
    for (let n = 1; n <= 24; n++) {
      const angle = (n * Math.PI) / 12;
      await page.mouse.move(
        cx + Math.cos(angle) * rx,
        cy + Math.sin(angle) * ry,
      );
    }
    await page.mouse.up();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(1);
    await page.screenshot({ path: `test-results/phase61-pen-${width}.png` });
    await page.getByRole("button", { name: "清除註記", exact: true }).click();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(0);
    await page.getByRole("button", { name: "撤銷註記", exact: true }).click();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(
      page.locator(".preview-frame [data-page-selected]"),
    ).toHaveCount(0);
    await pageAction(page, "重新載入頁面");
    await expect(heading).toHaveText("讓作品清楚地被看見");
    await expect(page.locator("[data-annotation-id]")).toHaveCount(0);
    await expect(page.getByTestId("page-save-status")).toHaveCount(1);
    await expect(page.locator(".footer")).toHaveCount(0);
    expect(external).toEqual([]);
    writeFileSync(
      `test-results/phase61-metrics-${width}.json`,
      JSON.stringify([selected, closed, opened], null, 2),
    );
  });
