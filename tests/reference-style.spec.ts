import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
// A reference picture teaches style only: read locally at once, and (with AI) described by fixed
// choices. The layout request carries those choices, never the picture.
async function openBrief(page: import("@playwright/test").Page) {
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  for (const n of ["首屏介紹", "三欄特色", "行動呼籲"]) await page.getByRole("button", { name: "新增區塊：" + n }).click();
  await page.getByRole("button", { name: "描述網站" }).click();
  return page.getByRole("dialog", { name: "描述你的網站" });
}

test("reference picture without AI: read in the browser, site follows its direction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const posts: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  const panel = await openBrief(page);
  const ref = panel.getByRole("region", { name: "參考圖片" });
  await expect(ref).toContainText("圖片不會上傳");
  await panel.getByLabel("選參考圖").setInputFiles("public/assets/samples/camera.jpg");
  await expect(ref.getByRole("img", { name: "參考圖片縮圖 1" })).toBeVisible();
  // Design techniques with why they work and how the site will use them; no theme names.
  const techniques = ref.getByRole("list", { name: "看到的設計手法" }).getByRole("listitem");
  expect(await techniques.count()).toBeGreaterThan(0);
  await expect(techniques.first()).toContainText("用在你的網站");
  await expect(ref).not.toContainText("方向");
  await page.screenshot({ path: "test-results/reference-local.png" });
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  await panel.getByRole("button", { name: "確認生成" }).click();
  await expect(page.locator("main[aria-label='生成候選預覽'] .rendered-page").first()).toHaveAttribute("data-art", /\S/);
  expect(posts.filter((u) => u.includes("/api/"))).toEqual([]);
});

test("reference picture with AI: one small JPEG to the AI, only style choices in the layout request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true }) }));
  const sent: { images?: string[] }[] = [];
  await page.route(/\/api\/generation\/reference$/, async (r) => {
    const req = JSON.parse(r.request().postData() ?? "{}");
    sent.push(req);
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ requestId: req.requestId, style: { mood: "premium", colorMode: "mono", temperature: "neutral", lightness: "light", contrast: "strong", typeFamily: "sans", typeScale: "huge", space: "airy", imagery: "full-bleed", motion: "still", principles: ["big-type", "restrained-brand", "negative-space"], direction: "mono" } }) });
  });
  const layoutBodies: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/api\/generation$/.test(r.url())) layoutBodies.push(r.postData() ?? ""); });
  const panel = await openBrief(page);
  await panel.getByLabel("選參考圖").setInputFiles("public/assets/samples/cafe.jpg");
  const reference = panel.getByRole("region", { name: "參考圖片" });
  await expect(reference.getByRole("img", { name: "參考圖片縮圖 1" })).toBeVisible();
  await expect(reference).not.toContainText("不會保存");
  await expect(reference).not.toContainText("學它們為什麼好看");
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  await panel.getByRole("button", { name: "確認生成" }).click();
  await expect.poll(() => sent.length).toBe(1);
  // A re-encoded, small JPEG: no EXIF segment, well under the size limit.
  expect(sent[0].images).toHaveLength(1);
  const bytes = Buffer.from(sent[0].images![0].split(",")[1], "base64");
  expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  expect(bytes.includes(Buffer.from("Exif"))).toBe(false);
  expect(bytes.length).toBeLessThan(240000);
  await expect.poll(() => layoutBodies.length).toBeGreaterThan(0);
  expect(layoutBodies.join("")).toContain('"principles":["big-type","restrained-brand","negative-space"]');
  // The reference picture itself never reaches the layout step; only the drawing of the author's own draft does.
  const layout = JSON.parse(layoutBodies[0]);
  expect(JSON.stringify(layout.canvasSpec)).not.toContain("base64");
  expect(layout.snapshot).not.toBe(sent[0].images![0]);
});

test("AI build sends a small drawing of the draft only to a back end that asks for it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const bodies: { snapshot?: string; canvasSpec?: unknown }[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/api\/generation$/.test(r.url())) bodies.push(JSON.parse(r.postData() ?? "{}")); });
  await page.goto("/?draft");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "Sketch2Site 首頁" }).click();
  await Promise.all([page.waitForEvent("load"), page.getByRole("article", { name: "範本：社團招生頁" }).getByRole("button", { name: /用這個範本開始/ }).click()]);
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "描述網站" }).click();
  const panel = page.getByRole("dialog", { name: "描述你的網站" });
  await expect(panel).not.toContainText("縮小的草稿圖");
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  await panel.getByRole("button", { name: "確認生成" }).click();
  await expect.poll(() => bodies.length).toBe(1);
  const snap = bodies[0].snapshot!;
  expect(snap).toMatch(/^data:image\/jpeg;base64,/);
  expect(snap.length).toBeLessThanOrEqual(120000);
  const bytes = Buffer.from(snap.split(",")[1], "base64");
  expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  writeFileSync("test-results/draft-snapshot.jpg", bytes);
  // The drawing shows the photos: it is not a blank page.
  const ink = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data; let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) dark++;
    return { w: img.width, dark: dark / (d.length / 4) };
  }, snap);
  expect(ink.w).toBe(448);
  expect(ink.dark).toBeGreaterThan(0.05);
});

test("a back end that does not ask for the drawing never gets one", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/status$/, async (r) => {
    const resp = await r.fetch(); const data = await resp.json(); delete data.snapshot;
    return r.fulfill({ response: resp, body: JSON.stringify(data) });
  });
  const bodies: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/api\/generation$/.test(r.url())) bodies.push(r.postData() ?? ""); });
  const panel = await openBrief(page);
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  await panel.getByRole("button", { name: "確認生成" }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).not.toContain("snapshot");
});

test("up to five reference pictures: thumbnails, remove one, and all five in one AI request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true }) }));
  const sent: { images?: string[]; purposes?: string[][] }[] = [];
  await page.route(/\/api\/generation\/reference$/, async (r) => {
    const req = JSON.parse(r.request().postData() ?? "{}");
    sent.push(req);
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ requestId: req.requestId, style: { mood: "warm", colorMode: "duo", temperature: "warm", lightness: "light", contrast: "soft", typeFamily: "serif", typeScale: "large", space: "airy", imagery: "framed", motion: "gentle", principles: ["negative-space"], direction: "forest" } }) });
  });
  const panel = await openBrief(page);
  const ref = panel.getByRole("region", { name: "參考圖片" });
  const photos = ["cafe", "camera", "coffee-flatwhite", "coffee-pourover", "coffee-tonic", "coffee-coldbrew"].map((n) => `public/assets/samples/${n}.jpg`);
  // Six chosen at once: five are kept and the note says why.
  await panel.getByLabel("選參考圖").setInputFiles(photos);
  await expect(ref.getByRole("list", { name: "已選的參考圖" }).getByRole("listitem")).toHaveCount(5);
  await expect(ref).toContainText("最多 5 張");
  await expect(ref.getByRole("button", { name: /再加一張/ })).toHaveCount(0);
  await expect(ref.getByRole("list", { name: "看到的設計手法" })).toBeVisible();
  await ref.scrollIntoViewIfNeeded();
  await ref.screenshot({ path: "test-results/reference-five.png" });
  await ref.getByRole("button", { name: "移除第 2 張參考圖" }).click();
  await expect(ref.getByRole("list", { name: "已選的參考圖" }).getByRole("listitem")).toHaveCount(4);
  await expect(ref.getByRole("button", { name: "＋ 再加一張（4/5）" })).toBeVisible();
  await panel.getByLabel("選參考圖").setInputFiles(photos[5]);
  await expect(ref.getByRole("list", { name: "已選的參考圖" }).getByRole("listitem")).toHaveCount(5);
  await ref.getByText("用途：整體風格", { exact: true }).first().click();
  const firstScope = ref.getByRole("group", { name: "第 1 張參考圖用途" });
  await firstScope.getByRole("checkbox", { name: "配色", exact: true }).check();
  await firstScope.getByRole("checkbox", { name: "留白與間距", exact: true }).check();
  await expect(firstScope.getByRole("checkbox", { name: "整體風格", exact: true })).not.toBeChecked();
  await panel.getByRole("button", { name: "查看生成計畫" }).click();
  await panel.getByRole("button", { name: "確認生成" }).click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].images).toHaveLength(5);
  expect(sent[0].purposes).toEqual([["color", "spacing"], ["overall"], ["overall"], ["overall"], ["overall"]]);
  for (const image of sent[0].images!) expect(Buffer.from(image.split(",")[1], "base64").subarray(0, 2).toString("hex")).toBe("ffd8");
  expect(JSON.stringify(sent[0]).length).toBeLessThan(1200000);
});
