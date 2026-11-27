import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock, blockTemplateIds, type BlockTemplateId } from "./blockTemplates";
import { smartLayout, suggestTheme } from "./smartLayout";
import { materialize, verifyPreservation, LayoutSchema, layoutJSONSchema } from "./generation";
import { generationFixtures } from "./demoFixtures";
import { createDemoCandidate } from "./demo";
import { cardLineKind, PageSchema, type PageNode } from "./pageSpec";
import { applyPatchBatch, createPageSession } from "./patch";

function templatedDraft(name = "咖啡小店", ids: readonly BlockTemplateId[] = ["hero", "features", "gallery", "cta"]): CanvasSpec {
  let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, name, layoutMode: "reflow" } };
  for (const id of ids) {
    const block = createBlock(spec, id);
    expect(block).not.toBeNull();
    spec = { ...spec, metadata: { ...spec.metadata, height: block!.height }, nodes: [...spec.nodes, ...block!.nodes] };
  }
  return CanvasSchema.parse(spec);
}
const roles = (sections: PageNode[]) => sections.map((s) => s.role);

describe("block templates", () => {
  it("adds valid grouped nodes below existing content and grows the canvas", () => {
    const spec = templatedDraft("咖啡小店", blockTemplateIds);
    expect(spec.nodes).toHaveLength(51);
    expect(new Set(spec.nodes.map((n) => n.groupId)).size).toBe(12);
    expect(spec.metadata.height).toBeGreaterThan(1200);
    expect(spec.metadata.height % 600).toBe(0);
    expect(spec.nodes.every((n) => n.type !== "button" || n.href?.startsWith("#"))).toBe(true);
    expect(spec.nodes.find((n) => n.type === "form")?.href).toBeNull();
  });
  it("refuses a block once the canvas reaches its maximum height", () => {
    let spec = templatedDraft("頁面", ["hero"]);
    for (let i = 0; i < 40; i++) {
      const block = createBlock(spec, "faq");
      if (!block) break;
      spec = CanvasSchema.parse({ ...spec, metadata: { ...spec.metadata, height: block.height }, nodes: [...spec.nodes, ...block.nodes] });
    }
    expect(spec.metadata.height).toBeLessThanOrEqual(4800);
    expect(createBlock(spec, "faq")).toBeNull();
  });
});

describe("smart local layout", () => {
  it("infers hero, features, gallery and cta sections from a templated draft", () => {
    const spec = templatedDraft();
    const layout = smartLayout(spec);
    expect(LayoutSchema.safeParse(layout).success).toBe(true);
    expect(layout.sections.map((s) => s.role)).toEqual(["hero", "features", "gallery", "cta"]);
    expect(layout.sections[1].columns).toBe(3);
    expect(layout.nav).toBe(true);
    expect(layout.theme).toBe("forest");
    const page = materialize(spec, layout);
    expect(roles(page.sections)).toEqual(["hero", "features", "gallery", "cta"]);
    expect(page.theme).toBe("forest");
    expect(page.chrome).toEqual({ nav: true, footer: true });
    expect(page.draftLayout).toBeUndefined();
    expect(() => verifyPreservation(spec, page)).not.toThrow();
  });
  it("keeps every source exactly once for all demo fixtures in both layout modes", () => {
    for (const fixture of generationFixtures())
      for (const layoutMode of ["preserve", "reflow"] as const) {
        const spec = { ...fixture, metadata: { ...fixture.metadata, layoutMode } };
        const candidate = createDemoCandidate(spec);
        expect(PageSchema.safeParse(candidate.page).success).toBe(true);
        expect(() => verifyPreservation(spec, candidate.page)).not.toThrow();
      }
  });
  it("respects stack constraints without side columns", () => {
    const spec = { ...templatedDraft(), constraints: ["layout:stack"] };
    const layout = smartLayout(spec);
    expect(layout.sections.every((s) => s.layout === "stack" && s.aside.length === 0)).toBe(true);
    expect(JSON.stringify(materialize(spec, layout))).not.toContain('"type":"grid"');
  });
  it("suggests a theme from content and falls back to classic", () => {
    expect(suggestTheme(templatedDraft("夏日音樂派對"))).toBe("midnight");
    expect(suggestTheme(templatedDraft("我的頁面"))).toBe("classic");
  });
  it("rejects v2 plans that invent text or drop sources", () => {
    const spec = templatedDraft();
    const layout = smartLayout(spec);
    const dropped = structuredClone(layout);
    dropped.sections[0].intro.pop();
    expect(() => materialize(spec, dropped)).toThrow();
    const extra = structuredClone(layout) as unknown as { sections: { intro: Record<string, unknown>[] }[] };
    extra.sections[0].intro[0].content = "已有100萬名客戶";
    expect(() => materialize(spec, extra)).toThrow();
    expect(JSON.stringify(layoutJSONSchema)).toContain('"theme"');
  });
});

describe("pricing, FAQ and tall canvases", () => {
  it("detects pricing and FAQ sections and keeps card text line by line", () => {
    const spec = templatedDraft("頁面", ["hero", "pricing", "faq", "cta"]);
    expect(spec.metadata.height).toBeGreaterThan(1200);
    const layout = smartLayout(spec);
    expect(layout.sections.map((s) => s.role)).toEqual(["hero", "pricing", "faq", "cta"]);
    expect(layout.sections[2].layout).toBe("stack");
    const page = materialize(spec, layout);
    expect(() => verifyPreservation(spec, page)).not.toThrow();
    const pricing = page.sections[1];
    const card = JSON.stringify(pricing);
    expect(card).toContain('"content":"NT$ 290 / 月"');
  });
  it("does not treat ordinary words containing 元 as prices", () => {
    let spec = templatedDraft("頁面", ["hero", "features"]);
    spec = { ...spec, nodes: spec.nodes.map((n) => (n.type === "card" ? { ...n, content: "多元課程\n每堂一元化設計" } : n)) };
    expect(smartLayout(spec).sections[1].role).toBe("features");
  });
  it("keeps draft geometry for tall canvases in preserve mode", () => {
    let spec = templatedDraft("頁面", ["hero", "features", "pricing", "faq", "cta"]);
    spec = { ...spec, metadata: { ...spec.metadata, layoutMode: "preserve" } };
    const page = materialize(spec, smartLayout(spec));
    expect(page.draftLayout?.height).toBe(spec.metadata.height);
    expect(Math.max(...page.draftLayout!.items.map((i) => i.y))).toBeGreaterThan(1200);
  });
  it("rejects out-of-range canvas heights and nodes below the canvas", () => {
    const spec = templatedDraft();
    expect(CanvasSchema.safeParse({ ...spec, metadata: { ...spec.metadata, height: 9600 } }).success).toBe(false);
    expect(CanvasSchema.safeParse({ ...spec, metadata: { ...spec.metadata, height: 600 } }).success).toBe(false);
    const low = { ...spec, nodes: [{ ...spec.nodes[0], y: spec.metadata.height }] };
    expect(CanvasSchema.safeParse(low).success).toBe(false);
  });
});

describe("contact form", () => {
  const withEndpoint = (spec: CanvasSpec, href: string) => ({ ...spec, nodes: spec.nodes.map((n) => (n.type === "form" ? { ...n, href } : n)) });
  it("blocks generation until the form has an https endpoint", () => {
    const spec = templatedDraft("頁面", ["hero", "contact"]);
    expect(() => createDemoCandidate(spec)).toThrow(/收件網址/);
    expect(CanvasSchema.safeParse(withEndpoint(spec, "#" + spec.nodes[0].id)).success).toBe(false);
    expect(CanvasSchema.safeParse(withEndpoint(spec, "http://example.com/f")).success).toBe(false);
  });
  it("builds a contact section with the form beside its copy", () => {
    const spec = CanvasSchema.parse(withEndpoint(templatedDraft("頁面", ["hero", "contact"]), "https://formspree.io/f/abc123"));
    const layout = smartLayout(spec);
    expect(layout.sections.map((s) => s.role)).toEqual(["hero", "contact"]);
    expect(layout.sections[1].aside[0].presentation).toBe("form");
    const page = materialize(spec, layout);
    expect(() => verifyPreservation(spec, page)).not.toThrow();
    const form = JSON.stringify(page.sections[1]);
    expect(form).toContain('"type":"form"');
    expect(form).toContain("https://formspree.io/f/abc123");
  });
  it("rejects forms whose endpoint or fields were altered", () => {
    const spec = CanvasSchema.parse(withEndpoint(templatedDraft("頁面", ["hero", "contact"]), "https://formspree.io/f/abc123"));
    const page = materialize(spec, smartLayout(spec));
    const swap = (fn: (n: PageNode) => PageNode) => ({ ...page, sections: page.sections.map(function walk(n: PageNode): PageNode { const next = n.type === "form" ? fn(n) : n; return next.children ? { ...next, children: next.children.map(walk) } : next; }) });
    expect(() => verifyPreservation(spec, swap((n) => ({ ...n, href: "https://evil.example.com/collect" })))).toThrow();
    expect(() => verifyPreservation(spec, swap((n) => ({ ...n, content: n.content + "\n信用卡號碼" })))).toThrow();
    expect(PageSchema.safeParse(swap((n) => ({ ...n, href: "javascript:alert(1)" }))).success).toBe(false);
    expect(PageSchema.safeParse(swap((n) => ({ ...n, content: Array(9).fill("欄位").join("\n") }))).success).toBe(false);
  });
});

describe("page theme patch", () => {
  it("changes only the theme, anchored on the first section, with undo-able revision", () => {
    const spec = templatedDraft();
    const page = materialize(spec, smartLayout(spec));
    const session = createPageSession(page);
    const first = page.sections[0].id;
    const ok = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: [{ operation: "set-theme", targetId: first, payload: { theme: "ocean" } }] }, [first]);
    expect(ok.ok && ok.after.theme).toBe("ocean");
    expect(ok.ok && ok.state.revision).toBe(1);
    const second = page.sections[1].id;
    const wrong = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: [{ operation: "set-theme", targetId: second, payload: { theme: "ocean" } }] }, [second]);
    expect(wrong.ok).toBe(false);
    const bad = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: [{ operation: "set-theme", targetId: first, payload: { theme: "url(javascript:1)" } }] }, [first]);
    expect(bad.ok).toBe(false);
  });
  it("rejects unknown themes and chrome fields in PageSpec", () => {
    const spec = templatedDraft();
    const page = materialize(spec, smartLayout(spec));
    expect(PageSchema.safeParse({ ...page, theme: "hacker" }).success).toBe(false);
    expect(PageSchema.safeParse({ ...page, chrome: { nav: true, footer: true, html: "<b>" } }).success).toBe(false);
  });
});

describe("footer information", () => {
  it("the last part with a © line becomes the footer: name and intro, columns, © below", () => {
    const spec = templatedDraft("咖啡小店", ["hero", "features", "footer"]);
    const layout = smartLayout(spec);
    const footer = layout.sections.at(-1)!;
    expect(footer.role).toBe("footer");
    const text = (id: string) => spec.nodes.find((n) => n.id === id)!.content;
    expect(footer.intro.map((i) => text(i.sourceId))).toEqual(["你的店名", "一句話介紹你的店，例如：學校後門的小店，自家烘豆。"]);
    expect(footer.items).toHaveLength(2);
    expect(text(footer.outro[0].sourceId)).toMatch(/^©/);
    // The page-level footer is not shown twice.
    const page = materialize(spec, layout);
    expect(page.sections.at(-1)!.role).toBe("footer");
  });
  it("a © line elsewhere does not turn a middle section into a footer", () => {
    const spec = templatedDraft("咖啡小店", ["hero", "footer", "features"]);
    expect(smartLayout(spec).sections.map((s) => s.role)).not.toContain("footer");
  });
});

describe("menu items", () => {
  it("one photo per priced card: a menu section with each photo right above its card", () => {
    const spec = templatedDraft("咖啡小店", ["hero", "menu"]);
    // A growing heading nudges the first photo down a little; it still belongs to the first row.
    spec.nodes = spec.nodes.map((n) => (n.type === "image" && n.content === "品項照片一" ? { ...n, y: n.y + 12 } : n));
    const menu = smartLayout(spec).sections.find((s) => s.role === "menu")!;
    const label = (id: string) => spec.nodes.find((n) => n.id === id)!.content.split("\n")[0] + (spec.nodes.find((n) => n.id === id)!.content.split("\n")[2] ?? "");
    expect(menu.columns).toBe(3);
    expect(menu.items.map((i) => label(i.sourceId))).toEqual(["品項照片一", "品項照片二", "品項照片三", "品項名稱NT$ 120", "品項名稱NT$ 150", "品項名稱NT$ 160"]);
  });
  it("reads card lines by shape", () => {
    expect(cardLineKind("Dune Espresso")).toBe("en");
    expect(cardLineKind("NT$ 140")).toBe("price");
    expect(cardLineKind("120 元")).toBe("price");
    expect(cardLineKind("#招牌 #冷萃")).toBe("tags");
    expect(cardLineKind("※ 可換燕麥奶")).toBe("note");
    expect(cardLineKind("雙份濃縮配深焙豆")).toBeUndefined();
  });
});
