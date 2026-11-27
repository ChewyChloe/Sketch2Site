import { expect, test, type Page } from "@playwright/test";
import { demoPage } from "../src/pageFixtures";
import { createMotion, type MotionId } from "../src/motion";
import { PageNodeSchema } from "../src/pageSpec";
import { openWebsiteWorkspace } from "./helpers/workbench";

const id = "67000000-0000-4000-8000-000000000002";
async function load(page: Page, preset: MotionId, controls: Record<string, string | number>, card = false) {
  const content = { type: "heading", level: 2, content: "城市春日設計展" };
  const section = PageNodeSchema.parse({
    id: "67000000-0000-4000-8000-000000000001", type: "section", children: [{
      id, ...(card ? { type: "card", children: [{ id: "67000000-0000-4000-8000-000000000003", ...content }] } : content),
      effects: [createMotion(preset, id, controls)],
    }],
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?draft");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "graphic.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...demoPage, sections: [...demoPage.sections, section] })) });
  const node = page.locator(`.preview-frame [data-page-id="${id}"]`);
  await node.scrollIntoViewIfNeeded();
  return node;
}
for (const [preset, controls, selector, property, value] of [
  ["glitch-slice-reveal", { durationMs: 800 }, ".cin-text-cuts > span", "translate", "8px"],
  ["hand-drawn-highlight", { stroke: "circle-line", durationMs: 1200 }, ".advanced-circle-line path", "strokeDashoffset", "100"],
  ["svg-path-drawing", { trigger: "redraw", durationMs: 1000 }, ".advanced-path", "translate", "-4px"],
] as const) {
  test(`graphic mode ${preset} plays its own keyframes and retains content`, async ({ page }) => {
    const target = await load(page, preset, controls, preset === "svg-path-drawing");
    if (preset === "svg-path-drawing") await target.focus();
    await expect.poll(() => target.locator(selector).evaluateAll((nodes, key) => nodes.flatMap(node =>
      node.getAnimations().flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes().map(frame => String(frame[key])))
    ).join(" "), property)).toContain(value);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 900 });
    await expect.poll(() => target.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(target).toHaveText("城市春日設計展");
  });
}

test("graphic mode striped letter windows uses flowing theme stripes without replacing the text", async ({ page }) => {
  const target = await load(page, "letter-windows", { fill: "stripes" });
  await expect(target).toHaveCSS("background-image", /repeating-linear-gradient/);
  await expect.poll(() => target.evaluate(element => element.getAnimations()[0]?.playState)).toBe("running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => target.evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(target).toHaveAccessibleName("城市春日設計展");
});

test("graphic mode scroll-counter controls three opposing lanes with the middle outline", async ({ page }) => {
  const target = await load(page, "marquee-text", { layout: "scroll-counter" });
  const lanes = target.locator(".sig-band-runway");
  await expect(lanes).toHaveCount(3);
  const first = lanes.nth(0), middle = lanes.nth(1), last = lanes.nth(2);
  await expect(first).not.toHaveCSS("translate", "none");
  await expect(middle.locator("span").first()).toHaveCSS("-webkit-text-stroke-width", "1px");
  const before = await first.evaluate(node => getComputedStyle(node).translate);
  await target.evaluate(element => {
    let root = element.parentElement;
    while (root && (!/auto|scroll/.test(getComputedStyle(root).overflowY) || root.scrollHeight <= root.clientHeight))
      root = root.parentElement;
    if (root) root.scrollTop -= 60;
    else window.scrollBy(0, -60);
  });
  await expect(first).not.toHaveCSS("translate", before);
  const movement = await lanes.evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).translate)));
  expect(movement[0]).toBeCloseTo(movement[2], 0);
  expect(movement[0]).not.toBeCloseTo(movement[1], 0);
  await expect(last).not.toHaveCSS("translate", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lanes).toHaveCount(0);
  await expect(target).toHaveAccessibleName("城市春日設計展");
});
