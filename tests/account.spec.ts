import { test, expect } from "@playwright/test";
// Sign-in with Google or GitHub: hidden when not set up, card with both providers, signed-in
// menu with logout, and the message after coming back from GitHub.
const ready = (page: import("@playwright/test").Page) => page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));

test("before sign-in is set up, the button shows both options as coming soon", async ({ page }) => {
  await ready(page);
  await page.route(/\/api\/auth\/me$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ providers: [], user: null }) }));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "登入", exact: true }).click();
  const card = page.getByRole("dialog", { name: "登入" });
  await expect(card.getByRole("button", { name: "用 Google 登入（即將開放）" })).toBeDisabled();
  await expect(card.getByRole("button", { name: "用 GitHub 登入（即將開放）" })).toBeDisabled();
  await expect(card.getByRole("link")).toHaveCount(0);
});

test("sign in card offers Google and GitHub; signed-in menu logs out", async ({ page }) => {
  await ready(page);
  let user: unknown = null;
  let loggedOut = false;
  await page.route("https://accounts.google.com/**", (r) => r.abort());
  await page.route(/\/api\/auth\/me$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ providers: ["google", "github"], google: user ? undefined : { clientId: "1-a.apps.googleusercontent.com", nonce: "n".repeat(32) }, user }) }));
  await page.route(/\/api\/auth\/logout$/, (r) => { loggedOut = r.request().method() === "POST"; user = null; return r.fulfill({ contentType: "application/json", body: "{\"ok\":true}" }); });
  await page.goto("/?signin=failed");
  // Back from GitHub with a failure: the card explains and the address bar is tidied.
  const card = page.getByRole("dialog", { name: "登入" });
  await expect(card.getByRole("status")).toHaveText("登入沒有成功，請再試一次");
  await expect(page).toHaveURL(/\/$/);
  await expect(card.getByRole("link", { name: "用 GitHub 登入" })).toHaveAttribute("href", "/api/auth/github/start");
  await expect(card.locator(".account-google")).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  // Signed in.
  user = { name: "八爪小孩", email: "octo@example.com", provider: "github" };
  await page.reload();
  const account = page.getByRole("button", { name: "帳號：八爪小孩" });
  const avatar = account.locator(".account-avatar");
  await expect(avatar).toHaveCSS("border-top-width", "0px");
  await expect(account.locator(".account-name")).toBeVisible();
  await expect(account.locator(".account-chevron")).toBeVisible();
  await account.screenshot({ path: "test-results/account-desktop.png" });
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(account.locator(".account-name")).toBeHidden();
  await expect(avatar).toBeVisible();
  await account.screenshot({ path: "test-results/account-mobile.png" });
  await account.click();
  const menu = page.getByRole("dialog", { name: "帳號" });
  await expect(menu).toContainText("octo@example.com");
  await expect(menu).toContainText("用 GitHub 登入");
  await menu.getByRole("button", { name: "登出" }).click();
  await expect(page.getByRole("button", { name: "登入", exact: true })).toBeVisible();
  expect(loggedOut).toBe(true);
});
