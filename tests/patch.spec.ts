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
import { test, expect } from "@playwright/test";
test("依 ID 選取、套用、Diff、撤銷重做、非法修改與草稿隔離", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  const draft = page.getByTestId("canvas-node");
  const draftId = await draft.getAttribute("data-node-id"),
    draftText = await draft.textContent();
  await openWebsiteWorkspace(page);
  const heading = page.locator(".rendered-page h1");
  const id = await heading.getAttribute("data-page-id"),
    original = await heading.textContent();
  const other = page.locator(".rendered-page .page-paragraph").first(),
    otherText = await other.textContent();
  await heading.click();
  await openPanel(page, "元件");
  await expect(page.locator(`[data-component-id="${id}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(heading).toHaveAttribute("data-page-selected", "true");
  await editSelection(page);
  await page.getByLabel("標題文字").fill("我的作品集");
  await addFade(page);
  await setFadeDuration(page, "700");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(heading).toHaveText("我的作品集");
  await expect(heading).toHaveAttribute("data-page-id", id!);
  await expect(heading).toHaveAttribute("data-effects", /fade-in/);
  await expect(other).toHaveText(otherText!);
  await page.locator(".patch-diff summary").click();
  await expect(page.getByText("最近修改", { exact: true })).toBeVisible();
  await expect(page.locator(".patch-diff")).toContainText(original!);
  await expect(page.locator(".patch-diff")).toContainText("我的作品集");
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(heading).toHaveText(original!);
  await expect(heading).toHaveAttribute("data-effects", /fade-in/);
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(heading).not.toHaveAttribute("data-effects", /fade-in/);
  await page.getByRole("button", { name: "重做修改" }).click();
  await page.getByRole("button", { name: "重做修改" }).click();
  await expect(heading).toHaveText("我的作品集");
  await expect(page.getByLabel("動畫時長（毫秒）")).toHaveValue("700");
  await setFadeDuration(page, "99999");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("修改格式或數值無效");
  await expect(heading).toHaveText("我的作品集");
  await expect(page.getByRole("button", { name: "撤銷修改" })).toBeEnabled();
  await setFadeDuration(page, "700");
  await editSelection(page);
  await page
    .getByLabel("標題文字")
    .fill('<img src=x onerror="window.pwned=true">');
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("img[src=x]")).toHaveCount(0);
  await expect(heading).toHaveText("我的作品集");
  await editSelection(page);
  await page.getByLabel("標題文字").fill("我的作品集");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByText("沒有需要套用的變更。")).toBeVisible();
  await page.screenshot({
    path: "test-results/patch-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await editSelection(page);
  await page.getByLabel("標題文字").fill("另一個方向");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByRole("button", { name: "重做修改" })).toBeDisabled();
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await expect(draft).toHaveAttribute("data-node-id", draftId!);
  await expect(draft).toHaveText(draftText!);
  await page.keyboard.press("Control+z");
  await expect(draft).toHaveCount(0);
  expect(errors).toEqual([]);
});
for (const width of [768, 375]) {
  test("標題編輯在 " + width + "px 可操作", async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await openWebsiteWorkspace(page);
    await page.locator(".rendered-page h1").click();
    await editSelection(page);
    await page.getByLabel("標題文字").fill("測試局部修改");
    await page.getByRole("button", { name: "套用", exact: true }).click();
    await expect(page.locator(".rendered-page h1")).toHaveText("測試局部修改");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/patch-" + width + ".png",
      fullPage: true,
    });
  });
}
