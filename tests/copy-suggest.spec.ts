import { test, expect } from "@playwright/test";
// AI copy suggestions (mock provider on the test server): only suggestions, the user picks.
test("AI suggests wordings for selected text and nothing changes until one is picked", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：行動呼籲" }).click();
  const heading = page.locator('[data-testid="canvas-node"].heading');
  await heading.click();
  await page.keyboard.press("Control+Shift+G");
  await page.keyboard.press("Escape");
  await heading.click();
  await page.getByRole("button", { name: "請 AI 想幾個說法" }).click();
  const options = page.getByRole("group", { name: "AI 建議的說法" });
  await expect(options).toBeVisible();
  // Unsafe options (links) never reach the page; the original text is unchanged so far.
  await expect(options.getByRole("button", { name: /evil/ })).toHaveCount(0);
  await expect(heading).toContainText("最後，請訪客做一件事");
  await options.getByRole("button", { name: /建議一/ }).click();
  await expect(heading).toContainText("最後，請訪客做一件事（建議一）");
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await expect(heading).not.toContainText("建議一");
  expect(errors).toEqual([]);
});
