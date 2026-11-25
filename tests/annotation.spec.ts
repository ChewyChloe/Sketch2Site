import { test, expect } from "@playwright/test";
// Click an element in the site workspace, say how to change it, and it changes (undoable).
test("annotation bubble changes the clicked element and can be undone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click();
  // Starters arrive with motion from the library already attached.
  await expect(page.getByTestId("canvas-node").locator(".effect-tags span").first()).toBeAttached();
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await page.getByRole("button", { name: "使用此版本" }).click();
  const frame = page.getByTestId("preview-frame");
  const heading = frame.getByRole("heading", { name: "我們的堅持" });
  await heading.click();
  await page.getByRole("button", { name: "註解：說說這個標題要怎麼改" }).click();
  const bubble = page.getByRole("dialog", { name: "註解：修改這個標題" });
  await expect(bubble).toBeVisible();
  await expect(bubble.getByLabel("想怎麼改這個元件")).toBeFocused();
  await bubble.getByLabel("想怎麼改這個元件").fill("標題大一點，置中，換成藍色");
  await bubble.getByRole("button", { name: "改", exact: true }).click();
  await expect(bubble.getByRole("status")).toContainText("標題放大為主標題");
  await expect(frame.getByRole("heading", { level: 1, name: "我們的堅持" })).toBeVisible();
  await expect(frame.locator(".rendered-page")).toHaveAttribute("data-theme", "ocean");
  // Unknown requests explain what works instead of guessing.
  await bubble.getByLabel("想怎麼改這個元件").fill("幫我加一個購物車");
  await bubble.getByRole("button", { name: "改", exact: true }).click();
  await expect(bubble.getByRole("status")).toContainText("還看不懂");
  // Esc folds the box back into the small button; text inside a card offers card changes.
  await page.keyboard.press("Escape");
  await expect(bubble).toBeHidden();
  await frame.getByText("自家烘豆").click();
  await page.getByRole("button", { name: "註解：說說這個文字要怎麼改" }).click();
  const cardBubble = page.getByRole("dialog", { name: "註解：修改這個文字" });
  await cardBubble.getByRole("button", { name: "卡片放大" }).click();
  await expect(cardBubble.getByRole("status")).toContainText("一排 2 個");
  // The normal undo reverts annotation changes.
  await page.getByRole("button", { name: "撤銷修改" }).first().click();
  await expect(frame.locator(".role-features .page-grid").first()).toHaveCSS("grid-template-columns", /^\S+ \S+ \S+$/);
  expect(errors).toEqual([]);
});
