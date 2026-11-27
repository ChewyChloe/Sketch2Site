import { z } from "zod";
import { principleIds, principleText, themeIds, type PrincipleId, type ThemeId } from "./pageSpec";

// A reference picture teaches WHY something looks good, never WHAT it shows. The picture is
// reduced to a small set of fixed choices (mood, colour, type, space, imagery, motion); only
// these choices reach the layout step, so the site cannot copy the picture's text, logos,
// content or layout. The picture itself is never stored.

export const ReferenceStyleSchema = z
  .object({
    mood: z.enum(["calm", "lively", "premium", "warm", "playful", "technical", "natural"]),
    colorMode: z.enum(["mono", "duo", "multi"]),
    temperature: z.enum(["warm", "cool", "neutral"]),
    lightness: z.enum(["light", "dark"]),
    contrast: z.enum(["soft", "strong"]),
    typeFamily: z.enum(["serif", "sans"]),
    typeScale: z.enum(["modest", "large", "huge"]),
    space: z.enum(["airy", "balanced", "dense"]),
    imagery: z.enum(["full-bleed", "framed", "rounded", "none"]),
    motion: z.enum(["still", "gentle", "lively"]),
    // Why it looks good: up to five techniques from our list (pageSpec principleText).
    principles: z.array(z.enum(principleIds)).max(5),
    direction: z.enum(themeIds),
  })
  .strict();
export type ReferenceStyle = z.infer<typeof ReferenceStyleSchema>;

export const styleLabels = {
  mood: { calm: "安靜", lively: "活潑", premium: "高級", warm: "溫暖", playful: "俏皮", technical: "科技", natural: "自然" },
  colorMode: { mono: "單色", duo: "雙色", multi: "多色" },
  temperature: { warm: "暖色", cool: "冷色", neutral: "中性色" },
  lightness: { light: "亮底", dark: "暗底" },
  contrast: { soft: "柔和對比", strong: "強烈對比" },
  typeFamily: { serif: "襯線字", sans: "黑體字" },
  typeScale: { modest: "字小而精緻", large: "大標題", huge: "超大標題" },
  space: { airy: "留白多", balanced: "留白適中", dense: "資訊密集" },
  imagery: { "full-bleed": "滿版圖片", framed: "留邊圖片", rounded: "圓角圖片", none: "少用圖片" },
  motion: { still: "幾乎不動", gentle: "輕柔動態", lively: "動態多" },
} as const;

/** What the picture taught, as design techniques: why it works and how the site will use it. */
export function describeStyle(s: ReferenceStyle) {
  return s.principles.map((id) => ({ id, ...principleText[id] }));
}

/** The closest of our art directions for a set of choices. */
export function directionFor(s: Omit<ReferenceStyle, "direction">): ThemeId {
  if (s.lightness === "dark") return "midnight";
  if (s.principles.includes("soft-gradient")) return "blossom";
  if (s.principles.includes("serif-display") || s.principles.includes("paper-grain")) return "forest";
  if (s.principles.includes("big-type") && s.colorMode === "mono") return "mono";
  if (s.principles.includes("color-field") && s.temperature === "cool") return "ocean";
  if (s.colorMode === "mono" && s.contrast === "strong" && s.temperature === "neutral") return "mono";
  if (s.colorMode === "mono" && s.temperature === "cool" && s.contrast === "strong") return "ocean";
  if (s.mood === "natural" || (s.typeFamily === "serif" && s.temperature !== "warm")) return "forest";
  if (s.mood === "warm" || (s.temperature === "warm" && s.typeFamily === "serif")) return "forest";
  if (s.mood === "playful" || (s.contrast === "soft" && s.colorMode === "multi")) return "blossom";
  if (s.mood === "technical" || s.temperature === "cool") return "ocean";
  if (s.mood === "premium") return "mono";
  return "classic";
}

const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * Reads a picture's look in the browser (RGBA bytes from a small canvas): how light, how much
 * contrast, warm or cool, how many colours, how busy. Type and mood cannot be measured from
 * pixels, so they get neutral guesses that the AI may refine.
 */
export function styleFromPixels(data: Uint8ClampedArray | number[], width: number, height: number): ReferenceStyle | null {
  const n = width * height;
  if (!n || data.length < n * 4) return null;
  let sumL = 0, sumL2 = 0, warmth = 0, sat = 0, edges = 0, count = 0;
  const hues = new Map<number, number>();
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    if (a < 128) continue;
    const l = luminance(r, g, b);
    L[i] = l;
    sumL += l; sumL2 += l * l; count++;
    warmth += (r - b) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), s = max ? (max - min) / max : 0;
    sat += s;
    if (s > 0.25 && max > 40) {
      const h = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
      const bucket = Math.floor((((h * 60) + 360) % 360) / 30);
      hues.set(bucket, (hues.get(bucket) ?? 0) + 1);
    }
  }
  if (!count) return null;
  let diagonal = 0;
  for (let y = 1; y < height; y++) for (let x = 1; x < width; x++) {
    const i = y * width + x;
    const dx = L[i] - L[i - 1], dy = L[i] - L[i - width];
    if (Math.abs(dx) + Math.abs(dy) > 0.18) {
      edges++;
      // Edges whose change runs both across and down belong to slanted lines.
      const r = Math.abs(dx) / (Math.abs(dy) || 1e-6);
      if (Math.abs(dx) > 0.04 && Math.abs(dy) > 0.04 && r > 0.35 && r < 2.8) diagonal++;
    }
  }
  const mean = sumL / count, sd = Math.sqrt(Math.max(0, sumL2 / count - mean * mean));
  const avgWarm = warmth / count, avgSat = sat / count, busy = edges / count;
  const strongHues = [...hues.values()].filter((v) => v / count > 0.04).length;
  const topHue = Math.max(0, ...hues.values()) / count;
  const base = {
    mood: (avgSat < 0.12 || mean < 0.38 ? "calm" : avgWarm > 0.12 ? "warm" : strongHues >= 3 && mean > 0.45 ? "lively" : "calm") as ReferenceStyle["mood"],
    colorMode: (strongHues <= 1 ? "mono" : strongHues === 2 ? "duo" : "multi") as ReferenceStyle["colorMode"],
    temperature: (avgWarm > 0.08 ? "warm" : avgWarm < -0.06 ? "cool" : "neutral") as ReferenceStyle["temperature"],
    lightness: (mean < 0.38 ? "dark" : "light") as ReferenceStyle["lightness"],
    contrast: (sd > 0.24 ? "strong" : "soft") as ReferenceStyle["contrast"],
    typeFamily: "sans" as const,
    typeScale: (busy < 0.06 ? "huge" : busy < 0.14 ? "large" : "modest") as ReferenceStyle["typeScale"],
    space: (busy < 0.08 ? "airy" : busy < 0.18 ? "balanced" : "dense") as ReferenceStyle["space"],
    imagery: (avgSat > 0.2 ? "full-bleed" : "framed") as ReferenceStyle["imagery"],
    motion: (busy < 0.08 ? "still" : "gentle") as ReferenceStyle["motion"],
  };
  // What the pixels can show: a colour filling the frame, lines and their direction, empty space,
  // soft blends, strong light and dark, a photo filling the frame. Type, brand and subject size
  // need the AI's eye.
  const principles: PrincipleId[] = [];
  const field = topHue > 0.4;
  if (field) principles.push("color-field");
  if (busy > 0.015 && busy < 0.2 && (field || diagonal / Math.max(1, edges) > 0.3)) principles.push("fine-lines");
  if (edges > 20 && diagonal / edges > 0.3) principles.push("diagonal-lines");
  if (busy < 0.08) principles.push("negative-space");
  if (busy < 0.03 && strongHues >= 2 && sd < 0.2) principles.push("soft-gradient");
  if (sd > 0.3) principles.push("high-contrast");
  if (avgSat > 0.2 && busy > 0.05 && !field) principles.push("full-bleed-photo");
  const withPrinciples = { ...base, principles: principles.slice(0, 5) };
  return { ...withPrinciples, direction: directionFor(withPrinciples) };
}

/**
 * Prepares a picture for reading: drawn small on a canvas (at most 768 px), which also drops
 * its EXIF data. Returns the pixels for the local reading and a JPEG for the AI.
 */
export async function prepareReference(file: File): Promise<{ jpeg: string; style: ReferenceStyle; preview: string } | null> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(canvas.width / 6));
    small.height = Math.max(1, Math.round(canvas.height / 6));
    small.getContext("2d")!.drawImage(canvas, 0, 0, small.width, small.height);
    const px = small.getContext("2d")!.getImageData(0, 0, small.width, small.height).data;
    const style = styleFromPixels(px, small.width, small.height);
    if (!style) return null;
    const jpeg = canvas.toDataURL("image/jpeg", 0.78);
    const thumb = document.createElement("canvas");
    const t = Math.min(1, 160 / Math.max(canvas.width, canvas.height));
    thumb.width = Math.round(canvas.width * t); thumb.height = Math.round(canvas.height * t);
    thumb.getContext("2d")!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return { jpeg, style, preview: thumb.toDataURL("image/jpeg", 0.7) };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** What the browser sends: one to five small JPEGs (EXIF already dropped by the canvas). */
export const maxReferences = 5;
export const referencePurposeIds = ["overall", "layout", "color", "type", "spacing", "components"] as const;
export type ReferencePurpose = (typeof referencePurposeIds)[number];
export const referencePurposeLabels: Record<ReferencePurpose, string> = {
  overall: "整體風格", layout: "構圖與布局", color: "配色",
  type: "字體與文字層級", spacing: "留白與間距", components: "元件樣式",
};
export const ReferencePurposesSchema = z.array(z.enum(referencePurposeIds)).min(1).max(referencePurposeIds.length)
  .refine(ids => new Set(ids).size === ids.length);
const referenceJpeg = z.string().max(300000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/);
export const ReferenceRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    images: z.array(referenceJpeg).min(1).max(maxReferences),
    purposes: z.array(ReferencePurposesSchema).min(1).max(maxReferences).optional(),
  })
  .strict()
  .refine(r => !r.purposes || r.purposes.length === r.images.length, "每張參考圖須對應用途")
  .refine((r) => r.images.reduce((n, i) => n + i.length, 0) <= 1200000, "參考圖太大");
export type ReferenceRequest = z.infer<typeof ReferenceRequestSchema>;
/** What the AI may answer: the fixed choices only; the direction is worked out by trusted code. */
export const ReferenceAnswerSchema = ReferenceStyleSchema.omit({ direction: true });
export const referenceJSONSchema = z.toJSONSchema(ReferenceAnswerSchema, { target: "draft-7" });
/** Trusted code turns the AI's choices into a style, adding the direction. */
export function styleFromAnswer(answer: unknown): ReferenceStyle | null {
  const parsed = ReferenceAnswerSchema.safeParse(answer);
  return parsed.success ? { ...parsed.data, direction: directionFor(parsed.data) } : null;
}

/**
 * Several pictures read locally become one style: each choice is the one most pictures share
 * (ties go to the first picture), and the techniques are the ones seen most often.
 */
export function mergeStyles(styles: readonly ReferenceStyle[]): ReferenceStyle | undefined {
  if (!styles.length) return undefined;
  if (styles.length === 1) return styles[0];
  const vote = <K extends keyof Omit<ReferenceStyle, "principles" | "direction">>(key: K): ReferenceStyle[K] => {
    const counts = new Map<ReferenceStyle[K], number>();
    for (const s of styles) counts.set(s[key], (counts.get(s[key]) ?? 0) + 1);
    let best = styles[0][key];
    for (const [v, n] of counts) if (n > (counts.get(best) ?? 0)) best = v;
    return best;
  };
  const seen = new Map<ReferenceStyle["principles"][number], number>();
  styles.forEach((s) => s.principles.forEach((p) => seen.set(p, (seen.get(p) ?? 0) + 1)));
  const principles = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 5);
  const base = {
    mood: vote("mood"), colorMode: vote("colorMode"), temperature: vote("temperature"), lightness: vote("lightness"),
    contrast: vote("contrast"), typeFamily: vote("typeFamily"), typeScale: vote("typeScale"), space: vote("space"),
    imagery: vote("imagery"), motion: vote("motion"), principles,
  };
  return { ...base, direction: directionFor(base) };
}

const purposeFields = {
  layout: ["imagery"],
  color: ["colorMode", "temperature", "lightness", "contrast"],
  type: ["typeFamily", "typeScale"],
  spacing: ["space"],
  components: [],
} as const;
const purposePrinciples: Record<Exclude<ReferencePurpose, "overall">, readonly PrincipleId[]> = {
  layout: ["small-subject", "full-bleed-photo"],
  color: ["color-field", "soft-gradient", "high-contrast"],
  type: ["big-type", "serif-display"],
  spacing: ["negative-space"],
  components: ["fine-lines", "diagonal-lines", "restrained-brand", "paper-grain", "numbered-rhythm"],
};

export function referenceHints(style?: ReferenceStyle, purposes?: readonly ReferencePurpose[]): Partial<ReferenceStyle> | undefined {
  if (!style || !purposes || purposes.includes("overall")) return style;
  const hints = Object.fromEntries(purposes.flatMap(purpose =>
    purpose === "overall" ? [] : purposeFields[purpose].map(key => [key, style[key]]),
  )) as Partial<ReferenceStyle>;
  const principles = style.principles.filter(principle => purposes.some(purpose =>
    purpose !== "overall" && purposePrinciples[purpose].includes(principle),
  ));
  if (purposes.includes("layout") && hints.imagery === "full-bleed" && !principles.includes("full-bleed-photo")) principles.push("full-bleed-photo");
  if (purposes.includes("type")) {
    if (hints.typeFamily === "serif" && !principles.includes("serif-display")) principles.push("serif-display");
    if (hints.typeScale === "huge" && !principles.includes("big-type")) principles.push("big-type");
  }
  if (principles.length) hints.principles = principles.slice(0, 5);
  if (purposes.includes("color")) {
    hints.direction = directionFor({
      ...style, mood: "calm", typeFamily: "sans",
      principles: principles.filter(id => purposePrinciples.color.includes(id)),
    });
  }
  return hints;
}

/** Votes only from pictures assigned to each dimension. The stored scope gates all downstream hints. */
export function mergeReferencePurposes(references: readonly { style: ReferenceStyle; purposes: readonly ReferencePurpose[] }[]) {
  const style = mergeStyles(references.map(reference => reference.style));
  if (!style || references.every(reference => reference.purposes.includes("overall")))
    return { style, referencePurposes: undefined };
  const referencePurposes = referencePurposeIds.filter(id => references.some(reference => reference.purposes.includes(id)));
  const overall = mergeStyles(references.filter(reference => reference.purposes.includes("overall")).map(reference => reference.style));
  const selected: Partial<ReferenceStyle> = {};
  const principles = new Set<PrincipleId>();
  for (const purpose of referencePurposeIds) {
    if (purpose === "overall") continue;
    const eligible = references.filter(reference => reference.purposes.includes(purpose) || reference.purposes.includes("overall"));
    const vote = mergeStyles(eligible.map(reference => reference.style));
    if (!vote) continue;
    for (const key of purposeFields[purpose]) Object.assign(selected, { [key]: vote[key] });
    vote.principles.filter(id => purposePrinciples[purpose].includes(id)).forEach(id => principles.add(id));
  }
  return {
    style: { ...(overall ?? style), ...selected, principles: [...principles].slice(0, 5) },
    referencePurposes: [...referencePurposes],
  };
}
