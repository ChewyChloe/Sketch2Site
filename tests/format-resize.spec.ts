import { choose } from "./helpers/select";
import { test, expect } from "@playwright/test";
// Slide-editor style editing: resize handles, Ctrl/Cmd+Shift+C/V format copy, format brush.
test("resize handles, format copy/paste and format brush", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await choose(page.getByLabel("畫布縮放"), "1");
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "新增卡片", exact: true }).click();
  const nodes = page.getByTestId("canvas-node");
  const box = (i: number) => nodes.nth(i).evaluate((e) => [parseFloat((e as HTMLElement).style.left), parseFloat((e as HTMLElement).style.top), parseFloat((e as HTMLElement).style.width), parseFloat((e as HTMLElement).style.height)]);
  await nodes.nth(0).click({ position: { x: 20, y: 20 } });
  const se = (await page.locator(".resize-handle.h-se").boundingBox())!;
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await page.mouse.down();
  await page.mouse.move(se.x + 100, se.y + 50, { steps: 5 });
  await page.mouse.up();
  const [x0, y0, w0, h0] = await box(0);
  expect([x0, y0]).toEqual([80, 80]); // top-left stays put
  expect(Math.abs(w0 - 380)).toBeLessThanOrEqual(8);
  expect(Math.abs(h0 - 230)).toBeLessThanOrEqual(8);
  const w = (await page.locator(".resize-handle.h-w").boundingBox())!;
  await page.mouse.move(w.x + w.width / 2, w.y + w.height / 2);
  await page.mouse.down();
  await page.mouse.move(w.x + w.width / 2 + 40, w.y + w.height / 2, { steps: 4 });
  await page.mouse.up();
  const [x1, , w1] = await box(0);
  expect(Math.abs(x1 - 120)).toBeLessThanOrEqual(8); // left edge moved
  expect(x1 + w1).toBe(x0 + w0); // right edge fixed
  await page.keyboard.press("Control+Shift+c");
  await expect(page.getByRole("status")).toContainText("已複製格式");
  await nodes.nth(1).click({ position: { x: 20, y: 20 } });
  await page.keyboard.press("Control+Shift+v");
  const copied = (await box(0)).slice(2);
  expect((await box(1)).slice(2)).toEqual(copied);
  await page.keyboard.press("Control+z");
  expect((await box(1)).slice(2)).toEqual([280, 180]);
  // Brush applies once, then turns off.
  await nodes.nth(0).click({ position: { x: 20, y: 20 } });
  const brush = page.getByRole("button", { name: "格式刷" });
  await brush.click();
  await expect(brush).toHaveAttribute("aria-pressed", "true");
  await nodes.nth(1).click({ position: { x: 20, y: 20 } });
  await expect(brush).toHaveAttribute("aria-pressed", "false");
  expect((await box(1)).slice(2)).toEqual(copied);
});
