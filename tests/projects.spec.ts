import { test, expect } from "@playwright/test";
// Several projects in one browser: create, switch (auto-saving the open draft), rename, duplicate, delete.
test("project workspace keeps drafts separate and survives reloads", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：首屏介紹" }).click(); // unsaved on purpose
  const homeLink = page.getByRole("button", { name: "Sketch2Site 首頁" });
  const home = page.getByRole("main", { name: "Sketch2Site 首頁" });
  await homeLink.click();
  await home.getByRole("button", { name: "新增專案" }).click();
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await expect(page.getByTestId("canvas-node")).toHaveCount(0);
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  await page.getByRole("button", { name: "儲存草稿" }).click();
  await homeLink.click();
  const cards = home.locator(".home-project");
  await expect(cards).toHaveCount(2);
  // Rename the parked project, then open it: its unsaved hero block was kept.
  const parked = home.locator(".home-project:not(.is-active)");
  await parked.getByRole("button", { name: "改名" }).click();
  await parked.getByLabel("專案名稱").fill("社團活動頁");
  await parked.getByRole("button", { name: "儲存" }).click();
  await expect(home.getByRole("heading", { name: "社團活動頁" })).toBeVisible();
  await home.locator(".home-project", { hasText: "社團活動頁" }).getByRole("button", { name: "開啟", exact: true }).click();
  await expect(page.locator(".project-name")).toHaveValue("社團活動頁");
  await expect(page.getByTestId("canvas-node")).toHaveCount(4);
  // Duplicate and delete (two-step confirmation, no browser dialogs).
  await homeLink.click();
  await home.locator(".home-project.is-active").getByRole("button", { name: "複製" }).click();
  await expect(cards).toHaveCount(3);
  const copy = home.locator(".home-project", { hasText: "社團活動頁 副本" });
  await copy.getByRole("button", { name: "刪除" }).click();
  await copy.getByRole("button", { name: "刪除", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await page.reload();
  await homeLink.click();
  await expect(cards).toHaveCount(2);
  expect(dialogs).toEqual([]);
});
