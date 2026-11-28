import { ArtPlanSchema, type ArtPlan } from "./artPlan";
import { planIds } from "./compositionPlan";
import { imageSource } from "./assetRef";
import { SectionLayoutSchema, sectionLayoutIssue, type SectionLayout } from "./sectionLayout";
import { SectionLockSchema, type SectionLock } from "./sectionLock";
import { z } from "zod";
import { motionIds, MotionSchema, bindMotionInput, compatibleMotion, combinationReason, targetReason, withinMotionBudget, type MotionInstance } from "./motion";
// Site navigation set in the draft (導覽列). Items are keyed by the heading or page they link to;
// order, a custom label and hiding are all optional. Without settings the site picks its own.
export const navStyles = ["top-sticky", "top-compact", "top-static", "top-autohide", "side-left", "side-right", "floating", "dots", "none"] as const;
export type NavStyle = (typeof navStyles)[number];
export const menuMotions = ["cross", "return", "glide", "line", "capsule", "strips"] as const;
export type MenuMotion = (typeof menuMotions)[number];
export const NavItemSchema = z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(24).optional(), hidden: z.boolean().optional() }).strict();
export const NavSettingsSchema = z.object({ style: z.enum(navStyles), menuMotion: z.enum(menuMotions).optional(), items: z.array(NavItemSchema).max(40).optional() }).strict();
export type NavSettings = z.infer<typeof NavSettingsSchema>;
/** Page chrome for a site built from a draft with (or without) navigation settings. */
/**
 * A menu-sized name from a heading: the part before the first punctuation mark
 * (新生快來找答案，一起加入！ → 新生快來找答案), cut to about ten Chinese characters.
 */
export function shortNavLabel(text: string) {
  const line = text.split("\n")[0].trim();
  const head = line.split(/[，,。！!？?：:；;、～~｜|—]/)[0].trim() || line;
  const cjk = /[\u3400-\u9fff]/.test(head), max = cjk ? 10 : 18;
  if (head.length <= max) return head;
  // English is cut at a space, never mid-word.
  const cut = cjk ? head.slice(0, max) : head.slice(0, max + 1).replace(/\s+\S*$/, "") || head.slice(0, max);
  return cut.trimEnd() + "…";
}
export function navChrome(nav: NavSettings | undefined, fallback: boolean): { nav: boolean; navStyle?: NavStyle; menuMotion?: MenuMotion; navItems?: NavSettings["items"] } {
  return nav ? { nav: nav.style !== "none", navStyle: nav.style, ...(nav.menuMotion ? { menuMotion: nav.menuMotion } : {}), ...(nav.items?.length ? { navItems: nav.items } : {}) } : { nav: fallback };
}
export const effectIds = motionIds;
export const EffectSchema = MotionSchema;
export const localAssets = ["/assets/workspace.svg"] as const;
export const href = z
  .string()
  .max(2048)
  .refine((value) => {
    if (value.startsWith("#")) return z.uuid().safeParse(value.slice(1)).success;
    // Reject characters the URL parser would trim, ignore or reinterpret.
    if (/[\s\u0000-\u001f\u007f-\u009f\\]/u.test(value)) return false;
    try {
      const u = new URL(value);
      const authority = value.match(/^https:\/\/([^/?#]+)/i)?.[1];
      const host = u.hostname.toLowerCase();
      const labels = host.split(".");
      // DNS-shaped public names only; no literals, single-label or local namespaces.
      const publicHost = host.length <= 253 && labels.length >= 2 &&
        labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) &&
        /^[a-z]{2,63}$/i.test(labels.at(-1)!) &&
        !labels.some((label) => ["localhost", "local", "internal", "localdomain", "lan", "home", "intranet", "onion", "test", "invalid"].includes(label)) &&
        !host.endsWith(".home.arpa") && host !== "home.arpa";
      return (
        /^https:\/\//i.test(value) &&
        !!authority && !/[@%]/.test(authority) &&
        !authority.endsWith(":") &&
        u.protocol === "https:" &&
        publicHost &&
        !u.username &&
        !u.password &&
        !u.port
      );
    } catch {
      return false;
    }
  }, "連結網址無效");
export const styleSchema = z
  .object({
    gap: z.enum(["none", "small", "medium", "large"]).default("medium"),
    padding: z.enum(["none", "small", "medium", "large"]).default("medium"),
    align: z.enum(["start", "center", "end"]).default("start"),
    tone: z.enum(["plain", "soft", "accent"]).default("plain"),
    width: z.enum(["full", "content", "narrow"]).default("full"),
  })
  .strict();
// Visual themes are fixed, reviewed token sets; never model-supplied CSS.
export const themeIds = ["classic", "midnight", "sunrise", "ocean", "forest", "mono", "blossom"] as const;
export type ThemeId = (typeof themeIds)[number];
// 晨光 was retired (2026-11-26, user feedback): sites already using it still render, but it is never
// offered, picked by the AI or chosen by the local planner.
export const pickableThemes = ["classic", "midnight", "ocean", "forest", "mono", "blossom"] as const satisfies readonly ThemeId[];
export const themeLabels: Record<ThemeId, string> = {
  classic: "經典綠",
  midnight: "午夜",
  sunrise: "晨光",
  ocean: "海洋",
  forest: "森林",
  mono: "極簡黑白",
  blossom: "花園",
};
// Image frames and photo adjustments (shared by the draft, the site and the export).
export const frameIds = ["rounded", "circle", "squircle", "pill", "blob", "heart", "star", "hexagon", "diamond", "flower", "polaroid", "phone", "laptop", "browser"] as const;
export type FrameId = (typeof frameIds)[number];
export const frameLabels: Record<FrameId, string> = { rounded: "圓角", circle: "圓形", squircle: "圓潤方形", pill: "膠囊", blob: "有機形", heart: "愛心", star: "星形", hexagon: "六角形", diamond: "菱形", flower: "花瓣", polaroid: "拍立得", phone: "手機", laptop: "筆電", browser: "瀏覽器視窗" };
/** Width ÷ height of each frame (rounded follows its box). */
export const frameRatios: Record<FrameId, number> = { rounded: 4 / 3, circle: 1, squircle: 1, pill: 4 / 5, blob: 1, heart: 1, star: 1, hexagon: 1.155, diamond: 1, flower: 1, polaroid: 0.84, phone: 9 / 19, laptop: 16 / 10.6, browser: 16 / 10.5 };
export const imageFilters = ["none", "mono", "warm", "cool", "vintage", "vivid", "fade", "noir"] as const;
export const filterLabels: Record<(typeof imageFilters)[number], string> = { none: "原圖", mono: "黑白", warm: "暖調", cool: "冷調", vintage: "復古", vivid: "鮮豔", fade: "褪色", noir: "高對比黑白" };
// Design concepts (docs/REFERENCE_STUDY.md): one idea the whole site follows, deciding type,
// numbering, lines, navigation and how pictures are shown. Stronger than a theme's colours.
export const conceptIds = ["exhibition", "archive", "gallery-wall", "darkroom", "poster", "generative-grid", "swiss", "japanese-minimal", "nordic", "editorial-magazine", "retro-digital", "y2k", "neo-brutalist", "organic", "storybook", "architectural"] as const;
export type ConceptId = (typeof conceptIds)[number];
export const conceptText: Record<ConceptId, { name: string; idea: string }> = {
  exhibition: { name: "展覽空間", idea: "像走進展場：一進來是一整面照片，之後一次只看一件作品，標籤小而寬" },
  archive: { name: "研究檔案", idea: "像一份研究檔案：等寬字、00001 編號、細線框，照片像資料圖" },
  "gallery-wall": { name: "作品牆", idea: "介面退到最後，讓作品說話：無框作品牆、兩層圖說" },
  darkroom: { name: "暗場", idea: "全黑的房間，作品像在發光，字極小" },
  poster: { name: "單色海報", idea: "一個大膽的底色、超粗的字、像封鎖線的標語條，一眼記住" },
  "generative-grid": { name: "生成網格", idea: "用網站名稱產生一組主題色幾何色塊" },
  "swiss": { name: "瑞士國際主義", idea: "左對齊的非對稱網格與細分隔線" },
  "japanese-minimal": { name: "日式極簡", idea: "窄幅文字、長留白與置中的照片" },
  "nordic": { name: "北歐美學", idea: "寬闊的暖白空間、自然照片與柔和介面" },
  "editorial-magazine": { name: "雜誌編輯排版", idea: "襯線大標、寬窄欄與圖說節奏" },
  "retro-digital": { name: "復古數位", idea: "像素感等寬文字、格線和方形控制項" },
  "y2k": { name: "Y2K", idea: "銀色反光面、圓形照片和膠囊按鈕" },
  "neo-brutalist": { name: "新粗獷主義", idea: "厚框、偏移陰影、強烈字級反差" },
  "organic": { name: "有機自然", idea: "不規則照片輪廓、寬鬆段落與自然色" },
  "storybook": { name: "童話繪本", idea: "圓體大標、插畫式照片框與置中敘事" },
  "architectural": { name: "建築作品集", idea: "全寬橫幅攝影、窄字欄與精準格線" },
};
/** Concepts whose pictures drift with the scroll (CSS only, off for reduced motion). */
export const parallaxConcepts: readonly ConceptId[] = ["exhibition", "archive", "darkroom"];
// Design techniques learned from a reference picture (參考圖片). Each one is a reason something
// looks good, written by us, and each changes the site in a concrete way (pageRuntime.css,
// [data-art~=...]). The AI may only pick from this list, so nothing from the picture is copied.
export const principleIds = ["color-field", "fine-lines", "diagonal-lines", "negative-space", "small-subject", "big-type", "restrained-brand", "soft-gradient", "paper-grain", "high-contrast", "serif-display", "numbered-rhythm", "full-bleed-photo"] as const;
export type PrincipleId = (typeof principleIds)[number];
export const principleText: Record<PrincipleId, { name: string; why: string; use: string }> = {
  "color-field": { name: "整片單色撐起畫面", why: "一種顏色鋪滿，畫面立刻有記憶點，其他東西都變得清楚", use: "首屏鋪滿你的主色，字改成反白" },
  "fine-lines": { name: "細線切出節奏", why: "細細的線把空間分段，讓空白有秩序而不空洞", use: "首屏與區塊之間加上細線節奏" },
  "diagonal-lines": { name: "斜線帶出速度感", why: "斜向的線引導視線往前，靜止的畫面也有動感", use: "首屏的線改成斜向，像跑道一樣往前延伸" },
  "negative-space": { name: "大量留白", why: "空出來的地方讓主角更突出，看起來從容、有質感", use: "區塊上下留白加大，文字行寬收窄" },
  "small-subject": { name: "主角小、空間大", why: "主角刻意放小，反而讓人注意到整個場景的氣氛", use: "首屏照片縮小一點，讓顏色與留白當主角" },
  "big-type": { name: "超大字當主角", why: "字本身就是圖像，一眼就知道重點", use: "首屏標題放到最大，副標退一步" },
  "restrained-brand": { name: "品牌字小而克制", why: "標誌不搶畫面，反而顯得自信、高級", use: "導覽列的名稱縮小、字距拉開" },
  "soft-gradient": { name: "柔霧漸層", why: "顏色像霧一樣暈開，溫柔又有空氣感", use: "首屏與結尾改成柔和的漸層底" },
  "paper-grain": { name: "紙張顆粒質感", why: "細微的顆粒讓畫面有手感，不像冷冰冰的螢幕", use: "背景加上很淡的紙張顆粒" },
  "high-contrast": { name: "黑白分明的強對比", why: "明暗清楚，視線不用找就知道先看哪裡", use: "文字與按鈕改成更深的顏色，對比拉高" },
  "serif-display": { name: "優雅的襯線標題", why: "襯線字有書卷氣，讓內容顯得講究", use: "標題改用襯線字" },
  "numbered-rhythm": { name: "重複與編號形成節奏", why: "反覆出現的編號或線條，讓人一路看下去", use: "區塊編號放大，變成畫面的一部分" },
  "full-bleed-photo": { name: "照片滿版", why: "照片佔滿寬度，讓人像站在場景裡", use: "首屏照片拉到滿版，不留邊框" },
};
export const ImageLookSchema = z
  .object({
    frame: z.enum(frameIds).optional(),
    // Crop inside the frame: focus point (percent) and zoom.
    focusX: z.number().min(0).max(100).optional(),
    focusY: z.number().min(0).max(100).optional(),
    zoom: z.number().min(1).max(4).optional(),
    brightness: z.number().int().min(-50).max(50).optional(),
    contrast: z.number().int().min(-50).max(50).optional(),
    saturation: z.number().int().min(-100).max(100).optional(),
    opacity: z.number().int().min(10).max(100).optional(),
    flipX: z.boolean().optional(),
    flipY: z.boolean().optional(),
    filter: z.enum(imageFilters).optional(),
    // 3D on request (a note like 做成 3D): a floating card that follows the pointer, or a slow turntable.
    depth: z.enum(["float", "turntable"]).optional(),
  })
  .strict();
export const depthLabels = { float: "浮動立體卡", turntable: "旋轉展示台" } as const;
export type ImageLook = z.infer<typeof ImageLookSchema>;
const filterCss: Record<(typeof imageFilters)[number], string> = { none: "", mono: "grayscale(1)", warm: "sepia(.25) saturate(1.15) hue-rotate(-8deg)", cool: "saturate(.9) hue-rotate(12deg) brightness(1.03)", vintage: "sepia(.45) contrast(.92) brightness(1.04)", vivid: "saturate(1.45) contrast(1.08)", fade: "contrast(.8) brightness(1.1) saturate(.75)", noir: "grayscale(1) contrast(1.45)" };
/** CSS for a framed photo; every value comes from the validated look, never from text. */
export function lookStyle(look: ImageLook | undefined) {
  const l = look ?? {};
  const parts = [filterCss[l.filter ?? "none"], l.brightness ? `brightness(${1 + l.brightness / 100})` : "", l.contrast ? `contrast(${1 + l.contrast / 100})` : "", l.saturation ? `saturate(${1 + l.saturation / 100})` : ""].filter(Boolean);
  const zoom = l.zoom ?? 1;
  return {
    objectPosition: `${l.focusX ?? 50}% ${l.focusY ?? 50}%`,
    transformOrigin: `${l.focusX ?? 50}% ${l.focusY ?? 50}%`,
    transform: zoom !== 1 || l.flipX || l.flipY ? `scale(${zoom * (l.flipX ? -1 : 1)}, ${zoom * (l.flipY ? -1 : 1)})` : undefined,
    filter: parts.length ? parts.join(" ") : undefined,
    opacity: l.opacity !== undefined && l.opacity < 100 ? l.opacity / 100 : undefined,
  };
}
// Text styling from the editor's text toolbar (draft textStyle → site text).
// Only system font stacks: no remote fonts are loaded.
export const fontIds = ["sans", "serif", "rounded", "kai", "mono"] as const;
export type FontId = (typeof fontIds)[number];
export const fontLabels: Record<FontId, string> = { sans: "黑體", serif: "明體", rounded: "粉圓體", kai: "楷體", mono: "等寬" };
export const fontStacks: Record<FontId, string> = {
  sans: '"Noto Sans TC", "Microsoft JhengHei", "微軟正黑體", "PingFang TC", system-ui, sans-serif',
  serif: '"Noto Serif TC", "Noto Serif CJK TC", "Songti TC", "PMingLiU", "MingLiU", Georgia, serif',
  rounded: '"Huninn", "jf-openhuninn-2.0", ui-rounded, "Arial Rounded MT Bold", "Yuanti TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  kai: '"Kaiti TC", "BiauKai", "DFKai-SB", "KaiTi", "STKaiti", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Noto Sans Mono CJK TC", monospace',
};
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
// ---- Media elements (媒體): video, carousel, flipbook, character, 3D object ----
// Videos are YouTube or Vimeo links only (shown behind a play cover until pressed);
// every picture is one of the app's own image references, never an arbitrary URL.
export const characterIds = ["sprout", "cat", "bird", "robot", "ghost", "star"] as const;
export const characterActions = ["wave", "bounce", "float", "blink", "spin"] as const;
export const object3dShapes = ["cube", "coin", "ring"] as const;
export const chartTypes = ["bar", "line", "pie"] as const;
export const chartTypeLabels: Record<(typeof chartTypes)[number], string> = { bar: "長條圖", line: "折線圖", pie: "圓餅圖" };
// Labels and cells are plain words: no markup, links or control characters.
const dataText = (max: number) => z.string().max(max).refine((v) => !/<\s*\/?[a-z!]|https?:|javascript:|[\u0000-\u0008\u000b-\u001f\u007f]/i.test(v), "只接受純文字");
export const MediaSchema = z.discriminatedUnion("kind", [
  // A new video has no link yet (videoId absent); the site cannot be built until one is pasted.
  z.object({ kind: z.literal("video"), provider: z.enum(["youtube", "vimeo"]), videoId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/).optional(), autoplay: z.boolean(), loop: z.boolean() }).strict()
    .refine((v) => v.videoId === undefined || (v.provider === "youtube" ? /^[A-Za-z0-9_-]{11}$/ : /^\d{6,12}$/).test(v.videoId), "影片網址無效"),
  z.object({ kind: z.literal("carousel"), images: z.array(imageSource).min(1).max(12), autoplay: z.boolean(), seconds: z.number().int().min(2).max(10), arrows: z.boolean(), dots: z.boolean() }).strict(),
  z.object({ kind: z.literal("flipbook"), images: z.array(imageSource).min(2).max(24) }).strict(),
  z.object({ kind: z.literal("character"), character: z.enum(characterIds), action: z.enum(characterActions), color: hex }).strict(),
  z.object({ kind: z.literal("object3d"), shape: z.enum(object3dShapes), images: z.array(imageSource).min(1).max(8), spin: z.boolean() }).strict(),
  // A chart drawn from the author's own numbers (bar, line or pie); no outside data.
  z.object({ kind: z.literal("chart"), chart: z.enum(chartTypes), points: z.array(z.object({ label: dataText(16).min(1), value: z.number().finite().min(-1e9).max(1e9) }).strict()).min(2).max(12), unit: dataText(6) }).strict()
    .refine((c) => c.chart !== "pie" || (c.points.every((p) => p.value >= 0) && c.points.some((p) => p.value > 0)), "圓餅圖的數字要大於 0"),
  // A table of plain text cells; the first row can be the header.
  z.object({ kind: z.literal("table"), rows: z.array(z.array(dataText(60)).min(1).max(6)).min(1).max(20), header: z.boolean() }).strict()
    .refine((t) => t.rows.every((r) => r.length === t.rows[0].length), "每一列的欄數要一樣"),
]);
export type Media = z.infer<typeof MediaSchema>;
/** YouTube (watch, youtu.be, shorts, embed) or Vimeo link → provider and id; anything else is refused. */
export function parseVideoUrl(input: string): { provider: "youtube" | "vimeo"; videoId: string } | null {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  if (host === "youtu.be") { const id = u.pathname.slice(1).split("/")[0]; return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: "youtube", videoId: id } : null; }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: "youtube", videoId: id } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") { const id = u.pathname.match(/(?:^|\/)(\d{6,12})(?:$|[/?#])/)?.[1]; return id ? { provider: "vimeo", videoId: id } : null; }
  return null;
}
/** Embed address for a video; YouTube uses its no-cookie domain. */
export function videoEmbedUrl(m: { provider: "youtube" | "vimeo"; videoId?: string; loop: boolean }, play: boolean, muted = false) {
  return m.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${m.videoId}?rel=0&playsinline=1${play ? "&autoplay=1" : ""}${muted ? "&mute=1" : ""}${m.loop ? `&loop=1&playlist=${m.videoId}` : ""}`
    : `https://player.vimeo.com/video/${m.videoId}?dnt=1${play ? "&autoplay=1" : ""}${muted ? "&muted=1" : ""}${m.loop ? "&loop=1" : ""}`;
}
export const mediaKinds = ["video", "carousel", "flipbook", "chart", "table", "character", "object3d"] as const;
export type MediaKind = (typeof mediaKinds)[number];
export const mediaKindLabels: Record<MediaKind, string> = { video: "影片", carousel: "輪播圖片", flipbook: "翻頁書", character: "動畫角色", object3d: "3D 物件", chart: "圖表", table: "表格" };
const samplePictures = ["/assets/samples/cafe.jpg", "/assets/samples/camera.jpg", "/assets/workspace.svg"] as const;
/** A new media element of this kind, with sample pictures so it shows something right away. */
export function defaultMedia(kind: MediaKind): Media {
  switch (kind) {
    case "video": return { kind, provider: "youtube", autoplay: false, loop: false };
    case "carousel": return { kind, images: [...samplePictures], autoplay: true, seconds: 4, arrows: true, dots: true };
    case "flipbook": return { kind, images: [...samplePictures] };
    case "character": return { kind, character: "sprout", action: "float", color: "#9be7b0" };
    case "object3d": return { kind, shape: "cube", images: [...samplePictures], spin: true };
    case "chart": return { kind, chart: "bar", points: [{ label: "一月", value: 120 }, { label: "二月", value: 180 }, { label: "三月", value: 150 }, { label: "四月", value: 220 }], unit: "" };
    case "table": return { kind, header: true, rows: [["項目", "價格", "說明"], ["經典美式", "70", "淺焙或深焙"], ["拿鐵", "90", "可換燕麥奶"]] };
  }
}
export function mediaAssetRefs(m: Media | undefined): string[] {
  return m && "images" in m ? [...m.images] : [];
}
export const TextStyleSchema = z
  .object({
    font: z.enum(fontIds).optional(),
    size: z.number().int().min(12).max(120).optional(),
    color: hex.optional(),
    highlight: hex.optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strike: z.boolean().optional(),
    align: z.enum(["start", "center", "end", "justify"]).optional(),
    lineHeight: z.number().min(1).max(3).optional(),
    letterSpacing: z.number().min(-0.1).max(0.5).optional(),
    // Extruded 3D lettering (立體字).
    depth: z.boolean().optional(),
  })
  .strict();
export type TextStyle = z.infer<typeof TextStyleSchema>;
/**
 * CSS for a text style. `fluid` scales the size with the page width (site),
 * otherwise it is exact (editor canvas). Values come only from the schema.
 */
export function textCss(t: TextStyle | undefined, fluid = true) {
  if (!t) return undefined;
  const deco = [t.underline ? "underline" : "", t.strike ? "line-through" : ""].filter(Boolean).join(" ");
  return {
    ...(t.font ? { fontFamily: fontStacks[t.font] } : {}),
    ...(t.size ? { fontSize: fluid ? `clamp(${Math.max(12, Math.round(t.size * 0.62))}px, ${(t.size / 14.4).toFixed(2)}cqi, ${t.size}px)` : `${t.size}px` } : {}),
    ...(t.color ? { color: t.color } : {}),
    // The highlight colour is painted by an inline .text-mark span, line by line.
    ...(t.highlight ? { "--text-mark": t.highlight, ...(t.color ? {} : { "--text-mark-ink": "#111111" }) } : {}),
    ...(t.bold !== undefined ? { fontWeight: t.bold ? 800 : 400 } : {}),
    ...(t.italic ? { fontStyle: "italic" as const } : {}),
    ...(deco ? { textDecorationLine: deco } : {}),
    ...(t.align ? { textAlign: t.align } : {}),
    ...(t.lineHeight ? { lineHeight: t.lineHeight } : {}),
    ...(t.letterSpacing !== undefined ? { letterSpacing: `${t.letterSpacing}em` } : {}),
  };
}
// Brand kit: the project's own colours, fonts and logo (set in the editor only).
// Latin-only font stacks: used before the Chinese stack, so English and numbers take this
// font while Chinese characters fall through to the Chinese font.
export const latinFontIds = ["sans", "geometric", "serif", "classic", "rounded", "mono"] as const;
export type LatinFontId = (typeof latinFontIds)[number];
export const latinFontLabels: Record<LatinFontId, string> = { sans: "Helvetica 無襯線", geometric: "Avenir 幾何", serif: "Georgia 襯線", classic: "Palatino 古典", rounded: "Rounded 圓體", mono: "Menlo 等寬" };
export const latinFontStacks: Record<LatinFontId, string> = {
  sans: '"Helvetica Neue", Helvetica, Arial',
  geometric: '"Avenir Next", Avenir, "Century Gothic", Futura',
  serif: 'Georgia, "Times New Roman", Times',
  classic: '"Palatino Linotype", Palatino, "Book Antiqua"',
  rounded: '"Arial Rounded MT Bold", "Varela Round", "Nunito"',
  mono: '"SF Mono", Menlo, Consolas, "Courier New"',
};
export const brandRadii = ["none", "small", "medium", "large", "round"] as const;
export const radiusLabels: Record<(typeof brandRadii)[number], string> = { none: "直角", small: "小圓角", medium: "中圓角", large: "大圓角", round: "膠囊" };
export const BrandSchema = z
  .object({
    colors: z.array(hex).max(10),
    // 主色: buttons, links and the closing band use it instead of the theme accent.
    primary: hex.optional(),
    // 副色: soft section backgrounds. 強調色: highlights and focus rings. 中性色: body text.
    secondary: hex.optional(),
    accent: hex.optional(),
    neutral: hex.optional(),
    headingFont: z.enum(fontIds).optional(),
    bodyFont: z.enum(fontIds).optional(),
    headingFontLatin: z.enum(latinFontIds).optional(),
    bodyFontLatin: z.enum(latinFontIds).optional(),
    logo: imageSource.optional(),
    // Secondary logo (footer) and the small site icon (browser tab).
    logoAlt: imageSource.optional(),
    icon: imageSource.optional(),
    // One corner style for cards, images and buttons.
    radius: z.enum(brandRadii).optional(),
    // Type scale: largest size in px and weight for 標題 (h1), 副標題 (h2) and 內文.
    type: z
      .object({
        h1Size: z.number().int().min(28).max(96).optional(),
        h1Weight: z.union([z.literal(500), z.literal(600), z.literal(700), z.literal(800), z.literal(900)]).optional(),
        h2Size: z.number().int().min(20).max(64).optional(),
        h2Weight: z.union([z.literal(500), z.literal(600), z.literal(700), z.literal(800), z.literal(900)]).optional(),
        bodySize: z.number().int().min(14).max(22).optional(),
        bodyWeight: z.union([z.literal(400), z.literal(500), z.literal(600)]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Brand = z.infer<typeof BrandSchema>;
export const radiusPx: Record<(typeof brandRadii)[number], { card: number; button: number }> = { none: { card: 0, button: 0 }, small: { card: 6, button: 6 }, medium: { card: 14, button: 12 }, large: { card: 24, button: 20 }, round: { card: 28, button: 999 } };
const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(color: string) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(color.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two colours (1–21). */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** Black or white, whichever reads better on the colour (WCAG relative luminance). */
export function inkOn(color: string) {
  return contrast(color, "#111111") >= contrast(color, "#ffffff") ? "#111111" : "#ffffff";
}
function toHsl(color: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function fromHsl(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, "0")).join("");
}
/** Moves a colour's lightness (keeping hue) until it reaches `min` contrast against `against`. */
export function fixContrast(color: string, against: string, min: number) {
  if (contrast(color, against) >= min) return color;
  const [h, s, l] = toHsl(color);
  const darker = luminance(against) > 0.18;
  for (let step = 1; step <= 100; step++) {
    const next = fromHsl(h, s, Math.min(1, Math.max(0, l + (darker ? -step : step) / 100)));
    if (contrast(next, against) >= min) return next;
  }
  return darker ? "#000000" : "#ffffff";
}
/** A starting palette from one main colour: readable text, a soft background and a lively highlight. */
export function smartPalette(primary: string) {
  const [h, s] = toHsl(primary);
  return {
    secondary: fromHsl(h, Math.min(0.55, s), 0.94),
    accent: fixContrast(fromHsl((h + 150) % 360, Math.max(0.6, s), 0.5), "#ffffff", 3),
    neutral: fixContrast(fromHsl(h, Math.min(0.18, s), 0.16), "#ffffff", 7),
  };
}
const fontWith = (latin: LatinFontId | undefined, cjk: string) => (latin ? `${latinFontStacks[latin]}, ${cjk}` : cjk);
/** CSS variables a brand sets on the rendered page. */
export function brandCss(b: Brand | undefined) {
  if (!b) return {};
  const headingCjk = b.headingFont ? fontStacks[b.headingFont] : "var(--heading-font, inherit)";
  const bodyCjk = b.bodyFont ? fontStacks[b.bodyFont] : "var(--font, inherit)";
  return {
    ...(b.primary ? { "--accent": b.primary, "--pg-accent-ink": inkOn(b.primary), "--accent-soft": `color-mix(in srgb, ${b.primary} 14%, #ffffff)` } : {}),
    // Raw brand colours: light themes tint their page, hero glow, lines and decorations with these.
    ...(b.primary ? { "--brand-p": b.primary, "--brand-s": b.secondary ?? b.primary, "--brand-a": b.accent ?? b.primary } : {}),
    ...(b.secondary ? { "--pg-soft": b.secondary } : {}),
    ...(b.accent ? { "--pg-highlight": b.accent } : {}),
    ...(b.neutral ? { "--ink": b.neutral } : {}),
    ...(b.headingFont || b.headingFontLatin ? { "--pg-heading-font": fontWith(b.headingFontLatin, headingCjk) } : {}),
    ...(b.bodyFont || b.bodyFontLatin ? { fontFamily: fontWith(b.bodyFontLatin, bodyCjk) } : {}),
    ...(b.radius ? { "--pg-radius-lg": radiusPx[b.radius].card + "px", "--brand-btn-radius": radiusPx[b.radius].button + "px" } : {}),
    ...(b.type?.h1Size ? { "--brand-h1-n": String(b.type.h1Size) } : {}),
    ...(b.type?.h1Weight ? { "--brand-h1-w": String(b.type.h1Weight) } : {}),
    ...(b.type?.h2Size ? { "--brand-h2-n": String(b.type.h2Size) } : {}),
    ...(b.type?.h2Weight ? { "--brand-h2-w": String(b.type.h2Weight) } : {}),
    ...(b.type?.bodySize ? { "--brand-body-n": String(b.type.bodySize) } : {}),
    ...(b.type?.bodyWeight ? { "--brand-body-w": String(b.type.bodyWeight) } : {}),
  };
}
export const sectionRoles = ["hero", "features", "content", "gallery", "pricing", "faq", "contact", "cta", "footer", "menu"] as const;
export type SectionRole = (typeof sectionRoles)[number];
export type PageNode = {
  id: string;
  role?: SectionRole;
  type:
    | "section"
    | "container"
    | "heading"
    | "paragraph"
    | "button"
    | "form"
    | "image"
    | "media"
    | "card"
    | "stack"
    | "grid";
  style: z.infer<typeof styleSchema>;
  effects: z.infer<typeof EffectSchema>[];
  content?: string;
  level?: 1 | 2 | 3;
  href?: string;
  src?: string;
  alt?: string;
  galleryCategory?: string;
  look?: ImageLook;
  media?: Media;
  text?: TextStyle;
  columns?: 1 | 2 | 3;
  children?: PageNode[];
  /** Sections only: parts the author locked (see sectionLock.ts). */
  lock?: SectionLock;
  artPlan?: ArtPlan;
  sectionLayout?: SectionLayout;
};
export function effectCompatible(
  node: PageNode,
  effectId: (typeof effectIds)[number],
) {
  return targetReason(node,effectId) === null;
}
const common = {
  id: z.string().uuid(),
  style: styleSchema.default({
    gap: "medium",
    padding: "medium",
    align: "start",
    tone: "plain",
    width: "full",
  }),
  effects: z
    .array(EffectSchema)
    .max(12)
    .default([])
    .refine(
      (a) => new Set(a.map((e) => e.presetId)).size === a.length,
      "動畫重複",
    ),
};
export const GalleryCategorySchema = z.string().trim().min(1).max(32);
export const PageNodeSchema: z.ZodType<PageNode> = z.lazy(() =>
  z.preprocess(bindMotionInput,z.discriminatedUnion("type", [
    z
      .object({
        ...common,
        type: z.literal("section"),
        role: z.enum(sectionRoles).optional(),
        lock: SectionLockSchema.optional(),
        sectionLayout: SectionLayoutSchema.optional(),
        children: z.array(PageNodeSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("container"),
        artPlan: ArtPlanSchema.optional(),
        children: z.array(PageNodeSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("card"),
        galleryCategory: GalleryCategorySchema.optional(),
        children: z.array(PageNodeSchema).max(100),
        text: TextStyleSchema.optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("stack"),
        children: z.array(PageNodeSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("grid"),
        columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        children: z.array(PageNodeSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("heading"),
        content: z.string().min(1).max(2000),
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        text: TextStyleSchema.optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("paragraph"),
        content: z.string().max(4000),
        text: TextStyleSchema.optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("button"),
        content: z.string().min(1).max(120),
        href,
        text: TextStyleSchema.optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        // Field labels, one per line; submissions go to a third-party https endpoint.
        type: z.literal("form"),
        content: z.string().min(1).max(600).refine((v) => v.split("\n").length <= 8 && v.split("\n").every((l) => l.trim().length > 0 && l.length <= 40), "表單欄位無效"),
        href: href.refine((v) => !v.startsWith("#"), "表單接收網址無效"),
      })
      .strict(),
    z
      .object({
        ...common,
        // Video, carousel, flipbook, animated character or 3D object; content is its caption.
        type: z.literal("media"),
        content: z.string().max(200),
        media: MediaSchema,
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("image"),
        src: imageSource,
        alt: z.string().min(1).max(200),
        galleryCategory: GalleryCategorySchema.optional(),
        look: ImageLookSchema.optional(),
      })
      .strict(),
  ])),
);
// Bound untrusted input before recursive Zod traversal; reject cycles and huge/deep objects.
function withinBudget(input: unknown): boolean {
  const seen = new WeakSet<object>();
  let entries = 0,
    characters = 0;
  const walk = (v: unknown, depth: number): boolean => {
    if (++entries > 12000 || depth > 30) return false;
    if (typeof v === "string") {
      characters += v.length;
      return characters <= 200000;
    }
    if (v && typeof v === "object") {
      if (seen.has(v)) return false;
      seen.add(v);
      return Object.values(v).every((x) => walk(x, depth + 1));
    }
    return true;
  };
  return walk(input, 0);
}
const DraftLayoutSchema = z.object({width:z.literal(1440),height:z.number().int().min(1200).max(4800),items:z.array(z.object({id:z.string().uuid(),x:z.number().min(0).max(1440),y:z.number().min(0).max(4800),width:z.number().min(80).max(1440),height:z.number().min(40).max(1200),zIndex:z.number().int().min(0).max(100)}).strict()).min(1).max(40)}).strict();
const PageObject = z
  .object({
    schemaVersion: z.literal(2),
    metadata: z
      .object({
        title: z.string().min(1).max(100),
        language: z.literal("zh-Hant"),
      })
      .strict(),
    sections: z.array(PageNodeSchema).min(1).max(30),
    draftLayout: DraftLayoutSchema.optional(),
    // The first page's identity when a site has more pages.
    home: z.object({ id: z.string().uuid(), title: z.string().min(1).max(30) }).strict().optional(),
    // Additional pages of a multi-page site; each is a list of sections like the first page.
    subpages: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: z.string().min(1).max(30),
            sections: z.array(PageNodeSchema).min(1).max(30),
            draftLayout: DraftLayoutSchema.optional(),
          })
          .strict(),
      )
      .max(9)
      .optional(),
    typography: z.enum(["sans", "serif"]),
    styles: z.enum(["neutral", "warm"]),
    theme: z.enum(themeIds).optional(),
    // Design techniques from a reference picture, applied on top of the theme.
    art: z.object({ principles: z.array(z.enum(principleIds)).max(5) }).strict().optional(),
    concept: z.enum(conceptIds).optional(),
    // Editorial composition: each section gets its own arrangement instead of the tidy stack.
    composition: z.enum(["editorial"]).optional(),
    // The chosen candidate's geometry (compositionPlan.ts): hero arrangement, picture scale, reading axis.
    plan: z.enum(planIds).optional(),
    designControl: z.object({ composition: z.literal(true).optional(), style: z.literal(true).optional(), conceptMotion: z.boolean().optional(), layoutConcept: z.enum(conceptIds).nullable().optional(), layoutTheme: z.enum(themeIds).nullable().optional() }).strict().optional(),
    // Interactive extras the author switched on: a pricing builder and a gallery view switch.
    extras: z.object({ pricingBuilder: z.boolean().optional(), galleryViews: z.boolean().optional() }).strict().optional(),
    brand: BrandSchema.optional(),
    chrome: z.object({ nav: z.boolean(), footer: z.boolean(), navStyle: z.enum(navStyles).optional(), menuMotion: z.enum(menuMotions).optional(), navItems: z.array(NavItemSchema).max(40).optional() }).strict().optional(),
    responsive: z
      .object({
        mobileColumns: z.literal(1),
        desktopColumns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
      .strict(),
  })
  .strict()
  .superRefine((page, ctx) => {
    const ids = new Set<string>();
    const links: string[] = [];
    const motions:MotionInstance[]=[];
    const parents=new Map<string,string[]>();
    let count = 0;
    const walk = (n: PageNode, depth: number,ancestors:string[]=[]) => {
      parents.set(n.id,ancestors);
      if (++count > 400 || depth > 10)
        ctx.addIssue({ code: "custom", message: "頁面層級或元件數量超出限制" });
      if (ids.has(n.id))
        ctx.addIssue({ code: "custom", message: "元件 ID 重複" });
      ids.add(n.id);
      motions.push(...n.effects);
      const layoutIssue = n.sectionLayout && sectionLayoutIssue(n, n.sectionLayout);
      if (layoutIssue) ctx.addIssue({ code: "custom", path: ["sectionLayout"], message: layoutIssue });
      if (n.effects.some((e) => !compatibleMotion(n, e)) || combinationReason(n.effects))
        ctx.addIssue({
          code: "custom",
          path: ["effects"],
          message: "動畫參數、對象或組合不相容",
        });
      if (n.href?.startsWith("#")) links.push(n.href.slice(1));
      n.children?.forEach((c) => walk(c, depth + 1,[...ancestors,n.id]));
    };
    const pageViews = [{ sections: page.sections, draftLayout: page.draftLayout }, ...(page.subpages ?? [])];
    if (page.subpages?.length && !page.home) ctx.addIssue({ code: "custom", message: "多頁網站缺少首頁資訊" });
    const pageIds = new Set<string>();
    for (const id of [page.home?.id, ...(page.subpages ?? []).map((p) => p.id)].filter(Boolean) as string[]) {
      if (pageIds.has(id)) ctx.addIssue({ code: "custom", message: "頁面 ID 重複" });
      pageIds.add(id);
    }
    for (const view of pageViews) {
      const before = new Set(ids);
      for (const section of view.sections) {
        if (section.type !== "section")
          ctx.addIssue({ code: "custom", message: "最外層必須是區塊" });
        walk(section, 0);
      }
      // Draft geometry may only place nodes of its own page.
      const own = new Set([...ids].filter((id) => !before.has(id)));
      const layout = view.draftLayout;
      if(layout){const placed=new Set<string>();for(const item of layout.items){if(!own.has(item.id)||placed.has(item.id)||item.x+item.width>1440||item.y+item.height>layout.height)ctx.addIssue({code:'custom',message:'草稿布局無效'});placed.add(item.id);}for(const id of placed)if(parents.get(id)?.some(p=>placed.has(p)))ctx.addIssue({code:'custom',message:'布局來源不可包含重複子樹'});}
    }
    if ([...pageIds].some((id) => ids.has(id))) ctx.addIssue({ code: "custom", message: "頁面 ID 與元件重複" });
    if(!withinMotionBudget(motions))ctx.addIssue({code:"custom",message:"動畫數量超過效能上限"});
    if (links.some((id) => !ids.has(id) && !pageIds.has(id)))
      ctx.addIssue({ code: "custom", message: "找不到連結目標" });
  });
export const PageSchema = z.preprocess((input, ctx) => {
  if (!withinBudget(input)) {
    ctx.addIssue({ code: "custom", message: "頁面資料過大或層級過深" });
    return z.NEVER;
  }
  return input;
}, PageObject);
export type PageSpec = z.infer<typeof PageSchema>;
export function validatePage(input: unknown) {
  const result = PageSchema.safeParse(input);
  if (result.success) return { ok: true as const, page: result.data };
  const issue = result.error.issues[0];
  const path = issue?.path.map(String) ?? [];
  const reason = path.includes("src")
    ? "圖片網址無效"
    : path.includes("href")
      ? "連結網址無效"
      : path.includes("effects")
        ? "動畫設定無效"
        : path.includes("schemaVersion")
          ? "頁面版本不支援"
          : "頁面資料不符合格式";
  return {
    ok: false as const,
    error: "預覽失敗：" + reason + "，請修正檔案後重新載入",
  };
}
// Reuse unchanged validated branches, allowing React.memo to skip unrelated components.
export function reconcilePage(
  previous: PageSpec | undefined,
  next: PageSpec,
): PageSpec {
  if (!previous) return next;
  const cache = new Map<string, PageNode>();
  const collect = (n: PageNode) => {
    cache.set(n.id, n);
    n.children?.forEach(collect);
  };
  allSections(previous).forEach(collect);
  const share = (n: PageNode): PageNode => {
    const old = cache.get(n.id);
    if (old && JSON.stringify(old) === JSON.stringify(n)) return old;
    return n.children ? { ...n, children: n.children.map(share) } : n;
  };
  return {
    ...next,
    metadata:
      JSON.stringify(previous.metadata) === JSON.stringify(next.metadata)
        ? previous.metadata
        : next.metadata,
    responsive:
      JSON.stringify(previous.responsive) === JSON.stringify(next.responsive)
        ? previous.responsive
        : next.responsive,
    sections: next.sections.map(share),
    ...(next.subpages ? { subpages: next.subpages.map((p) => ({ ...p, sections: p.sections.map(share) })) } : {}),
  };
}
export function componentIdFromElement(element: Element): string | null {
  return (
    element.closest("[data-page-id]")?.getAttribute("data-page-id") ?? null
  );
}

/** Sections of every page (first page, then subpages), for walkers that must see the whole site. */
export function allSections(page: Pick<PageSpec, "sections" | "subpages">): PageNode[] {
  return [...page.sections, ...(page.subpages ?? []).flatMap((p) => p.sections)];
}

/** What a line inside a card is, so menu cards can style it: an English name, a price, tags or a note. */
export function cardLineKind(text: string | undefined): "en" | "price" | "tags" | "note" | undefined {
  const t = (text ?? "").trim();
  if (!t) return undefined;
  if (/^#\S/.test(t)) return "tags";
  if (/^※/.test(t)) return "note";
  if (t.length <= 18 && /^(NT\$|US\$|\$|＄|¥|€)\s*[\d,]+|^[\d,]+\s*(元|圓)$/.test(t)) return "price";
  if (t.length <= 48 && /^[A-Za-z][A-Za-z0-9 '&.,\-–]*$/.test(t)) return "en";
  return undefined;
}
