import { z } from "zod";
import { CanvasSchema, type CanvasSpec, type CanvasNode } from "./spec";
import {
  PageSchema,
  EffectSchema,
  styleSchema,
  type PageNode,
  type PageSpec,
} from "./pageSpec";
export const generationCodes = [
  "NOT_CONFIGURED",
  "INVALID_INPUT",
  "INVALID_OUTPUT",
  "REFUSED",
  "INCOMPLETE",
  "TIMEOUT",
  "BUSY",
  "LIMIT",
  "FORBIDDEN",
  "OWNER_REQUIRED",
  "ORIGIN_INVALID",
  "CSRF_INVALID",
  "DRAFT_HASH_MISMATCH",
  "DRAFT_APPROVAL_INVALID",
  "VERSION_MISMATCH",
  "DUPLICATE",
  "UNAVAILABLE",
  "STALE",
] as const;
export type GenerationCode = (typeof generationCodes)[number];
export const generationMessages: Record<GenerationCode, string> = {
  NOT_CONFIGURED: "AI 尚未設定，可在草稿選單使用示範排版。",
  INVALID_INPUT: "草稿無法生成：請檢查元素、按鈕連結與設計限制。",
  INVALID_OUTPUT: "生成失敗：結果未符合頁面或內容規則，原版本已保留。",
  REFUSED: "模型未提供布局，原版本已保留。",
  INCOMPLETE: "生成結果不完整，請縮小草稿後重試。",
  TIMEOUT: "生成逾時，請稍後重新發起。",
  BUSY: "已有生成正在進行，請稍後再試。",
  LIMIT: "已達生成用量上限，請檢查後端額度設定。",
  OWNER_REQUIRED: "請使用正式擁有者帳號登入私人網站。",
  ORIGIN_INVALID: "請從原本的私人網站操作，請求來源不符。",
  CSRF_INVALID: "安全驗證失敗（CSRF_INVALID），請停止測試並回報。",
  VERSION_MISMATCH: "網站前後端版本尚未同步，請完整重新載入；未送出生成。",
  DRAFT_APPROVAL_INVALID: "草稿已變更或核准已過期，未送出AI生成；請重新核對目前草稿。",
  DRAFT_HASH_MISMATCH: "草稿不符（DRAFT_HASH_MISMATCH）：目前草稿超出已核准的測試範圍，請使用「載入核准測試草稿（免費）」。",
  FORBIDDEN: "無法驗證生成請求，請重新整理後重試。",
  DUPLICATE: "這次生成請求已處理，請重新發起。",
  UNAVAILABLE: "無法連線至生成服務，原版本已保留；可在草稿選單使用示範排版。",
  STALE: "草稿或頁面已更新，請重新生成。",
};
export class GenerationError extends Error {
  code: GenerationCode;
  constructor(code: GenerationCode, reason?: "BUTTON_LINK" | "GROUP_EFFECT") {
    super(
      reason === "BUTTON_LINK"
        ? "請先設定每個按鈕的有效連結。"
        : reason === "GROUP_EFFECT"
          ? "依序出現動畫目前只能附加至卡片。"
          : generationMessages[code],
    );
    this.code = code;
  }
}
export function prepareIntent(input: unknown) {
  const checked = CanvasSchema.safeParse(input);
  if (!checked.success) throw new GenerationError("INVALID_INPUT");
  const canvas = checked.data;
  if (
    !canvas.nodes.length ||
    canvas.nodes.length > 40 ||
    canvas.nodes.reduce((n, v) => n + v.content.length, 0) > 12000
  )
    throw new GenerationError("INVALID_INPUT");
  const supported = [
    "typography:sans",
    "typography:serif",
    "layout:stack",
    "layout:grid",
  ];
  if (
    canvas.constraints.some((c) => !supported.includes(c)) ||
    (canvas.constraints.includes("typography:sans") &&
      canvas.constraints.includes("typography:serif")) ||
    (canvas.constraints.includes("layout:stack") &&
      canvas.constraints.includes("layout:grid"))
  )
    throw new GenerationError("INVALID_INPUT");
  if (canvas.nodes.some((n) => n.type === "button" && !n.href))
    throw new GenerationError("INVALID_INPUT", "BUTTON_LINK");
  for (const n of canvas.nodes)
    if (
      (n.type === "button" &&
        (!n.href || !n.content || n.content.length > 120)) ||
      (["heading", "image"].includes(n.type) &&
        (!n.content || (n.type === "image" && n.content.length > 200)))
    )
      throw new GenerationError("INVALID_INPUT");
  if (
    canvas.nodes.some(
      (n) => n.effects.some(e=>e.presetId==="stagger-reveal") && n.type !== "card",
    )
  )
    throw new GenerationError("INVALID_INPUT", "GROUP_EFFECT");
  const nodes = [...canvas.nodes].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
  );
  const distance = (a: CanvasNode, b: CanvasNode) =>
    Math.round(
      Math.hypot(
        a.x + a.width / 2 - b.x - b.width / 2,
        a.y + a.height / 2 - b.y - b.height / 2,
      ),
    );
  return {
    canvas,
    nodes: nodes.map((n) => ({
      ...n,
      normalized: {
        x: n.x / 1440,
        y: n.y / 1200,
        width: n.width / 1440,
        height: n.height / 1200,
      },
      nearest: nodes
        .filter((v) => v.id !== n.id)
        .map((v) => ({
          targetId: v.id,
          distance: distance(n, v),
          sameRow: Math.abs(n.y - v.y) < Math.max(n.height, v.height) / 2,
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3),
    })),
    candidateGroups: nodes.reduce<string[][]>((groups, n) => {
      const group = groups.find(
        (g) => Math.abs(nodes.find((v) => v.id === g[0])!.y - n.y) <= 100,
      );
      if (group) group.push(n.id);
      else groups.push([n.id]);
      return groups;
    }, []),
  };
}
const ItemSchema = z
  .object({
    sourceId: z.string().uuid(),
    presentation: z.enum(["heading", "paragraph", "button", "image", "card"]),
    headingLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    width: z.enum(["full", "content", "narrow"]),
    align: z.enum(["start", "center", "end"]),
    tone: z.enum(["plain", "soft", "accent"]),
  })
  .strict();
export const LayoutSchema = z
  .object({
    version: z.literal(1),
    typography: z.enum(["sans", "serif"]),
    theme: z.enum(["neutral", "warm"]),
    sections: z
      .array(
        z
          .object({
            layout: z.enum(["stack", "grid"]),
            columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            gap: z.enum(["small", "medium", "large"]),
            items: z.array(ItemSchema).min(1).max(40),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export type Layout = z.infer<typeof LayoutSchema>;
export const layoutJSONSchema = z.toJSONSchema(LayoutSchema, {
  target: "draft-7",
});
export function materialize(canvasInput: unknown, output: unknown): PageSpec {
  const { canvas } = prepareIntent(canvasInput);
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(output);
  } catch {
    throw new GenerationError("INVALID_OUTPUT");
  }
  if (typeof serialized !== "string" || serialized.length > 60000)
    throw new GenerationError("INVALID_OUTPUT");
  const result = LayoutSchema.safeParse(output);
  if (!result.success) throw new GenerationError("INVALID_OUTPUT");
  const layout = result.data,
    seen = new Set<string>(),
    byId = new Map(canvas.nodes.map((n) => [n.id, n]));
  const defaultStyle = styleSchema.parse({});
  const make = (
    type: PageNode["type"],
    props: Partial<PageNode> = {},
  ): PageNode => ({
    id: crypto.randomUUID(),
    type,
    style: { ...defaultStyle, padding: "none" },
    effects: [],
    ...props,
  });
  const sections = layout.sections.map((section) => {
    const items = section.items.map((item) => {
      const node = byId.get(item.sourceId);
      if (!node || seen.has(item.sourceId))
        throw new GenerationError("INVALID_OUTPUT");
      seen.add(item.sourceId);
      const allowed = {
        text: ["heading", "paragraph"],
        heading: ["heading"],
        button: ["button"],
        image: ["image"],
        card: ["card"],
      };
      if (!(allowed[node.type] as string[]).includes(item.presentation))
        throw new GenerationError("INVALID_OUTPUT");
      const common = {
        id: node.id,
        style: {
          ...defaultStyle,
          padding:
            item.presentation === "card"
              ? ("medium" as const)
              : ("none" as const),
          align: item.align,
          tone: item.tone,
          width: item.width,
        },
        effects: node.effects,
      };
      switch (item.presentation) {
        case "heading":
          return make("heading", {
            ...common,
            content: node.content,
            level: item.headingLevel,
          });
        case "paragraph":
          return make("paragraph", { ...common, content: node.content });
        case "button":
          return make("button", {
            ...common,
            style: { ...common.style, padding: "small" },
            content: node.content,
            href: node.href!,
          });
        case "image":
          return make("image", {
            ...common,
            src: node.assetId!,
            alt: node.content,
          });
        case "card":
          return make("card", {
            ...common,
            children: (node.effects.some(e=>["stagger-reveal","focus-transfer","disclosure-panel"].includes(e.presetId)&&e.presetVersion===1) ? node.content.split("\n") : [node.content]).map(content=>make("paragraph", { content })),
          });
      }
    });
    const group = make(section.layout, {
      style: { ...defaultStyle, padding: "none", gap: section.gap },
      children: items,
      ...(section.layout === "grid" ? { columns: section.columns } : {}),
    });
    return make("section", {
      style: { ...defaultStyle, padding: "large", gap: section.gap },
      children: [make("container", { children: [group] })],
    });
  });
  if (seen.size !== canvas.nodes.length)
    throw new GenerationError("INVALID_OUTPUT");
  if (
    canvas.constraints.some(
      (c) =>
        (c.startsWith("typography:") &&
          c.split(":")[1] !== layout.typography) ||
        (c.startsWith("layout:") &&
          layout.sections.some((s) => s.layout !== c.split(":")[1])),
    )
  )
    throw new GenerationError("INVALID_OUTPUT");
  const checked = PageSchema.safeParse({
    schemaVersion: 2,
    metadata: { title: canvas.metadata.name, language: "zh-Hant" },
    sections,
    typography: layout.typography,
    styles: layout.theme,
    responsive: { mobileColumns: 1, desktopColumns: 3 },
  });
  if (!checked.success) throw new GenerationError("INVALID_OUTPUT");
  verifyPreservation(canvas, checked.data);
  return checked.data;
}
export function verifyPreservation(canvas: CanvasSpec, page: PageSpec) {
  if (
    !PageSchema.safeParse(page).success ||
    page.metadata.title !== canvas.metadata.name
  )
    throw new GenerationError("INVALID_OUTPUT");
  const sources = new Map(canvas.nodes.map((n) => [n.id, n]));
  const nodes = new Map<string, PageNode>();
  const content: string[] = [];

  const walk = (n: PageNode, parent?: PageNode) => {
    if (!sources.has(n.id)) {
      if (
        !["section", "container", "stack", "grid", "paragraph"].includes(
          n.type,
        ) ||
        n.effects.length ||
        (n.type === "paragraph" &&
          (!parent ||
            sources.get(parent.id)?.type !== "card" ||
            (parent.children?.length !== 1 && !sources.get(parent.id)?.effects.some(e=>["stagger-reveal","focus-transfer","disclosure-panel"].includes(e.presetId)&&e.presetVersion===1))))
      )
        throw new GenerationError("INVALID_OUTPUT");
    }
    nodes.set(n.id, n);
    if (n.content !== undefined) content.push(n.content);
    n.children?.forEach((child) => walk(child, n));
  };
  page.sections.forEach((n) => walk(n));
  const expectedContent: string[] = [];
  for (const source of canvas.nodes) {
    const n = nodes.get(source.id);
    const types = {
      text: ["heading", "paragraph"],
      heading: ["heading"],
      button: ["button"],
      image: ["image"],
      card: ["card"],
    };
    if (n && !(types[source.type] as string[]).includes(n.type))
      throw new GenerationError("INVALID_OUTPUT");
    if (!n) throw new GenerationError("INVALID_OUTPUT");
    if (source.type === "image") {
      if (
        n.type !== "image" ||
        n.src !== source.assetId ||
        n.alt !== source.content
      )
        throw new GenerationError("INVALID_OUTPUT");
    } else {
      const splitCard=source.type==="card"&&source.effects.some(e=>["stagger-reveal","focus-transfer","disclosure-panel"].includes(e.presetId)&&e.presetVersion===1);
      expectedContent.push(...(splitCard?source.content.split("\n"):[source.content]));
      const actual = n.type === "card" ? n.children?.map(c=>c.content).join("\n") : n.content;
      if (actual !== source.content)
        throw new GenerationError("INVALID_OUTPUT");
      if (
        source.type === "button" &&
        (n.type !== "button" || n.href !== source.href)
      )
        throw new GenerationError("INVALID_OUTPUT");
    }
    if (
      JSON.stringify([...n.effects].sort((a,b)=>a.presetId.localeCompare(b.presetId))) !==
      JSON.stringify([...source.effects].sort((a,b)=>a.presetId.localeCompare(b.presetId)))
    )
      throw new GenerationError("INVALID_OUTPUT");
  }
  // The model never supplies prose. No extra visible strings can be introduced by layout generation.
  if (JSON.stringify(content.sort()) !== JSON.stringify(expectedContent.sort()))
    throw new GenerationError("INVALID_OUTPUT");
}
export const UsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cachedInputTokens: z.number().int().nonnegative().nullable().optional(),
    reasoningTokens: z.number().int().nonnegative().nullable().optional(),
    latencyMs: z.number().nonnegative(),
    estimatedCostUsd: z.number().nonnegative(),
  })
  .strict();
export const GenerationResponseSchema = z
  .object({
    requestId: z.string().uuid(),
    page: PageSchema,
    usage: UsageSchema,
    mode: z.enum(["mock", "live"]),
  })
  .strict();
export type GenerationResponse = z.infer<typeof GenerationResponseSchema>;
