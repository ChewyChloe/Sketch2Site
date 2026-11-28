import { AskSchema } from "./directions";
import { commitHistory, undoHistory, redoHistory } from "./history";
import { z } from "zod";
import { imageSource } from "./assetRef";
import { MotionSchema, bindMotionInput, compatibleMotion, combinationReason, withinMotionBudget } from "./motion";
import { ReferencePurposesSchema, ReferenceStyleSchema } from "./referenceStyle";
import { href, localAssets, ImageLookSchema, TextStyleSchema, BrandSchema, NavSettingsSchema, MediaSchema, defaultMedia, mediaKindLabels, type MediaKind } from "./pageSpec";
import { SiteOverridesSchema } from "./siteOverrides";
export const Effect = z.enum([
  "hover-glow",
  "fade-in",
  "lift",
  "slide-up",
  "scale-in",
  "hover-lift",
  "stagger-reveal",
]);
export const canvasMaxHeight = 4800;
export const Kind = z.enum(["text", "button", "card", "heading", "image", "form", "media"]);
export const NodeSchema = z.preprocess(bindMotionInput,z
  .object({
    id: z.string().uuid(),
    type: Kind,
    x: z.number().min(0).max(1440),
    y: z.number().min(0).max(canvasMaxHeight),
    width: z.number().min(80).max(1440),
    height: z.number().min(40).max(1200),
    content: z.string().max(2000),
    effects: z
      .array(MotionSchema)
      .max(12)
      .refine(
        (a) =>
          new Set(a.map((e) => e.presetId)).size ===
          a.length,
      ),
    parentId: z.string().uuid().nullable(),
    groupId:z.string().uuid().optional(),
    // Page of a multi-page draft; absent means the first page.
    pageId: z.string().uuid().optional(),
    assetId: imageSource.nullable(),
    href: href.nullable().optional(),
    // Frame, crop and photo adjustments (images only).
    look: ImageLookSchema.optional(),
    // Font, size, colour and emphasis from the text toolbar (text-like elements).
    textStyle: TextStyleSchema.optional(),
    // Video, carousel, flipbook, character or 3D object (media elements only).
    media: MediaSchema.optional(),
    // Locked elements cannot be moved, resized, edited or deleted until unlocked.
    locked: z.literal(true).optional(),
    zIndex: z.number().int().min(0).max(100),
  })
  .strict()
  .refine((n) => !n.look || n.type === "image", "只有圖片可以設定相框")
  .refine((n) => (n.type === "media") === !!n.media && (n.type !== "media" || n.content.length <= 200), "媒體元件設定無效")
  .refine((n) => !n.textStyle || ["heading", "text", "button", "card"].includes(n.type), "這個元件不能設定文字樣式"));
export const CanvasSchema = z
  .object({
    schemaVersion: z.literal(1),
    metadata: z
      .object({
        name: z.string().min(1).max(80),
        layoutMode:z.enum(["preserve","reflow"]).optional(),
        sectionOrder: z.array(z.string().uuid()).max(100).refine(ids => new Set(ids).size === ids.length).optional(),
        // The user's short description for generation (fill-in blanks + an optional note).
        brief: z.object({
          audience: z.string().trim().max(20),
          purpose: z.string().trim().max(20),
          mood: z.string().trim().max(20),
          focus: z.string().trim().max(20),
          note: z.string().trim().max(100),
          details: z.string().trim().max(600).optional(),
          // What a reference picture taught (fixed choices only; the picture is never stored).
          style: ReferenceStyleSchema.optional(),
          caseFeedback: z.record(z.string().regex(/^case-(0[1-9]|[12][0-9]|3[0-2])$/), z.enum(["prefer", "avoid"])).optional(),
          // The author's own inspiration links (moodboard). Stored only, never fetched; the AI
          // gets the author's note and what they like about it, not the address.
          moodLinks: z.array(z.object({
            url: z.string().max(300).url().refine((u) => /^https:\/\//.test(u), "只接受 https 網址"),
            note: z.string().trim().max(40),
            likes: z.array(z.enum(["layout", "type", "color", "space", "photo", "motion"])).max(6),
          }).strict()).max(8).optional(),
          referencePurposes: ReferencePurposesSchema.optional(),
          // Answers asked before generating: references, what to avoid, lightness, the opening.
          ask: AskSchema.optional(),
        }).strict().optional(),
        // Pages of a multi-page site, in order; the first is the home page.
        pages: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(30) }).strict()).min(1).max(10).optional(),
        // Layout tweaks made on the generated site, re-applied after each generation (siteSync.ts).
        siteOverrides: SiteOverridesSchema.optional(),
        // Brand kit: colours, fonts and logo applied to the generated site.
        brand: BrandSchema.optional(),
        // Site navigation (導覽列): style and which headings or pages it lists.
        nav: NavSettingsSchema.optional(),
        // Short fingerprint of the draft the current site was built from (siteSync.ts).
        siteBuiltFrom: z.string().regex(/^[0-9a-f]{8}$/).optional(),
        width: z.literal(1440),
        // Taller pages grow in 600px steps; existing drafts stay at 1200.
        height: z.number().int().min(1200).max(canvasMaxHeight),
      })
      .strict(),
    nodes: z.array(NodeSchema).max(100),
    constraints: z.array(z.string().max(200)).max(20),
  })
  .strict()
  .superRefine((v, ctx) => {
    if(!withinMotionBudget(v.nodes.flatMap(n=>n.effects)))ctx.addIssue({code:"custom",message:"動畫數量超過效能上限"});
    const ids = new Set(v.nodes.map((n) => n.id));
    const pageIds = new Set((v.metadata.pages ?? []).map((p) => p.id));
    if (pageIds.size !== (v.metadata.pages ?? []).length || [...pageIds].some((id) => ids.has(id)))
      ctx.addIssue({ code: "custom", message: "Duplicate page IDs" });
    if (ids.size !== v.nodes.length)
      ctx.addIssue({ code: "custom", message: "Duplicate IDs" });
    for (const n of v.nodes) {
      if(n.effects.some(e=>!compatibleMotion(n,e)) || combinationReason(n.effects))ctx.addIssue({code:"custom",message:"動畫目標或組合無效"});
      if (
        n.x + n.width > v.metadata.width ||
        n.y + n.height > v.metadata.height
      )
        ctx.addIssue({ code: "custom", message: "Out of bounds" });
      if (
        (n.type === "image" && !n.assetId) ||
        (n.type !== "image" && n.assetId !== null)
      )
        ctx.addIssue({ code: "custom", message: "Invalid asset" });
      if (n.type !== "button" && n.type !== "form" && n.href != null)
        ctx.addIssue({ code: "custom", message: "Unexpected link" });
      if (n.type === "form" && n.href?.startsWith("#"))
        ctx.addIssue({ code: "custom", message: "Form endpoint must be https" });
      if (n.href?.startsWith("#") && !ids.has(n.href.slice(1)) && !pageIds.has(n.href.slice(1)))
        ctx.addIssue({ code: "custom", message: "Unknown link target" });
      if (n.pageId !== undefined && !pageIds.has(n.pageId))
        ctx.addIssue({ code: "custom", message: "Unknown page" });
      // The editor still supports flat nodes only.
      if (n.parentId !== null)
        ctx.addIssue({
          code: "custom",
          message: "Hierarchy not supported yet",
        });
    }
  });
const SafeHref = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      /^#[a-zA-Z][\w-]*$/.test(v) ||
      (/^https:\/\//.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    "Unsafe URL",
  );
const PageComponent = z
  .object({
    id: z.string().uuid(),
    type: Kind,
    content: z.string().max(2000),
    effects: z.array(Effect).max(3),
    interaction: z
      .object({ label: z.string().max(100), href: SafeHref })
      .strict()
      .nullable(),
  })
  .strict();
export const LegacyPageSchema = z
  .object({
    schemaVersion: z.literal(1),
    metadata: z
      .object({
        title: z.string().min(1).max(100),
        language: z.literal("zh-Hant"),
      })
      .strict(),
    sections: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            layout: z.enum(["stack", "grid"]),
            components: z.array(PageComponent).max(100),
          })
          .strict(),
      )
      .max(30),
    typography: z.enum(["sans", "serif"]),
    styles: z.enum(["neutral", "warm"]),
    responsive: z
      .object({
        mobileColumns: z.literal(1),
        desktopColumns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
      .strict(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = v.sections.flatMap((s) => [
      s.id,
      ...s.components.map((c) => c.id),
    ]);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate IDs" });
  });
export type CanvasSpec = z.infer<typeof CanvasSchema>;
export type CanvasNode = z.infer<typeof NodeSchema>;
export const blank = (): CanvasSpec => ({
  schemaVersion: 1,
  metadata: { name: "未命名草稿", width: 1440, height: 1200 },
  nodes: [],
  constraints: [],
});
const mediaSizes: Record<MediaKind, [number, number]> = { video: [480, 270], carousel: [480, 300], flipbook: [300, 400], character: [180, 180], object3d: [280, 280], chart: [480, 300], table: [520, 220] };
/** A media element (video, carousel, flipbook, chart, table, character, 3D object) at x, y. */
export function createMediaNode(kind: MediaKind, x: number, y: number, canvasHeight = 1200): CanvasNode {
  const [width, height] = mediaSizes[kind];
  return {
    ...createNode("media", x, y, canvasHeight),
    x: Math.max(0, Math.min(1440 - width, x)),
    y: Math.max(0, Math.min(canvasHeight - height, y)),
    width,
    height,
    content: kind === "character" ? "" : mediaKindLabels[kind],
    media: defaultMedia(kind),
  };
}
export function createNode(
  type: CanvasNode["type"],
  x: number,
  y: number,
  canvasHeight = 1200,
): CanvasNode {
  const width =
      type === "heading"
        ? 400
        : type === "card" || type === "image"
          ? 280
          : 200,
    height =
      type === "heading" ? 96 : type === "card" || type === "image" ? 180 : 64;
  return {
    id: crypto.randomUUID(),
    type,
    x: Math.max(0, Math.min(1440 - width, x)),
    y: Math.max(0, Math.min(canvasHeight - height, y)),
    width,
    height,
    content: {
      text: "在這裡寫下想法",
      button: "了解更多",
      card: "卡片標題\n補充內容與說明",
      heading: "網站標題",
      image: "內建圖片示意",
      form: "姓名\nEmail\n訊息",
      media: "",
    }[type],
    effects: [],
    parentId: null,
    assetId: type === "image" ? localAssets[0] : null,
    ...(type === "button" || type === "form" ? { href: null } : {}),
    ...(type === "media" ? { media: defaultMedia("video") } : {}),
    zIndex: 0,
  };
}
export type History = import("./history").History<CanvasSpec>;
export function commit(h: History, next: CanvasSpec): History {
  CanvasSchema.parse(next);
  return commitHistory(h, next);
}
export const undo = undoHistory<CanvasSpec>;
export const redo = redoHistory<CanvasSpec>;

export { PageSchema } from "./pageSpec";

/** Page of a node in a multi-page draft (first page when unset). */
export function pageOfNode(spec: CanvasSpec, node: Pick<CanvasNode, "pageId">): string | null {
  return node.pageId ?? spec.metadata.pages?.[0]?.id ?? null;
}
/** The draft limited to one page, as a single-page draft (used for layout and generation). */
export function pageDraft(spec: CanvasSpec, pageId: string | null): CanvasSpec {
  const pages = spec.metadata.pages;
  if (!pages) return spec;
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const { pages: _pages, ...metadata } = spec.metadata;
  return {
    ...spec,
    metadata: { ...metadata, name: spec.metadata.name },
    nodes: spec.nodes.filter((n) => pageOfNode(spec, n) === page.id).map(({ pageId: _p, ...n }) => n),
  };
}
