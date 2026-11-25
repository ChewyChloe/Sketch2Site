import {openWebsiteWorkspace} from "./helpers/workbench";
import {
  pageAction,
  viewAction,
  openPanel,
  editSelection,
  addFade,
  setFadeDuration,
  cancelSelection,
} from "./helpers/workbench";
import { test, expect, type Page } from "@playwright/test";
import { id, fixture } from "./fixtures/workbench";
async function record(page: Page, store = "pages", key = "local-project") {
  return page.evaluate(
    ({ store, key }) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open("sketch2site", 3);
        open.onsuccess = () => {
          const db = open.result,
            r = db.transaction(store).objectStore(store).get(key);
          r.onsuccess = () => {
            resolve(r.result ?? null);
            db.close();
          };
          r.onerror = () => reject(r.error);
        };
      }),
    { store, key },
  );
}
async function setup(page: Page) {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/generation"
    )
      external.push("unexpected-generation");
  });
  await page.route("https://**/*", (route) => {
    external.push(new URL(route.request().url()).hostname);
    return route.abort();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  if (
    !(await page
      .getByRole("button", { name: "新增文字", exact: true })
      .isVisible())
  )
    await page.getByRole("button", { name: "展開側欄", exact: true }).click();
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "visual-mock.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.locator(".rendered-page h1")).toHaveText("我的設計作品");
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  return external;
}
const node = (page: Page, n: number) =>
  page.locator(`[data-page-id="${id(n)}"]`);
async function marquee(page: Page, zoom = "1") {
  if (await page.getByRole("button", { name: "取消選取", exact: true }).count())
    await page.getByRole("button", { name: "取消選取", exact: true }).click();
  await page.getByRole("button", { name: "選取", exact: true }).click();
  await page.getByLabel("預覽縮放").selectOption(zoom);
  const root = (await page.getByTestId("visual-surface").boundingBox())!;
  const h = (await node(page, 2).boundingBox())!,
    p = (await node(page, 3).boundingBox())!;
  await page.mouse.move(root.x + 2, root.y + 2);
  await page.mouse.down();
  await page.mouse.move(
    Math.max(h.x + h.width, p.x + p.width) + 2,
    p.y + p.height + 2,
    { steps: 12 },
  );
  if (zoom === "1")
    await page.screenshot({
      path: "test-results/phase6-marquee.png",
      fullPage: true,
    });
  await page.mouse.up();
}
test("單選、框選、多選、取消、縮放與 Patch 保存不影響草稿", async ({
  page,
}) => {
  const external = await setup(page),
    draft = await record(page, "drafts", "current");
  await page.getByRole("button", { name: "選取", exact: true }).click();
  await node(page, 2).click();
  await expect(node(page, 2)).toHaveAttribute("data-page-selected", "true");
  await openPanel(page, "元件");
  await expect(page.locator(`[data-component-id="${id(2)}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await editSelection(page);
  await page.getByLabel("元素對齊").selectOption("center");
  await editSelection(page);
  await page.getByLabel("標題文字").fill("清楚呈現我的作品");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(node(page, 2)).toHaveClass(/align-center/);
  await expect(node(page, 2)).toHaveText("清楚呈現我的作品");
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(node(page, 2)).toHaveText("我的設計作品");
  await page.getByRole("button", { name: "重做修改" }).click();
  await editSelection(page);
  await page.getByLabel("標題文字").fill('<img src=x onerror="alert(1)">');
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("數值不對");
  await page.getByRole("button", { name: "捨棄修改", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-page-selected]")).toHaveCount(0);
  for (const zoom of ["1", "0.75", "0.5"]) {
    await marquee(page, zoom);
    await expect(page.getByRole("region", { name: "選取摘要" })).toContainText(
      "已選取 2 個元件",
    );
    await expect(node(page, 2)).toHaveAttribute("data-page-selected", "true");
    await expect(node(page, 3)).toHaveAttribute("data-page-selected", "true");
    if (zoom === "0.75")
      await page.screenshot({
        path: "test-results/phase6-multi-75.png",
        fullPage: true,
      });
    const surface = (await page.getByTestId("visual-surface").boundingBox())!;
    await page.mouse.click(surface.x + 2, surface.y + surface.height - 2);
    // Blank surface below the rendered content has no component ID.
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-page-selected]")).toHaveCount(0);
  }
  await page.getByLabel("預覽縮放").selectOption("1");
  await node(page, 2).click();
  const scroll = (await page.locator(".preview-scroll").boundingBox())!;
  await page.mouse.click(scroll.x + 2, scroll.y + 2);
  await expect(page.locator("[data-page-selected]")).toHaveCount(0);
  await expect.poll(() => record(page, "drafts", "current")).toEqual(draft);
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await page.reload();
  await openWebsiteWorkspace(page);
  await expect(node(page, 2)).toHaveText("清楚呈現我的作品");
  expect(external).toEqual([]);
});
test("畫筆、撤銷清除、縮放與瀏覽互動；註記不進入 PageSpec", async ({
  page,
}) => {
  const external = await setup(page),
    before = await record(page);
  await page.getByRole("button", { name: "畫筆", exact: true }).click();
  await page.getByLabel("預覽縮放").selectOption("0.5");
  const root = (await page.getByTestId("visual-surface").boundingBox())!;
  await page.mouse.move(root.x + 20, root.y + 20);
  await page.mouse.down();
  await page.mouse.move(root.x + 50, root.y + 40, { steps: 8 });
  await page.mouse.up();
  const stroke = page.locator("[data-annotation-id]");
  await expect(stroke).toHaveCount(1);
  const points = await stroke.getAttribute("points");
  expect(Number(points!.split(" ")[0].split(",")[0])).toBeCloseTo(40, 0);
  await page.getByRole("button", { name: "清除註記", exact: true }).click();
  await expect(stroke).toHaveCount(0);
  await page.getByRole("button", { name: "撤銷註記", exact: true }).click();
  await expect(stroke).toHaveCount(1);
  expect(await record(page)).toEqual(before);
  await page.getByLabel("預覽縮放").selectOption("1");
  await expect(stroke).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 650 });
  await node(page, 4).scrollIntoViewIfNeeded();
  const scrolled = (await page.getByTestId("visual-surface").boundingBox())!,
    card = (await node(page, 4).boundingBox())!;
  await page.mouse.move(card.x + 10, card.y + 10);
  await page.mouse.down();
  await page.mouse.move(card.x + 30, card.y + 30, { steps: 5 });
  await page.mouse.up();
  await expect(stroke).toHaveCount(2);
  const secondPoints = await stroke.last().getAttribute("points");
  expect(Number(secondPoints!.split(" ")[0].split(",")[1])).toBeCloseTo(
    card.y + 10 - scrolled.y,
    0,
  );
  await page.getByRole("button", { name: "瀏覽", exact: true }).click();
  await node(page, 6).click();
  await expect(node(page, 4)).toBeFocused();
  expect(await record(page)).toEqual(before);
  await page.reload();
  await openWebsiteWorkspace(page);
  await expect(stroke).toHaveCount(0);
  expect(external).toEqual([]);
});
test("動畫拖放、相容性、替換移除、Undo/Redo 與實際播放", async ({ page }) => {
  const external = await setup(page);
  await openPanel(page, "動畫");
  await page.locator('[data-effect-id="slide-up"]').dragTo(node(page, 2));
  await expect(node(page, 2)).toHaveAttribute("data-effects", "slide-up");
  await page.locator('[data-effect-id="slide-up"]').dragTo(node(page, 2));
  await expect(page.getByRole("alert")).toContainText("動畫不存在或已附加");
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(node(page, 2)).toHaveAttribute("data-effects", "");
  await page.getByRole("button", { name: "重做修改" }).click();
  await expect(node(page, 2)).toHaveAttribute("data-effects", "slide-up");
  await page.locator('[data-effect-id="stagger-reveal"]').dragTo(node(page, 2));
  await expect(page.getByRole("alert")).toContainText("不適用於目前元件");
  await expect(node(page, 2)).toHaveAttribute("data-effects", "slide-up");
  await editSelection(page);
  await expect(page.getByLabel("更換向上滑入").locator('option[value="scale-in"]')).toBeDisabled();
  await page.getByLabel("更換向上滑入").selectOption("fade-in");
  await expect(node(page, 2)).toHaveAttribute("data-effects", "fade-in");
  await page.getByRole("button", { name: "移除淡入", exact: true }).click();
  await expect(node(page, 2)).toHaveAttribute("data-effects", "");
  await openPanel(page, "動畫");
  await page
    .locator('[data-effect-id="stagger-reveal"]')
    .dragTo(node(page, 4), { targetPosition: { x: 3, y: 3 } });
  await expect(page.getByRole("alert")).toContainText("兩樣以上的內容");
  await expect(node(page, 4)).toHaveAttribute("data-effects", "");
  await page.locator('[data-effect-id="stagger-reveal"]').dragTo(node(page,1),{targetPosition:{x:3,y:3}});
  await expect(node(page,1)).toHaveAttribute("data-effects","stagger-reveal");
  await page.screenshot({
    path: "test-results/phase6-animations.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await viewAction(page, "重播動畫");
  await expect
    .poll(() => node(page, 4).evaluate((el) => el.getAnimations().length))
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => node(page, 4).evaluate((el) => el.getAnimations().length))
    .toBe(0);
  expect(external).toEqual([]);
});
for (const width of [1440, 768, 375])
  test(`視覺工作台 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const external = await setup(page);
    await page.getByRole("button", { name: "選取", exact: true }).click();
    await node(page, 2).click();
    await editSelection(page);
    await page
      .getByRole("button", { name: "套用", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "套用", exact: true }),
    ).toBeInViewport();
    await expect(node(page, 2)).toHaveAttribute("data-page-selected", "true");
    await page.screenshot({
      path: `test-results/phase6-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "取消選取", exact: true }).click();
    await page
      .getByRole("button", { name: "關閉工具面板", exact: true })
      .click();
    await page.getByRole("button", { name: "畫筆", exact: true }).click();
    const box = (await node(page, 2).boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 30, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator("[data-annotation-id]")).toHaveCount(1);
    await page.screenshot({
      path: `test-results/phase6-pen-${width}.png`,
      fullPage: true,
    });
    expect(external).toEqual([]);
  });
