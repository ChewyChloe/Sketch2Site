import { expect, test } from "@playwright/test";
import { demoPage } from "../src/pageFixtures";
import { textModeId, textModes, textModesSection } from "./fixtures/textModes";
import { openWebsiteWorkspace } from "./helpers/workbench";

for (const [index, mode] of textModes.entries()) {
  test(`text mode ${mode.title}: live keyframes, responsive reading and Reduced Motion`, async ({ page }) => {
    const input = { ...demoPage, sections: [...demoPage.sections, textModesSection(index)] };
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/?draft");
    await openWebsiteWorkspace(page);
    await page.getByLabel("載入頁面檔案").setInputFiles({ name: "mode.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(input)) });
    const target = page.locator(`.preview-frame [data-page-id="${textModeId(index)}"]`);
    await target.scrollIntoViewIfNeeded();
    await expect.poll(() => target.evaluate((element, property) => element.getAnimations({ subtree: true })
      .flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes().map(frame => String(frame[property]))).join(" "), mode.key)).toContain(mode.value);
    await expect(target.getByRole("heading", { name: mode.title + "文字", includeHidden: false }).or(target.filter({ hasText: mode.title })).first()).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 880 });
    await expect.poll(() => target.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(target).toHaveAccessibleName(mode.title + "文字");
    expect(await page.locator(".preview-frame").evaluate(frame => frame.scrollWidth <= frame.clientWidth)).toBe(true);
  });
}
