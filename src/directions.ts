import { z } from "zod";
import { allSections, conceptIds, conceptText, pickableThemes, themeLabels, type Brand, type ConceptId, type PageSpec, type ThemeId } from "./pageSpec";

// Diverge, then converge (docs/WORKFLOW_STUDY.md): ask a few questions, show three clearly
// different directions side by side, then three variants of the chosen one. The person picks.

/** The default "AI look" (docs/WORKFLOW_STUDY.md). All avoided unless the author allows one. */
export const avoidIds = ["purple-gradient", "glow", "emoji", "rounded", "sparkle", "cheap-3d", "beige-orange"] as const;
export type AvoidId = (typeof avoidIds)[number];
export const avoidLabels: Record<AvoidId, string> = {
  "purple-gradient": "紫藍漸層",
  glow: "發光特效",
  emoji: "emoji",
  rounded: "太圓的介面",
  sparkle: "AI 閃亮圖示",
  "cheap-3d": "廉價 3D 圖",
  "beige-orange": "米色配橘色",
};
export const lightnessIds = ["light", "dark", "editorial", "bold"] as const;
export type Lightness = (typeof lightnessIds)[number];
export const lightnessLabels: Record<Lightness, string> = { light: "淺色乾淨", dark: "深色", editorial: "雜誌感", bold: "大膽色塊" };
export const heroIds = ["photo", "product", "type"] as const;
export type HeroPref = (typeof heroIds)[number];
export const heroLabels: Record<HeroPref, string> = { photo: "大字配照片", product: "一句話配作品畫面", type: "只有超大字" };

/** The extra answers asked before generating (all optional). */
export const AskSchema = z
  .object({
    refs: z.string().trim().max(80).optional(),
    avoid: z.array(z.enum(avoidIds)).max(avoidIds.length).optional(),
    lightness: z.array(z.enum(lightnessIds)).max(lightnessIds.length).optional(),
    hero: z.enum(heroIds).optional(),
  })
  .strict();
export type Ask = z.infer<typeof AskSchema>;

export const compositionIds = ["tidy", "editorial"] as const;
/** One design direction: fixed choices plus a short name and reason shown to the author. */
export const DirectionSchema = z
  .object({
    name: z.string().trim().min(1).max(12),
    why: z.string().trim().min(1).max(60),
    concept: z.enum([...conceptIds, "none"]),
    theme: z.enum(pickableThemes),
    composition: z.enum(compositionIds),
  })
  .strict();
export type Direction = z.infer<typeof DirectionSchema>;
// Shown words must be plain: no links, addresses, code or markup.
const plain = (s: string) => !/[<>{}`]|https?:|www\.|@|\.(com|tw|net|org)\b/i.test(s);
/** Keeps exactly three valid, different directions from an AI answer, or nothing. */
export function cleanDirections(input: unknown): Direction[] | null {
  const parsed = z.array(DirectionSchema).length(3).safeParse(input);
  if (!parsed.success) return null;
  // A concept brings its own arrangement; the editorial composition applies only without one.
  parsed.data = parsed.data.map((d) => (d.concept !== "none" ? { ...d, composition: "tidy" as const } : d));
  const keys = new Set(parsed.data.map((d) => d.concept + d.theme + d.composition));
  if (keys.size !== 3 || parsed.data.some((d) => !plain(d.name) || !plain(d.why))) return null;
  return parsed.data;
}

type Combo = { concept: ConceptId | "none"; theme: (typeof pickableThemes)[number]; composition: "tidy" | "editorial"; light: Lightness; photos?: number; hero?: HeroPref; moods: string[]; name: string };
// Reviewed combinations; each reads clearly different from the others.
const combos: Combo[] = [
  { concept: "exhibition", theme: "midnight", composition: "tidy", light: "dark", photos: 2, hero: "photo", moods: ["質感", "簡約", "專業"], name: "展覽空間" },
  { concept: "none", theme: "mono", composition: "editorial", light: "light", hero: "type", moods: ["簡約", "專業", "清爽"], name: "雜誌大字" },
  { concept: "archive", theme: "classic", composition: "tidy", light: "editorial", hero: "product", moods: ["專業", "科技感", "簡約"], name: "研究檔案" },
  { concept: "gallery-wall", theme: "classic", composition: "tidy", light: "light", photos: 3, hero: "photo", moods: ["溫暖", "自然", "清爽"], name: "作品牆" },
  { concept: "darkroom", theme: "midnight", composition: "tidy", light: "dark", photos: 2, hero: "photo", moods: ["科技感", "質感"], name: "暗場" },
  { concept: "poster", theme: "ocean", composition: "tidy", light: "bold", hero: "type", moods: ["活潑", "科技感"], name: "單色海報" },
  { concept: "none", theme: "midnight", composition: "editorial", light: "dark", photos: 1, hero: "photo", moods: ["科技感", "專業"], name: "夜色編排" },
  { concept: "generative-grid", theme: "classic", composition: "tidy", light: "bold", moods: ["活潑", "科技感"], name: "生成網格" },
  { concept: "none", theme: "forest", composition: "editorial", light: "editorial", moods: ["自然", "溫暖"], name: "書頁編排" },
  { concept: "none", theme: "classic", composition: "editorial", light: "light", photos: 1, hero: "photo", moods: ["溫暖", "活潑", "清爽"], name: "清爽編排" },
];
const whyFor = (c: Combo) =>
  (c.concept !== "none" ? conceptText[c.concept].idea : c.composition === "editorial" ? "每一段排法不同，大字和照片互相壓疊" : "整齊清楚，一眼看懂") + "，" + themeLabels[c.theme] + "色調";

/** Three different directions worked out on this device from the answers and the page content. */
export function localDirections(page: PageSpec, brief?: { mood?: string; ask?: Ask } | null): Direction[] {
  const images = allSections(page).reduce((n, s) => n + JSON.stringify(s).split('"type":"image"').length - 1, 0);
  const want = brief?.ask?.lightness ?? [];
  const scored = combos
    .map((c, i) => {
      let score = -i * 0.01;
      if (want.includes(c.light)) score += 3;
      if (c.photos && images < c.photos) score -= 6;
      if (c.photos && images >= c.photos) score += 1;
      if (brief?.ask?.hero && c.hero === brief.ask.hero) score += 1.5;
      if (brief?.mood && c.moods.includes(brief.mood)) score += 2;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);
  // Three picks that differ in lightness or concept, so the comparison is a real choice.
  const picks: Combo[] = [];
  for (const { c } of scored) {
    if (picks.length === 3) break;
    if (picks.some((p) => p.light === c.light && (p.concept === c.concept || p.theme === c.theme))) continue;
    picks.push(c);
  }
  for (const { c } of scored) if (picks.length < 3 && !picks.includes(c)) picks.push(c);
  return picks.map((c) => ({ name: c.name, why: whyFor(c), concept: c.concept, theme: c.theme, composition: c.composition }));
}

/** Three variants of one direction: the direction as is, then two type pairings and accents. */
export type Variant = { label: string; brand: Partial<Brand> };
const darkThemes: ThemeId[] = ["midnight"];
export function variantsFor(d: Direction): Variant[] {
  const dark = darkThemes.includes(d.theme) || d.concept === "darkroom";
  const accents = dark ? ["#e8c547", "#7cc6a4"] : d.concept === "poster" ? ["#0f7b5f", "#c8102e"] : ["#1f4fd8", "#0f7b5f"];
  return [
    { label: "原本", brand: {} },
    { label: "襯線標題", brand: { primary: accents[0], headingFont: "serif", headingFontLatin: "classic" } },
    { label: "等寬標題", brand: { primary: accents[1], headingFont: "sans", headingFontLatin: "mono" } },
  ];
}
export const variantAccent = (v: Variant) => v.brand.primary;

/** The page in one direction and variant; the author's own brand choices always win. */
export function applyDirection(page: PageSpec, d: Direction, v: Variant | undefined): PageSpec {
  const own = page.brand ?? { colors: [] };
  const extra = Object.fromEntries(Object.entries(v?.brand ?? {}).filter(([k]) => own[k as keyof Brand] === undefined));
  const brand = Object.keys(extra).length ? { ...own, ...extra } : page.brand;
  const { concept: _c, composition: _m, ...rest } = page;
  return {
    ...rest,
    theme: d.theme,
    ...(d.concept !== "none" ? { concept: d.concept } : {}),
    ...(d.composition === "editorial" ? { composition: "editorial" as const } : {}),
    ...(brand ? { brand } : {}),
  };
}
/** The opening section and the one after it: enough to judge a direction. */
export function firstTwo(page: PageSpec): PageSpec {
  const { subpages: _s, home: _h, ...rest } = page;
  return { ...rest, sections: page.sections.slice(0, 2), ...(page.chrome ? { chrome: { ...page.chrome, footer: false } } : {}) };
}

const lightOf = (theme: ThemeId, concept?: string): Lightness =>
  theme === "midnight" || concept === "darkroom" ? "dark" : concept === "poster" || concept === "generative-grid" ? "bold" : concept === "archive" || theme === "forest" ? "editorial" : "light";
/** The page as built becomes the first direction; two clearly different ones join it. */
export function directionsFor(page: PageSpec, brief?: { mood?: string; ask?: Ask } | null): Direction[] {
  const current: Direction = {
    name: page.concept ? conceptText[page.concept].name : themeLabels[page.theme ?? "classic"] + (page.composition === "editorial" ? "編排" : "整齊"),
    why: page.concept ? conceptText[page.concept].idea : "照你的描述選的色調，每一段" + (page.composition === "editorial" ? "排法不同" : "整齊排好"),
    concept: page.concept ?? "none",
    theme: page.theme && page.theme !== "sunrise" ? page.theme : "classic",
    composition: page.composition === "editorial" ? "editorial" : "tidy",
  };
  const light = lightOf(current.theme, page.concept);
  const others = localDirections(page, brief).concat(localDirections(page, { mood: brief?.mood }))
    .filter((d) => !(d.concept === current.concept && d.theme === current.theme && d.composition === current.composition));
  const picks: Direction[] = [current];
  for (const d of others) {
    if (picks.length === 3) break;
    if (picks.some((p) => p.concept === d.concept && p.theme === d.theme && p.composition === d.composition)) continue;
    if (lightOf(d.theme, d.concept === "none" ? undefined : d.concept) === light && picks.length === 1 && others.some((o) => lightOf(o.theme, o.concept) !== light)) continue;
    picks.push(d);
  }
  for (const d of others) if (picks.length < 3 && !picks.some((p) => p.concept === d.concept && p.theme === d.theme && p.composition === d.composition)) picks.push(d);
  return picks;
}
export const sameDirection = (d: Direction, theme: ThemeId | undefined, concept: string | undefined, composition: string | undefined) =>
  d.theme === theme && (d.concept === "none" ? !concept : d.concept === concept) && (d.composition === "editorial") === (composition === "editorial");
