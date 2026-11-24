import { describe, it, expect } from "vitest";
import { blank, CanvasSchema, pageDraft, type CanvasSpec } from "./spec";
import { createBlock } from "./blockTemplates";
import { createSiteCandidate } from "./siteGeneration";
import { PageSchema, allSections, type PageNode } from "./pageSpec";
import { applyPatchBatch, createPageSession, indexNodes } from "./patch";

function twoPageDraft(): CanvasSpec {
  const home = crypto.randomUUID(), about = crypto.randomUUID();
  let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, name: "社團網站", layoutMode: "reflow", pages: [{ id: home, name: "首頁" }, { id: about, name: "價目與報名" }] } };
  const add = (id: "hero" | "pricing" | "faq", pageId: string) => {
    const onPage = { ...spec, nodes: spec.nodes.filter((n) => (n.pageId ?? home) === pageId) };
    const block = createBlock(onPage, id)!;
    spec = { ...spec, metadata: { ...spec.metadata, height: Math.max(spec.metadata.height, block.height) }, nodes: [...spec.nodes, ...block.nodes.map((n) => ({ ...n, pageId }))] };
  };
  add("hero", home);
  add("pricing", about);
  add("faq", about);
  // The hero button links to the second page.
  spec = { ...spec, nodes: spec.nodes.map((n) => (n.type === "button" ? { ...n, href: "#" + about } : n)) };
  return CanvasSchema.parse(spec);
}
const find = (sections: PageNode[], pred: (n: PageNode) => boolean): PageNode | undefined => {
  for (const s of sections) {
    if (pred(s)) return s;
    const hit = find(s.children ?? [], pred);
    if (hit) return hit;
  }
};

describe("multi-page drafts", () => {
  it("validates page ids, node pages and links to pages", () => {
    const spec = twoPageDraft();
    expect(CanvasSchema.safeParse({ ...spec, nodes: [...spec.nodes.slice(1), { ...spec.nodes[0], pageId: crypto.randomUUID() }] }).success).toBe(false);
    const dup = spec.metadata.pages![0];
    expect(CanvasSchema.safeParse({ ...spec, metadata: { ...spec.metadata, pages: [dup, dup] } }).success).toBe(false);
    expect(pageDraft(spec, spec.metadata.pages![1].id).nodes).toHaveLength(8);
    expect(pageDraft(spec, spec.metadata.pages![1].id).nodes.every((n) => n.pageId === undefined)).toBe(true);
  });

  it("generates one site with a page per draft page and working page links", () => {
    const spec = twoPageDraft();
    const site = createSiteCandidate(spec).page;
    expect(PageSchema.safeParse(site).success).toBe(true);
    expect(site.home).toEqual({ id: spec.metadata.pages![0].id, title: "首頁" });
    expect(site.subpages?.map((p) => p.title)).toEqual(["價目與報名"]);
    expect(site.subpages![0].sections.map((s) => s.role)).toContain("pricing");
    const button = find(site.sections, (n) => n.type === "button")!;
    expect(button.href).toBe("#" + spec.metadata.pages![1].id);
    // Every source element appears exactly once across the site.
    const ids = new Set<string>();
    const walk = (n: PageNode) => { ids.add(n.id); n.children?.forEach(walk); };
    allSections(site).forEach(walk);
    expect(spec.nodes.every((n) => ids.has(n.id))).toBe(true);
  });

  it("refuses an empty page with a clear message", () => {
    const spec = twoPageDraft();
    const empty = { ...spec, metadata: { ...spec.metadata, pages: [...spec.metadata.pages!, { id: crypto.randomUUID(), name: "空白頁" }] } };
    expect(() => createSiteCandidate(CanvasSchema.parse(empty))).toThrow("空白頁");
  });

  it("patches elements on a subpage and keeps the page structure fixed", () => {
    const site = createSiteCandidate(twoPageDraft()).page;
    const session = createPageSession(site);
    const heading = find(site.subpages![0].sections, (n) => n.type === "heading")!;
    expect(indexNodes(site).has(heading.id)).toBe(true);
    const result = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: [{ operation: "set-text", targetId: heading.id, payload: { content: "方案一覽" } }] }, [heading.id]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(find(result.after.subpages![0].sections, (n) => n.id === heading.id)?.content).toBe("方案一覽");
  });

  it("rejects pages whose links point nowhere or whose ids collide", () => {
    const site = createSiteCandidate(twoPageDraft()).page;
    expect(PageSchema.safeParse({ ...site, home: undefined }).success).toBe(false);
    expect(PageSchema.safeParse({ ...site, subpages: [{ ...site.subpages![0], id: site.home!.id }] }).success).toBe(false);
  });
});
