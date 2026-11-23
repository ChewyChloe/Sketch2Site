import { test, expect } from "@playwright/test";
// Double-click a canvas element to type directly into it.
test("double-click edits text in place; Enter / Ctrl+Enter save, Escape cancels, undo restores", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const heading = page.locator('[data-testid="canvas-node"].heading');
  await heading.dblclick();
  const editor = page.getByLabel("編輯標題文字");
  await expect(editor).toBeFocused();
  await page.keyboard.type("一起開始吧");
  await page.keyboard.press("Enter");
  await expect(editor).toHaveCount(0);
  await expect(heading).toContainText("一起開始吧");
  // Multi-line text: Enter adds a line, Ctrl+Enter saves.
  const text = page.locator('[data-testid="canvas-node"].text');
  await text.dblclick();
  await page.keyboard.type("第一行");
  await page.keyboard.press("Enter");
  await page.keyboard.type("第二行");
  await page.keyboard.press("Control+Enter");
  await expect(text).toContainText("第一行");
  await expect(text).toContainText("第二行");
  // Escape discards; Delete while typing does not remove the element.
  await heading.dblclick();
  await page.keyboard.press("Delete");
  await page.keyboard.type("不要保存");
  await page.keyboard.press("Escape");
  await expect(heading).toContainText("一起開始吧");
  await expect(page.getByTestId("canvas-node")).toHaveCount(3);
  // Empty heading is refused and the original text kept.
  await heading.dblclick();
  await page.keyboard.press("Delete");
  await page.keyboard.press("Enter");
  await expect(heading).toContainText("一起開始吧");
  // Undo returns to the template text.
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await expect(heading).toContainText("準備好開始了嗎？");
});
