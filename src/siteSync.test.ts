import { describe, expect, it } from "vitest";
import { starterDrafts } from "./starters";
import { createSiteCandidate } from "./siteGeneration";
import { applyPatchBatch, createPageSession, indexNodes, type PageSession } from "./patch";
import { applySiteOverrides, draftFingerprint, overrideCount, syncSiteChange } from "./siteSync";
import { CanvasSchema, type CanvasSpec } from "./spec";
import type { PageNode, PageSpec } from "./pageSpec";
import { createMotion } from "./motion";

const nodes = (page: PageSpec) => [...indexNodes(page).values()];
const find = (page: PageSpec, pred: (n: PageNode) => boolean) => nodes(page).find(pred)!;

/** Applies patches on the site and mirrors them into the draft, like the app does. */
function edit(session: PageSession, draft: CanvasSpec, patches: unknown[]) {
  const scope = [...new Set(patches.map((p) => (p as { targetId: string }).targetId))];
  const r = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: session.revision, patches }, scope);
  if (!r.ok) throw new Error(r.error);
  const next = syncSiteChange(draft, session.history.present, r.after);
  return { session: r.state, draft: next ?? draft, changed: Boolean(next) };
}

describe("draft ↔ site sync", () => {
  it("keeps site edits when the draft changes and the site is updated", () => {
    let draft = starterDrafts()[0];
    const page = createSiteCandidate(draft).page;
    let session = createPageSession(page);
    const h2 = find(page, (n) => n.type === "heading" && n.level === 2);
    const card = find(page, (n) => n.type === "card" && !!n.children?.length);
    const line = card.children!.find((c) => c.type === "paragraph")!;
    const grid = nodes(page).find((n) => n.type === "grid" && n.children?.some((c) => c.id === card.id))!;
    const section = nodes(page).find((n) => n.type === "section" && JSON.stringify(n).includes(h2.id))!;
    let step = edit(session, draft, [{ operation: "set-text", targetId: h2.id, payload: { content: "我們在乎的事" } }]);
    ({ session, draft } = step);
    step = edit(session, draft, [{ operation: "set-text", targetId: line.id, payload: { content: "自家烘焙" } }]);
    ({ session, draft } = step);
    step = edit(session, draft, [
      { operation: "set-property", targetId: h2.id, payload: { property: "level", value: 1 } },
      { operation: "set-property", targetId: grid.id, payload: { property: "columns", value: 2 } },
      { operation: "set-style", targetId: section.id, payload: { padding: "large", tone: "accent" } },
      { operation: "set-theme", targetId: page.sections[0].id, payload: { theme: "ocean" } },
      { operation: "attach-effect", targetId: grid.id, payload: createMotion("stagger-reveal", grid.id) },
    ]);
    ({ session, draft } = step);
    expect(CanvasSchema.safeParse(draft).success).toBe(true);
    // Text lives in the draft now; layout tweaks are overrides.
    expect(draft.nodes.find((n) => n.id === h2.id)!.content).toBe("我們在乎的事");
    expect(draft.nodes.find((n) => n.id === card.id)!.content.split("\n")[0]).toBe("自家烘焙");
    // theme + heading level + grid (columns and motion share one entry) + section style
    expect(overrideCount(draft.metadata.siteOverrides)).toBe(4);

    // The user adds a block in the draft, then updates the site.
    const before = draftFingerprint(draft);
    draft = { ...draft, nodes: draft.nodes.map((n) => (n.type === "button" ? { ...n, content: "今天就來" } : n)) };
    expect(draftFingerprint(draft)).not.toBe(before);
    const next = applySiteOverrides(createSiteCandidate(draft).page, draft);
    const h = indexNodes(next).get(h2.id)!;
    expect(h.content).toBe("我們在乎的事");
    expect(h.level).toBe(1);
    expect(next.theme).toBe("ocean");
    const newGrid = nodes(next).find((n) => n.type === "grid" && n.children?.some((c) => c.id === card.id))!;
    expect(newGrid.columns).toBe(2);
    expect(newGrid.id).not.toBe(grid.id);
    expect(newGrid.effects.map((e) => [e.presetId, e.targetId])).toEqual([["stagger-reveal", newGrid.id]]);
    const newSection = nodes(next).find((n) => n.type === "section" && JSON.stringify(n).includes(h2.id))!;
    expect(newSection.style).toMatchObject({ padding: "large", tone: "accent" });
    expect(nodes(next).some((n) => n.content === "自家烘焙")).toBe(true);
  });

  it("follows undo, ignores unrelated pages and drops overrides whose anchor is gone", () => {
    let draft = starterDrafts()[0];
    const page = createSiteCandidate(draft).page;
    const session = createPageSession(page);
    const h2 = find(page, (n) => n.type === "heading" && n.level === 2);
    const step = edit(session, draft, [{ operation: "set-property", targetId: h2.id, payload: { property: "level", value: 3 } }]);
    // Undo is a transition back; the override follows the restored value.
    const undone = syncSiteChange(step.draft, step.session.history.present, page)!;
    expect(Object.values(undone.metadata.siteOverrides!.items)[0].level).toBe(2);
    // A page that shares no ids with the draft changes nothing in it.
    const other = createSiteCandidate(starterDrafts()[1]).page;
    expect(syncSiteChange(draft, other, { ...other, theme: "mono" })?.nodes).toEqual(draft.nodes);
    // Deleting the anchored element in the draft simply leaves that override unused.
    draft = { ...step.draft, nodes: step.draft.nodes.filter((n) => n.id !== h2.id) };
    const rebuilt = applySiteOverrides(createSiteCandidate(draft).page, draft);
    expect(indexNodes(rebuilt).has(h2.id)).toBe(false);
  });
});
