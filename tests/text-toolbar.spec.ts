import { choose } from "./helpers/select";
import { test, expect } from "@playwright/test";
// Text toolbar and shortcuts: font, size, colour, emphasis and alignment carry to the site.
test("text toolbar, text shortcuts and the shortcuts panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  // No text selected: no toolbar.
  await expect(page.getByRole("toolbar", { name: "文字樣式" })).toHaveCount(0);
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const heading = page.locator('[data-testid="canvas-node"].heading');
  await heading.click();
  await page.keyboard.press("Control+Shift+G");
  await page.keyboard.press("Escape");
  await heading.click();
  const bar = page.getByRole("toolbar", { name: "文字樣式" });
  await expect(bar).toBeVisible();
  await choose(bar.getByLabel("字型"), "serif");
  await bar.getByRole("button", { name: "字變大" }).click();
  await expect(bar.getByLabel("字級大小")).toHaveValue("36");
  await bar.getByRole("button", { name: "文字顏色" }).click();
  await page.getByRole("button", { name: "顏色 #0d74ce" }).click();
  await page.keyboard.press("Control+b");
  await expect(bar.getByRole("button", { name: "粗體" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Control+Shift+KeyE");
  await expect(bar.getByRole("button", { name: "文字置中" })).toHaveAttribute("aria-pressed", "true");
  await expect(heading).toHaveCSS("color", "rgb(13, 116, 206)");
  await expect(heading).toHaveCSS("font-size", "36px");
  // Bigger text grows its box and pushes the text below down instead of overlapping it.
  for (let i = 0; i < 4; i++) await bar.getByRole("button", { name: "字變大" }).click();
  const hb = (await heading.boundingBox())!, tb = (await page.locator('[data-testid="canvas-node"].text').first().boundingBox())!;
  expect(hb.y + hb.height).toBeLessThanOrEqual(tb.y + 1);
  for (let i = 0; i < 4; i++) await bar.getByRole("button", { name: "字變小" }).click();
  // Shortcuts panel opens with "?" and closes with Escape.
  await page.getByTestId("canvas").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "快捷鍵" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "快捷鍵" })).toHaveCount(0);
  // "T" adds a text box on the canvas.
  await page.getByTestId("canvas").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("t");
  await expect(page.locator('[data-testid="canvas-node"].text')).toHaveCount(2);
  // The site keeps the styles.
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  const site = page.locator(".candidate-preview .rendered-page, main[aria-label='生成候選預覽'] .rendered-page").first();
  const siteHeading = site.getByRole("heading", { name: "最後，請訪客做一件事" });
  await expect(siteHeading).toHaveCSS("color", "rgb(13, 116, 206)");
  await expect(siteHeading).toHaveCSS("text-align", "center");
  await expect(siteHeading).toHaveCSS("font-weight", "800");
  // Clearing removes every style in one undo step.
  await page.getByRole("button", { name: "返回草稿" }).click();
  await heading.click();
  await bar.getByRole("button", { name: "清除格式" }).click();
  await expect(heading).not.toHaveCSS("color", "rgb(13, 116, 206)");
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await expect(heading).toHaveCSS("color", "rgb(13, 116, 206)");
  expect(errors).toEqual([]);
});
