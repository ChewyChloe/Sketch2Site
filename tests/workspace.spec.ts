import { test, expect, type Page, type Locator } from "@playwright/test";
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
}
async function drag(
  page: Page,
  source: Locator,
  target: Locator,
  offset = { x: 150, y: 150 },
) {
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer: dt });
  const box = (await target.boundingBox())!;
  await target.dispatchEvent("drop", {
    dataTransfer: dt,
    clientX: box.x + offset.x,
    clientY: box.y + offset.y,
  });
}
test("草稿拖曳、位置、標記、歷史與 IndexedDB 恢復", async ({ page }) => {
  await ready(page);
  const canvas = page.getByTestId("canvas");
  // Actual browser mouse drag from library into canvas.
  await page
    .getByRole("button", { name: "新增文字", exact: true })
    .dragTo(canvas, { targetPosition: { x: 180, y: 180 } });
  const nodes = page.getByTestId("canvas-node");
  await expect(nodes).toHaveCount(1);
  await expect(nodes.first()).toHaveCSS("left", "300px");
  await expect(nodes.first()).toHaveCSS("top", "300px");
  const originalId = await nodes.first().getAttribute("data-node-id");
  const box = (await nodes.first().boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 50, { steps: 8 });
  await page.mouse.up();
  await expect(nodes.first()).toHaveCSS("left", "400px");
  await expect(nodes.first()).toHaveCSS("top", "350px");
  await page.getByRole("button", { name: "還原", exact: true }).click();
  await expect(nodes.first()).toHaveCSS("left", "300px");
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(nodes.first()).toHaveCSS("left", "400px");
  await page.getByRole("tab", { name: "動畫", exact: true }).click();
  await drag(
    page,
    page.getByRole("button", { name: "Fade In", exact: false }),
    nodes.first(),
    { x: 30, y: 20 },
  );
  await expect(nodes.first()).toContainText("Fade In");
  await page.getByRole("tab", { name: "元件", exact: true }).click();
  await page.getByRole("button", { name: "新增按鈕", exact: true }).click();
  await page.getByRole("button", { name: "新增卡片", exact: true }).click();
  await expect(nodes).toHaveCount(3);
  await page.getByRole("tab", { name: "編輯元素" }).click();
  await page
    .getByRole("textbox", { name: "元素內容" })
    .fill('<img src=x onerror="window.pwned=true">');
  await expect(nodes.last()).toContainText("<img");
  await page.screenshot({
    path: "test-results/properties-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.querySelectorAll("[data-node-id] img").length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("已儲存至本機");
  await page.reload();
  await expect(nodes).toHaveCount(3);
  await expect(nodes.first()).toHaveAttribute("data-node-id", originalId!);
  await expect(nodes.first()).toHaveCSS("left", "400px");
  await expect(nodes.first()).toContainText("Fade In");
  await nodes.last().click();
  await page.keyboard.press("Delete");
  await expect(nodes).toHaveCount(2);
  await page.keyboard.press("Control+z");
  await expect(nodes).toHaveCount(3);
  await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("已儲存至本機");
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
});
test("空白處動畫需選對象、縮放座標與窄視窗", async ({ page }) => {
  await ready(page);
  await page.screenshot({
    path: "test-results/empty-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "新增按鈕", exact: true }).click();
  await page.getByRole("tab", { name: "動畫", exact: true }).click();
  await drag(
    page,
    page.getByRole("button", { name: "Fade In", exact: false }),
    page.getByTestId("canvas"),
    { x: 500, y: 400 },
  );
  await expect(
    page.getByRole("button", { name: "附加標記", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("動畫附加對象").selectOption({ index: 1 });
  await page.getByRole("button", { name: "附加標記", exact: true }).click();
  await expect(page.getByTestId("canvas-node")).toContainText("Fade In");
  await drag(
    page,
    page.locator('.sidebar [data-effect-id="stagger-reveal"]'),
    page.getByTestId("canvas-node"),
    { x: 20, y: 20 },
  );
  await expect(page.getByRole("status")).toContainText("依序顯示僅適用於卡片");
  await expect(page.getByTestId("canvas-node")).not.toContainText(
    "Stagger Reveal",
  );

  await page.getByLabel("畫布縮放").selectOption("0.4");
  await page.getByRole("tab", { name: "元件", exact: true }).click();
  await drag(
    page,
    page.getByRole("button", { name: "新增卡片", exact: true }),
    page.getByTestId("canvas"),
    { x: 200, y: 200 },
  );
  await expect(page.getByTestId("canvas-node").last()).toHaveCSS(
    "left",
    "500px",
  );
  await expect(page.locator(".sidebar")).not.toHaveClass(/dragging-effect/);
  await page.getByRole("button", { name: "收合側欄" }).click();
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await page.getByRole("button", { name: "展開側欄" }).click();
  await page.setViewportSize({ width: 960, height: 768 });

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/workspace-compact.png",
    fullPage: true,
  });
});
test("不合法 IndexedDB 草稿安全失敗、不覆寫資料", async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("sketch2site", 3);
      r.onsuccess = () => {
        const db = r.result;
        const t = db.transaction("drafts", "readwrite");
        t.objectStore("drafts").put(
          { schemaVersion: 999, script: "evil" },
          "current",
        );
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByRole("status")).toContainText("無法讀取草稿");
  await expect(
    page.getByRole("button", { name: "儲存草稿", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "新增文字", exact: true }),
  ).toBeDisabled();
});
