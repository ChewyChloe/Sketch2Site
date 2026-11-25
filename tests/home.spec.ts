import { test, expect } from "@playwright/test";
// The top-left brand opens the home page with the real workspace, examples and product overview.
for (const width of [1440, 375])
  test(`brand opens home with workspace, examples and steps ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
    const home = page.getByRole("main", { name: "Sketch2Site 首頁" });
    await expect(home.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(home.getByRole("heading", { name: "我的工作區" })).toBeVisible();
    await expect(home.locator(".showcase-card")).toHaveCount(5);
    await expect(home.locator(".showcase-card .rendered-page")).toHaveCount(5);
    await expect(home.locator(".why-card")).toHaveCount(3);
    await expect(home.locator(".steps-track li")).toHaveCount(4);
    await home.getByText("我的資料存在哪裡？").click();
    await expect(home.getByText("不會上傳")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // An example becomes a new project and opens on the canvas.
    await home.getByRole("article", { name: "範本：個人作品集" }).getByRole("button", { name: /用這個範本開始/ }).click();
    await expect(page.getByTestId("canvas-node")).toHaveCount(6);
    await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
    await expect(home.locator(".home-project")).toHaveCount(2);
    await expect(home.locator(".home-project.is-active h3")).toHaveText("個人作品集");
    await home.getByRole("button", { name: "開啟網站工作區" }).click();
    await expect(page.locator(".preview-frame .rendered-page")).toBeVisible();
    await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
    await home.getByRole("button", { name: "動畫素材庫（68）" }).click();
    await expect(page.locator(".sidebar [data-effect-id]")).toHaveCount(68);
    expect(errors).toEqual([]);
  });
