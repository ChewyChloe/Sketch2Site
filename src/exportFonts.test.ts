import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { exportFontFiles, facesFor, parseFaces } from "./exportFonts";
// CSS imports are empty under the test runner, so read the real file.
const css = readFileSync("src/fonts.css", "utf8");
const urls = Object.fromEntries(readdirSync("src/assets/fonts/huninn").filter((f) => f.endsWith(".woff2")).map((f) => [`./assets/fonts/huninn/${f}`, f]));

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
    const files = await exportFontFiles("咖啡 Coffee", async () => woff2, css, urls);
    const out = files.find((f) => f.path === "src/fonts.css")!.content as string;
    const fonts = files.filter((f) => f.path.startsWith("src/fonts/huninn-"));
    expect(fonts.length).toBeGreaterThan(0);
    for (const f of fonts) expect(out).toContain(`url(./fonts/${f.path.split("/").pop()})`);
    expect(out).not.toContain("assets/fonts");
    expect(files.find((f) => f.path === "src/fonts/OFL.txt")!.content).toContain("SIL Open Font License");
    await expect(exportFontFiles("咖啡", async () => new Uint8Array([60, 104, 116, 109]), css, urls)).rejects.toThrow("字型檔格式無效");
  });
});
