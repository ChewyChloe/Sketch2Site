import { test, expect } from "@playwright/test";
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
  const input = structuredClone(demoPage);
  input.metadata.title =
    "作品 </title><script>window.exportPwned=true</script>";
  await page
    .getByLabel("載入頁面檔案")
    .setInputFiles({
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
  const service = spawn(
    "npm",
    ["run", "preview", "--", "--port", "4178", "--strictPort"],
    { cwd: project, stdio: "ignore", detached: false },
  );
  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch("http://127.0.0.1:4178")).status;
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
        url.origin !== "http://127.0.0.1:4178"
      ) {
        calls.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    await standalone.emulateMedia({ reducedMotion: "reduce" });
    await standalone.goto("http://127.0.0.1:4178");
    await expect(standalone.locator(".rendered-page h1")).toHaveText(
      "把想法，排成一個頁面。",
    );
    expect(await standalone.title()).toBe(input.metadata.title);
    expect(
      await standalone.evaluate(() => Boolean((window as any).exportPwned)),
    ).toBe(false);
    await expect(standalone.getByRole("img")).toBeVisible();
    await expect
      .poll(() =>
        standalone
          .getByRole("img")
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
      await run("pkill", ["-TERM", "-P", String(service.pid)]).catch(() => {});
      service.kill("SIGTERM");
    }
  }
});
