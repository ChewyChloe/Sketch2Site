import { motionCatalog } from "../src/motionCatalog";
import { test, expect } from "@playwright/test";
import { openPanel, openWebsiteWorkspace, useTemplate } from "./helpers/workbench";
import { motionFixture } from "./fixtures/motions";
import { motionFacets } from "../src/motionFacets";
import { motionIds } from "../src/motionCatalog";

test("animation browser searches, combines facets, counts and remembers favorites and recents", async ({ page }) => {
  await page.goto("/?draft");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "page.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(motionFixture())) });
  await openPanel(page, "動畫");
  const library = page.getByRole("region", { name: "預覽動畫效果庫" });
  const cards = library.locator("[data-effect-id]");
  const search = library.getByRole("searchbox");
  const status = library.getByRole("status");
  await expect(cards).toHaveCount(motionIds.length);
  await search.fill("fade-in");
  const fade = library.locator('[data-effect-id="fade-in"]');
  await expect(fade).toBeVisible();
  await fade.locator(".motion-favorite").click();
  await search.fill("");
  await library.getByRole("button", { name: /★ 收藏/ }).click();
  await expect(cards).toHaveCount(1);
  await expect(status).toHaveText("符合 1 種");
  await library.getByRole("button", { name: "清除條件" }).click();
  const targets = library.getByRole("group", { name: "用在", exact: true });
  await targets.getByRole("button", { name: /^文字/ }).click();
  await targets.getByRole("button", { name: /^圖片/ }).click();
  await library.getByRole("group", { name: "什麼時候動" }).getByRole("button", { name: /^出現時/ }).click();
  const expected = motionIds.filter(id => motionFacets[id].trigger.includes("enter") && motionFacets[id].target.some(t => t === "text" || t === "image"));
  await expect(cards).toHaveCount(expected.length);
  await expect(status).toHaveText(`符合 ${expected.length} 種`);
  await library.getByLabel("排序").selectOption("gentle");
  const ids = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-effect-id")));
  const levels = ids.map(id => ["low", "medium", "high"].indexOf(motionFacets[id as keyof typeof motionFacets].intensity[0]));
  expect(levels).toEqual([...levels].sort((a, b) => a - b));
  await library.getByRole("button", { name: "清除條件" }).click();
  await search.fill("fade-in");
  await fade.locator(".asset-choose").click();
  await search.fill("");
  await library.getByRole("button", { name: /^最近用過/ }).click();
  await library.getByLabel("排序").selectOption("recent");
  await expect(cards.first()).toHaveAttribute("data-effect-id", "fade-in");
  await expect(status).toHaveText("符合 1 種");
  await library.getByRole("button", { name: "清除條件" }).click();
  await search.fill("unmatched-motion-xyz");
  await expect(status).toHaveText("找不到符合的動畫");
  await library.getByLabel("描述想要的動畫（本機規則推薦）").fill("文字像被風吹散後重新聚集");
  await library.getByRole("button", { name: "推薦動畫" }).click();
  await expect(library.locator('[data-effect-id="letter-assembly"]')).toContainText("分散後重新組合文字");
  expect(await cards.count()).toBeLessThanOrEqual(5);
});

test("tuned animation is temporary until applied and survives undo and redo", async ({ page }) => {
  const fixture = motionFixture();
  const heading = fixture.sections[0].children!.find(node => node.type === "heading")!;
  heading.effects = [];
  await page.goto("/?draft");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({ name: "page.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture)) });
  const target = page.locator(`.preview-frame [data-page-id="${heading.id}"]`);
  await target.click();
  await openPanel(page, "動畫");
  const library = page.getByRole("region", { name: "預覽動畫效果庫" });
  await library.getByRole("searchbox").fill("fade-in");
  const card = library.locator('[data-effect-id="fade-in"]');
  await card.getByRole("button", { name: /調整.*參數/ }).click();
  await card.getByLabel("動畫時長（毫秒）").fill("700");
  await card.getByRole("button", { name: /在元件上試看/ }).click();
  await expect(target).toHaveAttribute("data-effects", /fade-in/);
  await page.getByRole("button", { name: "取消試看" }).click();
  await expect(target).not.toHaveAttribute("data-effects", /fade-in/);
  await card.locator(".asset-choose").click();
  await expect(target).toHaveAttribute("data-effects", /fade-in/);
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(target).not.toHaveAttribute("data-effects", /fade-in/);
  await page.getByRole("button", { name: "重做修改" }).click();
  await expect(target).toHaveAttribute("data-effects", /fade-in/);
  await openPanel(page, "屬性");
  await expect(page.getByLabel("動畫時長（毫秒）")).toHaveValue("700");
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await page.reload();
  await openWebsiteWorkspace(page);
  await target.click();
  await openPanel(page, "屬性");
  await expect(page.getByLabel("動畫時長（毫秒）")).toHaveValue("700");
});

test("draft trial renders the selected content without attaching an effect", async ({ page }) => {
  await page.goto("/?draft");
  await useTemplate(page, "巷口咖啡小店");
  const heading = page.getByTestId("canvas-node").filter({ hasText: "巷口咖啡小店" }).first();
  await heading.click();
  const before = await heading.locator(".effect-tags").textContent();
  await page.getByRole("button", { name: "動畫素材庫", exact: true }).click();
  const card = page.getByRole("region", { name: "草稿動畫素材" }).locator('[data-effect-id="typewriter"]');
  await card.getByRole("button", { name: /在元件上試看/ }).click();
  const trial = page.getByRole("region", { name: "草稿元件動畫試看" });
  await expect(trial.locator('[data-effects~="typewriter"]')).toContainText("巷口咖啡小店");
  await trial.getByRole("button", { name: "重播試看" }).click();
  await expect(trial.locator('[data-effects~="typewriter"]')).toContainText("巷口咖啡小店");
  await trial.getByRole("button", { name: "取消試看" }).click();
  await expect(trial).toHaveCount(0);
  await expect(heading.locator(".effect-tags")).toHaveText(before ?? "");
});

for (const [id, text] of [
  ["crosswind-ribbons", "巷口咖啡小店"], ["vanishing-lattice", "自家烘豆"],
  ["imprint-beats", "巷口咖啡小店"], ["drift-letterfall", "巷口咖啡小店"],
  ["turning-letter-mosaic", "巷口咖啡小店"],
  ...(["cutout-ticks", "sign-pivot", "quiet-landing", "storm-landing", "inverse-spring", "waterline-echo", "letter-fanout", "type-casts", "word-shelf", "reading-hop"] as const).map(id => [id, "巷口咖啡小店"] as const),
] as const) {
  test(`${id}: draft trial replays without editing the source`, async ({ page }) => {
    await page.goto("/?draft");
    await useTemplate(page, "巷口咖啡小店");
    const target = page.getByTestId("canvas-node").filter({ hasText: text }).first();
    await target.click();
    const before = await target.locator(".effect-tags").textContent();
    await page.getByRole("button", { name: "動畫素材庫", exact: true }).click();
    const card = page.getByRole("region", { name: "草稿動畫素材" }).locator(`[data-effect-id="${id}"]`);
    await card.getByRole("button", { name: "在元件上試看" + motionCatalog[id].nameZh }).click();
    const trial = page.getByRole("region", { name: "草稿元件動畫試看" });
    await expect(trial.locator(`[data-effects~="${id}"]`)).toBeVisible();
    await trial.getByRole("button", { name: "重播試看" }).click();
    await expect(trial.locator(`[data-effects~="${id}"]`)).toBeVisible();
    await trial.getByRole("button", { name: "取消試看" }).click();
    await expect(target.locator(".effect-tags")).toHaveText(before ?? "");
  });
}
