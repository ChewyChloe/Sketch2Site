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
import { demoPage } from "../src/pageFixtures";
test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => {
    if (dialog.message() === "取代目前頁面並自動儲存？") void dialog.accept();
    else void dialog.dismiss();
  });
});
async function openPreview(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "把想法，排成一個頁面。" }),
  ).toBeVisible();
}
async function upload(page: Page, data: unknown) {
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "page.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
}
test("預覽互動、動畫、草稿隔離與恢復", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  const id = await page.getByTestId("canvas-node").getAttribute("data-node-id");
  await openWebsiteWorkspace(page);
  await expect(page.getByText("範例預覽", { exact: true })).toBeVisible();
  // Replay, then inspect live browser Animation objects rather than only class names.
  await viewAction(page, "重播動畫");
  await expect
    .poll(() =>
      page
        .locator(".rendered-page")
        .evaluate((root) => root.getAnimations({ subtree: true }).length),
    )
    .toBeGreaterThan(0);
  const image = page.getByRole("img");
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  const heading = page.getByRole("heading", {
    level: 1,
    name: "把想法，排成一個頁面。",
  });
  const componentId = await heading.getAttribute("data-page-id");
  expect(componentId).toMatch(/^[\da-f-]{36}$/);
  const cta = page.getByRole("link", { name: "查看內容" });
  await cta.hover();
  await expect
    .poll(() => cta.evaluate((el) => getComputedStyle(el).boxShadow))
    .not.toBe("none");
  await cta.click();
  await expect(
    page.getByRole("heading", { name: "從內容開始，讓布局跟上。" }),
  ).toBeInViewport();
  await expect
    .poll(() =>
      page
        .locator('.page-grid[data-effects~="stagger-reveal"]')
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBeGreaterThan(0);
  const card = page.locator(".page-card").first();
  await card.hover();
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe("none");
  const external = page.getByRole("link", { name: "閱讀網頁開發文件" });
  await expect(external).toHaveAttribute("rel", "noopener noreferrer");
  await expect(external).toHaveAttribute(
    "href",
    "https://learn.microsoft.com/zh-tw/training/",
  );
  await context.route("https://learn.microsoft.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>文件測試</title><p>連結已開啟</p>",
    }),
  );
  const popupPromise = page.waitForEvent("popup");
  await external.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe("https://learn.microsoft.com/zh-tw/training/");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();

  const beforeInvalid = await page
    .locator(".preview-frame .rendered-page")
    .innerHTML();
  await upload(page, {
    ...demoPage,
    sections: [{ ...demoPage.sections[0], onclick: "alert(1)" }],
  });
  await expect(page.getByRole("alert")).toContainText("預覽失敗");
  expect(await page.locator(".preview-frame .rendered-page").innerHTML()).toBe(
    beforeInvalid,
  );
  await expect(page.locator(".preview-frame [onclick]")).toHaveCount(0);
  await pageAction(page, "還原範例");
  await expect(heading).toBeVisible();
  await page.keyboard.press("Delete");
  await page.keyboard.press("Control+z");
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await expect(page.getByTestId("canvas-node")).toHaveAttribute(
    "data-node-id",
    id!,
  );
  expect(errors).toEqual([]);
});
for (const width of [1440, 768, 375]) {
  test("響應式視窗 " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openPreview(page);
    const root = page.locator(".rendered-page");
    await expect
      .poll(() => root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const grid = page.locator(".page-grid").first();
    const columns = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
    expect(columns).toBe(width === 1440 ? 2 : 1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        root.evaluate((el) => el.getAnimations({ subtree: true }).length),
      )
      .toBe(0);
    await page.screenshot({
      path: "test-results/preview-" + width + ".png",
      fullPage: true,
    });
    if (width === 1440) {
      await viewAction(page, "手機");
      await expect(page.getByTestId("preview-frame")).toHaveCSS(
        "width",
        "375px",
      );
      expect(
        await grid.evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
      ).toBe(1);
      await page.screenshot({
        path: "test-results/preview-mobile-frame.png",
        fullPage: true,
      });
    }
  });
}
test("Reduced Motion 與不可信檔案", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPreview(page);
  await viewAction(page, "重播動畫");
  expect(
    await page
      .locator(".rendered-page")
      .evaluate((root) => root.getAnimations({ subtree: true }).length),
  ).toBe(0);
  const cta = page.getByRole("link", { name: "查看內容" });
  await cta.click();
  const card = page.locator(".page-card").first();
  await card.hover();
  await expect(card).toHaveCSS("transform", "none");
  const invalid = structuredClone(demoPage);
  const stack = invalid.sections[0].children![0].children![0].children![0];
  const button = stack.children!.find((n) => n.type === "button")!;
  button.href = "javascript:window.pwned=true";
  await upload(page, invalid);
  await expect(page.getByRole("alert")).toContainText("連結網址無效");
  button.href = "https://example.com";
  stack.children![0].content = '<img src=x onerror="window.pwned=true">';
  await upload(page, invalid);
  await expect(
    page.locator(".rendered-page").getByRole("heading", { level: 1 }),
  ).toContainText("<img");
  await expect(page.locator("img[src=x]")).toHaveCount(0);
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("檔案格式無效");
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.from(" ".repeat(200001)),
  });
  await expect(page.getByRole("alert")).toContainText("超過 200 KB");
  await pageAction(page, "還原範例");
  await expect(
    page.locator(".rendered-page").getByRole("heading", { level: 1 }),
  ).toBeVisible();
});
test("內建資產載入失敗可重試", async ({ page }) => {
  await page.route("**/assets/workspace.svg", (r) => r.abort());
  await openPreview(page);
  await expect(page.getByText("圖片無法載入", { exact: true })).toBeVisible();
  await page.unroute("**/assets/workspace.svg");
  await page.getByRole("button", { name: "重試圖片" }).click();
  await expect(page.getByRole("img")).toBeVisible();
  await expect
    .poll(() =>
      page.getByRole("img").evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
});
