import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock } from "./blockTemplates";
import { createSiteCandidate } from "./siteGeneration";
import { BrandSchema, brandCss, contrast, fixContrast, inkOn, smartPalette } from "./pageSpec";
import { exportProjectFiles } from "./exportProject";

function branded(): CanvasSpec {
  const base: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, layoutMode: "reflow" } };
  const block = createBlock(base, "hero")!;
  return CanvasSchema.parse({ ...base, metadata: { ...base.metadata, brand: { colors: ["#ffc53d", "#0d74ce"], primary: "#ffc53d", headingFont: "serif", bodyFont: "rounded", logo: "/assets/samples/cafe.jpg" } }, nodes: block.nodes });
}

describe("brand kit", () => {
  it("validates strictly", () => {
    expect(BrandSchema.safeParse({ colors: ["#000000"], primary: "#000000" }).success).toBe(true);
    for (const bad of [{ colors: ["red"] }, { colors: [], logo: "https://evil.example/x.png" }, { colors: [], headingFont: "Papyrus" }, { colors: Array(11).fill("#000000") }, { colors: [], css: "x" }]) expect(BrandSchema.safeParse(bad).success).toBe(false);
  });
  it("picks readable ink and sets theme variables", () => {
    expect(inkOn("#ffc53d")).toBe("#111111");
    expect(inkOn("#0d74ce")).toBe("#ffffff");
    expect(brandCss({ colors: [], primary: "#ffc53d", headingFont: "serif" })).toMatchObject({ "--accent": "#ffc53d", "--pg-accent-ink": "#111111" });
  });
  it("travels from the draft to the site and the export (with the logo file)", async () => {
    const page = createSiteCandidate(branded()).page;
    expect(page.brand).toEqual({ colors: ["#ffc53d", "#0d74ce"], primary: "#ffc53d", headingFont: "serif", bodyFont: "rounded", logo: "/assets/samples/cafe.jpg" });
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string) => new Response(String(url).endsWith(".svg") ? "<svg xmlns='http://www.w3.org/2000/svg'/>" : new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))) as typeof fetch;
    try {
      const files = await exportProjectFiles(page);
      expect(files.some((f) => f.path === "public/assets/samples/cafe.jpg")).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("brand colour roles", () => {
  it("builds a readable palette from one main colour", () => {
    for (const main of ["#ffc53d", "#0d74ce", "#e5484d", "#111111", "#30a46c"]) {
      const p = smartPalette(main);
      expect(contrast(p.neutral, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.neutral, p.secondary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, "#ffffff")).toBeGreaterThanOrEqual(3);
    }
  });
  it("fixes faint colours to the WCAG minimum and leaves good ones alone", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    const fixed = fixContrast("#ffc53d", "#ffffff", 3);
    expect(contrast(fixed, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(fixContrast("#0d74ce", "#ffffff", 3)).toBe("#0d74ce");
  });
  it("puts the English font before the Chinese one and maps the roles to page variables", () => {
    const css = brandCss({ colors: [], primary: "#0d74ce", secondary: "#eef4ff", accent: "#f76b15", neutral: "#1b2430", headingFont: "serif", headingFontLatin: "serif", bodyFontLatin: "geometric" }) as Record<string, string>;
    expect(css["--pg-soft"]).toBe("#eef4ff");
    expect(css["--pg-highlight"]).toBe("#f76b15");
    expect(css["--ink"]).toBe("#1b2430");
    expect(css["--pg-heading-font"]).toMatch(/^Georgia.*Noto Serif TC/);
    expect(css.fontFamily).toMatch(/^"Avenir Next".*var\(--font/);
    expect(BrandSchema.safeParse({ colors: [], bodyFontLatin: "comic" }).success).toBe(false);
  });
});
