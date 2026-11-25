import { test, expect } from "@playwright/test";
// The page frame's bottom edge can be dragged (or moved with arrow keys) to change the page height.
test("page height: drag the bottom edge, keyboard steps, minimum and undo", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  const handle = page.getByRole("slider", { name: "網頁高度" });
  await expect(handle).toHaveAttribute("aria-valuenow", "1200");
  await page.locator(".canvas-scroll").evaluate((e) => (e.scrollTop = e.scrollHeight));
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  // Dragging above the minimum stops at 1200.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 80, { steps: 4 });
  await expect(page.locator(".page-height-handle b")).toHaveText("高度 1200");
  await page.mouse.move(x, y + 100, { steps: 6 });
  await page.mouse.up();
  const after = Number(await handle.getAttribute("aria-valuenow"));
  expect(after).toBeGreaterThan(1200);
  expect(after % 10).toBe(0);
  await expect(page.getByTestId("canvas")).toHaveCSS("height", after + "px");
  await expect(page.getByRole("status")).toContainText("網頁高度改成 " + after);
  // Arrow keys move in steps of 100; one undo step per change.
  await handle.focus();
  await page.keyboard.press("ArrowDown");
  await expect(handle).toHaveAttribute("aria-valuenow", String(after + 100));
  await page.getByRole("button", { name: "還原", exact: true }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", String(after));
  await page.getByRole("button", { name: "還原", exact: true }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "1200");
});
