// Exported sites carry their Chinese fonts (Noto Sans TC by default, 粉圓 when chosen) themselves,
// but only the unicode-range pieces that the page's text actually uses, plus each font's licence.
import fontCss from "./fonts.css?raw";
import licence from "./assets/fonts/huninn/OFL.txt?raw";
import notoCss from "./notoFonts.css?raw";
import notoLicence from "./assets/fonts/noto-sans-tc/OFL.txt?raw";
import type { ProjectFile } from "./archive";

const fontUrls = import.meta.glob("./assets/fonts/huninn/*.woff2", { query: "?url", import: "default", eager: true }) as Record<string, string>;
export type FontFace = { file: string; ranges: [number, number][]; block: string };

/** Splits the self-hosted font CSS into @font-face blocks with their unicode ranges. */
export function parseFaces(css: string = fontCss, filePattern = /url\(\.\/assets\/fonts\/huninn\/(huninn-\d{3}\.woff2)\)/): FontFace[] {
  const faces: FontFace[] = [];
  for (const match of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const block = match[0];
    const file = filePattern.exec(block)?.[1];
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

/** A self-hosted CJK family split by unicode-range: its CSS, files and licence. */
export type CjkFamily = { dir: string; name: string; css: string; urls: Record<string, string>; licence: string };
export const huninn: CjkFamily = { dir: "huninn", name: "jf open 粉圓 (Huninn)", css: fontCss, urls: fontUrls, licence };
export const notoSansTC: CjkFamily = {
  dir: "noto-sans-tc", name: "Noto Sans TC (思源黑體)", css: notoCss, licence: notoLicence,
  urls: import.meta.glob("./assets/fonts/noto-sans-tc/*.woff2", { query: "?url", import: "default", eager: true }) as Record<string, string>,
};

/** Font files, CSS and licence for an exported page: only the pieces of each family the text needs. */
export async function exportFontFiles(pageText: string, load: (url: string) => Promise<Uint8Array> = async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer()), families: CjkFamily[] = [notoSansTC, huninn]): Promise<ProjectFile[]> {
  const files: ProjectFile[] = [];
  let out = "";
  for (const family of families) {
    const pattern = new RegExp(`url\\(\\./assets/fonts/${family.dir}/([a-z-]+-\\d{3}\\.woff2)\\)`);
    const faces = facesFor(pageText, parseFaces(family.css, pattern));
    out += `/* ${family.name}, SIL Open Font License 1.1 — see fonts/${family.dir}/OFL.txt. Only the pieces this page uses. */\n`;
    for (const face of faces) {
      const url = family.urls[`./assets/fonts/${family.dir}/${face.file}`];
      if (!url) continue;
      const bytes = await load(url);
      // woff2 magic bytes "wOF2"; anything else is not shipped.
      if (bytes.length > 600_000 || bytes[0] !== 0x77 || bytes[1] !== 0x4f || bytes[2] !== 0x46 || bytes[3] !== 0x32) throw new Error("字型檔格式無效");
      files.push({ path: `src/fonts/${family.dir}/${face.file}`, content: bytes });
      out += face.block.replace(`url(./assets/fonts/${family.dir}/${face.file})`, `url(./fonts/${family.dir}/${face.file})`) + "\n";
    }
    files.push({ path: `src/fonts/${family.dir}/OFL.txt`, content: family.licence });
  }
  files.push({ path: "src/fonts.css", content: out });
  return files;
}

import displayCss from "./displayFonts.css?raw";
import displayLicence from "./assets/fonts/display/OFL.txt?raw";
const displayUrls = import.meta.glob("./assets/fonts/display/*.woff2", { query: "?url", import: "default", eager: true }) as Record<string, string>;

/** The Latin display fonts a design concept uses, with their licence (CSS is appended to fonts.css). */
export async function exportDisplayFonts(load: (url: string) => Promise<Uint8Array> = async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer()), urls: Record<string, string> = displayUrls, css: string = displayCss): Promise<{ css: string; files: ProjectFile[] }> {
  const files: ProjectFile[] = [];
  for (const [path, url] of Object.entries(urls)) {
    const bytes = await load(url);
    if (bytes.length > 200_000 || bytes[0] !== 0x77 || bytes[1] !== 0x4f || bytes[2] !== 0x46 || bytes[3] !== 0x32) throw new Error("字型檔格式無效");
    files.push({ path: "src/fonts/display/" + path.split("/").pop(), content: bytes });
  }
  files.push({ path: "src/fonts/display/OFL.txt", content: displayLicence });
  return { css: css.replaceAll("./assets/fonts/display/", "./fonts/display/"), files };
}
