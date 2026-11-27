import { expect, test } from "@playwright/test";
import { createMotion } from "../src/motion";
import { demoPage } from "../src/pageFixtures";
import { PageNodeSchema } from "../src/pageSpec";
import { openWebsiteWorkspace } from "./helpers/workbench";

const modes = [
  { id: "portal", property: "scale", value: "2.2" },
  { id: "squash", property: "scale", value: "0.12" },
  { id: "orbit", property: "rotate", value: "24deg" },
] as const;

for (const mode of modes) {
  test(`word morph ${mode.id} moves real content and remains usable without motion`, async ({ page }) => {
    const id = "47000000-0000-4000-8000-000000000002";
    const text = PageNodeSchema.parse({ id: "47000000-0000-4000-8000-000000000001", type: "section",
      children: [{ id, type: "heading", level: 2, content: "春季展覽", effects: [
        createMotion("text-morph-transition", id, { style: mode.id, toText: "城市畫冊", durationMs: 1200 }),
      ] }],
    });
    const input = { ...demoPage, sections: [...demoPage.sections, text] };
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/?draft");
    await openWebsiteWorkspace(page);
    await page.getByLabel("載入頁面檔案").setInputFiles({ name: "morph.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(input)) });
    const element = page.locator(`.preview-frame [data-page-id="${id}"]`);
    const button = element.getByRole("button", { name: "切換文字" });
    await button.click();
    await expect(element.locator(".cin-text-source")).toHaveText("城市畫冊");
    await expect.poll(() => element.evaluate((el, property) => el.getAnimations({ subtree: true })
      .flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes().map(frame => String(frame[property]))).join(" "), mode.property)).toContain(mode.value);
    if (mode.id === "orbit") await expect(element.locator(".cin-word-ring")).toBeVisible();
    await expect(element.locator(".cin-text-overlay")).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await button.click();
    await expect(element.locator(".cin-text-source")).toHaveText("春季展覽");
    await expect(element.locator(".cin-text-overlay")).toHaveCount(0);
  });
}
