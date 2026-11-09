import { test, expect, type Page, type Route } from "@playwright/test";
import { generationFixtures, mockLayout } from "./fixtures/generation";
import { materialize, prepareIntent } from "../src/generation";
import type { CanvasSpec } from "../src/spec";
const fixtures = generationFixtures();
async function seed(page: Page, canvas = fixtures[0]) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.evaluate(
    async (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("sketch2site", 2);
        open.onsuccess = () => {
          const db = open.result,
            t = db.transaction("drafts", "readwrite");
          t.objectStore("drafts").put(value, "current");
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onabort = () => reject(t.error);
        };
      }),
    canvas,
  );
  await page.reload();
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await expect(page.getByTestId("page-save-status")).toHaveText("尚未儲存");
}
async function savedPage(page: Page) {
  return page.evaluate(
    async () =>
      new Promise<unknown>((res, rej) => {
        const r = indexedDB.open("sketch2site", 2);
        r.onsuccess = () => {
          const db = r.result,
            q = db
              .transaction("pages")
              .objectStore("pages")
              .get("local-project");
          q.onsuccess = () => {
            db.close();
            res(q.result);
          };
          q.onerror = () => rej(q.error);
        };
      }),
  );
}
async function fulfillMock(route: Route) {
  const body = route.request().postDataJSON() as {
    requestId: string;
    canvasSpec: CanvasSpec;
  };
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      requestId: body.requestId,
      mode: "mock",
      page: materialize(
        body.canvasSpec,
        mockLayout(prepareIntent(body.canvasSpec)),
      ),
      usage: {
        inputTokens: 100,
        outputTokens: 100,
        latencyMs: 10,
        estimatedCostUsd: 0.001,
      },
    }),
  });
}
for (const [index, canvas] of fixtures.entries()) {
  test(
    "Mock 端到端草稿 " + index + "：候選不保存，確認才保存",
    async ({ page }) => {
      await seed(page, canvas);
      await page.getByRole("button", { name: "生成網站", exact: true }).click();
      await expect(
        page.getByRole("main", { name: "生成候選預覽" }),
      ).toBeVisible();
      await expect(
        page.getByText("測試生成（非 AI）", { exact: true }),
      ).toBeVisible();
      for (const source of canvas.nodes)
        await expect(
          page.locator('[data-page-id="' + source.id + '"]'),
        ).toBeVisible();
      expect(await savedPage(page)).toBeUndefined();
      await page.screenshot({
        path: "test-results/generation-mock-" + index + ".png",
        fullPage: true,
      });
      for (const width of [768, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.getByRole("button", { name: "手機", exact: true }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await page
            .locator('[aria-label="生成候選預覽"] .rendered-page')
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        await page.screenshot({
          path: "test-results/generation-mock-" + index + "-" + width + ".png",
          fullPage: true,
        });
      }
      await page
        .getByRole("button", { name: "使用此版本", exact: true })
        .click();
      await expect(
        page.getByRole("main", { name: "生成候選預覽" }),
      ).toHaveCount(0);
      await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
      expect(await savedPage(page)).toBeTruthy();
      if (index === 0) {
        await page.getByRole("button", { name: "撤銷修改" }).click();
        await expect(
          page.getByRole("heading", { name: "把想法，排成一個頁面。" }),
        ).toBeVisible();
        await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
        await page.getByRole("button", { name: "重做修改" }).click();
        await expect(
          page.getByRole("heading", { name: "林的作品集" }),
        ).toBeVisible();
        await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
      }
      await page.getByRole("button", { name: "草稿", exact: true }).click();
      await expect(page.getByTestId("canvas-node")).toHaveCount(
        canvas.nodes.length,
      );
    },
  );
}
test("key 缺失、生成失敗與返回草稿都保留原內容", async ({ page }) => {
  await seed(page);
  await page.route("**/api/generation/status", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ configured: false, csrfToken: "a".repeat(64) }),
    }),
  );
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("AI 尚未設定");
  await expect(page.getByTestId("canvas-node")).toHaveCount(
    fixtures[0].nodes.length,
  );
  await page.unroute("**/api/generation/status");
  await page.route("**/api/generation", (r) =>
    r.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ code: "INVALID_OUTPUT" }),
    }),
  );
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("生成失敗");
  expect(await savedPage(page)).toBeUndefined();
  await page.unroute("**/api/generation");
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toBeVisible();
  await page.getByRole("button", { name: "返回草稿", exact: true }).click();
  await expect(page.getByTestId("canvas-node")).toHaveCount(
    fixtures[0].nodes.length,
  );
  expect(await savedPage(page)).toBeUndefined();
});
test("生成期間改動草稿使結果過期，不接受舊結果", async ({ page }) => {
  await seed(page);
  let captured!: Route;
  let notify!: () => void;
  const arrived = new Promise<void>((res) => (notify = res));
  await page.route("**/api/generation", (route) => {
    captured = route;
    notify();
  });
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await arrived;
  await expect(page.getByRole("button", { name: "生成中…" })).toBeDisabled();
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  await fulfillMock(captured);
  await expect(page.getByRole("alert")).toContainText("草稿或頁面已更新");
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toHaveCount(0);
  expect(await savedPage(page)).toBeUndefined();
});
test("生成期間重新載入 Page Session 使結果過期", async ({ page }) => {
  await seed(page);
  let captured!: Route;
  let notify!: () => void;
  const arrived = new Promise<void>((res) => (notify = res));
  await page.route("**/api/generation", (route) => {
    captured = route;
    notify();
  });
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await arrived;
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.getByRole("button", { name: "重新載入頁面", exact: true }).click();
  await expect(page.getByTestId("page-save-status")).toHaveText("尚未儲存");
  await fulfillMock(captured);
  await expect(page.getByRole("alert")).toContainText("草稿或頁面已更新");
  expect(await savedPage(page)).toBeUndefined();
});
test("候選保存失敗仍保留候選，最後有效頁面不變，可重試保存", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if (
        this.name === "pages" &&
        (window as typeof window & { denyCandidate?: boolean }).denyCandidate
      )
        throw new DOMException("quota", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await seed(page);
  // Save an existing valid page first, then generate a different candidate.
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.locator(".rendered-page h1").click();
  await page.getByLabel("標題文字").fill("原有效版本");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  const previous = await savedPage(page);
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toBeVisible();
  await page.evaluate(() => {
    (window as typeof window & { denyCandidate?: boolean }).denyCandidate =
      true;
  });
  await page.getByRole("button", { name: "使用此版本", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("候選結果仍保留");
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toBeVisible();
  expect(await savedPage(page)).toEqual(previous);
  await page.evaluate(() => {
    (window as typeof window & { denyCandidate?: boolean }).denyCandidate =
      false;
  });
  await page.getByRole("button", { name: "使用此版本", exact: true }).click();
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toHaveCount(0);
  expect(await savedPage(page)).not.toEqual(previous);
});
test("透過既有元件庫建立標題、圖片與可操作按鈕再生成", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增標題", exact: true }).click();
  await page.getByRole("button", { name: "新增圖片", exact: true }).click();
  await page.getByRole("button", { name: "新增按鈕", exact: true }).click();
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("設定每個按鈕");
  await page.getByRole("tab", { name: "編輯元素" }).click();
  await page.getByLabel("按鈕連結").fill("javascript:alert(1)");
  await page.getByLabel("按鈕連結").press("Enter");
  await expect(page.getByLabel("按鈕連結")).toHaveValue("");
  await page.getByLabel("按鈕連結").fill("https://example.com");
  await page.getByLabel("按鈕連結").press("Enter");
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toBeVisible();
  await expect(page.getByRole("link", { name: "了解更多" })).toHaveAttribute(
    "href",
    "https://example.com",
  );
  await expect(page.getByRole("img", { name: "內建圖片示意" })).toBeVisible();
});
