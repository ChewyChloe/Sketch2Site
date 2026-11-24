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
    await expect(home.getByText("尚未開始")).toBeVisible();
    await expect(home.locator(".home-demo")).toHaveCount(4);
    await expect(home.locator(".home-steps li")).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Loading an example from home opens it on the canvas.
    await home.locator(".home-demo").first().click();
    await expect(page.getByTestId("canvas-node")).toHaveCount(6);
    // Back home: the workspace card reflects the real draft.
    await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
    await expect(home.getByText("6 個元件", { exact: false }).first()).toBeVisible();
    await expect(home.getByText("有尚未儲存的修改")).toBeVisible();
    await home.getByRole("button", { name: "開啟網站工作區" }).click();
    await expect(page.locator(".preview-frame .rendered-page")).toBeVisible();
    await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
    await home.getByRole("button", { name: "開啟素材庫" }).click();
    await expect(page.locator(".sidebar [data-effect-id]")).toHaveCount(60);
    expect(errors).toEqual([]);
  });
