import { test, expect } from "@playwright/test";
import { buildSite } from "./helpers/workbench";
// Leave notes on several elements, send them together, review, apply, and undo in one step.
test("batch notes: stage, send once, review, apply and undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  // AI is stubbed: one notes request, answering only within what it was offered.
  const sent: unknown[] = [];
  await page.route(/\/api\/generation\/status$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true, csrfToken: "a".repeat(64) }) }));
  await page.route(/\/api\/generation\/notes$/, async (r) => {
    const req = JSON.parse(r.request().postData() ?? "{}");
    sent.push(req);
    const n = req.notes[0].n;
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ requestId: req.requestId, results: [{ n, newText: "一起來喝咖啡吧", commands: [] }] }) });
  });
  await page.goto("/");
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
  expect((sent[0] as { notes: { note: string }[] }).notes.map((x) => x.note)).toEqual(["寫得更溫暖一點"]);
  await expect(tray.getByRole("listitem").nth(1)).toContainText("AI：");
  await tray.getByRole("button", { name: "套用 2 則" }).click();
  await expect(frame.getByRole("heading", { name: "一起來喝咖啡吧" })).toBeVisible();
  await expect(tray).toHaveCount(0);
  await expect(page.locator(".note-marker")).toHaveCount(0);
  // One undo takes back the whole batch.
  await page.getByRole("button", { name: "撤銷修改" }).first().click();
  await expect(frame.getByRole("heading", { name: "今天就來坐坐" })).toBeVisible();
});
