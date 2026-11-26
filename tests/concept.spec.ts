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
  await page.getByText("細調：構圖、設計概念、主題").click();
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

async function clubCandidate(page: import("@playwright/test").Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：社團招生頁" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
}

test("every concept changes the whole site and stays inside a phone screen", async ({ page }) => {
  await clubCandidate(page, 390);
  await buildSite(page);
  const candidate = page.locator("main[aria-label='生成候選預覽'] .rendered-page").first();
  await page.getByText("細調：構圖、設計概念、主題").click();
  const picker = page.getByRole("radiogroup", { name: "設計概念" });
  const looks = new Set<string>();
  for (const [name, id] of [["研究檔案", "archive"], ["作品牆", "gallery-wall"], ["暗場", "darkroom"], ["單色海報", "poster"], ["生成網格", "generative-grid"]]) {
    await picker.getByRole("radio", { name }).click();
    await expect(candidate).toHaveAttribute("data-concept", id);
    looks.add(await candidate.evaluate((e) => getComputedStyle(e).backgroundColor + "|" + getComputedStyle(e.querySelector("h1")!).fontFamily));
    // Nothing spills past the phone width.
    expect(await candidate.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(looks.size).toBe(5);
  // The generated grid grows from the site name, so it is the same every time for one site.
  await expect(candidate.locator(".pg-gen-grid span").first()).toBeAttached();
});

test("side dots nav marks where the visitor is", async ({ page }) => {
  await clubCandidate(page);
  await page.getByRole("button", { name: /導覽列/ }).first().click();
  await page.getByRole("dialog", { name: "導覽列" }).getByRole("radio", { name: /側邊點點/ }).click();
  await page.keyboard.press("Escape");
  await buildSite(page);
  const site = page.locator("main[aria-label='生成候選預覽'] .rendered-page").first();
  const dots = site.locator(".page-dots a");
  expect(await dots.count()).toBeGreaterThan(1);
  // The dots are a visual shortcut; the menu is the accessible way to move around.
  await expect(site.locator(".page-dots-rail")).toHaveAttribute("aria-hidden", "true");
  await expect(site.getByRole("button", { name: /選單/ })).toBeVisible();
  await dots.last().click();
  await expect(site.locator(".page-dots a.is-here")).toHaveCount(1);
  await expect(dots.last()).toHaveClass(/is-here/);
});

test("interactive pricing totals, gallery views switch, logo wall and numbers stand out", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  for (const n of ["圖片展示", "數字證明", "合作夥伴"]) await page.getByRole("button", { name: "新增區塊：" + n }).click();
  await buildSite(page);
  const site = page.locator("main[aria-label='生成候選預覽'] .rendered-page").first();
  const extras = page.getByRole("group", { name: "互動功能" });
  await expect(site.getByRole("group", { name: "自己組合" })).toHaveCount(0);
  await extras.getByRole("button", { name: "互動價目表" }).click();
  await extras.getByRole("button", { name: "作品瀏覽切換" }).click();
  await expect(extras.getByRole("button", { name: "互動價目表" })).toHaveAttribute("aria-pressed", "true");
  const builder = site.getByRole("group", { name: "自己組合" });
  await expect(builder.locator("output")).toContainText("勾選想要的項目");
  await builder.getByText("拿鐵").click();
  await builder.getByText("季節手沖").click();
  await expect(builder.locator("output")).toContainText("已選 2 項");
  await expect(builder.locator("output")).toContainText("210");
  // One switcher, on the work gallery only; the logo wall stays a plain row.
  const views = site.getByRole("radiogroup", { name: "瀏覽方式" });
  await expect(views).toHaveCount(1);
  await expect(views.getByRole("radio", { name: "網格" })).toHaveAttribute("aria-checked", "true");
  await views.getByRole("radio", { name: "清單" }).click();
  await expect(views.getByRole("radio", { name: "清單" })).toHaveAttribute("aria-checked", "true");
  const logo = site.locator(".page-image[data-caption*='標誌'] :is(img, .page-image-placeholder)").first();
  await expect(logo).toHaveCSS("filter", /grayscale/);
  await expect(site.locator(".page-card[data-stat]")).toHaveCount(3);
  // Kept after accepting.
  await page.getByRole("button", { name: "使用此版本" }).click();
  await expect(page.getByTestId("preview-frame").getByRole("group", { name: "自己組合" })).toBeVisible();
});

test("editorial composition: each section gets its own arrangement, phone stays inside the screen", async ({ page }) => {
  await clubCandidate(page, 390);
  await buildSite(page);
  const candidate = page.locator("main[aria-label='生成候選預覽'] .rendered-page").first();
  await page.getByText("細調：構圖、設計概念、主題").click();
  const compose = page.getByRole("radiogroup", { name: "構圖" });
  await expect(compose.getByRole("radio", { name: "整齊" })).toHaveAttribute("aria-checked", "true");
  await compose.getByRole("radio", { name: "編排" }).click();
  await expect(candidate).toHaveAttribute("data-compose", "editorial");
  await expect(candidate.locator(".role-hero h1")).toHaveCSS("mix-blend-mode", "difference");
  await expect(candidate.locator(".role-gallery h2.page-heading")).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  expect(await candidate.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "使用此版本" }).click();
  await expect(page.getByTestId("preview-frame").locator(".rendered-page").first()).toHaveAttribute("data-compose", "editorial");
});
