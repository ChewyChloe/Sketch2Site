import { test, expect } from "@playwright/test";
test("describe-site panel: fill-in blanks, Tab suggestions, details, and generation follows the brief", async ({ page }) => {
  // Exercise the local-layout path (AI not configured).
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  for (const n of ["首屏介紹", "三欄特色", "價目表", "行動呼籲"]) await page.getByRole("button", { name: "新增區塊：" + n }).click();
  await page.getByRole("button", { name: "描述網站" }).click();
  const panel = page.getByRole("dialog", { name: "描述你的網站" });
  // Choosing a blank moves on to the next one.
  for (const option of ["學生", "社團招生", "科技感", "價格"]) await panel.getByRole("button", { name: option, exact: true }).click();
  await expect(panel.locator(".brief-blank.filled")).toHaveCount(4);
  // Tab accepts only while a suggestion shows; otherwise it moves focus.
  const note = panel.getByLabel("一句話補充（選填）");
  await note.click();
  await page.keyboard.type("報名");
  await expect(panel.locator("#brief-note-hint")).toContainText("截止日期要醒目");
  await page.keyboard.press("Tab");
  await expect(note).toHaveValue("報名截止日期要醒目");
  await expect(note).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(note).not.toBeFocused();
  // Esc dismisses a suggestion without closing the panel.
  await note.click();
  await page.keyboard.press("End");
  await page.keyboard.type("，主色");
  await expect(panel.locator("#brief-note-hint")).toContainText("Tab");
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await expect(note).toHaveValue("報名截止日期要醒目，主色");
  await panel.getByRole("button", { name: /想寫更多/ }).click();
  await panel.getByLabel("詳細說明（選填）").fill("我們是攝影社，想讓新生知道社課很輕鬆。");
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  const summary = panel.getByRole("region", { name: "生成前需求摘要" });
  await expect(summary).toContainText("社團招生");
  await expect(summary).toContainText("學生");
  await expect(summary).toContainText("科技感");
  await expect(summary).toContainText("價目");
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toHaveCount(0);
  await panel.getByRole("button", { name: "返回修改" }).click();
  await expect(panel.getByLabel("詳細說明（選填）")).toHaveValue("我們是攝影社，想讓新生知道社課很輕鬆。");
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  await panel.getByRole("button", { name: "確認生成" }).click();
  const site = page.locator(".preview-frame .rendered-page:visible").first();
  await expect(site).toHaveAttribute("data-theme", "midnight");
  await expect(site.locator(".page-main > .page-section").nth(1)).toHaveClass(/role-pricing/);
  // The brief is saved with the draft and reopens filled.
  await page.getByRole("button", { name: "返回草稿", exact: true }).click();
  await expect(page.getByRole("button", { name: "描述網站 ✓" })).toBeVisible();
  await page.getByRole("button", { name: "描述網站 ✓" }).click();
  await expect(panel.getByLabel("詳細說明（選填）")).toHaveValue("我們是攝影社，想讓新生知道社課很輕鬆。");
});

test("moodboard: search all cases, prefer one, add an own link that is stored but never fetched", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const outside: string[] = [];
  page.on("request", (r) => { if (r.url().includes("example-studio.tw")) outside.push(r.url()); });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "描述網站" }).click();
  const panel = page.getByRole("dialog", { name: "描述你的網站" });
  await panel.getByText(/^靈感板/).click();
  const grid = panel.getByRole("list", { name: "靈感做法" });
  await panel.getByLabel("搜尋靈感").fill("留白");
  await expect(panel.getByText(/找到 \d+ 個做法/)).toBeVisible();
  expect(await grid.getByRole("listitem").count()).toBeGreaterThan(0);
  const first = grid.getByRole("listitem").first();
  await first.getByRole("button", { name: "偏好這個做法" }).click();
  await expect(first).toHaveClass(/is-prefer/);
  await panel.getByLabel("靈感網址", { exact: true }).fill("http://not-secure.example");
  await panel.getByRole("button", { name: "加入靈感板" }).click();
  await expect(panel.getByRole("status").filter({ hasText: "https://" })).toBeVisible();
  await panel.getByLabel("靈感網址", { exact: true }).fill("https://example-studio.tw/work");
  await panel.getByLabel("喜歡的地方").fill("首屏大字很有力");
  await panel.getByRole("group", { name: "喜歡它的" }).getByRole("button", { name: "字體" }).click();
  await panel.getByRole("button", { name: "加入靈感板" }).click();
  const links = panel.getByRole("region", { name: "我的靈感網址" });
  await expect(links).toContainText("example-studio.tw");
  await expect(links).toContainText("首屏大字很有力・字體");
  await panel.locator(".moodboard").screenshot({ path: "test-results/moodboard.png" });
  expect(outside).toEqual([]);
});
