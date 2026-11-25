import {structuredGroupMotions} from "./motion";
import { moodThemes, withFocusFirst } from "./brief";
import { z } from "zod";
import { CanvasSchema, type CanvasSpec, type CanvasNode } from "./spec";
import {
  PageSchema,
  EffectSchema,
  styleSchema,
  themeIds,
  sectionRoles,
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
  NOT_CONFIGURED: "AI 尚未設定，可在草稿選單使用智慧排版。",
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
  UNAVAILABLE: "無法連線至生成服務，原版本已保留；可在草稿選單使用智慧排版。",
  STALE: "草稿或頁面已更新，請重新生成。",
};
export class GenerationError extends Error {
  code: GenerationCode;
  constructor(code: GenerationCode, reason?: "BUTTON_LINK" | "GROUP_EFFECT" | "FORM_ENDPOINT") {
    super(
      reason === "BUTTON_LINK"
        ? "請先設定每個按鈕的有效連結。"
        : reason === "FORM_ENDPOINT"
        ? "請先為表單設定接收網址（例如 Formspree 的 https 網址）。"
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
  if (canvas.nodes.some((n) => n.type === "form" && (!n.href || n.href.startsWith("#"))))
    throw new GenerationError("INVALID_INPUT", "FORM_ENDPOINT");
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
        y: n.y / canvas.metadata.height,
        width: n.width / 1440,
        height: n.height / canvas.metadata.height,
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
        (g) => {const first=nodes.find(v=>v.id===g[0])!;return n.groupId?first.groupId===n.groupId:!first.groupId&&Math.abs(first.y-n.y)<=100;},
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
    presentation: z.enum(["heading", "paragraph", "button", "image", "card", "form"]),
    headingLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    width: z.enum(["full", "content", "narrow"]),
    align: z.enum(["start", "center", "end"]),
    tone: z.enum(["plain", "soft", "accent"]),
  })
  .strict();
export const LayoutV1Schema = z
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
// v2 adds semantic section roles, a reviewed visual theme and page chrome.
// intro/outro stack above/below the main group; aside becomes a side column.
export const LayoutV2Schema = z
  .object({
    version: z.literal(2),
    typography: z.enum(["sans", "serif"]),
    theme: z.enum(themeIds),
    nav: z.boolean(),
    footer: z.boolean(),
    sections: z
      .array(
        z
          .object({
            role: z.enum(sectionRoles),
            tone: z.enum(["plain", "soft"]),
            layout: z.enum(["stack", "grid"]),
            columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            gap: z.enum(["small", "medium", "large"]),
            intro: z.array(ItemSchema).max(12),
            items: z.array(ItemSchema).max(40),
            outro: z.array(ItemSchema).max(12),
            aside: z.array(ItemSchema).max(4),
          })
          .strict()
          .refine((s) => s.intro.length + s.items.length + s.outro.length + s.aside.length > 0),
      )
      .min(1)
      .max(20),
  })
  .strict();
export const LayoutSchema = z.union([LayoutV1Schema, LayoutV2Schema]);
export type Layout = z.infer<typeof LayoutSchema>;
export type LayoutV1 = z.infer<typeof LayoutV1Schema>;
export type LayoutV2 = z.infer<typeof LayoutV2Schema>;
export type LayoutItem = z.infer<typeof ItemSchema>;
// The model only receives the v2 contract; v1 stays readable for old fixtures.
export const layoutJSONSchema = z.toJSONSchema(LayoutV2Schema, {
  target: "draft-7",
  reused: "ref",
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
  const build = (item: LayoutItem): PageNode => {
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
        form: ["form"],
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
      const presentation=canvas.metadata.layoutMode!=="reflow"&&node.type==="text"?"paragraph":item.presentation;
      // The user's own text styling travels with the element (never chosen by the model).
      const text = node.textStyle ? { text: node.textStyle } : {};
      switch (presentation) {
        case "heading":
          return make("heading", {
            ...common,
            ...text,
            content: node.content,
            level: item.headingLevel,
          });
        case "paragraph":
          return make("paragraph", { ...common, ...text, content: node.content });
        case "button":
          return make("button", {
            ...common,
            ...text,
            style: { ...common.style, padding: "small" },
            content: node.content,
            href: node.href!,
          });
        case "form":
          return make("form", { ...common, content: node.content, href: node.href! });
        case "image":
          return make("image", {
            ...common,
            src: node.assetId!,
            alt: node.content,
            ...(node.look ? { look: node.look } : {}),
          });
        case "card":
          return make("card", {
            ...common,
            ...text,
            children: (node.effects.some(e=>structuredGroupMotions.includes(e.presetId as typeof structuredGroupMotions[number])) ? node.content.split("\n").map(content=>make("card",{children:[make("paragraph",{content})]})) : (node.effects.some(e=>["stagger-reveal","focus-transfer","disclosure-panel","card-deck-fan","layered-parallax","grid-diagonal-turn"].includes(e.presetId)&&e.presetVersion===1)||(layout.version===2&&canvas.metadata.layoutMode==="reflow") ? node.content.split("\n") : [node.content]).map(content=>make("paragraph", { content }))),
          });
      }
      throw new GenerationError("INVALID_OUTPUT");
  };
  const stackStyle = (gap: "small" | "medium" | "large") => ({ ...defaultStyle, padding: "none" as const, gap });
  // Adjacent buttons share a row; this wrapper carries no content of its own.
  const withActions = (nodes: PageNode[]) =>
    nodes.reduce<PageNode[]>((out, n) => {
      const last = out.at(-1);
      if (n.type === "button" && last?.type === "stack" && last.children?.every((c) => c.type === "button")) last.children.push(n);
      else if (n.type === "button") out.push(make("stack", { style: stackStyle("small"), children: [n] }));
      else out.push(n);
      return out;
    }, []);
  const sections = layout.version === 1
    ? layout.sections.map((section) => {
        const group = make(section.layout, {
          style: { ...defaultStyle, padding: "none", gap: section.gap },
          children: section.items.map(build),
          ...(section.layout === "grid" ? { columns: section.columns } : {}),
        });
        return make("section", {
          style: { ...defaultStyle, padding: "large", gap: section.gap },
          children: [make("container", { children: [group] })],
        });
      })
    : withFocusFirst(layout.sections, canvas.metadata.brief?.focus).map((section) => {
        // One text alignment per section: headings, paragraphs and buttons follow the heading.
        const textual = (i: LayoutItem) => ["heading", "paragraph", "button"].includes(i.presentation);
        const all = [...section.intro, ...section.items, ...section.outro];
        const lead = all.find((i) => i.presentation === "heading") ?? all.find(textual);
        const align = (list: LayoutItem[]) => (lead ? list.map((i) => (textual(i) ? { ...i, align: lead.align } : i)) : list);
        section = { ...section, intro: align(section.intro), items: align(section.items), outro: align(section.outro) };
        const intro = section.intro.map(build), items = section.items.map(build), outro = section.outro.map(build), aside = section.aside.map(build);
        const group = items.length
          ? make(section.layout, {
              style: stackStyle(section.gap),
              children: items,
              ...(section.layout === "grid" ? { columns: section.columns } : {}),
            })
          : null;
        const main = [
          ...(intro.length ? [make("stack", { style: stackStyle("medium"), children: withActions(intro) })] : []),
          ...(group ? [group] : []),
          ...(outro.length ? [make("stack", { style: stackStyle("medium"), children: withActions(outro) })] : []),
        ];
        const body = aside.length
          ? [make("grid", { columns: 2, style: stackStyle("large"), children: [make("stack", { style: stackStyle("large"), children: main }), make("stack", { style: stackStyle("medium"), children: aside })] })]
          : main;
        return make("section", {
          role: section.role,
          style: { ...defaultStyle, padding: "large", gap: section.gap, tone: section.tone },
          children: [make("container", { style: stackStyle("large"), children: body })],
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
    ...(canvas.metadata.layoutMode!=='reflow'?{draftLayout:{width:1440,height:canvas.metadata.height,items:canvas.nodes.map(({id,x,y,width,height,zIndex})=>({id,x,y,width,height,zIndex}))}}:{}),
    sections,
    typography: layout.typography,
    ...(layout.version === 1
      ? { styles: layout.theme }
      : {
          styles: "neutral",
          // An explicit mood choice in the brief always decides the theme, whoever planned the layout.
          theme: moodThemes[canvas.metadata.brief?.mood ?? ""] ?? layout.theme,
          chrome: { nav: layout.nav, footer: layout.footer },
        }),
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

  const trustedGroupDescendants=new Set<string>();
  const groupScan=(node:PageNode)=>{const source=sources.get(node.id);if(source?.type==='card'&&source.effects.some(e=>structuredGroupMotions.includes(e.presetId as typeof structuredGroupMotions[number]))){
    const lines=source.content.split('\n');if(node.children?.length!==lines.length)throw new GenerationError('INVALID_OUTPUT');
    node.children.forEach((child,i)=>{if(child.type!=='card'||child.effects.length||child.children?.length!==1||child.children[0].type!=='paragraph'||child.children[0].effects.length||child.children[0].content!==lines[i])throw new GenerationError('INVALID_OUTPUT');trustedGroupDescendants.add(child.id);trustedGroupDescendants.add(child.children[0].id);});
  }node.children?.forEach(groupScan);};page.sections.forEach(groupScan);
  const walk = (n: PageNode, parent?: PageNode) => {
    if (!sources.has(n.id)&&!trustedGroupDescendants.has(n.id)) {
      if (
        !["section", "container", "stack", "grid", "paragraph"].includes(
          n.type,
        ) ||
        n.effects.length ||
        // Card text may be split into one paragraph per line; the joined text is checked below.
        (n.type === "paragraph" &&
          (!parent || sources.get(parent.id)?.type !== "card"))
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
      form: ["form"],
    };
    if (n && !(types[source.type] as string[]).includes(n.type))
      throw new GenerationError("INVALID_OUTPUT");
    if (!n) throw new GenerationError("INVALID_OUTPUT");
    // Text styling must come from the draft unchanged.
    if (JSON.stringify(n.text ?? null) !== JSON.stringify(source.textStyle ?? null))
      throw new GenerationError("INVALID_OUTPUT");
    if (source.type === "image") {
      if (
        n.type !== "image" ||
        n.src !== source.assetId ||
        n.alt !== source.content ||
        JSON.stringify(n.look ?? null) !== JSON.stringify(source.look ?? null)
      )
        throw new GenerationError("INVALID_OUTPUT");
    } else {
      const structured=source.type==="card"&&source.effects.some(e=>structuredGroupMotions.includes(e.presetId as typeof structuredGroupMotions[number]));
      const splitCard=structured||source.type==="card"&&source.effects.some(e=>["stagger-reveal","focus-transfer","disclosure-panel","card-deck-fan","layered-parallax","grid-diagonal-turn"].includes(e.presetId)&&e.presetVersion===1);
      const lineSplit=splitCard||(source.type==="card"&&(n.children?.length??0)>1);
      expectedContent.push(...(lineSplit?source.content.split("\n"):[source.content]));
      const actual = n.type === "card" ? n.children?.map(c=>structured?c.children?.[0].content:c.content).join("\n") : n.content;
      if (actual !== source.content)
        throw new GenerationError("INVALID_OUTPUT");
      if (
        (source.type === "button" || source.type === "form") &&
        (n.type !== source.type || n.href !== source.href)
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
