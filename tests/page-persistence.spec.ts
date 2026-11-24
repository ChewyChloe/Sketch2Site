import path from "node:path";
import {openWebsiteWorkspace} from "./helpers/workbench";
import {
  pageAction,
  viewAction,
  openPanel,
  editSelection,
  addFade,
  setFadeDuration,
  cancelSelection,
} from "./helpers/workbench";
import { test, expect, chromium, type Page } from "@playwright/test";
const key = "local-project";
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});
async function open(page: Page) {
  await page.goto("/");
  await openWebsiteWorkspace(page);
  await expect(page.locator(".rendered-page h1")).toBeVisible();
}
async function edit(page: Page, text: string, fade?: number) {
  await page.locator(".rendered-page h1").click();
  await editSelection(page);
  await page.getByLabel("標題文字").fill(text);
  if (fade) {
    await addFade(page);
    await setFadeDuration(page, String(fade));
  }
  await page.getByRole("button", { name: "套用", exact: true }).click();
}
async function saved(page: Page) {
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
}
async function disk(page: Page) {
  return page.evaluate(
    async () =>
      new Promise<any>((res, rej) => {
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result;
          const q = db
            .transaction("pages")
            .objectStore("pages")
            .get("local-project");
          q.onsuccess = () => {
            db.close();
            res(q.result);
          };
          q.onerror = () => rej(q.error);
        };
        r.onerror = () => rej(r.error);
      }),
  );
}
test("自動保存、刷新、新 Session 歷史、範例取消與 Canvas 隔離", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  const draftId = await page
    .getByTestId("canvas-node")
    .getAttribute("data-node-id");
  await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("已儲存至本機");
  await openWebsiteWorkspace(page);
  await expect(page.getByTestId("page-save-status")).toHaveText("尚未儲存");
  expect(await disk(page)).toBeUndefined();
  await edit(page, "已保存的頁面", 650);
  await saved(page);
  const first = await disk(page);
  await page.reload();
  await openWebsiteWorkspace(page);
  await expect(page.locator(".rendered-page h1")).toHaveText("已保存的頁面");
  await expect(page.getByRole("button", { name: "撤銷修改" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "重做修改" })).toBeDisabled();
  await page.locator(".rendered-page h1").click();
  await expect(page.getByLabel("動畫時長（毫秒）")).toHaveValue("650");
  await edit(page, "新工作階段修改");
  await saved(page);
  const second = await disk(page);
  expect(second.revision).toBe(first.revision + 1);
  expect(second.writerSessionId).not.toBe(first.writerSessionId);
  page.once("dialog", (d) => d.dismiss());
  await pageAction(page, "還原範例");
  await expect(page.locator(".rendered-page h1")).toHaveText("新工作階段修改");
  expect(await disk(page)).toEqual(second);
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await expect(page.getByTestId("canvas-node")).toHaveAttribute(
    "data-node-id",
    draftId!,
  );
  await page.close();
  const again = await context.newPage();
  await open(again);
  await expect(again.locator(".rendered-page h1")).toHaveText("新工作階段修改");
});
test("交易未完成不顯示已儲存；連續修改合併保存最新版本", async ({ page }) => {
  await open(page);
  await page.evaluate(
    async () =>
      new Promise<void>((res, rej) => {
        const flags = window as typeof window & { releasePageLock?: boolean };
        flags.releasePageLock = false;
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction("pages", "readwrite");
          const store = tx.objectStore("pages");
          let started = false;
          const pump = () => {
            const get = store.get("local-project");
            get.onsuccess = () => {
              if (!started) {
                started = true;
                res();
              }
              if (!flags.releasePageLock) pump();
            };
          };
          pump();
          tx.oncomplete = () => db.close();
        };
        r.onerror = () => rej(r.error);
      }),
  );
  await edit(page, "連續修改 A");
  await expect(page.getByTestId("page-save-status")).toHaveText("儲存中");
  await edit(page, "連續修改 B", 800);
  await expect(page.getByTestId("page-save-status")).toHaveText("儲存中");
  await page.evaluate(() => {
    (window as typeof window & { releasePageLock?: boolean }).releasePageLock =
      true;
  });
  await saved(page);
  expect((await disk(page)).revision).toBe(3); // Text A, attach preset, then text B + duration.
  await page.reload();
  await openWebsiteWorkspace(page);
  await expect(page.locator(".rendered-page h1")).toHaveText("連續修改 B");
});
test("配額失敗保留記憶體內容並可重試", async ({ page }) => {
  await page.addInitScript(() => {
    const native = IDBObjectStore.prototype.put;
    (window as typeof window & { denyPageSave?: boolean }).denyPageSave = true;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof native>
    ) {
      if (
        this.name === "pages" &&
        (window as typeof window & { denyPageSave?: boolean }).denyPageSave
      )
        throw new DOMException("quota", "QuotaExceededError");
      return native.apply(this, args);
    };
  });
  await open(page);
  await edit(page, "配額不足時的內容");
  await expect(page.getByTestId("page-save-status")).toHaveText("儲存失敗");
  await expect(
    page.getByText("儲存空間不足，修改仍保留在本頁。"),
  ).toBeVisible();
  await expect(page.locator(".rendered-page h1")).toHaveText(
    "配額不足時的內容",
  );
  expect(await disk(page)).toBeUndefined();
  await page.screenshot({
    path: "test-results/page-save-failure.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    (window as typeof window & { denyPageSave?: boolean }).denyPageSave = false;
  });
  await page.getByRole("button", { name: "重試儲存" }).click();
  await saved(page);
  await page.reload();
  await openWebsiteWorkspace(page);
  await expect(page.locator(".rendered-page h1")).toHaveText(
    "配額不足時的內容",
  );
});
test("兩個分頁拒絕過期寫入，重新載入才恢復編輯基準", async ({
  page,
  context,
}) => {
  await open(page);
  await edit(page, "共同基準");
  await saved(page);
  const other = await context.newPage();
  await other.emulateMedia({ reducedMotion: "reduce" });
  await open(other);
  await edit(page, "第一分頁的新版本");
  await saved(page);
  const latest = await disk(page);
  await edit(other, "第二分頁的過期修改");
  await expect(other.getByTestId("page-save-status")).toHaveText("版本衝突");
  await expect(other.locator(".rendered-page h1")).toHaveText(
    "第二分頁的過期修改",
  );
  expect(await disk(other)).toEqual(latest);
  await other.screenshot({
    path: "test-results/page-conflict.png",
    fullPage: true,
  });
  other.once("dialog", (d) => d.accept());
  await pageAction(other, "重新載入頁面");
  await expect(other.locator(".rendered-page h1")).toHaveText(
    "第一分頁的新版本",
  );
  await expect(other.getByRole("button", { name: "撤銷修改" })).toBeDisabled();
  await edit(other, "重新載入後繼續修改");
  await saved(other);
  expect((await disk(other)).revision).toBe(latest.revision + 1);
});
test("損毀資料不進 Renderer、不被範例覆蓋；確認後原子備份重開", async ({
  page,
}) => {
  await open(page);
  const bad = {
    schemaVersion: 99,
    projectId: key,
    raw: "需要手動復原的資料",
    pageSpec: { sections: [{ type: "script", content: "alert(1)" }] },
  };
  await page.evaluate(
    async (value) =>
      new Promise<void>((res, rej) => {
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction("pages", "readwrite");
          tx.objectStore("pages").put(value, "local-project");
          tx.oncomplete = () => {
            db.close();
            res();
          };
          tx.onabort = () => rej(tx.error);
        };
      }),
    bad,
  );
  await page.reload();
  await openWebsiteWorkspace(page);
  await expect(page.getByRole("alert")).toContainText("原始紀錄已保留");
  await expect(page.locator("[data-page-id]")).toHaveCount(0);
  expect(await disk(page)).toEqual(bad);
  await page.screenshot({
    path: "test-results/page-corrupt.png",
    fullPage: true,
  });
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "以範例重新開始" }).click();
  expect(await disk(page)).toEqual(bad);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "以範例重新開始" }).click();
  await saved(page);
  await expect(page.locator(".rendered-page h1")).toBeVisible();
  const backups = await page.evaluate(
    async () =>
      new Promise<any[]>((res, rej) => {
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result;
          const q = db
            .transaction("pageBackups")
            .objectStore("pageBackups")
            .getAll();
          q.onsuccess = () => {
            db.close();
            res(q.result);
          };
          q.onerror = () => rej(q.error);
        };
      }),
  );
  expect(backups).toHaveLength(1);
  expect(backups[0].original).toEqual(bad);
});
test("禁止 IndexedDB 時安全失敗且不顯示預設範例", async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await openWebsiteWorkspace(page);
  await expect(page.getByRole("alert")).toContainText("無法開啟本機儲存");
  await expect(page.locator("[data-page-id]")).toHaveCount(0);
});
test("關閉 Chromium 程序後使用同一隔離 profile 可恢復已保存頁面", async ({}, testInfo) => {
  const options = {
    reducedMotion: "reduce" as const,
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
    viewport: { width: 1440, height: 1000 },
  };
  // ASCII-only path: Chromium's IndexedDB hangs in profiles whose path contains
  // non-ASCII characters on some Linux setups, and the test title is Chinese.
  const profile = path.join(testInfo.project.outputDir, `persistent-profile-${testInfo.workerIndex}-${Date.now()}`);
  const first = await chromium.launchPersistentContext(profile, options);
  try {
    const p = await first.newPage();
    await openPersistent(p);
    await edit(p, "重新開啟瀏覽器仍保留", 750);
    await saved(p);
  } finally {
    await first.close();
  }
  const second = await chromium.launchPersistentContext(profile, options);
  try {
    const p = await second.newPage();
    await openPersistent(p);
    await expect(p.locator(".rendered-page h1")).toHaveText(
      "重新開啟瀏覽器仍保留",
    );
    await expect(p.getByRole("button", { name: "撤銷修改" })).toBeDisabled();
    await p.screenshot({
      path: "test-results/page-restored.png",
      fullPage: true,
    });
  } finally {
    await second.close();
  }
  async function openPersistent(p: Page) {
    await p.goto("http://127.0.0.1:5173");
    await p.getByRole("button", { name: "預覽", exact: true }).click();
    await expect(p.locator(".rendered-page h1")).toBeVisible();
  }
});
