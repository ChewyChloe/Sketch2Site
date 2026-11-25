import { imageSource } from "./assetRef";
import { z } from "zod";
import { motionIds, MotionSchema, bindMotionInput, compatibleMotion, combinationReason, targetReason, withinMotionBudget, type MotionInstance } from "./motion";
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
  })
  .strict();
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
export const fontLabels: Record<FontId, string> = { sans: "黑體（預設）", serif: "明體", rounded: "圓體", kai: "楷體（手寫感）", mono: "等寬" };
export const fontStacks: Record<FontId, string> = {
  sans: 'system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif',
  serif: '"Noto Serif TC", "Songti TC", "PMingLiU", "MingLiU", Georgia, serif',
  rounded: 'ui-rounded, "Arial Rounded MT Bold", "jf-openhuninn-2.0", "Yuanti TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  kai: '"Kaiti TC", "BiauKai", "DFKai-SB", "KaiTi", "STKaiti", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Noto Sans Mono CJK TC", monospace',
};
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
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
export const sectionRoles = ["hero", "features", "content", "gallery", "pricing", "faq", "contact", "cta"] as const;
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
  look?: ImageLook;
  text?: TextStyle;
  columns?: 1 | 2 | 3;
  children?: PageNode[];
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
export const PageNodeSchema: z.ZodType<PageNode> = z.lazy(() =>
  z.preprocess(bindMotionInput,z.discriminatedUnion("type", [
    z
      .object({
        ...common,
        type: z.literal("section"),
        role: z.enum(sectionRoles).optional(),
        children: z.array(PageNodeSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("container"),
        children: z.array(PageNodeSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("card"),
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
        type: z.literal("image"),
        src: imageSource,
        alt: z.string().min(1).max(200),
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
    chrome: z.object({ nav: z.boolean(), footer: z.boolean() }).strict().optional(),
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
    error: "預覽失敗：" + reason + "。請修正檔案後重新載入。",
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
