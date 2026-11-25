import { test, expect } from "@playwright/test";
// Blocks are grouped: the first click picks the whole block, a second click picks one element.
test("second click on a selected group selects just that element", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const heading = page.locator('[data-testid="canvas-node"].heading');
  const selected = page.locator('[data-testid="canvas-node"].selected');
  await heading.click();
  expect(await selected.count()).toBeGreaterThan(1);
  await heading.click();
  await expect(selected).toHaveCount(1);
  await expect(heading).toHaveClass(/selected/);
  await expect(page.getByRole("status")).toContainText("只選了這一個元件");
  // Dragging the whole group still works after selecting it once.
  await page.getByTestId("canvas").click({ position: { x: 5, y: 5 } });
  await heading.click();
  const before = await page.locator('[data-testid="canvas-node"].text').first().boundingBox();
  const box = (await heading.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 90, { steps: 6 });
  await page.mouse.up();
  const after = await page.locator('[data-testid="canvas-node"].text').first().boundingBox();
  expect(after!.y).toBeGreaterThan(before!.y + 20);
});
