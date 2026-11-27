import { test, expect } from "@playwright/test";
import { buildSite } from "./helpers/workbench";
// Leave notes on several elements, send them together, review, apply, and undo in one step.
test("batch notes: stage, send once, review, apply and undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  // AI is stubbed: one rewrite request with the whole site; it returns the note's section reworded.
  const sent: { page: { sections: Node[] }; notes: { nodeId: string; note: string }[] }[] = [];
  type Node = { id: string; content?: string; children?: Node[] };
  await page.route(/\/api\/generation\/status$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true, csrfToken: "a".repeat(64) }) }));
  await page.route(/\/api\/generation\/rewrite$/, async (r) => {
    const req = JSON.parse(r.request().postData() ?? "{}");
    sent.push(req);
    const has = (n: Node, id: string): boolean => n.id === id || (n.children ?? []).some((c) => has(c, id));
    const section = structuredClone(req.page.sections.find((s: Node) => has(s, req.notes[0].nodeId)));
    const walk = (n: Node) => { if (n.id === req.notes[0].nodeId) n.content = "一起來喝咖啡吧"; n.children?.forEach(walk); };
    walk(section);
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ requestId: req.requestId, sections: [section], notes: [{ n: req.notes[0].n, summary: "改得更溫暖" }] }) });
  });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await buildSite(page);
  await page.getByRole("button", { name: "使用此版本" }).click();
  const frame = page.getByTestId("preview-frame");
  const stage = async (target: import("@playwright/test").Locator, chip: RegExp, text: string) => {
    await target.click();
    await page.getByRole("button", { name: chip }).click();
    const bubble = page.getByRole("dialog", { name: /註解：修改這個/ });
    await bubble.getByLabel("想怎麼改這個元件").fill(text);
    await bubble.getByRole("button", { name: "暫存" }).click();
    await expect(bubble.getByRole("status")).toContainText("已暫存");
    await page.keyboard.press("Escape");
  };
  await stage(frame.getByRole("heading", { name: "我們的堅持" }), /說說這個標題/, "置中");
  await stage(frame.getByRole("heading", { name: "今天就來坐坐" }), /說說這個標題/, "寫得更溫暖一點");
  const tray = page.getByRole("region", { name: "待送出的修改" });
  await expect(tray.getByRole("listitem")).toHaveCount(2);
  await expect(page.locator(".note-marker")).toHaveText(["1", "2"]);
  // Remove one and add it back.
  await tray.getByRole("button", { name: "刪除第 2 則註解" }).click();
  await expect(tray.getByRole("listitem")).toHaveCount(1);
  await stage(frame.getByRole("heading", { name: "今天就來坐坐" }), /說說這個標題/, "寫得更溫暖一點");
  // Nothing changed yet.
  await expect(frame.getByRole("heading", { name: "今天就來坐坐" })).toBeVisible();
  await tray.getByRole("button", { name: "送出修改" }).click();
  await expect(tray.getByText("可以改 2 / 2 則")).toBeVisible();
  // Only the note the local reader did not understand went to the AI, in one request.
  expect(sent).toHaveLength(1);
  expect(sent[0].notes.map((x) => x.note)).toEqual(["寫得更溫暖一點"]);
  // The AI got the whole site, not just the element.
  expect(sent[0].page.sections.length).toBeGreaterThan(1);
  await expect(tray.getByRole("listitem").nth(1)).toContainText("AI：");
  await tray.getByRole("button", { name: "套用 2 則" }).click();
  // Before / after of the sections the notes touched, right away.
  const compare = page.getByRole("dialog", { name: "AI 改了這些地方" });
  await expect(compare.locator(".compare-before")).toContainText("今天就來坐坐");
  await expect(compare.locator(".compare-after")).toContainText("一起來喝咖啡吧");
  // Only the two sections the notes touched, not the whole site.
  await expect(compare.locator(".compare-after section.page-section")).toHaveCount(2);
  const handle = compare.getByRole("slider", { name: "比較位置" });
  await handle.focus();
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "100");
  await compare.screenshot({ path: "test-results/notes-compare.png" });
  await compare.getByRole("button", { name: "關閉比較" }).click();
  await expect(compare).toBeHidden();
  await expect(frame.getByRole("heading", { name: "一起來喝咖啡吧" })).toBeVisible();
  await expect(tray).toHaveCount(0);
  await expect(page.locator(".note-marker")).toHaveCount(0);
  // One undo takes back the whole batch.
  await page.getByRole("button", { name: "撤銷修改" }).first().click();
  await expect(frame.getByRole("heading", { name: "今天就來坐坐" })).toBeVisible();
});

test("the comparison offers 不要這個修改, which takes the batch back", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.route(/\/api\/generation\/status$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true, csrfToken: "a".repeat(64) }) }));
  type Node = { id: string; content?: string; children?: Node[] };
  await page.route(/\/api\/generation\/rewrite$/, async (r) => {
    const req = JSON.parse(r.request().postData() ?? "{}");
    const has = (n: Node, id: string): boolean => n.id === id || (n.children ?? []).some((c) => has(c, id));
    const section = structuredClone(req.page.sections.find((s: Node) => has(s, req.notes[0].nodeId)));
    const walk = (n: Node) => { if (n.id === req.notes[0].nodeId) n.content = "一起來喝咖啡吧"; n.children?.forEach(walk); };
    walk(section);
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ requestId: req.requestId, sections: [section], notes: [{ n: req.notes[0].n, summary: "改得更溫暖" }] }) });
  });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await buildSite(page);
  await page.getByRole("button", { name: "使用此版本" }).click();
  const frame = page.getByTestId("preview-frame");
  await frame.getByRole("heading", { name: "今天就來坐坐" }).click();
  await page.getByRole("button", { name: /說說這個標題/ }).click();
  const bubble = page.getByRole("dialog", { name: /註解：修改這個/ });
  await bubble.getByLabel("想怎麼改這個元件").fill("寫得更溫暖一點");
  await bubble.getByRole("button", { name: "暫存" }).click();
  await expect(bubble.getByRole("status")).toContainText("已暫存");
  await page.keyboard.press("Escape");
  const tray = page.getByRole("region", { name: "待送出的修改" });
  if (await bubble.isVisible()) await page.keyboard.press("Escape");
  await expect(bubble).toBeHidden();
  void tray;
  // The tray sits over a page that is still settling; press its buttons directly.
  await page.locator(".note-tray footer button.primary", { hasText: "送出修改" }).dispatchEvent("click");
  await page.locator(".note-tray footer button.primary", { hasText: "套用 1 則" }).dispatchEvent("click");
  const compare = page.getByRole("dialog", { name: "AI 改了這些地方" });
  await expect(compare.locator(".compare-after")).toContainText("一起來喝咖啡吧");
  await compare.getByRole("button", { name: "不要這個修改" }).click();
  await expect(compare).toBeHidden();
  await expect(frame.getByRole("heading", { name: "今天就來坐坐" })).toBeVisible();
  // It is still in the version list, so it can be brought back later.
  await page.locator(".workbench-menu > summary").filter({ hasText: "頁面" }).click();
  await page.getByRole("button", { name: "版本紀錄", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "網站版本" })).toContainText("修改「今天就來坐坐」區塊");
});

test("an unclear note is asked about first: pick a choice, then it goes through", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.route(/\/api\/generation\/status$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true, csrfToken: "a".repeat(64) }) }));
  let rewrites = 0;
  await page.route(/\/api\/generation\/rewrite$/, (r) => { rewrites++; return r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "NOT_CONFIGURED" }) }); });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：巷口咖啡小店" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await buildSite(page);
  await page.getByRole("button", { name: "使用此版本" }).click();
  const frame = page.getByTestId("preview-frame");
  await frame.getByRole("heading", { name: "我們的堅持" }).click();
  await page.getByRole("button", { name: /說說這個標題/ }).click();
  const bubble = page.getByRole("dialog", { name: /註解：修改這個/ });
  await bubble.getByLabel("想怎麼改這個元件").fill("改好看一點");
  await bubble.getByRole("button", { name: "暫存" }).click();
  await expect(bubble.getByRole("status")).toContainText("已暫存");
  await page.keyboard.press("Escape");
  if (await bubble.isVisible()) await page.keyboard.press("Escape");
  await expect(bubble).toBeHidden();
  await page.locator(".note-tray footer button.primary", { hasText: "送出修改" }).dispatchEvent("click");
  const tray = page.locator(".note-tray");
  await expect(tray).toContainText("1 則要先確認");
  const question = tray.getByRole("group", { name: /第 1 則：想改哪個部分/ });
  await expect(question.getByRole("button", { name: "置中" })).toBeVisible();
  await tray.screenshot({ path: "test-results/note-ask.png" });
  // Nothing was sent to the AI to guess.
  expect(rewrites).toBe(0);
  await question.getByRole("button", { name: "置中" }).dispatchEvent("click");
  // Back in the list with the clearer words; sending now works locally.
  await expect(tray).toContainText("標題：置中");
  await page.locator(".note-tray footer button.primary", { hasText: "送出修改" }).dispatchEvent("click");
  await expect(tray).toContainText("可以改 1 / 1 則");
  expect(rewrites).toBe(0);
});
