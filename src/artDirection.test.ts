import { describe, expect, it } from "vitest";
import { applyArt, type ArtDirection } from "./artDirection";
import { composeDistance, distinctCompositions, planPresets } from "./compositionPlan";
import { PageSchema, type PageNode } from "./pageSpec";
import { criticOutline, criticResultFrom } from "./visualCriticAi";

import { starterDrafts } from "./starters";
import { createSiteCandidate } from "./siteGeneration";

// The café starter laid out locally (the same page the live run sent to the AI).
const sample = () => PageSchema.parse(createSiteCandidate(starterDrafts().find((d) => /咖啡/.test(d.metadata.name))!).page);
const art: ArtDirection = { thesis: "安靜的手沖", typeSystem: "editorial-serif", space: "generous", imagery: "framed", signature: "rule-lines", accent: "one-accent", motion: { hero: "blur-in", headings: "fade-in", actions: "hover-lift", images: "image-reveal" } };
const flat = (ns: PageNode[]): PageNode[] => ns.flatMap((n) => [n, ...flat(n.children ?? [])]);

describe("composable composition", () => {
  it("presets differ enough; repeated compositions fall back to the presets", () => {
    expect(composeDistance(planPresets.focus, planPresets.headline)).toBeGreaterThanOrEqual(2);
    const same = { hero: "focus", gallery: "lead", features: "cards" } as const;
    expect(distinctCompositions([same, same, undefined], ["focus", "headline", "column"])).toEqual([planPresets.focus, planPresets.headline, planPresets.column]);
    const free = [{ hero: "split-left", gallery: "grid", features: "rows" }, { hero: "headline", gallery: "strip", features: "cards" }, { hero: "column", gallery: "mosaic", features: "stagger" }] as const;
    expect(distinctCompositions([...free], ["focus", "headline", "column"])).toEqual(free);
  });
});

describe("art direction", () => {
  const page = sample();
  it("adds fonts and motions only where the author chose none, never in locked sections", () => {
    const p = page!;
    const locked = { ...p, sections: p.sections.map((s, i) => (i === 1 ? { ...s, lock: { layout: true } } : s)), brand: { colors: [], headingFont: "sans" as const } };
    const out = applyArt(locked as typeof p, art);
    expect(out.artDirection).toEqual(art);
    expect(out.brand?.headingFont).toBe("sans");
    expect(flat([out.sections[1]]).every((n, i) => JSON.stringify(n.effects) === JSON.stringify(flat([locked.sections[1]])[i].effects))).toBe(true);
    // Elements that already move keep their own motion.
    const before = new Map(flat(locked.sections).map((n) => [n.id, n.effects]));
    expect(flat(out.sections).filter((n) => before.get(n.id)?.length).every((n) => JSON.stringify(n.effects) === JSON.stringify(before.get(n.id)))).toBe(true);
    // Without any motion, the direction's own narrative is added where compatible.
    const strip = (n: PageNode): PageNode => ({ ...n, effects: [], ...(n.children ? { children: n.children.map(strip) } : {}) });
    const bare = applyArt({ ...p, sections: p.sections.map(strip) }, art);
    const ids = (id: string) => flat(bare.sections).some((n) => n.effects.some((e) => "presetId" in e && e.presetId === id));
    expect(ids("hover-lift") && ids("image-reveal") && ids("fade-in")).toBe(true);
    expect(applyArt(out, undefined).artDirection).toBeUndefined();
  });
});

describe("AI visual critic", () => {
  const page = sample();
  it("only known parts, only listed fixes, never locked sections", () => {
    const p = page!;
    const [hero, second] = p.sections;
    const lockedPage = { ...p, sections: p.sections.map((s) => (s.id === second.id ? { ...s, lock: { layout: true } } : s)) };
    expect(criticOutline(p).length).toBeLessThanOrEqual(80);
    const r = criticResultFrom(lockedPage as typeof p, { overall: "照片好，節奏平", findings: [
      { issue: "flat-rhythm", targetId: hero.id, fix: "change-tone", why: "換底色" },
      { issue: "crowded", targetId: second.id, fix: "more-padding", why: "太擠" },
      { issue: "weak-focus", targetId: "not-on-page", fix: "more-gap", why: "假" },
      { issue: "flat-rhythm", targetId: hero.id, fix: "change-tone", why: "重複" },
    ] });
    expect(r.findings.map((f) => f.targetId)).toEqual([hero.id, second.id]);
    expect(r.patches).toEqual([{ operation: "set-style", targetId: hero.id, payload: { tone: hero.style.tone === "soft" ? "plain" : "soft" } }]);
    expect(r.findings[1].fixed).toBe(false);
  });
});
