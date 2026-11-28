import { expect, test, type Page } from "@playwright/test";
import { referenceMotionIds } from "../src/motionCatalog";
import { referenceFixture, uid } from "./fixtures/referenceMotions";
import { openWebsiteWorkspace } from "./helpers/workbench";

const ids = referenceMotionIds.slice(-10);
const target = (page: Page, id: typeof ids[number]) =>
  page.locator(`.preview-frame [data-page-id="${uid(100 + referenceMotionIds.indexOf(id))}"]`);

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?draft");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "hundred.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(referenceFixture(true))),
  });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
}
test("the ten new presets render visible, actionable mechanisms and reduced-motion fallbacks", async ({ page }) => {
  await open(page);
  for (const [id, selector, count] of [
    ["aurora-pools", "> span", 3], ["petal-eddies", "> span", 12],
    ["relay-connections", "path", 3], ["grain-tide", "> span", 2], ["lantern-rise", "> span", 9],
  ] as const) {
    const scene = target(page, id).locator(".hundred-layer");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator(selector)).toHaveCount(count);
    await expect.poll(() => scene.evaluate(el => el.getAnimations({ subtree: true }).some(a => a.playState === "running"))).toBe(true);
  }
  const toolbar = target(page, "corner-reprint");
  await toolbar.getByRole("button", { name: "掀開再貼" }).click();
  await expect.poll(() => toolbar.evaluate(el => el.getAnimations().some(a => a.playState === "running"))).toBe(true);
  const dust = target(page, "glyph-embers").locator("canvas");
  await dust.scrollIntoViewIfNeeded();
  const before = await dust.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const bounds = (await dust.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect.poll(() => dust.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);

  for (const id of ["feature-deck", "orbit-exhibit"] as const) {
    const deck = target(page, id).locator(".media-carousel");
    const arrow = deck.getByRole("button", { name: "下一張" });
    await deck.scrollIntoViewIfNeeded();
    await arrow.focus();
    const original = await deck.getByRole("img").getAttribute("alt");
    await arrow.press("ArrowRight");
    await expect(deck.getByRole("img")).not.toHaveAttribute("alt", original!);
    await expect(deck).toHaveAttribute("data-carousel-effect", id);
  }
  const nav = page.locator(".preview-frame .page-nav");
  await nav.scrollIntoViewIfNeeded();
  const pill = nav.locator(".hundred-nav-pill");
  await expect(pill).toHaveCSS("opacity", "1");
  const position = await pill.evaluate(el => getComputedStyle(el).translate);
  await nav.locator("nav").getByRole("link").nth(1).focus();
  await expect.poll(() => pill.evaluate(el => getComputedStyle(el).translate)).not.toBe(position);

  await page.setViewportSize({ width: 375, height: 850 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dust).toHaveCount(0);
  await expect(target(page, "orbit-exhibit").locator(".hundred-carousel")).toHaveCount(0);
  for (const id of ids) await expect(target(page, id)).toHaveAttribute("data-effects", id);
});

test("the library hosts the full runtime for each new preset and replays the feature deck", async ({ page }) => {
  await page.goto("/?draft");
  await page.getByRole("button", { name: "動畫素材庫", exact: true }).click();
  for (const id of ids) {
    const card = page.locator(`.sidebar [data-effect-id="${id}"]`);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator(".asset-preview [data-effects~='" + id + "']").first()).toBeAttached();
    const selector = id === "waypoint-pill" ? ".hundred-nav-pill" :
      id === "feature-deck" || id === "orbit-exhibit" ? ".hundred-carousel" : ".hundred-layer";
    await expect(card.locator(selector)).toBeAttached();
  }
  const deck = page.locator('.sidebar [data-effect-id="feature-deck"]');
  await deck.getByRole("button", { name: "重播聚焦展列示意" }).click();
  await expect(deck.getByRole("img", { name: /2 \/ 3/ })).toHaveCount(1);
});
