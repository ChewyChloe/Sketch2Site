import type { CanvasNode, CanvasSpec } from "./spec";
import type { LayoutItem, LayoutV2 } from "./generation";
import type { ThemeId } from "./pageSpec";
import { moodThemes, withFocusFirst } from "./brief";

// Deterministic, local layout planner (no model). It reads the draft's reading
// order and element types to infer page sections, then hands a v2 layout plan to
// the same trusted materialize() path the AI uses. It never adds text.

type Section = LayoutV2["sections"][number];

const themeHints: [RegExp, ThemeId][] = [
  [/咖啡|餐|料理|甜點|麵包|烘焙|美食|食堂|飲/, "sunrise"],
  [/活動|派對|音樂|演唱|展演|祭|夜|遊戲|電競|live/i, "midnight"],
  [/作品|設計|攝影|portfolio|藝術|插畫|工作室/i, "mono"],
  [/自然|植物|農|旅|山|森|茶|露營|戶外|環境|永續/, "forest"],
  [/花|婚|美容|寵物|貓|狗|手作|甜蜜|保養/, "blossom"],
  [/科技|AI|軟體|App|系統|服務|課程|學|數據|雲|平台|工具/i, "ocean"],
];

export function suggestTheme(canvas: CanvasSpec): ThemeId {
  const text = canvas.metadata.name + " " + canvas.nodes.map((n) => n.content).join(" ");
  for (const [pattern, theme] of themeHints) if (pattern.test(text)) return theme;
  return "classic";
}

function item(node: CanvasNode, patch: Partial<LayoutItem> = {}): LayoutItem {
  return {
    sourceId: node.id,
    presentation: node.type === "text" ? "paragraph" : node.type,
    headingLevel: 2,
    width: "full",
    align: "start",
    tone: node.type === "card" ? "soft" : "plain",
    ...patch,
  };
}

const byReading = (a: CanvasNode, b: CanvasNode) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
/**
 * Reading order for a hand-placed draft: top to bottom, but items that share a row (their
 * heights overlap by at least half) read left to right even when one sits a little higher.
 */
export function readingOrder(list: readonly CanvasNode[]): CanvasNode[] {
  const rows: CanvasNode[][] = [];
  for (const n of [...list].sort(byReading)) {
    const row = rows[rows.length - 1];
    const sameRow = row?.some((m) => Math.min(m.y + m.height, n.y + n.height) - Math.max(m.y, n.y) >= 0.5 * Math.min(m.height, n.height));
    if (row && sameRow) row.push(n);
    else rows.push([n]);
  }
  return rows.flatMap((r) => r.sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id)));
}

/** Split the draft into reading-order segments, each starting at a heading. */
export function segmentDraft(canvas: CanvasSpec): CanvasNode[][] {
  const nodes = readingOrder(canvas.nodes);
  // A grouped set moves together, anchored at its top-most member.
  const anchorY = new Map<string, number>();
  for (const n of nodes) if (n.groupId && !anchorY.has(n.groupId)) anchorY.set(n.groupId, n.y);
  const top = (n: CanvasNode) => (n.groupId ? anchorY.get(n.groupId)! : n.y);
  let headings = nodes.filter((n) => n.type === "heading");
  if (!headings.length) {
    // No explicit heading: a short opening text line acts as the title.
    const title = nodes.find((n) => n.type === "text" && n.content.trim().length > 0 && n.content.length <= 40 && !n.content.includes("\n"));
    headings = title ? [title] : [];
  }
  // Items sitting in the same row as a heading (e.g. hero image raised a bit)
  // belong to that heading rather than the previous segment.
  const bounds = headings.map((h) => h.y - Math.min(80, h.height));
  const segments: CanvasNode[][] = headings.length ? headings.map(() => []) : [[]];
  for (const n of nodes) {
    let index = 0;
    for (let i = 0; i < bounds.length; i++) if (top(n) >= bounds[i] || n === headings[i]) index = i;
    if (headings.includes(n)) index = headings.indexOf(n);
    segments[index].push(n);
  }
  return segments.filter((s) => s.length).map((s) => readingOrder(s));
}

const pricePattern = /(NT\$|US\$|\$|＄|¥|€)\s*[\d,]+|[\d,]+\s*(元|圓)|免費|\/\s*(月|年|次|人)|每(月|年)/;

function columnsFor(count: number): 1 | 2 | 3 {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

function planSegment(segment: CanvasNode[], index: number, isLast: boolean, titleId: string | undefined): Section[] {
  const heading = segment.find((n) => n.type === "heading" || n.id === titleId);
  const firstCard = segment.find((n) => n.type === "card");
  // The segment is already in reading order: what comes before the first card is the intro.
  const cardAt = firstCard ? segment.indexOf(firstCard) : -1;
  const before = firstCard ? segment.slice(0, cardAt) : segment;
  const after = firstCard ? segment.slice(cardAt) : [];
  const head = (n: CanvasNode, level: 1 | 2, align: LayoutItem["align"] = "start") =>
    item(n, { presentation: "heading", headingLevel: level, align, width: "full" });
  const empty = { intro: [], items: [], outro: [], aside: [] } as Pick<Section, "intro" | "items" | "outro" | "aside">;
  const base = (role: Section["role"]): Section => ({ role, tone: "plain", layout: "stack", columns: 1, gap: "large", ...structuredClone(empty) });

  if (index === 0 && heading) {
    // Hero: title, supporting copy and actions, with the first image beside them.
    const hero = base("hero");
    const images = before.filter((n) => n.type === "image");
    for (const n of before) {
      if (n === heading) hero.intro.push(head(n, 1));
      else if (n.type === "image") continue;
      else hero.intro.push(item(n));
    }
    if (images.length) hero.aside.push(item(images[0], { width: "full" }));
    if (images.length > 1) {
      hero.layout = "grid";
      hero.columns = columnsFor(images.length - 1);
      hero.items.push(...images.slice(1).map((n) => item(n)));
    }
    const rest = after.length ? planSegment(after, 1, isLast, undefined) : [];
    return [hero, ...rest];
  }

  const cards = segment.filter((n) => n.type === "card");
  const images = segment.filter((n) => n.type === "image");
  const intro = (n: CanvasNode, align: LayoutItem["align"]) => (n === heading ? head(n, 2, align) : item(n, { align }));

  const forms = segment.filter((n) => n.type === "form");
  if (forms.length) {
    // Contact: heading and copy beside the form; any other media follows.
    const s = base("contact");
    const [first, ...more] = forms;
    s.aside.push(item(first));
    for (const n of segment) if (n !== first) (n.type === "form" ? s.items : n.type === "image" || n.type === "card" ? s.outro : s.intro).push(n.type === "form" ? item(n) : intro(n, "start"));
    void more;
    return [s];
  }
  // Cards whose lines carry prices read as plans; cards opening with a question read as FAQ.
  const priced = cards.filter((n) => pricePattern.test(n.content)).length;
  const questions = cards.filter((n) => /[?？]\s*$/.test(n.content.split("\n")[0])).length;
  if (cards.length >= 2 && questions * 2 > cards.length) {
    const s = base("faq");
    for (const n of before) s.intro.push(intro(n, "start"));
    for (const n of after) (n.type === "card" ? s.items : s.outro).push(item(n));
    return [s];
  }
  if (cards.length >= 2) {
    const s = base(priced * 2 > cards.length ? "pricing" : "features");
    s.layout = "grid";
    s.columns = columnsFor(cards.length);
    const centered = !!heading;
    // Plans read best centred; feature lists read like an article, left-aligned.
    const pricing = priced * 2 > cards.length;
    for (const n of before) s.intro.push(intro(n, centered && pricing && n.type !== "image" ? "center" : "start"));
    for (const n of after) {
      if (n.type === "card") s.items.push(item(n));
      else s.outro.push(item(n, { align: "start" }));
    }
    return [s];
  }

  if (images.length >= 2 && cards.length === 0) {
    const s = base("gallery");
    s.layout = "grid";
    s.columns = columnsFor(images.length);
    for (const n of segment) {
      if (n.type === "image") s.items.push(item(n));
      else if (n.type === "button") s.outro.push(item(n));
      else s.intro.push(intro(n, "start"));
    }
    return [s];
  }

  const buttons = segment.filter((n) => n.type === "button");
  const prose = segment.filter((n) => n.type === "text");
  if (isLast && index > 0 && buttons.length && !images.length && !cards.length && prose.length <= 2) {
    const s = base("cta");
    for (const n of segment) (n.type === "button" ? s.outro : s.intro).push(intro(n, "center"));
    return [s];
  }

  const s = base("content");
  for (const n of segment) {
    if (n.type === "image" && images.length === 1) s.aside.push(item(n));
    else s.intro.push(intro(n, "start"));
  }
  return [s];
}

export function smartLayout(canvas: CanvasSpec): LayoutV2 {
  const segments = segmentDraft(canvas);
  // Without a heading, the first text element becomes the title (never an image, card, form or media).
  const titleId = canvas.nodes.some((n) => n.type === "heading") ? undefined : segments[0]?.find((n) => n.type === "text")?.id;
  let sections = segments.flatMap((segment, i) => planSegment(segment, i, i === segments.length - 1, i === 0 ? titleId : undefined));
  // A draft with no title at all still gets a calm opening instead of a bare hero.
  if (!sections.some((s) => s.intro.some((i) => i.headingLevel === 1 && i.presentation === "heading")) && sections[0]?.role === "hero")
    sections[0] = { ...sections[0], role: "content" };
  // The brief's focus moves the matching section right after the opening one.
  const brief = canvas.metadata.brief;
  sections = withFocusFirst(sections, brief?.focus);
  const forceStack = canvas.constraints.includes("layout:stack");
  const forceGrid = canvas.constraints.includes("layout:grid");
  // Start with a soft band so the first section separates from the hero.
  let plain = false;
  sections = sections.map((s) => {
    let next = s;
    // A stack-only draft keeps side media inline instead of a two-column split.
    if (forceStack) next = { ...next, layout: "stack", columns: 1, intro: [...next.intro, ...next.aside], aside: [] };
    if (forceGrid && next.layout !== "grid") next = { ...next, layout: "grid", columns: next.items.length ? columnsFor(next.items.length) : 1 };
    if (next.role === "hero" || next.role === "cta") return next;
    // Alternate plain and soft bands so sections read as distinct blocks.
    const tone = plain ? "plain" : "soft";
    plain = !plain;
    return { ...next, tone };
  });
  // grid with no items is meaningless; keep stack to satisfy any constraint later.
  if (forceGrid) sections = sections.map((s) => (s.items.length ? s : { ...s, layout: "grid", columns: 1 }));
  return {
    version: 2,
    typography: canvas.constraints.includes("typography:serif") ? "serif" : "sans",
    theme: (brief && moodThemes[brief.mood]) || suggestTheme(canvas),
    nav: sections.length >= 3,
    footer: true,
    sections,
  };
}
