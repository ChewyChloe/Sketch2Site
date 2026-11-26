import { describe, expect, it } from "vitest";
import { navLinks } from "./PageRuntime";
import { navChrome, NavSettingsSchema, shortNavLabel, type PageNode, type PageSpec } from "./pageSpec";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const heading = (n: number, content: string): PageNode => ({ id: id(n), type: "heading", content, effects: [] } as unknown as PageNode);
const section = (n: number, role: string, children: PageNode[]): PageNode => ({ id: id(n), type: "section", role, effects: [], children } as unknown as PageNode);
const sections = [section(1, "hero", [heading(11, "首頁大標")]), section(2, "features", [heading(12, "特色")]), section(3, "pricing", [heading(13, "價目")]), section(4, "faq", [heading(14, "問答")])];
const page = (chrome?: PageSpec["chrome"]) => ({ metadata: { title: "店", language: "zh-Hant" }, sections, chrome } as unknown as PageSpec);

describe("site navigation links", () => {
  it("without settings lists section headings except the opening one, linking to sections", () => {
    expect(navLinks(page(), sections).map((l) => [l.label, l.target])).toEqual([["特色", id(2)], ["價目", id(3)], ["問答", id(4)]]);
  });
  it("saved items decide order, names and hiding; unknown or new items stay out", () => {
    const chrome = { nav: true, footer: true, navStyle: "side-left" as const, navItems: [{ id: id(13), label: "看價錢" }, { id: id(11) }, { id: id(12), hidden: true }, { id: id(99) }] };
    expect(navLinks(page(chrome), sections).map((l) => [l.label, l.target])).toEqual([["看價錢", id(13)], ["首頁大標", id(11)]]);
  });
  it("navChrome keeps the site's own choice without settings and turns the menu off for 不顯示", () => {
    expect(navChrome(undefined, false)).toEqual({ nav: false });
    expect(navChrome({ style: "none" }, true)).toEqual({ nav: false, navStyle: "none" });
    expect(navChrome({ style: "floating", items: [{ id: id(1), hidden: true }] }, false)).toEqual({ nav: true, navStyle: "floating", navItems: [{ id: id(1), hidden: true }] });
  });
  it("settings reject unknown styles and over-long names", () => {
    const parse = (v: object) => NavSettingsSchema.safeParse(v).success;
    expect(parse({ style: "side-left" })).toBe(true);
    expect(parse({ style: "sideways" })).toBe(false);
    expect(parse({ style: "floating", items: [{ id: id(1), label: "x".repeat(25) }] })).toBe(false);
    expect(parse({ style: "floating", items: [{ id: "not-an-id" }] })).toBe(false);
  });
  it("shortens long headings for the menu, keeping the part before the first punctuation", () => {
    expect(shortNavLabel("新生快來找答案，一起加入！")).toBe("新生快來找答案");
    expect(shortNavLabel("我們的堅持")).toBe("我們的堅持");
    expect(shortNavLabel("這是一個非常非常長而且沒有標點的標題")).toBe("這是一個非常非常長而…");
    expect(shortNavLabel("Pricing & Plans for Every Team")).toBe("Pricing & Plans…");
    expect(shortNavLabel("！")).toBe("！");
    const long = [section(1, "hero", [heading(11, "首頁")]), section(2, "faq", [heading(12, "新生快來找答案，一起加入！")])];
    expect(navLinks({ ...page(), sections: long } as PageSpec, long).map((l) => l.label)).toEqual(["新生快來找答案"]);
  });
});

describe("design concepts", () => {
  it("are a fixed list the page schema accepts, and nothing else", async () => {
    const { PageSchema, conceptIds } = await import("./pageSpec");
    const { createSiteCandidate } = await import("./siteGeneration");
    const { starterDrafts } = await import("./starters");
    const page = createSiteCandidate(starterDrafts()[1]).page;
    expect(conceptIds).toContain("exhibition");
    expect(PageSchema.safeParse({ ...page, concept: "exhibition" }).success).toBe(true);
    expect(PageSchema.safeParse({ ...page, concept: "copy-someone" }).success).toBe(false);
  });
});
