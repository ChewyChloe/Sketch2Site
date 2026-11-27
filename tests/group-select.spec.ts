import { test, expect } from "@playwright/test";
// Blocks are grouped: the first press picks (and drags) the whole block; pressing a picked
// block again picks just that element, and dragging it then moves only that element.
test("grouped blocks: first press moves the group, a second press moves one element", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const heading = page.locator('[data-testid="canvas-node"].heading');
  const text = page.locator('[data-testid="canvas-node"].text').first();
  const selected = page.locator('[data-testid="canvas-node"].selected');
  const drag = async (dy: number) => {
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 10 + dy, { steps: 6 });
    await page.mouse.up();
  };
  // Nothing selected: the first press + drag moves the whole block together.
  await page.getByTestId("canvas").click({ position: { x: 5, y: 5 } });
  const t0 = (await text.boundingBox())!.y, h0 = (await heading.boundingBox())!.y;
  await drag(80);
  expect(await selected.count()).toBeGreaterThan(1);
  const t1 = (await text.boundingBox())!.y, h1 = (await heading.boundingBox())!.y;
  expect(t1).toBeGreaterThan(t0 + 20);
  expect(h1).toBeGreaterThan(h0 + 20);
  // Second press on the picked block: only the heading is picked, and only it moves.
  await drag(60);
  await expect(selected).toHaveCount(1);
  await expect(heading).toHaveClass(/selected/);
  await expect(page.getByRole("status")).toContainText("只選了這一個");
  const t2 = (await text.boundingBox())!.y, h2 = (await heading.boundingBox())!.y;
  expect(h2).toBeGreaterThan(h1 + 20);
  expect(Math.abs(t2 - t1)).toBeLessThan(2);
  // It stays a single pick: dragging again still moves only the heading.
  await drag(40);
  await expect(selected).toHaveCount(1);
  expect(Math.abs((await text.boundingBox())!.y - t2)).toBeLessThan(2);
});
