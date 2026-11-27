import { test, expect } from "@playwright/test";
import { useTemplate, buildSite } from "./helpers/workbench";
import { createMotion } from "../src/motion";
import { PageSchema, type PageNode, type PageSpec } from "../src/pageSpec";

const concepts = [
  ["swiss", "瑞士國際主義"], ["japanese-minimal", "日式極簡"], ["nordic", "北歐美學"],
  ["editorial-magazine", "雜誌編輯排版"], ["retro-digital", "復古數位"], ["y2k", "Y2K"],
  ["neo-brutalist", "新粗獷主義"], ["organic", "有機自然"], ["storybook", "童話繪本"],
  ["architectural", "建築作品集"],
] as const;

function* walk(nodes: PageNode[]): Generator<PageNode> {
  for (const node of nodes) {
    yield node;
    yield* walk(node.children ?? []);
  }
}

test("all added concepts preserve motion rules, component compatibility and export", async ({ page }) => {
  test.setTimeout(120_000);
  let mockPage: PageSpec | undefined;
  let targetId: string | undefined;
  await page.goto("/?draft");
  await useTemplate(page, "巷口咖啡小店");
  await page.route("**/api/generation", async route => {
    const response = await route.fetch();
    const result = await response.json();
    const hero = result.page.sections[0];
    if (!hero) throw new Error("Mock fixture needs a hero section");
    delete result.page.draftLayout;
    hero.role = "hero";
    hero.lock = { text: true, assets: true, layout: true };
    const heading = Array.from(walk(result.page.sections)).find(node => node.type === "heading");
    if (!heading) throw new Error("Mock fixture needs a heading");
    targetId = heading.id;
    mockPage = PageSchema.parse(result.page);
    await route.fulfill({ response, json: result });
  });
  await buildSite(page);
  const candidate = page.getByRole("main", { name: "生成候選預覽" });
  await expect(candidate.locator('[data-candidate-mode="mock"]')).toBeVisible();
  const frame = candidate.locator(".preview-frame .rendered-page");
  const picker = candidate.getByRole("radiogroup", { name: "設計概念" });
  if (!(await picker.isVisible())) await candidate.locator("summary").filter({ hasText: "細調：構圖、設計概念、主題" }).click();
  await picker.getByRole("radio", { name: "不用概念" }).click();
  const source = () => frame.locator("[data-page-id]").evaluateAll(nodes => nodes.map(node => [
    node.getAttribute("data-page-id"), node.getAttribute("data-effects"),
    node.matches("h1,h2,h3,p,a") ? node.textContent : null,
    node.querySelector("img")?.getAttribute("src") ?? null,
  ]));
  const baseline = await source();
  const locked = frame.locator('.role-hero[data-locked~="layout"]');
  const lockedLayout = () => locked.evaluate(section => [
    getComputedStyle(section).paddingBlock,
    ...Array.from(section.querySelectorAll(".page-grid"), grid => getComputedStyle(grid).gridTemplateColumns),
  ]);
  expect(await frame.locator(".page-section").evaluateAll(nodes => nodes.map(n => [n.className,n.getAttribute("data-locked")]))).toContainEqual([expect.stringContaining("role-hero"), "text assets layout"]);
  await expect(locked).toBeVisible();
  const desktopLock = await lockedLayout();
  expect(baseline).toContainEqual([targetId, "slide-up", expect.any(String), null]);
  if (!mockPage || !targetId) throw new Error("Mock generation did not complete");
  const generated: PageSpec = mockPage;
  const headingId: string = targetId;
  const devices = candidate.getByRole("group", { name: "預覽寬度" });
  const profiles = new Set<string>();
  for (const [id, name] of concepts) {
    await test.step(name, async () => {
      await devices.getByRole("button", { name: "桌面" }).click();
      await picker.getByRole("radio", { name, exact: true }).click();
      await expect(frame).toHaveAttribute("data-concept", id);
      profiles.add(await frame.evaluate(root => JSON.stringify([
        ...Array.from(root.querySelectorAll(".page-heading,.page-image img,.page-section,.page-grid,.page-button,.page-card"), node => {
          const css = getComputedStyle(node);
          return [css.fontFamily, css.paddingBlock, css.aspectRatio, css.borderRadius, css.gridTemplateColumns, css.borderStyle, css.borderBlockStartWidth, css.borderBlockEndWidth, css.fontWeight, css.letterSpacing, css.backgroundColor, css.color, css.boxShadow];
        }),
      ])));
      expect(await source()).toEqual(baseline);
      expect(await lockedLayout(), name).toEqual(desktopLock);
      await devices.getByRole("button", { name: "手機" }).click();
      await expect(frame.locator(".page-heading").first()).toBeVisible();
      expect(await frame.evaluate(root => root.scrollWidth <= root.clientWidth + 1), name).toBe(true);
      expect(await source()).toEqual(baseline);
      const withCombination = structuredClone({ ...generated, concept: id });
      const heading = Array.from(walk(withCombination.sections)).find(node => node.id === headingId)!;
      heading.effects.push(createMotion("hand-drawn-highlight", headingId));
      const styled = PageSchema.parse(withCombination);
      for (const added of ["hover-glow", "blur-in"] as const) {
        await test.step(added === "hover-glow" ? "reject incompatible heading target" : "reject competing entrance animations", () => {
          const invalid = structuredClone(styled);
          const heading = Array.from(walk(invalid.sections)).find(node => node.id === headingId)!;
          heading.effects.push(createMotion(added, headingId));
          expect(PageSchema.safeParse(invalid)).toMatchObject({
            success: false,
            error: { issues: expect.arrayContaining([expect.objectContaining({ path: ["effects"] })]) },
          });
        });
      }
      const exported = await page.evaluate(async (spec) => {
        const { exportProjectFiles } = await import("/src/exportProject.ts");
        const files = await exportProjectFiles(spec);
        const content = (path: string) => files.find(file => file.path === path)?.content;
        return {
          page: JSON.parse(String(content("src/page.json"))),
          stylesheet: String(content("src/pageRuntime.css")),
          entry: String(content("src/main.tsx")),
          fonts: String(content("src/fonts.css")),
        };
      }, styled);
      expect(exported.page).toEqual(styled);
      expect(exported.stylesheet).toContain(`[data-concept="${id}"]`);
      expect(exported.entry).toContain("<PageRuntime input={page}/>");
      expect(exported.fonts).toContain("@font-face");
    });
  }
  expect(profiles.size).toBe(concepts.length);
});
