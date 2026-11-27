import { allSections, PageSchema, type PageNode, type PageSpec } from "./pageSpec";
import { sectionSourceIds } from "./sectionLayout";
import { diffPages, indexNodes } from "./patch";
import type { MotionInstance } from "./motion";
import type { CanvasSpec } from "./spec";
import type { SiteOverrides } from "./siteOverrides";
export { SiteOverridesSchema, type SiteOverrides } from "./siteOverrides";
type Item = SiteOverrides["items"][string];

// Draft ↔ site sync. The draft holds structure; the site holds look.
// - Edits made on the site to elements that exist in the draft (text, links,
//   images, motion) are written back to those draft elements.
// - Layout tweaks on the site (heading level, columns, spacing, alignment,
//   background, motion on generated containers, page theme) are kept as
//   "site overrides" in the draft and re-applied after every new generation.
// Containers have no draft id, so they are keyed by their first draft element.

const styleKeys = ["gap", "padding", "align", "tone", "width"] as const;
/** Stable key for a page node: its draft id, or type + first draft element below it + depth. */
function keyOf(node: PageNode, draftIds: ReadonlySet<string>): string | null {
  if (draftIds.has(node.id)) return "n:" + node.id;
  const walk = (n: PageNode, depth: number): string | null => {
    if (draftIds.has(n.id)) return `${node.type}:${n.id}:${depth}`;
    for (const c of n.children ?? []) {
      const hit = walk(c, depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  return walk(node, 0);
}
function parents(page: PageSpec) {
  const map = new Map<string, PageNode>();
  const walk = (n: PageNode) => n.children?.forEach((c) => (map.set(c.id, n), walk(c)));
  allSections(page).forEach(walk);
  return map;
}
const leafTexts = (n: PageNode): string[] => (n.children?.length ? n.children.flatMap(leafTexts) : n.type === "paragraph" ? [n.content ?? ""] : []);

/** Number of layout tweaks the site carries (shown when updating). */
export const overrideCount = (o?: SiteOverrides) => (o ? (o.theme ? 1 : 0) + Object.keys(o.items).length : 0);

/**
 * Reflects one site transition (an edit, undo or redo) into the draft.
 * Returns the updated draft, or null when nothing in the draft changes.
 */
export function syncSiteChange(draft: CanvasSpec, before: PageSpec, after: PageSpec): CanvasSpec | null {
  const draftIds = new Set(draft.nodes.map((n) => n.id));
  const nodes = new Map(draft.nodes.map((n) => [n.id, n]));
  const items: Record<string, Item> = structuredClone(draft.metadata.siteOverrides?.items ?? {});
  let theme = draft.metadata.siteOverrides?.theme;
  let touched = false;
  const index = indexNodes(after), up = parents(after);
  const setNode = (id: string, patch: Partial<CanvasSpec["nodes"][number]>) => {
    const n = nodes.get(id);
    if (!n) return;
    const next = { ...n, ...patch };
    if (JSON.stringify(next) !== JSON.stringify(n)) (nodes.set(id, next), (touched = true));
  };
  const setItem = (node: PageNode, patch: Partial<Item>) => {
    const key = keyOf(node, draftIds);
    if (!key) return;
    const merged: Item = { ...items[key], ...patch, ...(patch.style ? { style: { ...items[key]?.style, ...patch.style } } : {}) };
    if (JSON.stringify(merged) !== JSON.stringify(items[key])) (items[key] = merged, (touched = true));
  };
  if (before.theme !== after.theme && after.theme) {
    theme = after.theme;
    touched = true;
  }
  for (const c of diffPages(before, after).changes) {
    const node = index.get(c.targetId);
    if (!node) continue;
    const own = draftIds.has(node.id);
    if (c.property === "content") {
      if (own) setNode(node.id, { content: node.content ?? "" });
      else {
        // A line inside a card that the draft stores as one multi-line card.
        let p = up.get(node.id);
        while (p && !draftIds.has(p.id)) p = up.get(p.id);
        if (p && nodes.get(p.id)?.type === "card") setNode(p.id, { content: leafTexts(p).join("\n") });
      }
    } else if (c.property === "href" && own) setNode(node.id, { href: node.href });
    else if (c.property === "src" && own) setNode(node.id, { assetId: node.src });
    else if (c.property === "alt" && own) setNode(node.id, { content: node.alt ?? "" });
    else if (c.property === "look" && own) setNode(node.id, { look: node.look });
    else if (c.property === "text" && own) setNode(node.id, { textStyle: node.text });
    else if (c.property.startsWith("effects.")) {
      if (own) setNode(node.id, { effects: node.effects as MotionInstance[] });
      else setItem(node, { effects: node.effects as MotionInstance[] });
    } else if (c.property === "level" && node.level) setItem(node, { level: node.level as 1 | 2 | 3 });
    else if (c.property === "sectionLayout") {
      const anchor = sectionSourceIds(node, draftIds).next().value;
      if (!anchor) continue;
      const key = "layout:" + anchor;
      if (node.sectionLayout) items[key] = { sectionLayout: node.sectionLayout };
      else delete items[key];
      touched = true;
    }
    else if (c.property === "columns" && node.columns) setItem(node, { columns: node.columns as 1 | 2 | 3 });
    else if (c.property.startsWith("style.")) {
      const k = c.property.slice(6) as (typeof styleKeys)[number];
      if (styleKeys.includes(k)) setItem(node, { style: { [k]: node.style[k] } as Item["style"] });
    }
  }
  if (!touched) return null;
  const overrides: SiteOverrides = { ...(theme ? { theme } : {}), items };
  return { ...draft, nodes: draft.nodes.map((n) => nodes.get(n.id)!), metadata: { ...draft.metadata, siteOverrides: overrides } };
}

/** Re-applies the draft's site overrides to a freshly generated page. Invalid results are dropped. */
export function applySiteOverrides(page: PageSpec, draft: CanvasSpec): PageSpec {
  const o = draft.metadata.siteOverrides;
  if (!o || (!o.theme && !Object.keys(o.items).length)) return page;
  const draftIds = new Set(draft.nodes.map((n) => n.id));
  const visit = (n: PageNode): PageNode => {
    const children = n.children?.map(visit);
    const key = keyOf(n, draftIds);
    const item = key ? o.items[key] : undefined;
    let next: PageNode = children ? { ...n, children } : n;
    if (item) {
      next = {
        ...next,
        ...(item.level && n.type === "heading" ? { level: item.level } : {}),
        ...(item.columns && n.type === "grid" ? { columns: item.columns } : {}),
        ...(item.style ? { style: { ...n.style, ...item.style } } : {}),
        ...(item.effects && !draftIds.has(n.id) ? { effects: item.effects.map((e) => ({ ...e, targetId: n.id })) } : {}),
      };
    }
    return next;
  };
  const candidate: PageSpec = {
    ...page,
    ...(o.theme ? { theme: o.theme } : {}),
    sections: page.sections.map(visit),
    ...(page.subpages ? { subpages: page.subpages.map((p) => ({ ...p, sections: p.sections.map(visit) })) } : {}),
  };
  const parsed = PageSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  // One bad override must not lose the rest: retry without container motion, then without anything.
  const strip = (n: PageNode): PageNode => ({ ...n, ...(draftIds.has(n.id) ? {} : { effects: [] }), ...(n.children ? { children: n.children.map(strip) } : {}) });
  const noMotion = PageSchema.safeParse({ ...candidate, sections: candidate.sections.map(strip), ...(candidate.subpages ? { subpages: candidate.subpages.map((p) => ({ ...p, sections: p.sections.map(strip) })) } : {}) });
  return noMotion.success ? noMotion.data : page;
}

/** Fingerprint of what generation reads from the draft (not the site bookkeeping). */
export function draftFingerprint(draft: CanvasSpec): string {
  const { siteOverrides: _o, siteBuiltFrom: _b, ...meta } = draft.metadata;
  void _b;
  const layouts = Object.entries(_o?.items ?? {}).filter(([key, item]) => key.startsWith("layout:") && item.sectionLayout);
  const text = JSON.stringify([meta, draft.nodes, draft.constraints, ...(layouts.length ? [layouts] : [])]);
  // FNV-1a, 32 bit: short enough to keep in the draft, only used to notice changes.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}
/** True when a site was built from this draft and the draft changed since. */
export const siteOutdated = (draft: CanvasSpec) => Boolean(draft.metadata.siteBuiltFrom) && draft.metadata.siteBuiltFrom !== draftFingerprint(draft);
/** Marks the draft as the source of the current site. */
export const markSiteBuilt = (draft: CanvasSpec): CanvasSpec => ({ ...draft, metadata: { ...draft.metadata, siteBuiltFrom: draftFingerprint(draft) } });
