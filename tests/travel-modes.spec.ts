import { expect, test, type Page } from "@playwright/test";
import { createMotion, type MotionId } from "../src/motion";
import { PageNodeSchema } from "../src/pageSpec";
import { demoPage } from "../src/pageFixtures";
import { openWebsiteWorkspace } from "./helpers/workbench";

const id = (suffix: number) => `49000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const words = "城市小路 連著春日";
async function load(page: Page, preset: MotionId, controls: Record<string, string | number>, kind: "text" | "grid" | "card" = "text") {
  const authored = kind === "text" ? { type: "heading", level: 2, content: words } :
    { type: kind, ...(kind === "grid" ? { columns: 2 } : {}), children: [0, 1, 2, 3].map((n) => ({ id: id(5 + n), type: "paragraph", content: "現有文字 " + n })) };
  const section = PageNodeSchema.parse({
    id: id(1), type: "section", children: [{ id: id(2), ...authored, effects: [createMotion(preset, id(2), controls)] }],
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?draft");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "travel.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...demoPage, sections: [...demoPage.sections, section] })) });
  const node = page.locator(`.preview-frame [data-page-id="${id(2)}"]`);
  await node.scrollIntoViewIfNeeded();
  return node;
}

for (const pathMode of ["circle", "flow"] as const) {
  test(`traveling curve ${pathMode} changes its actual SVG geometry and keeps text readable`, async ({ page }) => {
    const target = await load(page, "curved-path-text", { pathMode, cycleSeconds: 6 });
    const moving = target.locator(pathMode === "circle" ? "svg text" : "textPath");
    const attr = pathMode === "circle" ? "transform" : "startOffset";
    const baseline = await moving.getAttribute(attr);
    await expect.poll(() => moving.getAttribute(attr)).not.toBe(baseline);
    await expect(target).toHaveAccessibleName(words);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 850 });
    await expect(moving).toHaveCount(0);
    await expect(target).toHaveAccessibleName(words);
  });
}

for (const [preset, controls, kind, selector, property, token] of [
  ["elastic-word-bounce", { style: "impact", durationMs: 1250 }, "text", ".cin-glyph", "transform", "0.72"],
  ["blur-in", { entry: "depth-trail", durationMs: 1200 }, "text", "", "transform", "-180px"],
  ["stagger-reveal", { sequence: "reading-z", childDurationMs: 900 }, "grid", ".page-paragraph", "translate", "-18px 12px"],
  ["stagger-reveal", { sequence: "alternate", childDurationMs: 900 }, "grid", ".page-paragraph", "translate", "22px 3px"],
  ["svg-path-drawing", { shape: "signature", durationMs: 1600 }, "card", ".advanced-signature-point", "translate", "px"],
] as const) {
  test(`travel mode ${preset} ${JSON.stringify(controls)} has geometry and static fallback`, async ({ page }) => {
    const target = await load(page, preset, controls, kind);
    const animated = selector ? target.locator(selector) : target;
    await expect.poll(() => animated.evaluateAll((elements, key) => elements.flatMap(el => el.getAnimations()
      .flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes().map(frame => String(frame[key])))).join(" "), property)).toContain(token);
    if (preset === "svg-path-drawing") await expect(target.locator(".advanced-path path")).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 850 });
    await expect.poll(() => target.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(target).toContainText(kind === "text" ? words : "現有文字");
    expect(await page.locator(".preview-frame").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
}
