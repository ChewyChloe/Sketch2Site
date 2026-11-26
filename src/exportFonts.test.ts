import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { exportDisplayFonts, exportFontFiles, facesFor, parseFaces, type CjkFamily } from "./exportFonts";
// CSS imports are empty under the test runner, so read the real file.
const css = readFileSync("src/fonts.css", "utf8");
const urls = Object.fromEntries(readdirSync("src/assets/fonts/huninn").filter((f) => f.endsWith(".woff2")).map((f) => [`./assets/fonts/huninn/${f}`, f]));
const family = (dir: string, cssFile: string, name: string): CjkFamily => ({
  dir, name, css: readFileSync(cssFile, "utf8"), licence: readFileSync(`src/assets/fonts/${dir}/OFL.txt`, "utf8"),
  urls: Object.fromEntries(readdirSync(`src/assets/fonts/${dir}`).filter((f) => f.endsWith(".woff2")).map((f) => [`./assets/fonts/${dir}/${f}`, f])),
});
const noto = family("noto-sans-tc", "src/notoFonts.css", "Noto Sans TC"), huninnFamily = family("huninn", "src/fonts.css", "Huninn");

describe("export fonts", () => {
  it("parses every self-hosted face and picks only the pieces a text needs", () => {
    const faces = parseFaces(css);
    expect(faces).toHaveLength(111);
    const few = facesFor("咖啡", faces);
    expect(few.length).toBeGreaterThan(0);
    expect(few.length).toBeLessThan(12);
    expect(facesFor("每天一杯，剛剛好的手沖咖啡。學校後門走路三分鐘", faces).length).toBeLessThan(faces.length / 3);
  });
  it("writes font files, a matching CSS and the licence; rejects non-woff2 bytes", async () => {
    const woff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 1, 2, 3]);
    const files = await exportFontFiles("咖啡 Coffee", async () => woff2, [noto, huninnFamily]);
    const out = files.find((f) => f.path === "src/fonts.css")!.content as string;
    for (const dir of ["noto-sans-tc", "huninn"]) {
      const fonts = files.filter((f) => f.path.startsWith(`src/fonts/${dir}/`) && f.path.endsWith(".woff2"));
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.length).toBeLessThan(12);
      for (const f of fonts) expect(out).toContain(`url(./fonts/${dir}/${f.path.split("/").pop()})`);
      expect(files.find((f) => f.path === `src/fonts/${dir}/OFL.txt`)!.content).toContain("SIL Open Font License");
    }
    expect(out).toContain("font-family: 'Noto Sans TC'");
    expect(out).not.toContain("assets/fonts");
    // Only Noto when the page does not use 粉圓.
    const plain = await exportFontFiles("咖啡", async () => woff2, [noto]);
    expect(plain.some((f) => f.path.includes("huninn"))).toBe(false);
    await expect(exportFontFiles("咖啡", async () => new Uint8Array([60, 104, 116, 109]), [noto])).rejects.toThrow("字型檔格式無效");
  });
  it("ships Noto Sans TC with every variable weight and its licence", () => {
    const faces = parseFaces(noto.css, /url\(\.\/assets\/fonts\/noto-sans-tc\/(noto-sans-tc-\d{3}\.woff2)\)/);
    expect(faces).toHaveLength(108);
    expect(noto.css).toContain("font-weight: 100 900");
    expect(noto.licence).toMatch(/Adobe[\s\S]*SIL Open Font License/);
  });
  it("carries the display fonts of a design concept with their licence, and rejects non-font bytes", async () => {
    const woff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0]);
    const urls = { "./assets/fonts/display/space-mono.woff2": "/x/space-mono.woff2" };
    const out = await exportDisplayFonts(async () => woff2, urls, "@font-face { src: url(./assets/fonts/display/space-mono.woff2); }");
    expect(out.files.map((f) => f.path)).toEqual(["src/fonts/display/space-mono.woff2", "src/fonts/display/OFL.txt"]);
    expect(out.css).toContain("url(./fonts/display/");
    expect(out.css).not.toContain("assets/fonts/display");
    await expect(exportDisplayFonts(async () => new Uint8Array([60, 104, 116, 109]), urls)).rejects.toThrow("字型檔格式無效");
  });
});
