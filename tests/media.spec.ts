import { test, expect } from "@playwright/test";
import { buildSite } from "./helpers/workbench";
// Media elements: add from the library, set them up in the inspector, and use them on the site.
test.setTimeout(90_000);
test("video, carousel and flipbook from draft to site; character and 3D object are still in development", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  // The video player is a third party; stub it so the test stays offline.
  const players: string[] = [];
  await page.route(/youtube-nocookie\.com|player\.vimeo\.com/, (r) => { players.push(r.request().url()); return r.fulfill({ contentType: "text/html", body: "<p>player</p>" }); });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  // Still in development: shown greyed out, cannot be added.
  for (const soon of ["動畫角色", "3D 物件"]) await expect(page.getByRole("button", { name: soon + "（開發中）" })).toBeDisabled();
  for (const kind of ["影片", "輪播圖片", "翻頁書"]) {
    await page.getByRole("tab", { name: "元件", exact: true }).click();
    await page.getByRole("button", { name: "新增" + kind }).click();
    await expect(page.getByRole("status")).toContainText("已新增" + kind);
    if (kind === "影片") {
      // No link yet: the site cannot be built.
      await buildSite(page);
      await expect(page.getByText("請先幫影片貼上 YouTube 或 Vimeo 網址")).toBeVisible();
      const link = page.getByLabel("影片網址");
      await link.fill("https://evil.example/video");
      await link.press("Enter");
      await expect(page.getByRole("alert").filter({ hasText: "只能貼 YouTube 或 Vimeo 的影片網址" })).toBeVisible();
      await link.fill("https://youtu.be/dQw4w9WgXcQ");
      await link.press("Enter");
      await expect(page.getByText("已設定 YouTube 影片，網站上按播放才會載入")).toBeVisible();
    }
  }
  expect(players).toEqual([]);
  await buildSite(page);
  await page.getByRole("button", { name: "使用此版本", exact: true }).click();
  const site = page.getByTestId("preview-frame");
  // Video: nothing loads until play is pressed, then only the no-cookie player.
  await expect(site.locator(".media-video iframe")).toHaveCount(0);
  expect(players).toEqual([]);
  await site.getByRole("button", { name: /播放影片/ }).click();
  await expect(site.locator(".media-video iframe")).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  // Carousel: next arrow and dots.
  const carousel = site.getByRole("region", { name: "輪播圖片" });
  await carousel.getByRole("button", { name: "第 1 張" }).click();
  await carousel.getByRole("button", { name: "下一張" }).click();
  await expect(carousel.getByRole("button", { name: "第 2 張" })).toHaveAttribute("aria-current", "true");
  // Flipbook: turn a page.
  const book = site.getByRole("group", { name: "翻頁書" });
  await expect(book.getByText("1 / 3")).toBeVisible();
  await book.getByRole("button", { name: "下一頁" }).click();
  await expect(book.getByText("2 / 3")).toBeVisible();
  await expect(book.getByRole("button", { name: "上一頁" })).toBeEnabled();
});

test("看手機版 opens the preview at phone width, and the 桌面／手機 switch stays on the toolbar", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  await page.getByRole("button", { name: "看手機版" }).click();
  const toggle = page.getByRole("group", { name: "預覽寬度" });
  await expect(toggle.getByRole("button", { name: "手機" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "使用此版本", exact: true }).click();
  await expect(page.getByRole("group", { name: "預覽寬度" }).getByRole("button", { name: "手機" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("preview-frame")).toHaveClass(/mobile/);
  await page.getByRole("group", { name: "預覽寬度" }).getByRole("button", { name: "桌面" }).click();
  await expect(page.getByTestId("preview-frame")).toHaveClass(/desktop/);
});
