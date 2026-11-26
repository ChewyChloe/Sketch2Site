import { test, expect } from "@playwright/test";
// Diverge, then converge (docs/WORKFLOW_STUDY.md): a few questions, three directions side by side,
// three variants of the chosen one. Works without AI; with AI the answers go to the layout request.
async function club(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：社團招生頁" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
}
async function answer(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "描述網站" }).click();
  const panel = page.getByRole("dialog", { name: "描述你的網站" });
  const ask = panel.getByRole("region", { name: "先問清楚" });
  await ask.getByLabel("喜歡哪些網站或品牌").fill("無印良品");
  await ask.getByRole("group", { name: "想要的感覺" }).getByRole("button", { name: "大膽色塊" }).click();
  await ask.getByRole("radiogroup", { name: "首屏怎麼講" }).getByRole("radio", { name: "只有超大字" }).click();
  // Every "AI look" item starts avoided; clicking one allows it.
  const avoid = ask.getByRole("group", { name: "一定不要" }).getByRole("button");
  await expect(avoid).toHaveCount(7);
  for (const b of await avoid.all()) await expect(b).toHaveAttribute("aria-pressed", "true");
  await ask.getByRole("group", { name: "一定不要" }).getByRole("button", { name: "emoji" }).click();
  return panel;
}

test("three directions side by side, then a variant; the choice is kept", async ({ page }) => {
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await club(page);
  const panel = await answer(page);
  await panel.getByRole("button", { name: "用這個描述生成網站" }).click();
  const cards = page.getByRole("radiogroup", { name: "三個方向" }).getByRole("radio");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute("aria-checked", "true");
  // Each card shows a live preview of the opening, and a name with a reason.
  await expect(cards.nth(1).locator(".rendered-page")).toBeAttached();
  await expect(cards.nth(1)).toHaveAccessibleName(/：.+/);
  const site = page.locator("main[aria-label='生成候選預覽'] .preview-frame .rendered-page").first();
  const before = await site.getAttribute("data-theme") + "|" + await site.getAttribute("data-concept");
  // The bold colour field asked for comes up among the three.
  const names = await cards.evaluateAll((es) => es.map((e) => e.getAttribute("aria-label")));
  expect(names.join()).toMatch(/單色海報|生成網格/);
  await cards.nth(1).click();
  await expect(cards.nth(1)).toHaveAttribute("aria-checked", "true");
  expect(await site.getAttribute("data-theme") + "|" + await site.getAttribute("data-concept")).not.toBe(before);
  const variants = page.getByRole("radiogroup", { name: "同一方向的變化" }).getByRole("radio");
  await expect(variants).toHaveCount(3);
  await variants.nth(2).click();
  await expect(site).toHaveAttribute("data-branded", "");
  await page.screenshot({ path: "test-results/directions.png" });
  await page.getByRole("button", { name: "使用此版本" }).click();
  await expect(page.getByTestId("preview-frame").locator(".rendered-page").first()).toHaveAttribute("data-branded", "");
});

test("with AI the answers reach the layout request; the directions still show", async ({ page }) => {
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true }) }));
  const bodies: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/api\/generation$/.test(r.url())) bodies.push(r.postData() ?? ""); });
  await club(page);
  const panel = await answer(page);
  await panel.getByRole("button", { name: "用這個描述生成網站" }).click();
  await expect.poll(() => bodies.length).toBe(1);
  const ask = JSON.parse(bodies[0]).canvasSpec.metadata.brief.ask;
  expect(ask).toMatchObject({ refs: "無印良品", lightness: ["bold"], hero: "type" });
  expect(ask.avoid).toHaveLength(6);
  expect(ask.avoid).not.toContain("emoji");
  await expect(page.getByRole("radiogroup", { name: "三個方向" }).getByRole("radio")).toHaveCount(3);
});
