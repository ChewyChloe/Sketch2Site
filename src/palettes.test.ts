import { describe, expect, it } from "vitest";
import { contrast } from "./pageSpec";
import { fixPalette, paletteFromPixels, paletteGroups, palettes } from "./palettes";

const readable = (p: { primary: string; secondary: string; accent: string; neutral: string }) => {
  expect(contrast(p.primary, "#ffffff")).toBeGreaterThanOrEqual(3);
  expect(contrast(p.accent, "#ffffff")).toBeGreaterThanOrEqual(3);
  expect(contrast(p.neutral, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.neutral, p.secondary)).toBeGreaterThanOrEqual(4.5);
};

describe("palette library", () => {
  it("has original palettes in every group, all readable", () => {
    expect(palettes.length).toBe(16);
    for (const g of paletteGroups) expect(palettes.some((p) => p.group === g)).toBe(true);
    expect(new Set(palettes.map((p) => p.name)).size).toBe(palettes.length);
    palettes.forEach(readable);
  });

  it("fixes a palette whose colours clash", () => {
    readable(fixPalette({ primary: "#ffe066", secondary: "#777777", accent: "#a0e7ff", neutral: "#999999" }));
  });

  it("reads colours from a picture", () => {
    // A photo-like mix: much pale cream, a lot of green, some orange, a little near-black.
    const px: number[] = [];
    const add = (n: number, r: number, g: number, b: number) => { for (let i = 0; i < n; i++) px.push(r, g, b, 255); };
    add(500, 245, 238, 220);
    add(300, 40, 150, 90);
    add(120, 230, 120, 30);
    add(80, 20, 22, 25);
    add(50, 0, 0, 0); px.splice(px.length - 50 * 4); // transparent pixels are skipped
    for (let i = 0; i < 20; i++) px.push(255, 0, 0, 0);
    const p = paletteFromPixels(px)!;
    readable(p);
    const g = (c: string) => parseInt(c.slice(3, 5), 16), r = (c: string) => parseInt(c.slice(1, 3), 16);
    expect(g(p.primary)).toBeGreaterThan(r(p.primary)); // green leads
    expect(r(p.accent)).toBeGreaterThan(g(p.accent)); // orange highlights
    expect(contrast(p.secondary, "#ffffff")).toBeLessThan(1.3); // pale background
    expect(paletteFromPixels([0, 0, 0, 0])).toBeNull();
  });
});
