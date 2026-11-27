import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock, type BlockTemplateId } from "./blockTemplates";
import { applyDraftMotionSuggestion, draftMotionSuggestions, enlivenDraft, motionStyleFor, stillDraft } from "./motionRecipes";
import { createSiteCandidate } from "./siteGeneration";
import { starterDrafts } from "./starters";

function draft(blocks: BlockTemplateId[], mood = ""): CanvasSpec {
  let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, layoutMode: "reflow", ...(mood ? { brief: { audience: "", purpose: "", mood, focus: "", note: "" } } : {}) } };
  for (const id of blocks) {
    const block = createBlock(spec, id)!;
    spec = { ...spec, metadata: { ...spec.metadata, height: block.height }, nodes: [...spec.nodes, ...block.nodes] };
  }
  return CanvasSchema.parse(spec);
}
const ids = (spec: CanvasSpec) => spec.nodes.map((n) => n.effects.map((e) => e.presetId).join("+"));

describe("motion recipes", () => {
  it("gives every element a fitting preset by section role", () => {
    const spec = enlivenDraft(draft(["hero", "features", "faq", "cta"]));
    const of = (type: string, content?: RegExp) => spec.nodes.filter((n) => n.type === type && (!content || content.test(n.content)));
    // Quiet by default (docs/SITE_AESTHETICS.md): one gentle entrance per element.
    expect(of("heading")[0].effects[0].presetId).toBe("split-line-assembly");
    expect(of("image")[0].effects[0].presetId).toBe("cinematic-image-pan");
    expect(of("card", /[？?]/).every((n) => n.effects[0]?.presetId === "disclosure-panel")).toBe(true);
    expect(of("button").at(-1)!.effects[0].presetId).toBe("press-feedback");
    expect(ids(spec).join(" ")).not.toMatch(/letter-assembly|breathing-glow|confetti|hand-drawn-highlight|gradient-text-flow/);
    expect(spec.nodes.every((n) => n.effects.length > 0)).toBe(true);
  });

  it("uses quieter presets for calm moods", () => {
    expect(motionStyleFor(draft(["hero"], "簡約"))).toBe("calm");
    const spec = enlivenDraft(draft(["hero", "features"], "專業"));
    expect(ids(spec)).not.toContain("letter-assembly");
    expect(ids(spec)).toContain("slide-up");
    expect(ids(spec)).toContain("fade-in");
    expect(ids(spec)).not.toContain("split-line-assembly");
  });

  it("never replaces motion the user already picked and respects onlyIds", () => {
    const base = enlivenDraft(draft(["hero"]), "calm");
    const again = enlivenDraft(base, "lively");
    expect(ids(again)).toEqual(ids(base));
    const fresh = draft(["hero", "features"]);
    const one = new Set([fresh.nodes[0].id]);
    const partial = enlivenDraft(fresh, "lively", one);
    expect(partial.nodes.filter((n) => n.effects.length).map((n) => n.id)).toEqual([...one]);
    expect(stillDraft(partial).nodes.every((n) => !n.effects.length)).toBe(true);
  });

  it("keeps drafts valid and generatable, including the starters", () => {
    for (const spec of [...starterDrafts(), enlivenDraft(draft(["hero", "features", "gallery", "pricing", "faq", "cta"]))]) {
      expect(CanvasSchema.safeParse(spec).success).toBe(true);
      expect(spec.nodes.some((n) => n.effects.length)).toBe(true);
      expect(() => createSiteCandidate(spec)).not.toThrow();
    }
  });
});

it("recommends fitting motions from the brief, and confirmation protects locks and existing effects", () => {
  const spec = draft(["hero"], "專業");
  const heading = spec.nodes.find(node => node.type === "heading")!;
  const suggestion = draftMotionSuggestions(spec, heading.id, "輕柔淡入，不要循環")[0];
  expect(suggestion.reasons.join(" ")).toMatch(/海洋.*輕柔/);
  expect(suggestion.effect.targetId).toBe(heading.id);
  expect(applyDraftMotionSuggestion(spec, suggestion.effect, new Set([heading.id]))).toBeNull();
  const locked = { ...spec, nodes: spec.nodes.map(node => node.id === heading.id ? { ...node, locked: true as const } : node) };
  expect(draftMotionSuggestions(locked, heading.id, "")).toEqual([]);
  const edited = applyDraftMotionSuggestion(spec, suggestion.effect, new Set())!;
  expect(edited.nodes.find(node => node.id === heading.id)?.effects).toEqual([suggestion.effect]);
  expect(applyDraftMotionSuggestion(edited, suggestion.effect, new Set())).toBeNull();
  expect(JSON.stringify(createSiteCandidate(edited).page)).toContain(suggestion.effect.presetId);
});
