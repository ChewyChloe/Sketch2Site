import { test, expect } from "@playwright/test";
// Drag a box on the empty canvas to select, Ctrl+G to group, click any member to select the group.
test("box select, Ctrl+G group, group click and plain click narrowing", async ({ page }) => {
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  for (const name of ["新增文字", "新增按鈕", "新增卡片"]) await page.getByRole("button", { name, exact: true }).click();
  const nodes = page.getByTestId("canvas-node");
  const tops = await nodes.evaluateAll((n) => n.map((x) => parseFloat((x as HTMLElement).style.top)));
  expect(new Set(tops).size).toBe(3); // clicked elements no longer pile up
  const c = (await page.getByTestId("canvas").boundingBox())!;
  await page.mouse.move(c.x + c.width * 0.9, c.y + c.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(c.x + 3, c.y + 3, { steps: 6 });
  await page.mouse.up();
  const selected = page.locator('[data-testid="canvas-node"][aria-pressed="true"]');
  await expect(selected).toHaveCount(3);
  await page.keyboard.press("Control+g");
  expect(await nodes.evaluateAll((n) => new Set(n.map((x) => (x as HTMLElement).dataset.groupId)).size)).toBe(1);
  await page.mouse.click(c.x + c.width * 0.9, c.y + c.height * 0.9);
  await expect(selected).toHaveCount(0);
  await nodes.nth(1).click();
  await expect(selected).toHaveCount(3);
  await page.keyboard.press("Control+Shift+g");
  // Selection still holds all three; a plain click narrows it to one element.
  await nodes.nth(2).click();
  await expect(selected).toHaveCount(1);
});
