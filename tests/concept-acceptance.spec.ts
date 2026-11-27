import { test, expect } from "@playwright/test";
import { useTemplate, buildSite } from "./helpers/workbench";

const concepts = [
  ["swiss", "瑞士國際主義"], ["japanese-minimal", "日式極簡"], ["nordic", "北歐美學"],
  ["editorial-magazine", "雜誌編輯排版"], ["retro-digital", "復古數位"], ["y2k", "Y2K"],
  ["neo-brutalist", "新粗獷主義"], ["organic", "有機自然"], ["storybook", "童話繪本"],
  ["architectural", "建築作品集"],
];

test("all added concepts keep the same mock content and motions at desktop and phone widths", async ({ page }) => {
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
  expect(baseline.some(row => row[1])).toBe(true);
  const devices = candidate.getByRole("group", { name: "預覽寬度" });
  const profiles = new Set<string>();
  for (const [id, name] of concepts) {
    await devices.getByRole("button", { name: "桌面" }).click();
    await picker.getByRole("radio", { name, exact: true }).click();
    await expect(frame).toHaveAttribute("data-concept", id);
    profiles.add(await frame.evaluate(root => JSON.stringify([
      ...Array.from(root.querySelectorAll(".page-heading,.page-image img,.page-section,.page-grid,.page-button,.page-card"), node => {
        const css = getComputedStyle(node);
        return [css.fontFamily, css.paddingBlock, css.aspectRatio, css.borderRadius, css.gridTemplateColumns, css.borderStyle, css.boxShadow];
      }),
    ])));
    expect(await source()).toEqual(baseline);
    expect(await lockedLayout(), name).toEqual(desktopLock);
    await devices.getByRole("button", { name: "手機" }).click();
    await expect(frame.locator(".page-heading").first()).toBeVisible();
    expect(await frame.evaluate(root => root.scrollWidth <= root.clientWidth + 1), name).toBe(true);
    expect(await source()).toEqual(baseline);
  }
  expect(profiles.size).toBe(concepts.length);
});
