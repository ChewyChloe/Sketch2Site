import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock, type BlockTemplateId } from "./blockTemplates";
import { applyRefine, outlineOf, RefineSchema } from "./outline";
import { smartLayout } from "./smartLayout";
import { materialize } from "./generation";
import { enlivenDraft } from "./motionRecipes";

function draft(blocks: BlockTemplateId[]): CanvasSpec {
  let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, layoutMode: "reflow" } };
  for (const id of blocks) {
    const block = createBlock(spec, id);
    if (!block) break;
    spec = { ...spec, metadata: { ...spec.metadata, height: block.height }, nodes: [...spec.nodes, ...block.nodes] };
  }
  return enlivenDraft(CanvasSchema.parse(spec), "lively");
}

describe("outline-based AI", () => {
  it("keeps the request small however big the draft is, without text or positions", () => {
    const big = draft(["hero", "features", "gallery", "collage", "pricing", "faq", "cta", "features", "gallery", "pricing", "faq", "cta", "features", "gallery"]);
    expect(big.nodes.length).toBeGreaterThan(45);
    const outline = outlineOf(big);
    const json = JSON.stringify(outline);
    expect(Buffer.byteLength(json)).toBeLessThan(5000);
    expect(json).not.toMatch(/"(x|y|box|id)"/);
    // Headings are short previews only.
    expect(outline.sections.every((s) => s.heading.length <= 25)).toBe(true);
  });

  it("applies a refinement and the result still passes the trusted pipeline", () => {
    const d = draft(["hero", "features", "pricing", "faq", "cta"]);
    const plan = smartLayout(d);
    const n = plan.sections.length;
    const order = [0, ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)];
    const refine = RefineSchema.parse({ theme: "midnight", nav: true, order, sections: plan.sections.map((s, i) => ({ i, role: s.role, layout: s.layout, columns: s.columns, tone: i % 2 ? "soft" : "plain" })) });
    const next = applyRefine(plan, refine);
    expect(next.theme).toBe("midnight");
    expect(next.sections[0].role).toBe("hero");
    expect(next.sections[1].role).toBe(plan.sections[n - 1].role);
    const page = materialize(d, next);
    expect(page.sections).toHaveLength(n);
  });

  it("ignores refinements that do not fit", () => {
    const d = draft(["hero", "features", "cta"]);
    const plan = smartLayout(d);
    // Not a permutation, hero moved, grid without items, unknown section number.
    const r = RefineSchema.parse({ theme: "ocean", nav: true, order: [2, 2, 0], sections: [{ i: 0, role: "faq", layout: "grid", columns: 3, tone: "soft" }, { i: 19, role: "faq", layout: "stack", columns: 1, tone: "plain" }] });
    const next = applyRefine(plan, r);
    expect(next.sections.map((s) => s.role)).toEqual(plan.sections.map((s) => s.role));
    expect(next.sections[0].layout).toBe(plan.sections[0].layout);
    expect(RefineSchema.safeParse({ theme: "ocean", nav: true, order: [], sections: [], text: "hi" }).success).toBe(false);
    // A refinement that tries to move the hero away keeps it first.
    const moved = applyRefine(plan, RefineSchema.parse({ theme: "ocean", nav: true, order: [1, 2, 0].slice(0, plan.sections.length), sections: [] }));
    expect(moved.sections[0].role).toBe("hero");
  });
});

it("keeps FAQs as a list even if the model asks for a grid (paid test finding)", () => {
  const d = draft(["hero", "faq", "cta"]);
  const plan = smartLayout(d);
  const i = plan.sections.findIndex((s) => s.role === "faq");
  const next = applyRefine(plan, RefineSchema.parse({ theme: "blossom", nav: true, order: plan.sections.map((_, k) => k), sections: [{ i, role: "faq", layout: "grid", columns: 3, tone: "soft" }] }));
  expect(next.sections[i]).toMatchObject({ role: "faq", layout: "stack", columns: 1 });
});
