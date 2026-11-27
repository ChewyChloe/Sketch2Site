import { test, expect } from "@playwright/test";
// Slide-editor layout tools: smart guides, layers, align, lock and Alt-drag copy.
test("smart guides, layer order, align, lock and Alt-drag duplicate", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const nodes = page.getByTestId("canvas-node");
  await expect(nodes).toHaveCount(3);
  const heading = nodes.filter({ hasText: "最後，請訪客做一件事" });
  const text = page.locator('[data-testid="canvas-node"].text');
  // Ungroup so pieces move on their own.
  await heading.click();
  await page.keyboard.press("Control+Shift+G");
  await page.keyboard.press("Escape");
  // Drag the text near the heading's left edge: a guide appears and it snaps.
  const h = (await heading.boundingBox())!, t = (await text.boundingBox())!;
  await page.mouse.move(t.x + 20, t.y + 10);
  await page.mouse.down();
  await page.mouse.move(t.x + 60, t.y + 40, { steps: 4 });
  await page.mouse.move(h.x + 20 + 3, t.y + 80, { steps: 6 });
  await expect(page.locator(".smart-guide.v").first()).toBeVisible();
  await page.screenshot({ path: "test-results/layout-guides.png" });
  await page.mouse.up();
  await expect(page.locator(".smart-guide")).toHaveCount(0);
  expect(Math.round((await text.boundingBox())!.x)).toBe(Math.round(h.x));
  // Layer order: the heading comes to the front (last in drawing order).
  await heading.click();
  await page.keyboard.press("Control+Alt+BracketRight");
  await expect(nodes.last()).toContainText("最後，請訪客做一件事");
  // 排列與對齊 starts collapsed in the inspector; open it once (it stays open).
  await page.getByRole("button", { name: "排列與對齊" }).click();
  await page.getByRole("button", { name: "移到最下層" }).click();
  await expect(nodes.first()).toContainText("最後，請訪客做一件事");
  // Align a single element to the canvas centre.
  await page.getByRole("button", { name: "水平置中" }).click();
  const centred = (await heading.boundingBox())!, board = (await page.getByTestId("canvas").boundingBox())!;
  expect(Math.abs(centred.x + centred.width / 2 - (board.x + board.width / 2))).toBeLessThan(3);
  // Lock: no drag, no delete, no inline edit; then unlock.
  await page.getByRole("button", { name: "鎖定", exact: true }).click();
  await expect(heading.getByLabel("已鎖定")).toBeVisible();
  const before = (await heading.boundingBox())!;
  await page.mouse.move(before.x + 10, before.y + 10);
  await page.mouse.down();
  await page.mouse.move(before.x + 200, before.y + 100, { steps: 5 });
  await page.mouse.up();
  expect((await heading.boundingBox())!.x).toBeCloseTo(before.x, 0);
  await page.keyboard.press("Delete");
  await expect(nodes).toHaveCount(3);
  await heading.dblclick();
  await expect(page.getByLabel("編輯標題文字")).toHaveCount(0);
  await page.keyboard.press("Alt+Shift+KeyL");
  await expect(heading.getByLabel("已鎖定")).toHaveCount(0);
  // Alt + drag leaves the original in place and drags a copy.
  const b = (await heading.boundingBox())!;
  await page.keyboard.down("Alt");
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 10, b.y + 160, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect(nodes.filter({ hasText: "最後，請訪客做一件事" })).toHaveCount(2);
  // Everything is one undo step each.
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await expect(nodes.filter({ hasText: "最後，請訪客做一件事" })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("holding Alt shows distances from the selection to its neighbours", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：社團招生頁" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: /^按鈕：立即報名/ }).click();
  await page.keyboard.down("Alt");
  await expect(page.locator(".spacing-line")).toHaveCount(4);
  await page.keyboard.up("Alt");
  await expect(page.locator(".spacing-line")).toHaveCount(0);
});
