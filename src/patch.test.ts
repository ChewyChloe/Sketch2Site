import {legacyMotion,type MotionInstance} from "./motion";
import { describe, it, expect } from "vitest";
import { demoPage } from "./pageFixtures";
import { PageSchema, type PageNode } from "./pageSpec";
import {
  applyPatchBatch as engineApply,
  createPageSession,
  diffPages,
  indexNodes,
  travelPage,
  validateScope,
  type PageSession,
  type Patch,
} from "./patch";
// Test helper grants the local fixture nodes; explicit restricted-scope cases use engineApply directly.
const applyPatchBatch = (s: PageSession, input: unknown) =>
  engineApply(s, input, [...indexNodes(s.history.present).keys()]);
const make = () => createPageSession(demoPage);
const find = (s: PageSession, type: PageNode["type"]) =>
  Array.from(indexNodes(s.history.present).values()).find(
    (n) => n.type === type,
  )!;
function batch(s: PageSession, patches: unknown[]) {
  return {
    schemaVersion: 1,
    sessionId: s.sessionId,
    baseRevision: s.revision,
    patches,
  };
}
const textPatch = (id: string, content: string) => ({
  operation: "set-text",
  targetId: id,
  payload: { content },
});
function success(s: PageSession, patches: unknown[]) {
  const r = applyPatchBatch(s, batch(s, patches));
  expect(r.ok).toBe(true);
  if (!r.ok) throw Error(r.code);
  return r;
}
describe("ID-scoped atomic patch engine", () => {
  it("requires independently supplied scope and rejects extra targets in an otherwise valid batch", () => {
    const s = make(),
      a = find(s, "heading"),
      b = find(s, "paragraph");
    const result = engineApply(
      s,
      batch(s, [textPatch(a.id, "A"), textPatch(b.id, "B")]),
      [a.id],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SCOPE_VIOLATION");
    expect(result.state).toBe(s);
    expect(engineApply(s, batch(s, [textPatch(a.id, "A")]), []).ok).toBe(false);
  });
  it("updates only chosen text, preserves original and shares unchanged branches", () => {
    const s = make(),
      n = find(s, "heading"),
      original = JSON.stringify(s);
    const r = success(s, [textPatch(n.id, "我的作品集")]);
    expect(JSON.stringify(s)).toBe(original);
    expect(indexNodes(r.after).get(n.id)?.content).toBe("我的作品集");
    expect(r.after.metadata).toBe(s.history.present.metadata);
    expect(r.after.responsive).toBe(s.history.present.responsive);
    expect(r.after.sections[1]).toBe(s.history.present.sections[1]);
    expect(indexNodes(r.after).get(find(s, "image").id)).toBe(find(s, "image"));
    expect(r.diff.changes).toEqual([
      {
        targetId: n.id,
        property: "content",
        before: n.content,
        after: "我的作品集",
      },
    ]);
    expect(r.affectsOtherComponents).toBe(false);
    expect(PageSchema.safeParse(r.after).success).toBe(true);
    expect(r.state.history.past).toHaveLength(1);
  });
  it("updates one style token without resetting unspecified token defaults", () => {
    const s = make(),
      n = find(s, "heading");
    const r = success(s, [
      { operation: "set-style", targetId: n.id, payload: { tone: "accent" } },
    ]);
    expect(indexNodes(r.after).get(n.id)?.style).toEqual({
      ...n.style,
      tone: "accent",
    });
    expect(r.diff.changes.map((c) => c.property)).toEqual(["style.tone"]);
  });
  it("updates every permitted type-specific property through a whitelist", () => {
    for (const [type, property, value] of [
      ["heading", "level", 3],
      ["button", "href", "https://example.com"],
      ["image", "alt", "示意圖"],
      ["image", "src", "/assets/workspace.svg"],
      ["grid", "columns", 1],
    ] as const) {
      const s = make(),
        n = find(s, type);
      const r = success(s, [
        {
          operation: "set-property",
          targetId: n.id,
          payload: { property, value },
        },
      ]);
      expect(
        (indexNodes(r.after).get(n.id) as unknown as Record<string, unknown>)[
          property
        ],
      ).toBe(value);
    }
  });
  it("attaches, updates and removes a preset with precise diff", () => {
    let s = make();
    const id = find(s, "heading").id;
    const attached = success(s, [
      {
        operation: "attach-effect",
        targetId: id,
        payload: { effectId: "fade-in" },
      },
    ]);
    s = attached.state;
    expect(
      indexNodes(s.history.present)
        .get(id)
        ?.effects.find((e) => e.presetId === "fade-in")?.validatedControls.durationMs,
    ).toBe(450);
    const updated = success(s, [
      {
        operation: "update-effect",
        targetId: id,
        payload: { effectId: "fade-in", parameters: { duration: 900 } },
      },
    ]);
    s = updated.state;
    expect(updated.diff.changes.map((c) => c.property)).toEqual([
      "effects.fade-in.validatedControls.durationMs",
    ]);
    const removed = success(s, [
      {
        operation: "remove-effect",
        targetId: id,
        payload: { effectId: "fade-in" },
      },
    ]);
    expect(
      indexNodes(removed.after)
        .get(id)
        ?.effects.some((e) => e.presetId === "fade-in"),
    ).toBe(false);
  });
  it.each([
    {
      operation: "set-text",
      targetId: "00000000-0000-4000-8000-999999999999",
      payload: { content: "missing" },
    },
    { operation: "run", payload: {} },
    {
      operation: "set-property",
      payload: { property: "onclick", value: "alert(1)" },
    },
    {
      operation: "set-property",
      payload: { property: "href", value: "javascript:alert(1)" },
    },
    {
      operation: "set-property",
      payload: { property: "src", value: "https://evil.example/image.svg" },
    },
    { operation: "set-style", payload: { tone: "purple" } },
    { operation: "set-style", payload: { color: "red" } },
    {
      operation: "set-text",
      payload: { content: "<script>alert(1)</script>" },
    },
    {
      operation: "set-text",
      payload: { content: '<img src=x onerror="alert(1)">' },
    },
    { operation: "set-text", payload: { content: 'onclick="alert(1)"' } },
    { operation: "set-text", payload: { content: "javascript:alert(1)" } },
    { operation: "attach-effect", payload: { effectId: "eval" } },
    {
      operation: "attach-effect",
      payload: { effectId: "fade-in", duration: 99999 },
    },
    {
      operation: "update-effect",
      payload: { effectId: "slide-up", parameters: { distance: 100 } },
    },
    { operation: "set-property", payload: { property: "level", value: 6 } },
    { operation: "set-text", payload: { content: "x".repeat(16001) } },
  ])("rejects invalid input atomically ($operation)", (bad) => {
    const s = make(),
      before = JSON.stringify(s);
    const result = applyPatchBatch(
      s,
      batch(s, [{ targetId: find(s, "heading").id, ...bad }]),
    );
    expect(result.ok).toBe(false);
    expect(result.state).toBe(s);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("rejects duplicate original IDs rather than applying an ambiguous target", () => {
    const s = make();
    const invalid = structuredClone(s);
    invalid.history.present.sections[1].id =
      invalid.history.present.sections[0].id;
    const r = applyPatchBatch(
      invalid,
      batch(invalid, [textPatch(find(s, "heading").id, "test")]),
    );
    expect(r.ok).toBe(false);
  });
  it("rejects unsupported properties for a known component and invalid final values", () => {
    const s = make(),
      n = find(s, "heading");
    for (const patch of [
      {
        operation: "set-property",
        targetId: n.id,
        payload: { property: "href", value: "https://example.com" },
      },
      textPatch(n.id, ""),
      {
        operation: "set-property",
        targetId: find(s, "button").id,
        payload: {
          property: "href",
          value: "#11111111-1111-4111-8111-111111111111",
        },
      },
    ])
      expect(applyPatchBatch(s, batch(s, [patch])).ok).toBe(false);
  });
  it("rejects a batch if any operation fails without publishing partial state", () => {
    const s = make(),
      n = find(s, "heading"),
      before = JSON.stringify(s);
    const r = applyPatchBatch(
      s,
      batch(s, [
        textPatch(n.id, "valid first"),
        {
          operation: "remove-effect",
          targetId: n.id,
          payload: { effectId: "fade-in" },
        },
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(
      applyPatchBatch(
        s,
        batch(s, [textPatch(n.id, ""), textPatch(n.id, "later valid")]),
      ).ok,
    ).toBe(false);
  });
  it("records an entire multi-target batch as a single version", () => {
    const s = make(),
      a = find(s, "heading"),
      b = find(s, "paragraph");
    const r = success(s, [textPatch(a.id, "標題"), textPatch(b.id, "內文")]);
    expect(r.state.history.past).toHaveLength(1);
    expect(r.diff.changedIds).toEqual([a.id, b.id]);
    expect(r.state.revision).toBe(1);
  });
  it("rejects unauthorized sibling, parent, metadata and tree changes via scope checks", () => {
    const s = make(),
      before = s.history.present,
      id = find(s, "heading").id;
    const patches = [textPatch(id, "authorized")] as Patch[];
    for (const change of [
      (p: typeof before) => {
        p.metadata.title = "bad";
      },
      (p: typeof before) => {
        p.sections.reverse();
      },
      (p: typeof before) => {
        p.sections[1].style.tone = "accent";
      },
      (p: typeof before) => {
        find(
          { ...s, history: { ...s.history, present: p } },
          "paragraph",
        ).content = "bad";
      },
    ]) {
      const after = structuredClone(before);
      change(after);
      expect(validateScope(before, after, patches)).toBe(false);
    }
  });
  it("supports monotonic revision checks across undo, redo and branch changes", () => {
    const s = make(),
      id = find(s, "heading").id,
      first = success(s, [textPatch(id, "A")]).state;
    const undone = travelPage(first, "undo");
    expect(undone.history.present).toBe(s.history.present);
    expect(undone.revision).toBe(2);
    const redone = travelPage(undone, "redo");
    expect(redone.history.present).toBe(first.history.present);
    expect(redone.revision).toBe(3);
    expect(
      applyPatchBatch(redone, batch(first, [textPatch(id, "stale")])).ok,
    ).toBe(false);
    const branched = success(undone, [textPatch(id, "B")]).state;
    expect(branched.history.future).toEqual([]);
    expect(travelPage(branched, "redo")).toBe(branched);
  });
  it("ignores no-op patches without history or revision changes", () => {
    const s = make(),
      n = find(s, "heading");
    const r = success(s, [
      textPatch(n.id, n.content!),
      {
        operation: "set-style",
        targetId: n.id,
        payload: { tone: n.style.tone },
      },
      {
        operation: "update-effect",
        targetId: n.id,
        payload: {
          effectId: "slide-up",
          parameters: { duration: n.effects[0].validatedControls.durationMs },
        },
      },
    ]);
    expect(r.changed).toBe(false);
    expect(r.state).toBe(s);
    expect(r.diff.changes).toEqual([]);
  });
  it("rejects stale sessions, malformed versions and prototype-pollution payloads", () => {
    const s = make(),
      p = textPatch(find(s, "heading").id, "x");
    for (const envelope of [
      { ...batch(s, [p]), baseRevision: -1 },
      { ...batch(s, [p]), baseRevision: 0.5 },
      { ...batch(s, [p]), baseRevision: 1 },
      { ...batch(s, [p]), schemaVersion: 2 },
      { ...batch(s, [p]), sessionId: crypto.randomUUID() },
      JSON.parse(
        JSON.stringify(batch(s, [p])).replace(
          '"payload":{',
          '"payload":{"__proto__":{"polluted":true},',
        ),
      ),
    ])
      expect(applyPatchBatch(s, envelope).ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("bounds depth, cycles and operation count", () => {
    const s = make(),
      p = textPatch(find(s, "heading").id, "x");
    let deep: unknown = "x";
    for (let i = 0; i < 12; i++) deep = { x: deep };
    const cyclic: Record<string, unknown> = {};
    cyclic.x = cyclic;
    for (const input of [
      batch(s, []),
      batch(
        s,
        Array.from({ length: 61 }, () => structuredClone(p)),
      ),
      deep,
      cyclic,
    ])
      expect(applyPatchBatch(s, input).ok).toBe(false);
  });
  it("tracks animation order and denies unrequested reordering", () => {
    const s = make(),
      before = s.history.present;
    const after = structuredClone(before);
    const n = find(
      { ...s, history: { ...s.history, present: after } },
      "heading",
    );
    n.effects.push(legacyMotion({effectId:"fade-in",duration:450,delay:0,distance:12,stagger:70},n.id) as MotionInstance);
    const original = structuredClone(after);
    n.effects.reverse();
    expect(diffPages(original, after).changes[0].property).toBe(
      "effects.order",
    );
    expect(validateScope(original, after, [])).toBe(false);
  });
});

it("edits only section layout and enforces layout lock independently of theme", () => {
  const state = make();
  const section = state.history.present.sections[0];
  const layout = { arrangement: { mode: "split", ratio: "left", gap: "large" }, fullBleed: true };
  const setLayout = { operation: "set-section-layout", targetId: section.id, payload: layout };
  const updated = success(state, [setLayout]).state;
  expect(updated.history.present.sections[0]).toEqual({ ...section, sectionLayout: layout });
  expect(travelPage(updated, "undo").history.present).toEqual(state.history.present);
  const locked = success(updated, [{ operation: "set-lock", targetId: section.id, payload: { lock: { layout: true } } }]).state;
  expect(applyPatchBatch(locked, batch(locked, [{ ...setLayout, payload: { ...layout, fullBleed: false } }]))).toMatchObject({ ok: false, code: "LOCKED" });
  const restyled = success(locked, [{ operation: "set-theme", targetId: section.id, payload: { theme: "ocean" } }]).state;
  expect(restyled.history.present.sections[0]).toEqual(locked.history.present.sections[0]);
});
