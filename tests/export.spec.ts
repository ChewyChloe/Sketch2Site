import { marqueeId, marqueeLayouts, marqueeModesSection } from "./fixtures/marqueeModes";
import { textModeId, textModes, textModesSection } from "./fixtures/textModes";
import { galleryCategorySection } from "./fixtures/galleryCategories";
import {thirdFixture, tabsFixture} from "./fixtures/cinematicMotions";
import {advancedFixture} from "./fixtures/advancedMotions";
import {openWebsiteWorkspace} from "./helpers/workbench";
import { exportSite } from "./helpers/workbench";
import {serverMotionRegistry} from "../server/motionBriefs";
import {extendedMotionFixture} from "./fixtures/extendedMotions";
import {referenceFixture} from "./fixtures/referenceMotions";
import {createServer} from "node:net";
import { test, expect } from "@playwright/test";
import {motionFixture,motionId} from "./fixtures/motions";
import { createMotion } from "../src/motion";
import { PageSchema } from "../src/pageSpec";
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
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
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
  await openWebsiteWorkspace(page);
  const input = structuredClone(demoPage);
  input.chrome = { nav: true, footer: false, navStyle: "top-sticky", menuMotion: "strips" };
  const layoutSection = input.sections[0];
  layoutSection.sectionLayout = { arrangement: { mode: "masonry", columns: 2, gap: "medium", mobile: "stack" }, fullBleed: true };
  const cinematic = thirdFixture();
  cinematic.sections[0].children![0].effects[0].validatedControls.style = "portal";
  const story = cinematic.sections.map(section => section.children![0]).find(node => node.effects[0].presetId === "pinned-story-panels")!;
  story.effects[0].validatedControls.presentation = "media";
  const gooey = cinematic.sections.map(section => section.children![0]).find(node => node.effects[0].presetId === "gooey-blob-merge")!;
  gooey.effects[0].validatedControls.flow = "drift";
  const motions=motionFixture();motions.sections[0].children![0].level=2;const extended=extendedMotionFixture();extended.sections[0].children![0].level=2;input.sections.push(...motions.sections,...extended.sections,...advancedFixture().sections,...cinematic.sections,...[(()=>{const r=referenceFixture(true).sections;return {...r[0],children:r.flatMap(x=>x.children)};})()] as typeof input.sections);
  const countdown = {
    id: motionId(25), type: "paragraph" as const, content: "7",
    effects: [createMotion("count-up", motionId(25), { cadence: "impact", startValue: 10, endValue: 7, durationMs: 1200 })],
  };
  motions.sections[0].children!.push(countdown);
  const replaceImage = (nodes: typeof input.sections) =>
    nodes.forEach((n) => {
      if (n.type === "image") n.src = localRef;
      if (n.children) replaceImage(n.children);
    });
  replaceImage(input.sections);
  const interactiveBento = galleryCategorySection();
  interactiveBento.sectionLayout = { arrangement: { mode: "bento", columns: 3, gap: "medium", interactive: true }, fullBleed: false };
  const textSection = textModesSection();
  textSection.children!.push(...marqueeModesSection().children!);
  input.sections.push(interactiveBento, ...tabsFixture().sections, textSection);
  input.metadata.title =
    "作品 </title><script>window.exportPwned=true</script>";
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "export.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(PageSchema.parse(JSON.parse(JSON.stringify(input))))),
  });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  const download = page.waitForEvent("download");
  await exportSite(page);
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
  for(const entry of await readdir(join(project,'src'),{withFileTypes:true})){
    if(!entry.isFile())continue;
    const filename=entry.name;
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
  expect(await readFile(join(project,"public/assets/sequence/frame-03.svg"),"utf8")).toContain("FRAME 03");
  expect(await readFile(join(project,"public/assets/workspace.svg"),"utf8")).toContain("<svg");
  // The default Chinese font (思源黑體) ships with the site: only the needed pieces, plus the licence.
  const fontFiles = (await readdir(join(project, "src/fonts/noto-sans-tc"))).filter((f) => f.endsWith(".woff2"));
  expect(fontFiles.length).toBeGreaterThan(0);
  expect(fontFiles.length).toBeLessThan(108);
  expect(await readFile(join(project, "src/fonts/noto-sans-tc/OFL.txt"), "utf8")).toContain("SIL Open Font License");
  expect(await readFile(join(project, "src/fonts.css"), "utf8")).toContain("url(./fonts/noto-sans-tc/noto-sans-tc-");
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
    const digit = standalone.locator(`[data-page-id="${countdown.id}"] .motion-number-value`);
    await expect(digit).toHaveAttribute("data-impact", "");
    await expect(digit).toHaveText("7");
    expect(await digit.evaluate(el => el.getAnimations().length)).toBe(0);
    const exportedStory = standalone.locator(`[data-page-id="${story.id}"]`);
    await expect(exportedStory.locator(".story-vertical img")).toHaveCount(3);
    const gooeySurface = standalone.locator(`[data-page-id="${gooey.id}"] .cin-gooey-drift`);
    await expect(gooeySurface.locator("circle")).toHaveCount(3);
    await expect(gooeySurface.locator("g[filter]")).toHaveCount(0);
    const gallery = standalone.getByRole("group", { name: "作品分類" }).locator("..");
    await expect(gallery.getByRole("img")).toHaveCount(3);
    await gallery.getByRole("button", { name: "靜物" }).click();
    await expect(gallery.getByRole("img")).toHaveCount(1);
    await expect(gallery.getByRole("img")).toHaveAttribute("alt", "第二張");
    const tablist = standalone.getByRole("tablist", { name: "內容分頁" });
    await tablist.getByRole("tab", { name: "構思" }).press("ArrowRight");
    await expect(tablist.getByRole("tab", { name: "設計" })).toBeFocused();
    await expect(standalone.getByRole("tabpanel", { name: "設計" })).toBeVisible();
    for (const [index, mode] of textModes.entries()) {
      const text = standalone.locator(`[data-page-id="${textModeId(index)}"]`);
      await expect(text).toHaveAttribute("data-effects", mode.id);
      await expect(text).toHaveAccessibleName(mode.title + "文字");
    }
    for (const [index] of marqueeLayouts.entries()) {
      const text = standalone.locator(`[data-page-id="${marqueeId(index + 2)}"]`);
      await expect(text).toHaveAttribute("data-effects", "marquee-text");
      await expect(text).toHaveAccessibleName("城市聲音與日常風景");
    }
    const exportedLayout = standalone.locator('[data-section-arrangement="masonry"]');
    await expect(exportedLayout).toHaveCSS("column-count", "2");
    await expect(standalone.locator(`[data-page-id="${layoutSection.id}"]`)).toHaveAttribute("data-section-bleed", "");
    expect(
      await standalone.evaluate(() => Boolean((window as any).exportPwned)),
    ).toBe(false);
    await expect(standalone.getByRole("img").first()).toBeVisible();
    for (const [id, layer] of [["crosswind-ribbons", ".ref-ribbons"], ["vanishing-lattice", ".ref-lattice"], ["drift-letterfall", ".ref-letterfall"], ["turning-letter-mosaic", ".ref-mosaic"]] as const) {
      await expect(standalone.locator(`[data-effects~="${id}"] ${layer}`)).toHaveAttribute("aria-hidden", "true");
    }
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
    for(const node of advancedFixture().sections[0].children!){const target=standalone.locator(`[data-page-id="${node.id}"]`);await expect(target).toHaveAttribute('data-effects',node.effects[0].presetId);}
    await standalone.emulateMedia({reducedMotion:'no-preference'});
    const exportedRibbons = standalone.locator('.sig-multiband[data-layout="ribbon-cross"]');
    await exportedRibbons.scrollIntoViewIfNeeded();
    await expect(exportedRibbons.locator(".sig-band")).toHaveCount(2);

    await gallery.getByRole("button", { name: "全部作品" }).click();
    const bento = gallery.locator("[data-section-arrangement=bento]");
    const secondTile = bento.locator("> .page-node").nth(1);
    await expect(secondTile).toBeVisible();
    await secondTile.evaluate(el => { (el as HTMLElement).tabIndex = 0; });
    await secondTile.focus();
    await expect(secondTile).toHaveAttribute("data-bento-active", "");

    await exportedMotion(10).scrollIntoViewIfNeeded();
    const exportedCanvas=exportedMotion(10).locator('canvas');await expect(exportedCanvas).toBeVisible();
    await expect.poll(()=>exportedCanvas.evaluate((el:HTMLCanvasElement)=>el.getContext('2d')!.getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0))).toBe(true);
    await standalone.mouse.move(0,0);
    await exportedMotion(5).scrollIntoViewIfNeeded();
    await exportedMotion(5).evaluate(el=>(el as HTMLElement).blur());
    await expect(exportedMotion(5)).toHaveAttribute("data-motion-paused","false");
    await expect.poll(()=>exportedMotion(5).evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running'&&a.effect?.getComputedTiming().iterations===Infinity))).toBe(true);
    for(const section of thirdFixture().sections){const node=section.children![0];await expect(standalone.locator(`[data-page-id="${node.id}"]`)).toHaveAttribute('data-effects',node.effects[0].presetId);}
    const storyPreview = exportedStory.locator(".story-viewport");
    await expect(exportedStory.locator(".story-media-pin [data-active=true] img")).toHaveAttribute("alt", "構思的影像");
    await storyPreview.evaluate(host => { host.scrollTop = host.clientHeight; });
    await expect(exportedStory.locator(".story-media-pin [data-active=true] img")).toHaveAttribute("alt", "設計的影像");
    const thirdNodes=thirdFixture().sections.map(s=>s.children![0]);
    const morph=standalone.locator(`[data-page-id="${thirdNodes[0].id}"]`);await morph.getByRole('button',{name:'切換文字'}).click();await expect(morph.locator('.cin-text-source')).toHaveText('設計成真');
    await expect(morph.locator('.cin-word-stage')).toHaveCount(2);
    const sequence=standalone.locator(`[data-page-id="${thirdNodes[16].id}"]`);await sequence.scrollIntoViewIfNeeded();await sequence.getByLabel('序列影格進度').fill('100');await sequence.getByLabel('序列影格進度').dispatchEvent('input');await expect(sequence.locator('img')).toHaveAttribute('src',/frame-03.svg$/);await expect.poll(()=>sequence.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
    const follower=standalone.locator(`[data-page-id="${thirdNodes[5].id}"]`);await follower.focus();await expect(follower.locator('.cin-follower')).toHaveAttribute('data-visible','true');await expect.poll(()=>follower.locator('.cin-follower').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
    const shape=standalone.locator(`[data-page-id="${thirdNodes[19].id}"]`),path=shape.locator('.cin-shape path'),beforeShape=await path.getAttribute('d');await shape.getByRole('button',{name:'變換圖形'}).click();await expect.poll(()=>path.getAttribute('d')).not.toBe(beforeShape);
    const advancedNodes=advancedFixture().sections[0].children!;
    const newRipple=standalone.locator(`[data-page-id="${advancedNodes[7].id}"]`);await newRipple.scrollIntoViewIfNeeded();await newRipple.evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));await newRipple.focus();await newRipple.press('Enter');await expect(newRipple.locator('.advanced-ripple')).toHaveCount(1);await expect(newRipple.locator('.advanced-ripple')).toHaveCount(0);
    const newPan=standalone.locator(`[data-page-id="${advancedNodes[13].id}"]`);await newPan.scrollIntoViewIfNeeded();await expect.poll(()=>newPan.evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running'))).toBe(true);
    const newTrace=standalone.locator(`[data-page-id="${advancedNodes[9].id}"]`);await newTrace.focus();await expect(newTrace.locator('.advanced-border-svg')).toHaveCSS('opacity','1');
    await standalone.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>newPan.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
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
    await expect(exportedLayout).toHaveCSS("column-count", "1");
    const menu = standalone.locator(".page-nav-menu");
    const navLinks = standalone.locator(".page-nav nav");
    await expect(menu).toHaveAttribute("data-menu-motion", "strips");
    await menu.click();
    await expect(navLinks).toBeVisible();
    const strips = navLinks.locator(".page-nav-strips > span");
    await expect(strips).toHaveCount(5);
    await expect(strips.last()).toHaveCSS("transition-duration", "0s");
    await menu.press("Escape");
    await expect(navLinks).toBeHidden();
    for (const columns of await standalone
      .locator(".page-grid")
      .evaluateAll((els) =>
        els.map(el => getComputedStyle(el)).filter(css => css.display === "grid").map(css => css.gridTemplateColumns),
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
