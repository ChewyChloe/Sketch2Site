import { test, expect, devices } from "@playwright/test";
// Phones: pinch with two fingers to zoom the draft canvas; double-tap empty canvas to toggle.
test.use({ ...devices["Pixel 7"] });
test("pinch and double-tap zoom the draft canvas on phones", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  const zoom = page.getByLabel("畫布縮放");
  await expect(zoom).toHaveAttribute("data-value", "fit");
  const width = async () => (await page.getByTestId("canvas").boundingBox())!.width;
  const fitWidth = await width();
  // Two fingers moving apart.
  await page.locator(".canvas-scroll").evaluate((el) => {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + 200;
    const touches = (gap: number) => [0, 1].map((i) => new Touch({ identifier: i, target: el, clientX: cx + (i ? gap : -gap), clientY: cy }));
    const fire = (type: string, list: Touch[]) => el.dispatchEvent(new TouchEvent(type, { touches: list, targetTouches: list, changedTouches: list, bubbles: true, cancelable: true }));
    fire("touchstart", touches(40));
    for (let g = 50; g <= 120; g += 10) fire("touchmove", touches(g));
    fire("touchend", []);
  });
  await expect.poll(width).toBeGreaterThan(fitWidth * 2);
  await expect(zoom).not.toHaveAttribute("data-value", "fit");
  // Double tap on empty canvas goes back to fit.
  await page.locator(".canvas-scroll").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const tap = () => { const t = [new Touch({ identifier: 0, target: el, clientX: r.left + 10, clientY: r.top + 10 })]; el.dispatchEvent(new TouchEvent("touchstart", { touches: t, targetTouches: t, changedTouches: t, bubbles: true, cancelable: true })); el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: t, bubbles: true })); };
    tap(); tap();
  });
  await expect(zoom).toHaveAttribute("data-value", "fit");
  // And once more to zoom in to a readable size.
  await page.locator(".canvas-scroll").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const tap = () => { const t = [new Touch({ identifier: 0, target: el, clientX: r.left + 10, clientY: r.top + 10 })]; el.dispatchEvent(new TouchEvent("touchstart", { touches: t, targetTouches: t, changedTouches: t, bubbles: true, cancelable: true })); el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: t, bubbles: true })); };
    tap(); tap();
  });
  await expect(zoom).toHaveAttribute("data-value", "0.6");
});
