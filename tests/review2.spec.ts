import { useTemplate, buildSite } from "./helpers/workbench";
import { choose } from "./helpers/select";
import {openWebsiteWorkspace} from "./helpers/workbench";
import { test, expect, type Page } from "@playwright/test";
import { openPanel, editSelection, viewAction } from "./helpers/workbench";
import { generationFixtures } from "../src/demoFixtures";
import { writeFile } from "node:fs/promises";
for (const width of [1440, 768, 375])
  test(`review 2: fresh keyboard, animation, pen and scaling inspection ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    // AI not set up: 生成網站 builds the site locally, so nothing should leave the browser.
    await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
    const network: string[] = [];
    page.on("request", (r) => {
      // The read-only "is AI set up?" probe sends no draft data and creates no session.
      if (/\/api\/(generation\/ready|auth\/me)$/.test(r.url())) return;
      if (
        r.url().includes("/api/") ||
        new URL(r.url()).hostname !== "127.0.0.1"
      )
        network.push(r.url());
    });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await useTemplate(page, "活動介紹");
    if (
      width < 1000 &&
      (await page.getByRole("button", { name: "收合側欄" }).isVisible())
    )
      await page.getByRole("button", { name: "收合側欄" }).click();
    const heading = page
      .getByTestId("canvas-node")
      .filter({ hasText: "社區閱讀日" });
    await heading.click();
    if (width < 1000)
      await page.getByRole("button", { name: "展開側欄" }).click();
    const before = await heading.evaluate((e) => ({
      x: (e as HTMLElement).style.left,
      y: (e as HTMLElement).style.top,
    }));
    const tabs = page.getByRole("tablist", { name: "工具分類" });
    await tabs.getByRole("tab", { name: "元件", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      tabs.getByRole("tab", { name: "動畫", exact: true }),
    ).toBeFocused();
    await expect(
      tabs.getByRole("tab", { name: "動畫", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      await heading.evaluate((e) => ({
        x: (e as HTMLElement).style.left,
        y: (e as HTMLElement).style.top,
      })),
    ).toEqual(before);
    await page.keyboard.press("End");
    // Phones swap the library sheet for the inspector sheet; wider screens keep the tab focused.
    if (width <= 760) await expect(page.getByRole("complementary", { name: "物件檢查器" })).toBeVisible();
    else await expect(tabs.getByRole("tab", { name: "編輯元素" })).toBeFocused();
    await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
    await buildSite(page);
    await page.getByRole("button", { name: "使用此版本", exact: true }).click();
    await page.getByRole("button", { name: "選取", exact: true }).click();
    const h = page.locator(".preview-frame h1");
    await h.click();
    await editSelection(page);
    await page.getByLabel("標題文字").fill("閱讀，從這裡開始");
    await page.getByRole("button", { name: "套用", exact: true }).click();
    await page.screenshot({
      path: `test-results/review2-properties-${width}.png`,
      fullPage: true,
    });
    // The label may change, so use the one visible inspector tablist.
    const list = page.locator('#preview-inspector [role="tablist"]');
    await list.getByRole("tab", { name: "屬性", exact: true }).focus();
    await page.keyboard.press("Home");
    await expect(
      list.getByRole("tab", { name: "圖層", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(
      list.getByRole("tab", { name: "動畫", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "淡入", exact: true }).click();
    await expect(h).toHaveAttribute("data-effects", "fade-in");
    await page.screenshot({
      path: `test-results/review2-animations-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "工具", exact: true }),
    ).toBeFocused();
    await expect(page.locator("[data-page-selected]")).toHaveCount(0);
    await page.getByRole("button", { name: "選取", exact: true }).click();
    await choose(page.getByLabel("預覽縮放"), "0.5");
    await h.click();
    await expect(h).toHaveAttribute("data-page-selected", "true");
    const aligned = await h.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        outline: getComputedStyle(e).outlineStyle,
      };
    });
    expect(aligned.width).toBeGreaterThan(30);
    expect(aligned.outline).toBe("solid");
    await page.keyboard.press("Escape");
    await choose(page.getByLabel("預覽縮放"), "1");
    await page.getByRole("button", { name: "畫筆", exact: true }).click();
    const r = (await h.boundingBox())!;
    await page.mouse.move(r.x + 8, r.y + 8);
    await page.mouse.down();
    await page.mouse.move(r.x + 90, r.y + 30, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(1);
    await page.screenshot({
      path: `test-results/review2-pen-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "撤銷註記", exact: true }).click();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(0);
    await page.getByRole("button", { name: "瀏覽", exact: true }).click();
    await viewAction(page, "手機");
    await viewAction(page, "桌面");
    await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
    await page.reload();
    await openWebsiteWorkspace(page);
    await expect(h).toHaveText("閱讀，從這裡開始");
    await expect(h).toHaveAttribute("data-effects", "fade-in");
    if (await page.getByRole("button", { name: "關閉工具面板" }).isVisible())
      await page.getByRole("button", { name: "關閉工具面板" }).click();
    const metrics = await page.evaluate(() => {
      const read = (s: string) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return { width: r.width, height: r.height };
      };
      return {
        width: innerWidth,
        app: read(".topbar"),
        toolbar: read(".visual-tools"),
        canvas: read(".preview-scroll"),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(metrics.overflow).toBe(0);
    await writeFile(
      `test-results/review2-${width}.json`,
      JSON.stringify(metrics, null, 2),
    );
    await page.screenshot({
      path: `test-results/review2-${width}.png`,
      fullPage: true,
    });
    expect(network).toEqual([]);
  });
test("100-node drag preserves grab offset at 50/75% and can be cancelled", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  const canvas = generationFixtures()[0];
  const sample = canvas.nodes[0];
  canvas.nodes = Array.from({ length: 100 }, (_, i) => ({
    ...sample,
    id: `00000000-0000-4000-8000-${String(9000 + i).padStart(12, "0")}`,
    content: `壓力測試 ${i}`,
    x: i === 0 ? 50 : 700 + (i % 5) * 100,
    y: i === 0 ? 60 : 500 + Math.floor(i / 5) * 25,
    width: 200,
    height: 50,
  }));
  await page.evaluate(
    (data) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("drafts", "readwrite");
          t.objectStore("drafts").put(data, "current");
          t.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    canvas,
  );
  await page.reload();
  await expect(page.getByTestId("canvas-node")).toHaveCount(100);
  const first = page.getByTestId("canvas-node").first();
  const samples = [];
  for (const scale of ["0.5", "0.75"]) {
    await choose(page.getByLabel("畫布縮放"), scale);
    const b = (await first.boundingBox())!,
      factor = Number(scale);
    const start = Date.now();
    await page.mouse.move(b.x + 40, b.y + 15);
    await page.mouse.down();
    const down = (await first.boundingBox())!;
    expect(down.x).toBeCloseTo(b.x, 0);
    expect(down.y).toBeCloseTo(b.y, 0);
    await page.mouse.move(b.x + 40 + 60 * factor, b.y + 15 + 30 * factor, {
      steps: 12,
    });
    const moved = (await first.boundingBox())!;
    expect(moved.x - b.x).toBeCloseTo(60 * factor, 0);
    expect(moved.y - b.y).toBeCloseTo(30 * factor, 0);
    samples.push({
      scale,
      elapsedMs: Date.now() - start,
      deltaX: moved.x - b.x,
      deltaY: moved.y - b.y,
    });
    await page.mouse.up();
    await page.getByRole("button", { name: "還原", exact: true }).click();
    await expect(first).toHaveCSS("left", "50px");
  }
  const box = (await first.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 20);
  await first.dispatchEvent("pointercancel");
  await page.mouse.up();
  await expect(first).toHaveCSS("left", "50px");
  await writeFile(
    "test-results/drag-100.json",
    JSON.stringify(samples, null, 2),
  );
});

test("200% text magnification preserves readable controls and exits at narrow widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await openWebsiteWorkspace(page);
    // Simulate text-only enlargement explicitly; this is not a claim about browser zoom settings.
    await page.evaluate(() => {
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>(".topbar *, .visual-tools *"),
      );
      const fonts = targets.map((el) => ({
        el,
        font: parseFloat(getComputedStyle(el).fontSize),
        line: parseFloat(getComputedStyle(el).lineHeight),
      }));
      fonts.forEach(({ el, font, line }) => {
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) return;
        el.style.fontSize = font * 2 + "px";
        if (Number.isFinite(line)) el.style.lineHeight = line * 2 + "px";
      });
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBe(0);
    await page.screenshot({
      path: `test-results/text200-before-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.locator(".visual-tools").evaluate((root) => {
        const bounds = root.getBoundingClientRect();
        return Array.from(
          root.querySelectorAll("button,select,summary"),
        ).flatMap((el) => {
          const r = el.getBoundingClientRect();
          if (
            el.closest(".workbench-menu-content") ||
            !r.width ||
            (r.left >= bounds.left &&
              r.right <= bounds.right + 1 &&
              r.top >= bounds.top &&
              r.bottom <= bounds.bottom + 1)
          )
            return [];
          return [
            {
              text: el.textContent,
              rect: { x: r.x, y: r.y, width: r.width, height: r.height },
              bounds: {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
              },
            },
          ];
        });
      }),
    ).toEqual([]);
    const toggle = page.getByRole("button", { name: "工具", exact: true });
    if ((await toggle.getAttribute("aria-expanded")) !== "true")
      await toggle.click();
    await expect(
      page.getByRole("button", { name: "關閉工具面板" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "關閉工具面板" }).click();
    await page.screenshot({
      path: `test-results/text200-${width}.png`,
      fullPage: true,
    });
  }
});
