import { test, expect } from "@playwright/test";
import { openWebsiteWorkspace } from "./helpers/workbench";

// Each candidate's composition, measured on the drawn page: where the picture sits relative to
// the text, at desktop, tablet and phone widths; no sideways scrolling; the action stays visible.
const uid = (n: number) => `78000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const styleOf = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" });
const site = (plan: string) => ({
  schemaVersion: 2, metadata: { title: "小島咖啡", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 2 }, plan,
  sections: [{ id: uid(1), type: "section", role: "hero", style: styleOf(), effects: [], children: [{ id: uid(2), type: "container", style: styleOf(), effects: [], children: [{ id: uid(3), type: "grid", columns: 2, style: styleOf(), effects: [], children: [
    { id: uid(4), type: "stack", style: styleOf(), effects: [], children: [
      { id: uid(5), type: "heading", level: 1, content: "每天一杯，剛剛好的手沖咖啡", style: styleOf(), effects: [] },
      { id: uid(6), type: "paragraph", content: "學校後門走路三分鐘，週一到週六早上八點開門。", style: styleOf(), effects: [] },
      { id: uid(7), type: "button", content: "看今日菜單", href: "https://menu.island-coffee.tw/", style: styleOf(), effects: [] },
    ] },
    { id: uid(8), type: "stack", style: styleOf(), effects: [], children: [{ id: uid(9), type: "image", src: "/assets/samples/coffee-pourover.jpg", alt: "手沖咖啡", style: styleOf(), effects: [] }] },
  ] }] }] }],
});
const box = (page: import("@playwright/test").Page, n: number) => page.locator(`.preview-frame [data-page-id="${uid(n)}"]`).boundingBox();

for (const plan of ["focus", "headline", "column"])
  for (const width of [1440, 768, 390])
    test(`${plan} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?draft");
      await expect(page.getByRole("status")).toContainText("草稿已就緒");
      await openWebsiteWorkspace(page);
      await page.getByLabel("載入頁面檔案").setInputFiles({ name: "site.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(site(plan))) });
      await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
      await expect(page.locator(".preview-frame .rendered-page")).toHaveAttribute("data-plan", plan);
      const frame = page.locator(".preview-frame .rendered-page");
      expect(await frame.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
      const heading = (await box(page, 5))!, image = (await box(page, 9))!, button = (await box(page, 7))!;
      expect(button.width).toBeGreaterThan(0);
      const pageWidth = (await frame.boundingBox())!.width;
      if (pageWidth > 801) {
        if (plan === "focus") { expect(image.x).toBeGreaterThan(heading.x + heading.width / 2); expect(image.width).toBeGreaterThan(heading.width * 1.2); }
        if (plan === "headline") { expect(image.y).toBeGreaterThan(button.y); expect(image.width).toBeGreaterThan(pageWidth * 0.8); }
        if (plan === "column") { expect(image.y).toBeGreaterThan(heading.y + 40); expect(image.x).toBeGreaterThan(heading.x); }
      } else {
        // One column in reading order: text, then the picture.
        expect(image.y).toBeGreaterThan(button.y);
      }
      await frame.screenshot({ path: `test-results/plan-${plan}-${width}.png` });
    });
