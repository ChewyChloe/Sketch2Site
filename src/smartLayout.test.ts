import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock, blockTemplateIds } from "./blockTemplates";
import { smartLayout, suggestTheme } from "./smartLayout";
import { materialize, verifyPreservation, LayoutSchema, layoutJSONSchema } from "./generation";
import { generationFixtures } from "./demoFixtures";
import { createDemoCandidate } from "./demo";
import { PageSchema, type PageNode } from "./pageSpec";
import { applyPatchBatch, createPageSession } from "./patch";

function templatedDraft(name = "咖啡小店"): CanvasSpec {
  let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, name, layoutMode: "reflow" } };
  for (const id of blockTemplateIds) {
    const nodes = createBlock(spec, id);
    expect(nodes).not.toBeNull();
    spec = { ...spec, nodes: [...spec.nodes, ...nodes!] };
  }
  return CanvasSchema.parse(spec);
}
const roles = (sections: PageNode[]) => sections.map((s) => s.role);

describe("block templates", () => {
  it("adds valid grouped nodes below existing content and refuses when the canvas is full", () => {
    const spec = templatedDraft();
    expect(spec.nodes).toHaveLength(15);
    expect(new Set(spec.nodes.map((n) => n.groupId)).size).toBe(4);
    expect(spec.nodes.every((n) => n.type !== "button" || n.href?.startsWith("#"))).toBe(true);
    expect(createBlock(spec, "hero")).toBeNull();
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
    expect(layout.theme).toBe("sunrise");
    const page = materialize(spec, layout);
    expect(roles(page.sections)).toEqual(["hero", "features", "gallery", "cta"]);
    expect(page.theme).toBe("sunrise");
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
