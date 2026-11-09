import { describe, it, expect } from "vitest";
import {
  PageSchema,
  validatePage,
  reconcilePage,
  type PageNode,
} from "./pageSpec";
import { demoPage } from "./pageFixtures";
const clone = () => structuredClone(demoPage);
const leaves = (page = demoPage) => {
  const result: PageNode[] = [];
  const walk = (n: PageNode) => {
    result.push(n);
    n.children?.forEach(walk);
  };
  page.sections.forEach(walk);
  return result;
};
describe("PageSpec v2 validation", () => {
  it("accepts nested representative fixture with all registry types and six effects", () => {
    expect(PageSchema.safeParse(demoPage).success).toBe(true);
    expect(new Set(leaves().map((n) => n.type)).size).toBe(9);
    expect(
      new Set(leaves().flatMap((n) => n.effects.map((e) => e.effectId))).size,
    ).toBe(6);
  });
  it.each(["script", "iframe", "unknown"])(
    "rejects unknown component %s",
    (type) => {
      const page = clone();
      (page.sections[0] as unknown as { type: string }).type = type;
      expect(validatePage(page).ok).toBe(false);
    },
  );
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.com",
    "https://evil.example",
    "https://learn.microsoft.com.evil.example",
    "https://user:pass@example.com",
    "//example.com",
    "https://example.com:444/",
  ])("rejects unsafe link %s", (href) => {
    const page = clone();
    leaves(page).find((n) => n.type === "button")!.href = href;
    expect(validatePage(page).ok).toBe(false);
  });
  it("rejects event, arbitrary CSS, HTML and unknown nested props", () => {
    for (const extra of [
      { onclick: "alert(1)" },
      { style: { color: "red" } },
      { html: "<script>x</script>" },
      { component: "iframe" },
    ]) {
      const page = clone();
      Object.assign(page.sections[0], extra);
      expect(validatePage(page).ok).toBe(false);
    }
  });
  it.each([
    undefined,
    "javascript:alert(1)",
    "https://images.example/a.png",
    "/assets/missing.svg",
    "data:image/svg+xml,<svg/>",
  ])("rejects missing/unregistered image %s", (src) => {
    const page = clone();
    leaves(page).find((n) => n.type === "image")!.src = src as never;
    expect(validatePage(page).ok).toBe(false);
  });
  it("rejects unknown and out of range effects", () => {
    for (const extra of [
      { effectId: "eval" },
      { duration: 5000 },
      { distance: 1000 },
      { stagger: 0 },
      { code: "alert(1)" },
    ]) {
      const page = clone();
      Object.assign(page.sections[0].effects[0], extra);
      expect(validatePage(page).ok).toBe(false);
    }
  });
  it("rejects duplicate IDs, broken anchors and unsupported versions", () => {
    const page = clone();
    page.sections[1].id = page.sections[0].id;
    expect(validatePage(page).ok).toBe(false);
    const broken = clone();
    leaves(broken).find((n) => n.type === "button")!.href =
      "#11111111-1111-4111-8111-111111111111";
    expect(validatePage(broken).ok).toBe(false);
    expect(validatePage({ ...demoPage, schemaVersion: 1 }).ok).toBe(false);
  });
  it("bounds node count, recursion, cyclic objects and payload size", () => {
    const page = clone();
    let child = page.sections[0];
    for (let i = 0; i < 50; i++)
      child = { ...child, id: crypto.randomUUID(), children: [child] };
    expect(validatePage({ ...page, sections: [child] }).ok).toBe(false);
    const cyclic = clone();
    cyclic.sections[0].children = [cyclic.sections[0]];
    expect(validatePage(cyclic).ok).toBe(false);
    expect(validatePage({ ...page, extra: "x".repeat(200001) }).ok).toBe(false);
    const many = clone();
    many.sections[0].children = Array.from({ length: 100 }, () => ({
      ...many.sections[1],
      id: crypto.randomUUID(),
    }));
    expect(validatePage(many).ok).toBe(false);
  });
  it("reconciles unchanged branches and preserves IDs when a sibling changes", () => {
    const next = clone();
    next.sections[0].children![0].children![0].children![0].children![0].content =
      "修改標題";
    const shared = reconcilePage(demoPage, PageSchema.parse(next));
    expect(shared.sections[0]).not.toBe(demoPage.sections[0]);
    expect(shared.sections[1]).toBe(demoPage.sections[1]);
    expect(shared.sections[0].id).toBe(demoPage.sections[0].id);
  });
});
