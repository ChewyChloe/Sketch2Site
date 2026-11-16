import {serverMotionRegistry} from "../server/motionBriefs";
import {extendedMotionFixture} from "./fixtures/extendedMotions";
import {createServer} from "node:net";
import { test, expect } from "@playwright/test";
import {motionFixture,motionId} from "./fixtures/motions";
import { demoPage } from "../src/pageFixtures";
import { pageAction } from "./helpers/workbench";
import { mkdtemp, readFile, readdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
test("downloaded React project installs and builds independently; runtime stays offline and responsive", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  // A local raster is imported through the real UI, then referenced by the page being exported.
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  const raster = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 160;
    const x = c.getContext("2d")!;
    x.fillStyle = "#237552";
    x.fillRect(0, 0, 320, 160);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("匯入圖片檔案")
    .setInputFiles({
      name: "export-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(raster, "base64"),
    });
  await expect(page.getByTestId("canvas-node").locator("img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const localRef = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const r = indexedDB.open("sketch2site", 3);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("assets").objectStore("assets").getAllKeys();
          q.onsuccess = () => {
            resolve(String(q.result[0]));
            db.close();
          };
        };
      }),
  );
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  const input = structuredClone(demoPage);
  const motions=motionFixture();motions.sections[0].children![0].level=2;const extended=extendedMotionFixture();extended.sections[0].children![0].level=2;input.sections.push(...motions.sections,...extended.sections);
  const replaceImage = (nodes: typeof input.sections) =>
    nodes.forEach((n) => {
      if (n.type === "image") n.src = localRef;
      if (n.children) replaceImage(n.children);
    });
  replaceImage(input.sections);
  input.metadata.title =
    "作品 </title><script>window.exportPwned=true</script>";
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "export.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(input)),
  });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  const download = page.waitForEvent("download");
  await pageAction(page, "匯出 React 專案");
  const file = await download;
  const directory = await mkdtemp(join(tmpdir(), "sketch-export-")),
    archive = join(directory, "project.zip"),
    project = join(directory, "project");
  await file.saveAs(archive);
  await run("python3", [
    "-c",
    `import zipfile,sys,pathlib
z=zipfile.ZipFile(sys.argv[1]); root=pathlib.Path(sys.argv[2]); assert z.testzip() is None
for n in z.namelist():
 p=pathlib.PurePosixPath(n); assert not p.is_absolute() and '..' not in p.parts
 assert n not in ['.env'] and not any(t in n for t in ['server/','provider','CandidatePreview','usePagePersistence','patch.ts'])
z.extractall(root)
`,
    archive,
    project,
  ]);
  for(const filename of await readdir(join(project,'src'))){
    const content=await readFile(join(project,'src',filename),'utf8');
    expect(content).not.toContain('implementationBrief');expect(content).not.toContain('designIntent');
    for(const spec of Object.values(serverMotionRegistry))expect(content).not.toContain(spec.implementationBrief);
  }
  const runtime = await readFile(join(project, "src/PageRuntime.tsx"), "utf8");
  for (const forbidden of [
    "sessionId",
    "onSelect",
    "selectedId",
    "IndexedDB",
    "You are a responsive",
    "OPENAI_API_KEY",
  ])
    expect(runtime).not.toContain(forbidden);
  expect(await readFile(join(project, "package.json"), "utf8")).not.toContain(
    "openai",
  );
  await run(
    "npm",
    ["ci", "--ignore-scripts", "--cache", "/workspace/.npm-cache"],
    { cwd: project, timeout: 90000, maxBuffer: 1024 * 1024 },
  );
  await run("npm", ["run", "build"], {
    cwd: project,
    timeout: 60000,
    maxBuffer: 1024 * 1024,
  });
  expect(await readdir(join(project, "node_modules"))).toContain("react");
  const previewPort=await new Promise<number>((resolve,reject)=>{const socket=createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const address=socket.address();if(!address||typeof address==='string')return reject(new Error('missing preview port'));socket.close(()=>resolve(address.port));});});
  const service = spawn(
    "npm",
    ["run", "preview", "--", "--port", String(previewPort), "--strictPort"],
    { cwd: project, stdio: "ignore", detached: true },
  );
  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch(`http://127.0.0.1:${previewPort}`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    const standalone = await context.newPage(),
      calls: string[] = [];
    await standalone.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        url.protocol.startsWith("http") &&
        url.origin !== `http://127.0.0.1:${previewPort}`
      ) {
        calls.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    await standalone.emulateMedia({ reducedMotion: "reduce" });
    await standalone.goto(`http://127.0.0.1:${previewPort}`);
    await expect(standalone.locator(".rendered-page h1")).toHaveText(
      "把想法，排成一個頁面。",
    );
    expect(await standalone.title()).toBe(input.metadata.title);
    expect(
      await standalone.evaluate(() => Boolean((window as any).exportPwned)),
    ).toBe(false);
    await expect(standalone.getByRole("img").first()).toBeVisible();
    const exportedMotion=(id:number)=>standalone.locator(`[data-page-id="${motionId(id)}"]`);
    await expect(exportedMotion(3)).toContainText("1,234.50");
    await expect(exportedMotion(4).locator('textPath')).toHaveCount(1);
    await exportedMotion(6).getByRole('button',{name:'查看背面'}).click();
    await expect(exportedMotion(6).getByText('使用者提供的背面內容')).toBeVisible();
    await exportedMotion(8).getByRole('button',{name:'折頁切換'}).click();
    await expect(exportedMotion(8).getByText('使用者提供的下層內容')).toBeVisible();
    await expect(exportedMotion(10).getByRole('list')).toBeVisible();
    for(const [id,target] of Object.entries(extended.sections[0].children!.filter(n=>n.effects.length).reduce((m,n)=>({...m,[n.effects[0].presetId]:n.id}),{} as Record<string,string>)))
      await expect(standalone.locator(`[data-page-id="${target}"]`)).toHaveAttribute('data-effects',id);
    const disclosure=standalone.locator(`[data-page-id="${extended.sections[0].children!.at(-1)!.id}"]`);
    await disclosure.getByRole('button',{name:'展開內容'}).click();await expect(disclosure.getByText('展開後閱讀完整補充說明')).toBeVisible();
    await disclosure.getByRole('button',{name:'收合內容'}).click();await expect(disclosure.getByText('展開後閱讀完整補充說明')).toBeHidden();
    await standalone.emulateMedia({reducedMotion:'no-preference'});
    await exportedMotion(10).scrollIntoViewIfNeeded();
    const exportedCanvas=exportedMotion(10).locator('canvas');await expect(exportedCanvas).toBeVisible();
    await expect.poll(()=>exportedCanvas.evaluate((el:HTMLCanvasElement)=>el.getContext('2d')!.getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0))).toBe(true);
    await exportedMotion(5).scrollIntoViewIfNeeded();
    await expect.poll(()=>exportedMotion(5).evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running'&&a.effect?.getComputedTiming().iterations===Infinity))).toBe(true);
    await standalone.emulateMedia({reducedMotion:'reduce'});
    await standalone.evaluate(()=>window.scrollTo(0,0));
    await expect
      .poll(() =>
        standalone
          .getByRole("img").first()
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(
      standalone.locator(
        ".visual-tools,.annotation-layer,[data-page-selected]",
      ),
    ).toHaveCount(0);
    await standalone.screenshot({
      path: "test-results/export-1440.png",
      fullPage: true,
    });
    await standalone.setViewportSize({ width: 375, height: 1000 });
    for (const columns of await standalone
      .locator(".page-grid")
      .evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).gridTemplateColumns),
      ))
      expect(columns.trim().split(/\s+/)).toHaveLength(1);
    expect(
      await standalone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await standalone.screenshot({
      path: "test-results/export-375.png",
      fullPage: true,
    });
    expect(calls).toEqual([]);
    await standalone.close();
    await copyFile(archive, "test-results/validated-react-project.zip");
  } finally {
    if (service.pid) {
      try{process.kill(-service.pid,"SIGTERM");}catch{/* already exited */}
    }
  }
});
