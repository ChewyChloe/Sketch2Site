import { commitHistory, undoHistory, redoHistory } from "./history";
import { z } from "zod";
import { imageSource } from "./assetRef";
import { MotionSchema, bindMotionInput, compatibleMotion, combinationReason, withinMotionBudget } from "./motion";
import { href, localAssets } from "./pageSpec";
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
export const Kind = z.enum(["text", "button", "card", "heading", "image", "form"]);
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
    assetId: imageSource.nullable(),
    href: href.nullable().optional(),
    zIndex: z.number().int().min(0).max(100),
  })
  .strict());
export const CanvasSchema = z
  .object({
    schemaVersion: z.literal(1),
    metadata: z
      .object({
        name: z.string().min(1).max(80),
        layoutMode:z.enum(["preserve","reflow"]).optional(),
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
      if (n.href?.startsWith("#") && !ids.has(n.href.slice(1)))
        ctx.addIssue({ code: "custom", message: "Unknown link target" });
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
    }[type],
    effects: [],
    parentId: null,
    assetId: type === "image" ? localAssets[0] : null,
    ...(type === "button" || type === "form" ? { href: null } : {}),
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
