import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock } from "./blockTemplates";
import { createSiteCandidate } from "./siteGeneration";
import { BrandSchema, brandCss, inkOn } from "./pageSpec";
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
