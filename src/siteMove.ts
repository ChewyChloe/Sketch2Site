import { allSections, type PageNode, type PageSpec } from "./pageSpec";

// Small layout edits on the site itself, so they do not need a prompt:
// - drag an element to another place, also into another section (move-node patch),
// - copy one element's look and paste it on others, anywhere on the site, or on every
//   element of the same kind at once (ordinary set-style / set-property patches).

const containers = new Set(["section", "container", "stack", "grid", "card"]);
type Placement = { parentId: string; index: number };

function parentsOf(page: PageSpec) {
  const up = new Map<string, PageNode | "page">();
  const walk = (n: PageNode) => n.children?.forEach((c) => { up.set(c.id, n); walk(c); });
  allSections(page).forEach((s) => { up.set(s.id, "page"); walk(s); });
  return up;
}
const contains = (n: PageNode, id: string): boolean => n.id === id || !!n.children?.some((c) => contains(c, id));
const find = (page: PageSpec, id: string): PageNode | undefined => {
  let hit: PageNode | undefined;
  const walk = (n: PageNode) => { if (n.id === id) hit = n; else n.children?.forEach(walk); };
  allSections(page).forEach(walk);
  return hit;
};
const viewOf = (page: PageSpec, id: string) => [page.sections, ...(page.subpages ?? []).map((p) => p.sections)].findIndex((ss) => ss.some((s) => contains(s, id)));

/**
 * Where a dragged element lands when dropped over another one: just before or after it
 * (`after` from the pointer position), in the same parent. Dropped on an empty area of a
 * section or container, it goes to the end of it. Sections only reorder among sections.
 */
export function dropPlacement(page: PageSpec, movingId: string, overId: string, after: boolean): Placement | null {
  if (movingId === overId) return null;
  const up = parentsOf(page);
  const moving = find(page, movingId), over = find(page, overId);
  if (!moving || !over || viewOf(page, movingId) !== viewOf(page, overId)) return null;
  const sections = [page.sections, ...(page.subpages ?? []).map((p) => p.sections)][viewOf(page, movingId)];
  if (up.get(movingId) === "page") {
    // Reorder sections: the section the pointer is over.
    const target = sections.find((s) => contains(s, overId));
    if (!target || target.id === movingId) return null;
    const rest = sections.filter((s) => s.id !== movingId);
    const i = rest.findIndex((s) => s.id === target.id);
    return { parentId: "page", index: i + (after ? 1 : 0) };
  }
  if (contains(moving, overId)) return null;
  const parent = up.get(overId);
  if (parent === "page" || parent === undefined) {
    // Over a whole section: to its end (or start).
    if (!containers.has(over.type)) return null;
    const kids = (over.children ?? []).filter((c) => c.id !== movingId);
    return { parentId: over.id, index: after ? kids.length : 0 };
  }
  const kids = (parent.children ?? []).filter((c) => c.id !== movingId);
  const i = kids.findIndex((c) => c.id === overId);
  return { parentId: parent.id, index: i + (after ? 1 : 0) };
}

/** One step earlier or later among its siblings (keyboard alternative to dragging). */
export function nudge(page: PageSpec, id: string, by: -1 | 1): Placement | null {
  const up = parentsOf(page), parent = up.get(id);
  if (!parent) return null;
  const list = parent === "page" ? [page.sections, ...(page.subpages ?? []).map((p) => p.sections)][viewOf(page, id)] : parent.children ?? [];
  const i = list.findIndex((c) => c.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return null;
  return { parentId: parent === "page" ? "page" : parent.id, index: j };
}

export const movePatch = (id: string, p: Placement) => ({ operation: "move-node", targetId: id, payload: p });

/** The parts of an element's look that can be pasted on another element. */
export type CopiedStyle = { type: PageNode["type"]; level?: number; style: PageNode["style"]; text?: PageNode["text"]; look?: PageNode["look"] };
export const copyStyle = (n: PageNode): CopiedStyle => ({ type: n.type, level: n.level, style: { ...n.style }, ...(n.text ? { text: { ...n.text } } : {}), ...(n.look ? { look: { ...n.look } } : {}) });
const textTypes = new Set(["heading", "paragraph", "button", "card"]);

/** Patches that give each target the copied look (spacing, alignment, background, text style, picture frame). */
export function pastePatches(copied: CopiedStyle, targets: readonly PageNode[]) {
  return targets.flatMap((t) => {
    const out: { operation: string; targetId: string; payload: unknown }[] = [{ operation: "set-style", targetId: t.id, payload: { ...copied.style } }];
    if (textTypes.has(t.type) && textTypes.has(copied.type)) out.push({ operation: "set-property", targetId: t.id, payload: { property: "text", value: { ...(copied.text ?? {}) } } });
    if (t.type === "image" && copied.type === "image") out.push({ operation: "set-property", targetId: t.id, payload: { property: "look", value: { ...(copied.look ?? {}) } } });
    return out;
  });
}

/** Every element of the same kind on the site (headings of the same level), other than the source. */
export function sameKind(page: PageSpec, source: PageNode): PageNode[] {
  const out: PageNode[] = [];
  const walk = (n: PageNode) => {
    if (n.id !== source.id && n.type === source.type && (n.type !== "heading" || n.level === source.level)) out.push(n);
    n.children?.forEach(walk);
  };
  allSections(page).forEach(walk);
  return out;
}
