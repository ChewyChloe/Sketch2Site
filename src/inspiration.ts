import { z } from "zod";

// Web inspiration: real search, real screenshots, real analysis. Shared by the server (which
// talks to the AI and the capture service) and the browser (which shows the moodboard).
// Method adapted from MengTo/Skills (MIT): daily-ui-inspiration-capture (dedupe by normalized
// title and URL, pattern / why / interaction notes per reference) and stitched-full-page-capture
// (warm the page, settle each viewport ~2 s, stitch, reject blank captures).
// Nothing here is a fixed or invented result: a case is kept only when its address was cited by
// the search tool, and its analysis comes from a screenshot actually taken of that page.

export const inspirationDimensions = ["composition", "type", "space", "color", "imageRatio", "interaction"] as const;
export type InspirationDimension = (typeof inspirationDimensions)[number];
export const inspirationDimensionLabels: Record<InspirationDimension, string> = {
  composition: "構圖", type: "字體", space: "留白", color: "配色", imageRatio: "圖片比例", interaction: "互動",
};

/** What the author asks for (no page text, no pictures): becomes the search keywords. */
export const InspirationQuerySchema = z.object({
  purpose: z.string().trim().max(20),
  audience: z.string().trim().max(20),
  mood: z.string().trim().max(20),
  note: z.string().trim().max(100).optional(),
  // Words the author wants avoided in the results (e.g. a style they dislike).
  avoid: z.array(z.string().trim().min(1).max(20)).max(5).optional(),
}).strict();
export type InspirationQuery = z.infer<typeof InspirationQuerySchema>;

/** The model's answer to the search step. Every url must also be cited by the search tool. */
export const SearchAnswerSchema = z.object({
  keywords: z.array(z.string().min(2).max(60)).min(1).max(5),
  cases: z.array(z.object({
    url: z.string().max(300),
    title: z.string().max(80),
    why: z.string().max(80),
  }).strict()).max(8),
}).strict();
export type FoundCase = { url: string; title: string; why: string; host: string };

const normTitle = (t: string) => t.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "").slice(0, 40);
/** https only, no credentials, no private or local hosts, no fragments. */
export function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes(".") || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(h) || /\.(local|internal|lan|test|invalid)$/.test(h) || /^\[|^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}
const key = (u: URL) => (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();

/**
 * Keeps only cases whose address the search tool actually cited, removes duplicates (same
 * normalized title, same page, or same site) and anything seen before (earlier boards).
 */
export function verifiedCases(answer: z.infer<typeof SearchAnswerSchema>, citedUrls: readonly string[], seen: readonly string[] = []): FoundCase[] {
  const cited = new Set(citedUrls.map((c) => safeUrl(c)).filter((u): u is URL => !!u).map(key));
  const citedHosts = new Set(citedUrls.map((c) => safeUrl(c)?.hostname.replace(/^www\./, "")).filter(Boolean));
  const seenKeys = new Set(seen.map((s) => { const u = safeUrl(s); return u ? key(u) : s; }));
  const out: FoundCase[] = [], titles = new Set<string>(), hosts = new Set<string>();
  for (const c of answer.cases) {
    const u = safeUrl(c.url);
    if (!u) continue;
    const host = u.hostname.replace(/^www\./, "");
    // The page itself was cited, or (for a site's home page) the site was cited.
    if (!cited.has(key(u)) && !(u.pathname === "/" && citedHosts.has(host))) continue;
    if (seenKeys.has(key(u)) || hosts.has(host) || titles.has(normTitle(c.title))) continue;
    hosts.add(host); titles.add(normTitle(c.title));
    out.push({ url: u.toString(), title: c.title.trim(), why: c.why.trim(), host });
  }
  return out.slice(0, 8);
}

/** robots.txt: capture only when the page is not disallowed for every agent. */
export function robotsAllows(robots: string, path: string) {
  let applies = false;
  const rules: string[] = [];
  for (const line of robots.split(/\r?\n/)) {
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k.trim())) applies = v === "*";
    else if (applies && /^disallow$/i.test(k.trim()) && v) rules.push(v);
  }
  return !rules.some((r) => path.startsWith(r.replace(/\*$/, "")));
}

/** What the AI reads from one screenshot: fixed choices only (no text, logos or people). */
export const CaseAnalysisSchema = z.object({
  n: z.number().int().min(1).max(8),
  relevance: z.number().int().min(0).max(3),
  composition: z.enum(["split-image-right", "split-image-left", "full-bleed-hero", "type-led", "grid-index", "editorial-column", "centered-stack"]),
  focal: z.enum(["photo", "headline", "product", "pattern", "number"]),
  typeFamily: z.enum(["serif", "sans", "mono", "mixed"]),
  typeScale: z.enum(["modest", "large", "huge"]),
  space: z.enum(["airy", "balanced", "dense"]),
  colorMode: z.enum(["mono", "duo", "multi"]),
  lightness: z.enum(["light", "dark"]),
  imageRatio: z.enum(["wide", "landscape", "square", "portrait", "none"]),
  interaction: z.array(z.enum(["sticky-nav", "reveal-on-scroll", "marquee", "hover-zoom", "carousel", "parallax", "none-visible"])).max(4),
  pattern: z.string().max(60),
}).strict();
export type CaseAnalysis = z.infer<typeof CaseAnalysisSchema>;
export const AnalysisAnswerSchema = z.object({ cases: z.array(CaseAnalysisSchema).max(8) }).strict();

/** The author's say over each case: like, exclude, and which dimensions to take from it. */
export type CaseChoice = { like?: boolean; exclude?: boolean; dims?: InspirationDimension[] };

/** The 3 to 5 most relevant analysed cases (relevance, then liked first). */
export function pickBoard(analyses: readonly CaseAnalysis[], choices: Record<number, CaseChoice> = {}) {
  return [...analyses]
    .filter((a) => !choices[a.n]?.exclude && a.relevance > 0)
    .sort((a, b) => (choices[b.n]?.like ? 1 : 0) - (choices[a.n]?.like ? 1 : 0) || b.relevance - a.relevance)
    .slice(0, 5);
}

/**
 * What the board teaches the generation, per dimension: each value is the one most cases
 * share, weighted by relevance (a liked case counts double). A case only votes in the
 * dimensions the author kept for it; excluded cases never vote.
 */
export const InspirationHintsSchema = z.object({
  composition: CaseAnalysisSchema.shape.composition.optional(),
  focal: CaseAnalysisSchema.shape.focal.optional(),
  typeFamily: CaseAnalysisSchema.shape.typeFamily.optional(),
  typeScale: CaseAnalysisSchema.shape.typeScale.optional(),
  space: CaseAnalysisSchema.shape.space.optional(),
  colorMode: CaseAnalysisSchema.shape.colorMode.optional(),
  lightness: CaseAnalysisSchema.shape.lightness.optional(),
  imageRatio: CaseAnalysisSchema.shape.imageRatio.optional(),
  interaction: z.array(CaseAnalysisSchema.shape.interaction.element).max(3).optional(),
  patterns: z.array(z.string().max(60)).max(5).optional(),
  sources: z.array(z.string().max(80)).max(5).optional(),
}).strict();
export type InspirationHints = z.infer<typeof InspirationHintsSchema>;
const dimsOf: Record<InspirationDimension, (keyof CaseAnalysis)[]> = {
  composition: ["composition", "focal"], type: ["typeFamily", "typeScale"], space: ["space"], color: ["colorMode", "lightness"], imageRatio: ["imageRatio"], interaction: ["interaction"],
};
export function hintsFrom(board: readonly CaseAnalysis[], choices: Record<number, CaseChoice> = {}, hosts: Record<number, string> = {}): InspirationHints {
  const votes = new Map<string, Map<string, number>>();
  const add = (field: string, value: string, w: number) => { const m = votes.get(field) ?? new Map(); m.set(value, (m.get(value) ?? 0) + w); votes.set(field, m); };
  for (const a of board) {
    const c = choices[a.n] ?? {};
    if (c.exclude) continue;
    const w = a.relevance * (c.like ? 2 : 1);
    const dims = c.dims?.length ? c.dims : inspirationDimensions;
    for (const d of dims) for (const f of dimsOf[d]) {
      const v = a[f];
      if (Array.isArray(v)) v.filter((x) => x !== "none-visible").forEach((x) => add(f, x, w));
      else if (v !== "none") add(f, String(v), w);
    }
  }
  const top = (f: string) => { const m = votes.get(f); return m ? [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined; };
  const hints: Record<string, unknown> = {};
  for (const f of ["composition", "focal", "typeFamily", "typeScale", "space", "colorMode", "lightness", "imageRatio"]) { const v = top(f); if (v) hints[f] = v; }
  const inter = votes.get("interaction");
  if (inter) hints.interaction = [...inter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const used = board.filter((a) => !choices[a.n]?.exclude);
  if (used.length) {
    hints.patterns = used.map((a) => a.pattern).filter(Boolean).slice(0, 5);
    hints.sources = used.map((a) => hosts[a.n]).filter(Boolean).slice(0, 5);
  }
  return InspirationHintsSchema.parse(hints);
}

// Requests to the server (local api.ts and the Pages function check the same shapes).
export const InspirationSearchRequestSchema = z.object({
  requestId: z.string().uuid(),
  query: InspirationQuerySchema,
  seen: z.array(z.string().max(300)).max(40).default([]),
}).strict();
export const InspirationCaptureRequestSchema = z.object({ urls: z.array(z.string().url().max(300)).min(1).max(6) }).strict();
export const InspirationAnalyseRequestSchema = z.object({
  requestId: z.string().uuid(),
  owner: InspirationQuerySchema,
  images: z.array(z.object({ n: z.number().int().min(1).max(8), jpeg: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/).max(450_000) }).strict()).min(1).max(5),
}).strict();
