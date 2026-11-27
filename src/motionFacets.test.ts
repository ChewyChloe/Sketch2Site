import { describe, expect, it } from "vitest";
import { facetDimensions, matchesFilter, motionFacets, searchMotions, type Dimension } from "./motionFacets";
import { motionCatalog, motionIds } from "./motionCatalog";

describe("motion facets (one source for filters, search and recommendations)", () => {
  it("every motion has a value in every dimension, from the known list", () => {
    expect(Object.keys(motionFacets)).toEqual([...motionIds]);
    for (const id of motionIds) for (const dim of Object.keys(facetDimensions) as Dimension[]) {
      const values = motionFacets[id][dim] as string[];
      expect(values.length, `${id} ${dim}`).toBeGreaterThan(0);
      for (const v of values) expect(Object.keys(facetDimensions[dim].values), `${id} ${dim} ${v}`).toContain(v);
    }
  });
  it("keeps the 75 stable ids and the catalog untouched", () => {
    expect(motionIds).toHaveLength(75);
    expect(motionIds.slice(0, 3)).toEqual(["fade-in", "slide-up", "scale-in"]);
    for (const id of motionIds) expect(motionCatalog[id].id).toBe(id);
  });
  it("same dimension is OR, different dimensions are AND", () => {
    const pictureOrButton = motionIds.filter((id) => matchesFilter(id, { target: ["image", "button"] }));
    expect(pictureOrButton.length).toBeGreaterThan(motionIds.filter((id) => matchesFilter(id, { target: ["image"] })).length);
    const both = motionIds.filter((id) => matchesFilter(id, { target: ["image"], trigger: ["hover"] }));
    expect(both).toContain("dolly-frame");
    expect(both).not.toContain("image-reveal");
    expect(motionIds.filter((id) => matchesFilter(id, {}))).toHaveLength(75);
  });
  it("search finds Chinese and English names, descriptions and facet words", () => {
    expect(searchMotions(motionIds, "打字")).toContain("typewriter");
    expect(searchMotions(motionIds, "Typewriter")).toContain("typewriter");
    expect(searchMotions(motionIds, "圖表")).toContain("chart-build");
    expect(searchMotions(motionIds, "回彩 照片")).toContain("color-wake");
    expect(searchMotions(motionIds, "沒有這種動畫xyz")).toEqual([]);
  });
});
