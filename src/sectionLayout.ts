import { z } from "zod";
import type { PageNode, PageSpec } from "./pageSpec";

const gap = z.enum(["small", "medium", "large"]);
const columns = z.union([z.literal(2), z.literal(3)]);
const mobile = z.enum(["stack", "two"]);
export const SectionLayoutSchema = z.object({
  arrangement: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("cards"), columns, gap, mobile }).strict(),
    z.object({ mode: z.literal("bento"), columns, gap }).strict(),
    z.object({ mode: z.literal("split"), ratio: z.enum(["equal", "left", "right"]), gap }).strict(),
    z.object({ mode: z.literal("grid"), columns, gap, mobile }).strict(),
    z.object({ mode: z.literal("stack"), gap }).strict(),
    z.object({ mode: z.literal("masonry"), columns, gap, mobile }).strict(),
  ]).nullable(),
  fullBleed: z.boolean(),
}).strict();
export type SectionLayout = z.infer<typeof SectionLayoutSchema>;
export type SectionArrangement = NonNullable<SectionLayout["arrangement"]>;

export function layoutHost(section: PageNode): PageNode {
  let host = section;
  while (host.children?.length === 1) {
    const child = host.children[0];
    if (!["container", "grid", "stack"].includes(child.type)) break;
    host = child;
  }
  const grids = (host.children ?? []).filter(child => child.type === "grid" && (child.children?.length ?? 0) >= 2);
  return grids.reduce((largest, child) => (child.children?.length ?? 0) > (largest.children?.length ?? 0) ? child : largest, grids[0]) ?? host;
}

export function sectionLayoutIssue(section: PageNode, layout: SectionLayout): string | null {
  const mode = layout.arrangement?.mode;
  if (!mode) return null;
  const host = layoutHost(section);
  const count = host.children?.length ?? 0;
  const compatibleHostEffects = ["fade-in", "slide-up", "scale-in", "hover-lift", "hover-glow", "blur-in"];
  if (host.effects.some(effect => !compatibleHostEffects.includes(effect.presetId)) ||
    section.effects.some(effect => !compatibleHostEffects.includes(effect.presetId)))
    return "這個排列可能和目前區塊動畫衝突，原設定已保留";
  if (mode === "split" && count !== 2) return "分屏需要兩個同層內容項目";
  if (mode === "bento" && count < 3) return "大小格拼接至少需要三個同層內容項目";
  if (mode !== "stack" && count < 2) return "這個排列至少需要兩個同層內容項目";
  return null;
}

export function* sectionSourceIds(node: PageNode, sourceIds: ReadonlySet<string>): Generator<string> {
  if (sourceIds.has(node.id)) yield node.id;
  for (const child of node.children ?? []) yield* sectionSourceIds(child, sourceIds);
}

export function requestedSectionLayout(
  items: Record<string, { sectionLayout?: SectionLayout }> | undefined,
  sourceIds: Iterable<string>,
): SectionLayout | undefined {
  if (!items) return;
  for (const id of sourceIds) {
    const settings = items["layout:" + id]?.sectionLayout;
    if (settings) return settings;
  }
}

export function hasImplicitLayoutLock(page: Pick<PageSpec, "sections" | "subpages">) {
  return [...page.sections, ...(page.subpages ?? []).flatMap(view => view.sections)]
    .some(section => section.lock?.layout && !section.sectionLayout?.arrangement);
}

export function withSectionOrder<T>(sections: T[], order: readonly string[] | undefined, sources: (section: T) => Iterable<string>): T[] {
  if (!order?.length) return sections;
  const ranks = new Map(order.map((id, index) => [id, index]));
  const rank = (section: T) => Math.min(order.length, ...Array.from(sources(section), id => ranks.get(id) ?? order.length));
  return [...sections].sort((a, b) => rank(a) - rank(b));
}
