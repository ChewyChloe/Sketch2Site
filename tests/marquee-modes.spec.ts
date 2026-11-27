import { expect, test } from "@playwright/test";
import { demoPage } from "../src/pageFixtures";
import { marqueeLayouts, marqueeModesSection } from "./fixtures/marqueeModes";
import { openWebsiteWorkspace } from "./helpers/workbench";

test("distinct marquee layouts measure track speed, direction, stacking and crossings", async ({ page }) => {
  const input = { ...demoPage, sections: [...demoPage.sections, marqueeModesSection()] };
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?draft");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "marquee.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(input)) });
  for (const layout of marqueeLayouts) {
    const bands = page.locator(`.preview-frame .sig-multiband[data-layout="${layout}"]`);
    await bands.scrollIntoViewIfNeeded();
    await expect(bands).toHaveAttribute("aria-hidden", "true");
    const tracks = await bands.locator(".sig-band").evaluateAll(nodes => nodes.map(node => {
      const runway = node.querySelector(".sig-band-runway")!;
      const animation = runway.getAnimations()[0];
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      const measure = (frame: ComputedKeyframe) => String(frame.translate).split(" ").map(value => parseFloat(value));
      const from = measure(frames[0]), to = measure(frames[1]);
      const x = (to[0] ?? 0) - (from[0] ?? 0), y = (to[1] ?? 0) - (from[1] ?? 0);
      const duration = Number(animation.effect?.getComputedTiming().duration);
      return { x, y, rate: Math.hypot(x, y) / duration, font: getComputedStyle(node).fontFamily, rotate: getComputedStyle(node).rotate };
    }));
    expect(tracks.length).toBe(layout === "layered-rush" || layout === "vertical-stack" ? 3 : 2);
    if (layout === "dual-speed") expect(tracks[1].rate).toBeGreaterThan(tracks[0].rate * 2);
    if (layout === "counter-columns") expect(tracks[0].y * tracks[1].y).toBeLessThan(0);
    if (layout === "layered-rush") {
      expect(new Set(tracks.map(track => track.font)).size).toBe(3);
      expect(new Set(tracks.map(track => track.rate.toFixed(3))).size).toBe(3);
    }
    if (layout === "vertical-stack") expect(tracks.every(track => track.y < 0)).toBe(true);
    if (layout === "ribbon-cross") expect(tracks.map(track => track.rotate)).toEqual(["13deg", "-13deg"]);
  }
  await page.setViewportSize({ width: 375, height: 840 });
  expect(await page.locator(".preview-frame").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".preview-frame .sig-multiband")).toHaveCount(0);
  await expect(page.locator('.preview-frame [data-effects~="marquee-text"]').getByText("城市聲音與日常風景")).toHaveCount(5);
});
