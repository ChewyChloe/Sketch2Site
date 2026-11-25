import { choose } from "./helpers/select";
import { test, expect } from "@playwright/test";
import { pageAction, openPanel, editSelection } from "./helpers/workbench";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const run = promisify(execFile);
test("private raster import, reload, Mock generation, page edits, animation and asset-inclusive export", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const external: string[] = [];
  await page.route("https://**/*", (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  const png = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e7f1ea";
    ctx.fillRect(0, 0, 800, 480);
    ctx.fillStyle = "#237552";
    ctx.fillRect(80, 80, 240, 240);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "匯入圖片", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "private-name-not-stored.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(page.getByTestId("canvas-node").locator("img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect
    .poll(() =>
      page
        .getByTestId("canvas-node")
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(800);
  await page.getByRole("button", { name: "儲存草稿", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("canvas-node").locator("img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await expect(
    page.locator('[data-candidate-mode="mock"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "使用此版本", exact: true }).click();
  // Confirmation commits asynchronously; wait until the candidate has closed before inspecting the saved preview.
  await expect(page.getByRole("main", { name: "生成候選預覽", exact: true })).toHaveCount(0);
  const image = page.locator(".preview-frame .page-image");
  await expect
    .poll(() =>
      image
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(800);
  await image.click();
  await editSelection(page);
  await page.getByLabel("圖片說明").fill("我的本機圖片");
  await page.getByLabel("圖片說明").blur();
  await expect(image.locator("img")).toHaveAttribute("alt", "我的本機圖片");
  await openPanel(page, "動畫");
  await page.getByRole("button", { name: "淡入", exact: true }).click();
  await expect(image).toHaveAttribute("data-effects", "fade-in");
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(image).toHaveAttribute("data-effects", "");
  await page.getByRole("button", { name: "重做修改" }).click();
  await expect(image).toHaveAttribute("data-effects", "fade-in");
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  const download = page.waitForEvent("download");
  await pageAction(page, "匯出 React 專案");
  const directory = await mkdtemp(join(tmpdir(), "image-export-")),
    path = join(directory, "site.zip");
  await (await download).saveAs(path);
  const result = await run("python3", [
    "-c",
    `import zipfile,sys,json
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
page=json.loads(z.read('src/page.json')); paths=[n for n in z.namelist() if n.startswith('public/assets/local/')]; assert len(paths)==1
assert z.read(paths[0]).startswith(bytes([137,80,78,71,13,10,26,10]))
assert 'private-name-not-stored' not in ''.join(n for n in z.namelist())+z.read('src/page.json').decode()
print('PASS')`,
    path,
  ]);
  expect(result.stdout.trim()).toBe("PASS");
  const before = await page.evaluate(async () => {
    const r = indexedDB.open("sketch2site", 3);
    return new Promise((resolve) => {
      r.onsuccess = () => {
        const d = r.result,
          q = d.transaction("pages").objectStore("pages").get("local-project");
        q.onsuccess = () => {
          resolve(q.result);
          d.close();
        };
      };
    });
  });
  await pageAction(page, "重新載入頁面");
  await expect(page.getByRole("img", { name: "我的本機圖片" })).toBeVisible();
  expect(external).toEqual([]);
  expect(JSON.stringify(before)).not.toContain("blob:");
  await page.screenshot({
    path: "test-results/local-image-page-1440.png",
    fullPage: true,
  });
});
test("forged images fail without modifying the draft or retaining filenames", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByLabel("匯入圖片檔案").setInputFiles({
    name: "forged.png",
    mimeType: "image/png",
    buffer: Buffer.from('<svg onload="window.assetPwned=true"/>'),
  });
  await expect(page.getByRole("status")).toContainText("圖片無效");
  await expect(page.getByTestId("canvas-node")).toHaveCount(0);
  expect(await page.evaluate(() => Boolean((window as any).assetPwned))).toBe(
    false,
  );
});

// Photos stay JPEG after re-encoding (smaller than PNG); metadata is still dropped.
test("JPEG downscales to a re-encoded JPEG and replacing refs revokes object URLs; Undo restores the image", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const tracked = new Set<string>(),
      revoked: string[] = [];
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      tracked.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      tracked.delete(url);
      revoked.push(url);
      revoke(url);
    };
    Object.assign(window, { assetUrlState: { tracked, revoked } });
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  const jpeg = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 2400;
    c.height = 1200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#27674f";
    x.fillRect(0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg").split(",")[1];
  });
  await page.getByLabel("匯入圖片檔案").setInputFiles({
    name: "private.jpeg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(jpeg, "base64"),
  });
  const image = page.getByTestId("canvas-node").locator("img");
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1600);
  const previous = await image.getAttribute("src");
  await choose(page.getByLabel("草稿圖片素材"), "/assets/workspace.svg");
  await expect
    .poll(() =>
      page.evaluate(
        (url) => (window as any).assetUrlState.revoked.includes(url),
        previous,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "還原", exact: true }).click();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1600);
  await expect(image).not.toHaveAttribute("src", previous!);
  const records = await page.evaluate(
    () =>
      new Promise<any[]>((resolve) => {
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("assets").objectStore("assets").getAll();
          q.onsuccess = () => {
            resolve(
              q.result.map((v) => ({
                keys: Object.keys(v),
                type: v.blob.type,
                width: v.width,
                height: v.height,
              })),
            );
            db.close();
          };
        };
      }),
  );
  expect(records).toEqual([
    {
      keys: ["schemaVersion", "ref", "blob", "width", "height"],
      type: "image/jpeg",
      width: 1600,
      height: 800,
    },
  ]);
});

test("an import completing after a draft edit cannot overwrite the new draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const decode = window.createImageBitmap.bind(window);
    window.createImageBitmap = (async (...args: any[]) => {
      await new Promise((resolve) =>
        window.addEventListener("release-import", resolve, { once: true }),
      );
      return (decode as any)(...args);
    }) as typeof createImageBitmap;
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 4;
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("匯入圖片檔案")
    .setInputFiles({
      name: "race.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await expect(
    page.getByRole("button", { name: "正在匯入圖片…", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("release-import")));
  await expect(page.getByRole("status")).toContainText("草稿剛剛變了");
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);
  await expect(page.getByTestId("canvas-node").locator("img")).toHaveCount(0);
});
