// Exported sites carry the body font (jf open 粉圓 / Huninn) themselves, but only the
// unicode-range pieces that the page's text actually uses, plus the font's licence.
import fontCss from "./fonts.css?raw";
import licence from "./assets/fonts/huninn/OFL.txt?raw";
import type { ProjectFile } from "./archive";

const fontUrls = import.meta.glob("./assets/fonts/huninn/*.woff2", { query: "?url", import: "default", eager: true }) as Record<string, string>;
export type FontFace = { file: string; ranges: [number, number][]; block: string };

/** Splits the self-hosted font CSS into @font-face blocks with their unicode ranges. */
export function parseFaces(css: string = fontCss): FontFace[] {
  const faces: FontFace[] = [];
  for (const match of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const block = match[0];
    const file = /url\(\.\/assets\/fonts\/huninn\/(huninn-\d{3}\.woff2)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
    if (!file || !range) continue;
    const ranges = range.split(",").map((r) => {
      const [a, b] = r.trim().replace(/^U\+/i, "").split("-");
      const lo = parseInt(a, 16);
      return [lo, b ? parseInt(b, 16) : lo] as [number, number];
    }).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    faces.push({ file, ranges, block });
  }
  return faces;
}

/** The faces needed to draw `text` (always including the Latin piece for digits and punctuation). */
export function facesFor(text: string, faces: FontFace[] = parseFaces()): FontFace[] {
  const points = new Set<number>();
  for (const ch of text + "0123456789,.") points.add(ch.codePointAt(0)!);
  const sorted = [...points].sort((a, b) => a - b);
  return faces.filter((f) => f.ranges.some(([lo, hi]) => sorted.some((p) => p >= lo && p <= hi)));
}

/** Font files, CSS and licence for an exported page. */
export async function exportFontFiles(pageText: string, load: (url: string) => Promise<Uint8Array> = async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer()), css: string = fontCss, urls: Record<string, string> = fontUrls): Promise<ProjectFile[]> {
  const faces = facesFor(pageText, parseFaces(css));
  const files: ProjectFile[] = [];
  let out = "/* jf open 粉圓 (Huninn), SIL Open Font License 1.1 — see fonts/OFL.txt. Only the pieces this page uses. */\n";
  for (const face of faces) {
    const url = urls[`./assets/fonts/huninn/${face.file}`];
    if (!url) continue;
    const bytes = await load(url);
    // woff2 magic bytes "wOF2"; anything else is not shipped.
    if (bytes.length > 600_000 || bytes[0] !== 0x77 || bytes[1] !== 0x4f || bytes[2] !== 0x46 || bytes[3] !== 0x32) throw new Error("字型檔格式無效");
    files.push({ path: `src/fonts/${face.file}`, content: bytes });
    out += face.block.replace(`url(./assets/fonts/huninn/${face.file})`, `url(./fonts/${face.file})`) + "\n";
  }
  files.push({ path: "src/fonts.css", content: out }, { path: "src/fonts/OFL.txt", content: licence });
  return files;
}
