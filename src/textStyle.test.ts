import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock } from "./blockTemplates";
import { createSiteCandidate } from "./siteGeneration";
import { TextStyleSchema, textCss, type PageSpec } from "./pageSpec";
import { applyPatchBatch, createPageSession, indexNodes } from "./patch";
import { interpretAnnotation } from "./annotate";
import { syncSiteChange } from "./siteSync";
import { verifyPreservation } from "./generation";

function heroDraft(): CanvasSpec {
  const base: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, layoutMode: "reflow" } };
  const block = createBlock(base, "hero")!;
  const nodes = block.nodes.map((n) => (n.type === "heading" ? { ...n, textStyle: { font: "kai" as const, size: 56, color: "#e5484d", bold: true, highlight: "#fff3a3" } } : n));
  return CanvasSchema.parse({ ...base, nodes });
}
const find = (page: PageSpec, type: string) => [...indexNodes(page).values()].find((n) => n.type === type)!;

describe("text styles", () => {
  it("validates strictly and only on text elements", () => {
    expect(TextStyleSchema.safeParse({ font: "serif", size: 40, color: "#0d74ce", bold: true, align: "center", lineHeight: 1.4 }).success).toBe(true);
    for (const bad of [{ color: "red" }, { color: "url(x)" }, { size: 300 }, { font: "Comic Sans" }, { css: "x" }]) expect(TextStyleSchema.safeParse(bad).success).toBe(false);
    const d = heroDraft();
    const image = d.nodes.find((n) => n.type === "image")!;
    expect(CanvasSchema.safeParse({ ...d, nodes: d.nodes.map((n) => (n === image ? { ...n, textStyle: { bold: true } } : n)) }).success).toBe(false);
    expect(textCss({ size: 40, bold: true, underline: true, strike: true }, false)).toMatchObject({ fontSize: "40px", fontWeight: 800, textDecorationLine: "underline line-through" });
    expect(textCss({ size: 40 })!.fontSize).toBe("clamp(25px, 2.78cqi, 40px)");
  });

  it("carries styles into the site and rejects output that changes them", () => {
    const draft = heroDraft();
    const page = createSiteCandidate(draft).page;
    expect(find(page, "heading").text).toEqual({ font: "kai", size: 56, color: "#e5484d", bold: true, highlight: "#fff3a3" });
    const tampered = structuredClone(page);
    find(tampered, "heading").text = { color: "#000000" };
    expect(() => verifyPreservation(draft, tampered)).toThrow();
  });

  it("lets annotations style text on the site and syncs to the draft", () => {
    const draft = heroDraft();
    const page = createSiteCandidate(draft).page;
    const p = find(page, "paragraph");
    const r = interpretAnnotation(page, p.id, "改成明體，藍色字，粗體，字大一點");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patches).toHaveLength(1);
    const session = createPageSession(page);
    const applied = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: r.patches }, r.scope);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(indexNodes(applied.after).get(p.id)!.text).toEqual({ font: "serif", color: "#0d74ce", bold: true, size: 20 });
    expect(syncSiteChange(draft, page, applied.after)!.nodes.find((n) => n.id === p.id)!.textStyle).toEqual({ font: "serif", color: "#0d74ce", bold: true, size: 20 });
    // Theme words still change the page colours, not the text.
    const theme = interpretAnnotation(page, p.id, "整頁配色換成藍色");
    expect(theme.ok && theme.summary.join()).toContain("海洋");
  });
});
