import { test, expect } from "@playwright/test";
// The eight signature presets run in the library samples and survive into the generated site.
test("signature motions play in the library and carry into the site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "動畫素材庫", exact: true }).click();
  const card = (id: string) => page.locator(`.sidebar [data-effect-id="${id}"]`);
  for (const id of ["typewriter", "marquee-text", "gradient-text-flow", "blur-in", "float-idle", "confetti-burst", "jelly-press", "shine-sweep"]) {
    await card(id).scrollIntoViewIfNeeded();
    await expect(card(id).locator(".asset-new")).toHaveText("NEW");
  }
  // Typewriter types into an overlay while the real text stays in the page.
  await card("typewriter").scrollIntoViewIfNeeded();
  await card("typewriter").locator(".motion-replay").click();
  await expect(card("typewriter").locator(".sig-typewriter")).toBeAttached();
  await expect(card("typewriter").locator(".page-paragraph")).toContainText("你好，歡迎光臨！");
  // Marquee builds a moving track; gradient text clips a gradient to the letters.
  await card("marquee-text").scrollIntoViewIfNeeded();
  await expect(card("marquee-text").locator(".sig-marquee-track")).toBeAttached();
  await card("gradient-text-flow").scrollIntoViewIfNeeded();
  await expect(card("gradient-text-flow").locator(".page-paragraph")).toHaveCSS("background-clip", "text");
  // Confetti appears on click and cleans itself up.
  await card("confetti-burst").scrollIntoViewIfNeeded();
  await card("confetti-burst").locator(".page-button").click();
  await expect(card("confetti-burst").locator(".sig-confetti").first()).toBeAttached();
  await expect(card("confetti-burst").locator(".sig-confetti")).toHaveCount(0, { timeout: 4000 });
  // Shine adds its streak; float animates the element.
  await card("shine-sweep").scrollIntoViewIfNeeded();
  await expect(card("shine-sweep").locator(".sig-shine")).toBeAttached();
  await card("float-idle").scrollIntoViewIfNeeded();
  await expect.poll(() => card("float-idle").locator("[data-effects~='float-idle']").evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  // Category chips filter the library.
  await page.getByRole("group", { name: "什麼時候動" }).getByRole("button", { name: /^出現時/ }).click();
  await expect(card("typewriter")).toBeVisible();
  await expect(card("confetti-burst")).toHaveCount(0);
  await page.getByRole("button", { name: "清除條件" }).click();
  // Applied in the draft, the effect reaches the generated site.
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await page.getByRole("tab", { name: "元件" }).click();
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const button = page.locator('[data-testid="canvas-node"].button');
  await button.click();
  await button.click();
  await page.getByRole("tab", { name: "動畫" }).click();
  await card("confetti-burst").locator(".asset-choose").click();
  await expect(button.locator(".effect-tags")).toContainText("彩紙慶祝");
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  const site = page.locator(".candidate-preview .rendered-page, main[aria-label='生成候選預覽'] .rendered-page").first();
  await expect(site.locator("[data-effects~='confetti-burst']")).toHaveCount(1);
  expect(errors).toEqual([]);
});
