import { test, expect } from "@playwright/test";
// A reference picture teaches style only: read locally at once, and (with AI) described by fixed
// choices. The layout request carries those choices, never the picture.
async function openBrief(page: import("@playwright/test").Page) {
  await page.goto("/");
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
  await panel.getByLabel("選一張參考圖").setInputFiles("public/assets/samples/camera.jpg");
  await expect(ref.getByRole("img", { name: "參考圖片縮圖" })).toBeVisible();
  // Design techniques with why they work and how the site will use them; no theme names.
  const techniques = ref.getByRole("list", { name: "看到的設計手法" }).getByRole("listitem");
  expect(await techniques.count()).toBeGreaterThan(0);
  await expect(techniques.first()).toContainText("用在你的網站");
  await expect(ref).not.toContainText("方向");
  await page.screenshot({ path: "test-results/reference-local.png" });
  await panel.getByRole("button", { name: "用這個描述生成網站" }).click();
  await expect(page.locator("main[aria-label='生成候選預覽'] .rendered-page").first()).toHaveAttribute("data-art", /\S/);
  expect(posts.filter((u) => u.includes("/api/"))).toEqual([]);
});

test("reference picture with AI: one small JPEG to the AI, only style choices in the layout request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/api\/generation\/ready$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true }) }));
  const sent: { image?: string }[] = [];
  await page.route(/\/api\/generation\/reference$/, async (r) => {
    const req = JSON.parse(r.request().postData() ?? "{}");
    sent.push(req);
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ requestId: req.requestId, style: { mood: "premium", colorMode: "mono", temperature: "neutral", lightness: "light", contrast: "strong", typeFamily: "sans", typeScale: "huge", space: "airy", imagery: "full-bleed", motion: "still", principles: ["big-type", "restrained-brand", "negative-space"], direction: "mono" } }) });
  });
  const layoutBodies: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/api\/generation$/.test(r.url())) layoutBodies.push(r.postData() ?? ""); });
  const panel = await openBrief(page);
  await panel.getByLabel("選一張參考圖").setInputFiles("public/assets/samples/cafe.jpg");
  await expect(panel.getByRole("region", { name: "參考圖片" })).toContainText("不會保存");
  await panel.getByRole("button", { name: "用這個描述生成網站" }).click();
  await expect.poll(() => sent.length).toBe(1);
  // A re-encoded, small JPEG: no EXIF segment, well under the size limit.
  const bytes = Buffer.from(sent[0].image!.split(",")[1], "base64");
  expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  expect(bytes.includes(Buffer.from("Exif"))).toBe(false);
  expect(bytes.length).toBeLessThan(240000);
  await expect.poll(() => layoutBodies.length).toBeGreaterThan(0);
  expect(layoutBodies.join("")).toContain('"principles":["big-type","restrained-brand","negative-space"]');
  expect(layoutBodies.join("")).not.toContain("base64");
});
