import { expect, test } from "@playwright/test";
import { demoPage } from "../src/pageFixtures";
import { createMotion } from "../src/motion";
import { PageNodeSchema } from "../src/pageSpec";
import { openWebsiteWorkspace } from "./helpers/workbench";

for (const navStyle of ["top-compact", "top-autohide"] as const) {
  test(`navigation ${navStyle} responds to scroll direction and reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?draft");
    await openWebsiteWorkspace(page);
    const input = { ...demoPage, chrome: { nav: true, footer: false, navStyle } };
    await page.getByLabel("載入頁面檔案").setInputFiles({ name: "navigation.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(input)) });
    const nav = page.locator(".preview-frame .page-nav");
    await expect(nav).toHaveAttribute("data-nav-style", navStyle);
    const height = (await nav.boundingBox())!.height;
    async function scroll(y: number) {
      await nav.evaluate((element, top) => {
        let root = element.parentElement;
        while (root && (!/auto|scroll/.test(getComputedStyle(root).overflowY) || root.scrollHeight <= root.clientHeight))
          root = root.parentElement;
        if (root) root.scrollTop = top;
        else window.scrollTo(0, top);
      }, y);
    }
    await scroll(180);
    if (navStyle === "top-compact") {
      await expect(nav).toHaveClass(/is-compact/);
      await expect(nav).toHaveCSS("backdrop-filter", "blur(12px)");
      await expect(nav.locator(".page-brand")).toHaveCSS("scale", "0.86");
      expect((await nav.boundingBox())!.height).toBeLessThan(height);
      await scroll(20);
      await expect(nav).not.toHaveClass(/is-compact/);
    } else {
      await expect(nav).toHaveClass(/is-hidden/);
      await scroll(178);
      await expect(nav).not.toHaveClass(/is-hidden/);
    }
  });
}

const ids = (n: number) => `64000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const checks = [
  { id: "image-reveal", controls: { edge: "soft" }, node: { type: "image", src: "/assets/samples/cafe.jpg", alt: "柔邊實拍" }, key: "maskImage", value: "linear-gradient" },
  { id: "split-line-assembly", controls: { flow: "clarify" }, node: { type: "paragraph", content: "城市的聲音像一封寄給街道的信，文字保持原本的閱讀順序。" }, key: "filter", value: "blur(5px)" },
  { id: "grid-diagonal-turn", controls: { motion: "radial" }, node: { type: "grid", columns: 3, children: [3, 4, 5].map(n => ({ id: ids(n), type: "paragraph", content: "作品 " + n })) }, key: "scale", value: "1.065" },
] as const;

for (const mode of checks) {
  test(`site motion mode ${mode.id} runs authored keyframes and reduces to original`, async ({ page }) => {
    const section = PageNodeSchema.parse({
      id: ids(1), type: "section",
      children: [{ id: ids(2), ...mode.node, effects: [createMotion(mode.id, ids(2), mode.controls)] }],
    });
    const input = { ...demoPage, sections: [...demoPage.sections, section] };
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/?draft");
    await openWebsiteWorkspace(page);
    await page.getByLabel("載入頁面檔案").setInputFiles({ name: "motion.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(input)) });
    const target = page.locator(`.preview-frame [data-page-id="${ids(2)}"]`);
    await target.scrollIntoViewIfNeeded();
    await expect.poll(() => target.evaluate((node, property) => node.getAnimations({ subtree: true })
      .flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes().map(frame => String(frame[property]))).join(" "), mode.key)).toContain(mode.value);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 880 });
    await expect.poll(() => target.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(target).toBeVisible();
  });
}
