import { describe, expect, it } from "vitest";
import { assignPlans, distinctEnough, geometryDistance, planIds } from "./compositionPlan";
import { cleanDirections, directionsFor, localDirections, applyDirection } from "./directions";
import { starterDrafts } from "./starters";
import { createSiteCandidate } from "./siteGeneration";
import { PageSchema } from "./pageSpec";

describe("independent composition for each candidate", () => {
  it("the three plans differ pairwise in at least two of focus, main picture scale and reading axis", () => {
    expect(distinctEnough([...planIds])).toBe(true);
    for (const a of planIds) for (const b of planIds) if (a !== b) expect(geometryDistance(a, b)).toBeGreaterThanOrEqual(2);
    expect(distinctEnough(["focus", "focus", "column"])).toBe(false);
  });
  it("assigns three different plans, keeping wanted ones and fitting the material", () => {
    expect(assignPlans([undefined, undefined, undefined], 3)).toEqual(["focus", "headline", "column"]);
    expect(assignPlans([undefined, undefined, undefined], 0)).toEqual(["headline", "column", "focus"]);
    expect(assignPlans(["column", "column", undefined], 2)).toEqual(["column", "focus", "headline"]);
  });
  it("every starter's three candidates get three different geometries, and the page keeps the chosen one", () => {
    for (const draft of starterDrafts()) {
      const page = createSiteCandidate(draft).page;
      const ds = directionsFor(page);
      expect(ds).toHaveLength(3);
      expect(distinctEnough(ds.map((d) => d.plan!))).toBe(true);
      const chosen = applyDirection(page, ds[1], undefined);
      expect(chosen.plan).toBe(ds[1].plan);
      expect(PageSchema.safeParse(chosen).success).toBe(true);
      expect(localDirections(page).map((d) => d.plan).every(Boolean)).toBe(true);
    }
  });
  it("AI directions without plans, or with a repeated plan, still end up with three different ones", () => {
    const base = { why: "說明", concept: "none", composition: "tidy" } as const;
    const out = cleanDirections([{ ...base, name: "甲", theme: "classic", plan: "focus" }, { ...base, name: "乙", theme: "mono", plan: "focus" }, { ...base, name: "丙", theme: "forest" }])!;
    expect(distinctEnough(out.map((d) => d.plan!))).toBe(true);
    expect(out[0].plan).toBe("focus");
  });
});

import { preferredPlans, recordTaste, resetTaste, tasteScores, describeTaste, forgetTaste } from "./preferences";
describe("learned taste", () => {
  it("an explicit choice moves that composition first; undo and reset take it back; scores are capped", () => {
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } });
    resetTaste();
    expect(preferredPlans(["focus", "headline", "column"])).toEqual(["focus", "headline", "column"]);
    const id = recordTaste("plan:column", 3, "direction");
    expect(preferredPlans(["focus", "headline", "column"])).toEqual(["column", "focus", "headline"]);
    expect(describeTaste()[0]).toContain("窄文接寬圖");
    // The three candidates stay different with taste applied.
    expect(distinctEnough(assignPlans([undefined, undefined, undefined], 2, (o) => preferredPlans(o)))).toBe(true);
    forgetTaste(id);
    expect(preferredPlans(["focus", "headline", "column"])[0]).toBe("focus");
    for (let i = 0; i < 10; i++) recordTaste("plan:headline", 3, "direction");
    expect(tasteScores()["plan:headline"]).toBe(9);
    resetTaste();
    expect(describeTaste()).toEqual([]);
  });
});
