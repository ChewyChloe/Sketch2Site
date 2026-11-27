import { describe, expect, it } from "vitest";
import { PageSchema, type PageNode, type PageSpec } from "./pageSpec";
import { applyPatchBatch, createPageSession, indexNodes, travelPage } from "./patch";
import { copyStyle, dropPlacement, movePatch, nudge, pastePatches, sameKind } from "./siteMove";

const style = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" }) as const;
const id = () => crypto.randomUUID();
function site() {
  const [s1, s2, h1, p1, h2, p2, b2] = Array.from({ length: 7 }, id);
  const page = PageSchema.parse({ schemaVersion: 2, metadata: { title: "小島", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
    sections: [
      { id: s1, type: "section", style: style(), effects: [], children: [
        { id: h1, type: "heading", level: 2, content: "我們的堅持", style: { ...style(), align: "center", tone: "accent" }, text: { bold: true }, effects: [] },
        { id: p1, type: "paragraph", content: "每天現烘", style: style(), effects: [] },
      ] },
      { id: s2, type: "section", style: style(), effects: [], children: [
        { id: h2, type: "heading", level: 2, content: "來坐坐", style: style(), effects: [] },
        { id: p2, type: "paragraph", content: "週一到週六", style: style(), effects: [] },
        { id: b2, type: "button", content: "預約", href: "https://booking.island.tw/", style: style(), effects: [] },
      ] },
    ] }) as PageSpec;
  return { page, ids: { s1, s2, h1, p1, h2, p2, b2 } };
}
const apply = (page: PageSpec, patches: unknown[], scope: string[]) => {
  const s = createPageSession(page);
  return applyPatchBatch(s, { schemaVersion: 1, sessionId: s.sessionId, baseRevision: 0, patches }, scope);
};
const order = (n: PageNode) => n.children!.map((c) => c.content);

describe("move-node", () => {
  it("moves an element into another section and back with undo; nothing else changes", () => {
    const { page, ids } = site();
    const place = dropPlacement(page, ids.b2, ids.p1, true)!;
    expect(place).toEqual({ parentId: ids.s1, index: 2 });
    const r = apply(page, [movePatch(ids.b2, place)], [ids.b2]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(order(r.after.sections[0])).toEqual(["我們的堅持", "每天現烘", "預約"]);
    expect(order(r.after.sections[1])).toEqual(["來坐坐", "週一到週六"]);
    expect(indexNodes(r.after).get(ids.b2)).toEqual(indexNodes(page).get(ids.b2));
    expect(travelPage(r.state, "undo").history.present).toEqual(page);
  });
  it("reorders sections and nudges one step", () => {
    const { page, ids } = site();
    const r = apply(page, [movePatch(ids.s2, dropPlacement(page, ids.s2, ids.h1, false)!)], [ids.s2]);
    expect(r.ok && r.after.sections.map((s) => s.id)).toEqual([ids.s2, ids.s1]);
    const n = apply(page, [movePatch(ids.p2, nudge(page, ids.p2, -1)!)], [ids.p2]);
    expect(n.ok && order(n.after.sections[1])).toEqual(["週一到週六", "來坐坐", "預約"]);
    expect(nudge(page, ids.h1, -1)).toBeNull();
  });
  it("refuses moves into itself, into a non-container, a section into a section, or out of a layout-locked section", () => {
    const { page, ids } = site();
    expect(apply(page, [movePatch(ids.s1, { parentId: ids.s2, index: 0 })], [ids.s1]).ok).toBe(false);
    expect(apply(page, [movePatch(ids.b2, { parentId: ids.p1, index: 0 })], [ids.b2]).ok).toBe(false);
    expect(apply(page, [movePatch(ids.b2, { parentId: "page", index: 0 })], [ids.b2]).ok).toBe(false);
    const locked = structuredClone(page);
    locked.sections[1].lock = { layout: true };
    const r = apply(locked, [movePatch(ids.b2, { parentId: ids.s1, index: 0 })], [ids.b2]);
    expect(!r.ok && r.code).toBe("LOCKED");
    // A move cannot be mixed with a hidden content change.
    expect(apply(page, [movePatch(ids.b2, { parentId: ids.s1, index: 0 }), { operation: "set-text", targetId: ids.h2, payload: { content: "偷改" } }], [ids.b2, ids.h2]).ok).toBe(false);
  });
});

describe("copy a look to other elements", () => {
  it("pastes spacing, alignment, background and text style across sections, or on every heading of that level", () => {
    const { page, ids } = site();
    const nodes = indexNodes(page);
    const copied = copyStyle(nodes.get(ids.h1)!);
    expect(sameKind(page, nodes.get(ids.h1)!).map((n) => n.id)).toEqual([ids.h2]);
    const r = apply(page, pastePatches(copied, [nodes.get(ids.h2)!]), [ids.h2]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const h2 = indexNodes(r.after).get(ids.h2)!;
    expect(h2.style.align).toBe("center");
    expect(h2.style.tone).toBe("accent");
    expect(h2.text).toEqual({ bold: true });
    expect(h2.content).toBe("來坐坐");
    // A picture frame is only pasted between pictures.
    expect(pastePatches(copied, [nodes.get(ids.b2)!]).map((p) => p.operation)).toEqual(["set-style", "set-property"]);
  });
});

describe("pasting on many elements", () => {
  it("passes the patch size guard (no shared objects between patches)", () => {
    const { page, ids } = site();
    const nodes = indexNodes(page);
    const copied = copyStyle(nodes.get(ids.h1)!);
    const r = apply(page, pastePatches(copied, [nodes.get(ids.h2)!, nodes.get(ids.p1)!, nodes.get(ids.p2)!]), [ids.h2, ids.p1, ids.p2]);
    expect(r.ok).toBe(true);
  });
});
