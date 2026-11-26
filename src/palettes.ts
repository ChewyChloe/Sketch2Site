import { contrast, fixContrast } from "./pageSpec";

// The palette library in 品牌模板設定: ready-made colour sets in four roles, and colours read
// from the author's own picture. Everything runs in the browser; nothing is uploaded.

export type Palette = { primary: string; secondary: string; accent: string; neutral: string };
export const paletteGroups = ["清爽", "溫暖", "大地", "活潑", "典雅", "科技"] as const;
export type PaletteGroup = (typeof paletteGroups)[number];

/** Makes the four roles readable together: buttons and highlights on white, body text on both backgrounds. */
export function fixPalette(p: Palette): Palette {
  const primary = fixContrast(p.primary, "#ffffff", 3);
  const accent = fixContrast(p.accent, "#ffffff", 3);
  let neutral = fixContrast(fixContrast(p.neutral, "#ffffff", 4.5), p.secondary, 4.5);
  const secondary = contrast(p.secondary, neutral) >= 4.5 ? p.secondary : fixContrast(p.secondary, neutral, 4.5);
  if (contrast(neutral, secondary) < 4.5) neutral = "#111111";
  return { primary, secondary, accent, neutral };
}

const raw: [string, PaletteGroup, string, string, string, string][] = [
  ["薄荷晨光", "清爽", "#1f8a70", "#eef8f3", "#d97706", "#17322b"],
  ["海鹽", "清爽", "#2b6cb0", "#f0f6fb", "#dd6b20", "#1a2b3c"],
  ["晴空", "清爽", "#0e7490", "#ecfeff", "#e11d48", "#0f2a33"],
  ["焦糖拿鐵", "溫暖", "#9a5b2f", "#fbf3ea", "#c2410c", "#3b2416"],
  ["柿子", "溫暖", "#c2410c", "#fff4ec", "#2f855a", "#3a1f12"],
  ["蜂蜜", "溫暖", "#a16207", "#fffaf0", "#c53030", "#3d2c10"],
  ["苔原", "大地", "#4d6a3a", "#f3f1e7", "#b5651d", "#26301f"],
  ["陶土", "大地", "#a4502f", "#f6efe6", "#3f6c5a", "#2e211b"],
  ["石板", "大地", "#4a5568", "#f2f1ee", "#a16207", "#1f2328"],
  ["汽水", "活潑", "#e11d48", "#fff1f4", "#2563eb", "#2a1520"],
  ["檸檬糖", "活潑", "#7c3aed", "#fefce8", "#ca8a04", "#241a3a"],
  ["熱帶", "活潑", "#db2777", "#f0fdf9", "#0d9488", "#2b1726"],
  ["墨與金", "典雅", "#1f2937", "#f8f5ef", "#a16207", "#1c1917"],
  ["酒紅", "典雅", "#881337", "#fbf5f2", "#a16207", "#2a1418"],
  ["深夜代碼", "科技", "#2563eb", "#eef2ff", "#0891b2", "#0f172a"],
  ["螢光實驗室", "科技", "#15803d", "#f0fdf4", "#7c3aed", "#0b1f14"],
];
export const palettes: (Palette & { name: string; group: PaletteGroup })[] = raw.map(([name, group, primary, secondary, accent, neutral]) => ({
  name,
  group,
  ...fixPalette({ primary, secondary, accent, neutral }),
}));

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const hsl = (r: number, g: number, b: number) => {
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z), min = Math.min(x, y, z), l = (max + min) / 2, d = max - min;
  return { s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
};

/**
 * Reads a picture's main colours (RGBA bytes, as from a canvas) and turns them into the four
 * roles: the most colourful one leads, the lightest becomes the background, the darkest the text.
 */
export function paletteFromPixels(data: Uint8ClampedArray | number[]): Palette | null {
  // Coarse buckets (4 bits per channel) are enough to find the main colours of a photo.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const s = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    s.n++; s.r += r; s.g += g; s.b += b;
    buckets.set(key, s);
  }
  if (!buckets.size) return null;
  const colors = [...buckets.values()]
    .map((s) => { const r = s.r / s.n, g = s.g / s.n, b = s.b / s.n; return { n: s.n, r, g, b, ...hsl(r, g, b) }; })
    .sort((a, b) => b.n - a.n)
    .slice(0, 24);
  const total = colors.reduce((t, c) => t + c.n, 0);
  const toHex = (c: (typeof colors)[number]) => hex(c.r, c.g, c.b);
  const lively = colors.filter((c) => c.l > 0.15 && c.l < 0.85 && c.n / total > 0.01).sort((a, b) => b.s * Math.sqrt(b.n) - a.s * Math.sqrt(a.n));
  const main = lively[0] ?? colors[0];
  const far = (a: (typeof colors)[number], b: (typeof colors)[number]) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 90;
  const second = lively.find((c) => far(c, main)) ?? main;
  const light = [...colors].sort((a, b) => b.l - a.l)[0];
  const dark = [...colors].sort((a, b) => a.l - b.l)[0];
  // A soft background: the lightest colour, lifted close to white so text stays easy to read.
  const bg = { r: light.r + (255 - light.r) * 0.75, g: light.g + (255 - light.g) * 0.75, b: light.b + (255 - light.b) * 0.75 };
  return fixPalette({ primary: toHex(main), accent: toHex(second), secondary: hex(bg.r, bg.g, bg.b), neutral: toHex(dark) });
}

/** Draws the picture small on a canvas in this page and reads its colours. */
export async function paletteFromFile(file: File): Promise<Palette | null> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 96 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return paletteFromPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
