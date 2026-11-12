import { imageSource } from "./assetRef";
import { z } from "zod";
export const effectIds = [
  "fade-in",
  "slide-up",
  "scale-in",
  "hover-lift",
  "hover-glow",
  "stagger-reveal",
] as const;
export const EffectSchema = z
  .object({
    effectId: z.enum(effectIds),
    duration: z.number().int().min(120).max(1200).default(450),
    delay: z.number().int().min(0).max(1000).default(0),
    distance: z.number().int().min(0).max(32).default(12),
    stagger: z.number().int().min(30).max(150).default(70),
  })
  .strict();
export const localAssets = ["/assets/workspace.svg"] as const;
export const href = z
  .string()
  .max(2048)
  .refine((value) => {
    if (/^#[0-9a-f-]{36}$/i.test(value)) return true;
    try {
      const u = new URL(value);
      return (
        value.startsWith("https://") &&
        u.protocol === "https:" &&
        ["learn.microsoft.com", "example.com"].includes(u.hostname) &&
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
export type PageNode = {
  id: string;
  type:
    | "section"
    | "container"
    | "heading"
    | "paragraph"
    | "button"
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
  columns?: 1 | 2 | 3;
  children?: PageNode[];
};
export function effectCompatible(
  node: PageNode,
  effectId: (typeof effectIds)[number],
) {
  return effectId !== "stagger-reveal" || Boolean(node.children?.length);
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
    .max(6)
    .default([])
    .refine(
      (a) => new Set(a.map((e) => e.effectId)).size === a.length,
      "動畫重複",
    ),
};
export const PageNodeSchema: z.ZodType<PageNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        ...common,
        type: z.literal("section"),
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
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("paragraph"),
        content: z.string().max(4000),
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("button"),
        content: z.string().min(1).max(120),
        href,
      })
      .strict(),
    z
      .object({
        ...common,
        type: z.literal("image"),
        src: imageSource,
        alt: z.string().min(1).max(200),
      })
      .strict(),
  ]),
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
  .superRefine((page, ctx) => {
    const ids = new Set<string>();
    const links: string[] = [];
    let count = 0;
    const walk = (n: PageNode, depth: number) => {
      if (++count > 200 || depth > 10)
        ctx.addIssue({ code: "custom", message: "頁面層級或元件數量超出限制" });
      if (ids.has(n.id))
        ctx.addIssue({ code: "custom", message: "元件 ID 重複" });
      ids.add(n.id);
      if (n.effects.some((e) => !effectCompatible(n, e.effectId)))
        ctx.addIssue({
          code: "custom",
          path: ["effects"],
          message: "依序顯示需要子元件",
        });
      if (n.href?.startsWith("#")) links.push(n.href.slice(1));
      n.children?.forEach((c) => walk(c, depth + 1));
    };
    for (const section of page.sections) {
      if (section.type !== "section")
        ctx.addIssue({ code: "custom", message: "最外層必須是區塊" });
      walk(section, 0);
    }
    if (links.some((id) => !ids.has(id)))
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
  previous.sections.forEach(collect);
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
  };
}
export function componentIdFromElement(element: Element): string | null {
  return (
    element.closest("[data-page-id]")?.getAttribute("data-page-id") ?? null
  );
}
