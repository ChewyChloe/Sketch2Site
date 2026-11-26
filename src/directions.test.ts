import { describe, expect, it } from "vitest";
import { applyDirection, cleanDirections, directionsFor, firstTwo, localDirections, variantsFor } from "./directions";
import { createDemoCandidate } from "./demo";
import { starterDrafts } from "./starters";
const starterDraft = (name: string) => starterDrafts().find((s) => s.metadata.name === name)!;
import { applyRefine, RefineSchema } from "./outline";
import { smartLayout } from "./smartLayout";
import { prepareIntent } from "./generation";
import { mockDirections } from "../tests/fixtures/generation";

const club = () => createDemoCandidate(starterDraft("社團招生頁")).page;
describe("directions", () => {
  it("keeps only three plain, different directions from the AI", () => {
    expect(cleanDirections([...mockDirections])).toHaveLength(3);
    expect(cleanDirections(mockDirections.slice(0, 2))).toBeNull();
    expect(cleanDirections([mockDirections[0], mockDirections[0], mockDirections[1]])).toBeNull();
    expect(cleanDirections([{ ...mockDirections[0], why: "看 https://evil.example" }, mockDirections[1], mockDirections[2]])).toBeNull();
    expect(cleanDirections([{ ...mockDirections[0], name: "<b>x</b>" }, mockDirections[1], mockDirections[2]])).toBeNull();
  });
  it("starts from the page as built and adds two clearly different ones", () => {
    const page = club();
    const dirs = directionsFor(page, null);
    expect(dirs).toHaveLength(3);
    expect(dirs[0].theme).toBe(page.theme);
    expect(new Set(dirs.map((d) => d.concept + d.theme + d.composition)).size).toBe(3);
    // A photo-led direction only when the page has photos.
    expect(localDirections(page, { ask: { lightness: ["dark"] } })[0].theme).toBe("midnight");
  });
  it("follows the author's answers", () => {
    const page = club();
    const light = localDirections(page, { ask: { lightness: ["bold"] } });
    expect(["poster", "generative-grid"]).toContain(light[0].concept);
  });
  it("applies a direction and variant without overriding the author's own brand", () => {
    const page = club();
    const d = directionsFor(page, null)[1];
    const v = variantsFor(d)[1];
    const out = applyDirection(page, d, v);
    expect(out.theme).toBe(d.theme);
    expect(out.brand?.primary).toBe(v.brand.primary);
    const own = applyDirection({ ...page, brand: { colors: [], primary: "#123456" } }, d, v);
    expect(own.brand?.primary).toBe("#123456");
    expect(firstTwo(out).sections).toHaveLength(2);
  });
  it("carries the model's directions through the trusted refinement", () => {
    const canvas = starterDraft("社團招生頁");
    const plan = smartLayout(prepareIntent(canvas).canvas);
    const refine = RefineSchema.parse({ theme: "ocean", concept: "none", directions: [...mockDirections], nav: true, order: [], sections: [] });
    expect(applyRefine(plan, refine).directions).toHaveLength(3);
    const bad = RefineSchema.parse({ ...refine, directions: [mockDirections[0], mockDirections[0], mockDirections[1]] });
    expect(applyRefine(plan, bad).directions).toBeUndefined();
  });
});
