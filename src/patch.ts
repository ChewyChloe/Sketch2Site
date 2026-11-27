import {MotionSchema,LegacyEffectSchema,legacyMotion,updateMotion,type MotionId,type MotionInstance} from "./motion";
import { imageSource } from "./assetRef";
import { z } from "zod";
import {
  themeIds,
  parallaxConcepts,
  ImageLookSchema,
  TextStyleSchema,
  allSections,
  PageSchema,
  PageNodeSchema,
  EffectSchema,
  effectIds,
  href,
  localAssets,
  reconcilePage,
  type PageSpec,
  GalleryCategorySchema,
  type PageNode,
} from "./pageSpec";
import { SectionLayoutSchema, sectionLayoutIssue } from "./sectionLayout";
import { lockViolation, SectionLockSchema } from "./sectionLock";
import {
  commitHistory,
  undoHistory,
  redoHistory,
  type History,
} from "./history";
const plainText = z
  .string()
  .max(4000)
  .refine(
    (s) => !/<\s*\/?[a-z][^>]*>|\bon[a-z]+\s*=|javascript\s*:|<\s*!/i.test(s),
    "只接受純文字",
  );
const targetId = z.string().uuid();
const parameters = z
  .object({
    duration: z.number().int().min(120).max(1200).optional(),
    delay: z.number().int().min(0).max(1000).optional(),
    distance: z.number().int().min(0).max(32).optional(),
    stagger: z.number().int().min(30).max(150).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
const stylePatch = z
  .object({
    gap: z.enum(["none", "small", "medium", "large"]).optional(),
    padding: z.enum(["none", "small", "medium", "large"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
    tone: z.enum(["plain", "soft", "accent"]).optional(),
    width: z.enum(["full", "content", "narrow"]).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
export const PatchSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("set-section-layout"), targetId, payload: SectionLayoutSchema }).strict(),
  z
    .object({
      operation: z.literal("set-text"),
      targetId,
      payload: z.object({ content: plainText }).strict(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("set-property"),
      targetId,
      payload: z.discriminatedUnion("property", [
        z
          .object({
            property: z.literal("level"),
            value: z.union([z.literal(1), z.literal(2), z.literal(3)]),
          })
          .strict(),
        z.object({ property: z.literal("href"), value: href }).strict(),
        z
          .object({ property: z.literal("src"), value: imageSource })
          .strict(),
        z.object({ property: z.literal("alt"), value: plainText }).strict(),
        z.object({ property: z.literal("galleryCategory"), value: GalleryCategorySchema.nullable() }).strict(),
        z.object({ property: z.literal("look"), value: ImageLookSchema }).strict(),
        z.object({ property: z.literal("text"), value: TextStyleSchema }).strict(),
        z
          .object({
            property: z.literal("columns"),
            value: z.union([z.literal(1), z.literal(2), z.literal(3)]),
          })
          .strict(),
      ]),
    })
    .strict(),
  z
    .object({
      operation: z.literal("set-style"),
      targetId,
      payload: stylePatch,
    })
    .strict(),
  z
    .object({
      operation: z.literal("attach-effect"),
      targetId,
      payload: z.union([LegacyEffectSchema,MotionSchema]),
    })
    .strict(),
  z
    .object({
      operation: z.literal("update-effect"),
      targetId,
      payload: z.union([
        z.object({ effectId: z.enum(effectIds), parameters }).strict(),
        z.object({ effectId: z.enum(effectIds), validatedControls: z.record(z.string().max(40), z.union([z.string().max(1000), z.number().finite(), z.boolean(), z.array(z.string().max(24)).max(24), z.array(imageSource).min(2).max(12)])) }).strict(),
      ]),
    })
    .strict(),
  z
    .object({
      // Page-wide visual theme. Anchored on the first section so scope checks still apply.
      operation: z.literal("set-theme"),
      targetId,
      payload: z.object({ theme: z.enum(themeIds) }).strict(),
    })
    .strict(),
  z
    .object({
      // A whole top-level section rewritten (AI notes). Other sections must stay exactly as they were,
      // and it may only use pictures and links already on the site.
      operation: z.literal("replace-section"),
      targetId,
      payload: z.object({ section: PageNodeSchema }).strict(),
    })
    .strict(),
  z
    .object({
      // The author drags an element to another place, also into another section. "page" as the
      // parent reorders top-level sections. Nothing about the element itself changes.
      operation: z.literal("move-node"),
      targetId,
      payload: z.object({ parentId: z.union([z.string().uuid(), z.literal("page")]), index: z.number().int().min(0).max(200), positionOnly: z.literal(true).optional() }).strict(),
    })
    .strict(),
  z
    .object({
      // The author locks or unlocks parts of a section.
      operation: z.literal("set-lock"),
      targetId,
      payload: z.object({ lock: SectionLockSchema }).strict(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("remove-effect"),
      targetId,
      payload: z.object({ effectId: z.enum(effectIds) }).strict(),
    })
    .strict(),
]);
export type Patch = z.infer<typeof PatchSchema>;
const BatchSchema = z
  .object({
    schemaVersion: z.literal(1),
    sessionId: z.string().uuid(),
    baseRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER - 1),
    // Up to 60: 套用到全部同類 restyles many elements in one undoable step.
    patches: z.array(PatchSchema).min(1).max(60),
  })
  .strict();
export type PatchBatch = z.infer<typeof BatchSchema>;
export type Change = {
  targetId: string;
  property: string;
  before: unknown;
  after: unknown;
};
export type PageDiff = {
  changes: Change[];
  changedIds: string[];
  structureChanged: boolean;
  pageChanged: boolean;
};
export type PageSession = {
  sessionId: string;
  revision: number;
  history: History<PageSpec>;
  diff: PageDiff | null;
};
export type PatchError =
  | "INVALID_PATCH"
  | "INVALID_PAGE"
  | "STALE_REVISION"
  | "TARGET_NOT_FOUND"
  | "PROPERTY_NOT_ALLOWED"
  | "EFFECT_CONFLICT"
  | "SCOPE_VIOLATION"
  | "LOCKED";
export const patchMessages: Record<PatchError, string> = {
  INVALID_PATCH: "數值不對，請檢查後再試",
  INVALID_PAGE: "這樣改不了，頁面沒有變動",
  STALE_REVISION: "頁面已更新，請重新選取後再套用",
  TARGET_NOT_FOUND: "找不到指定元素，請重新選取",
  PROPERTY_NOT_ALLOWED: "此元素不支援這項修改",
  EFFECT_CONFLICT: "動畫不存在或已附加，請重新檢查",
  SCOPE_VIOLATION: "這樣改不了，頁面沒有變動",
  LOCKED: "這一區已鎖定，這樣改會動到鎖住的內容",
};
export function indexNodes(page: PageSpec) {
  const map = new Map<string, PageNode>();
  const walk = (n: PageNode) => {
    map.set(n.id, n);
    n.children?.forEach(walk);
  };
  allSections(page).forEach(walk);
  return map;
}
export function diffPages(before: PageSpec, after: PageSpec): PageDiff {
  const a = indexNodes(before),
    b = indexNodes(after);
  const changes: Change[] = [];
  const equal = (x: unknown, y: unknown) =>
    JSON.stringify(x) === JSON.stringify(y);
  let structureChanged =
    !equal(
      allSections(before).map((n) => n.id),
      allSections(after).map((n) => n.id),
    ) || a.size !== b.size;
  for (const [id, node] of a) {
    const next = b.get(id);
    if (!next) {
      structureChanged = true;
      continue;
    }
    if (
      node.type !== next.type ||
      !equal(
        node.children?.map((n) => n.id),
        next.children?.map((n) => n.id),
      )
    )
      structureChanged = true;
    for (const key of [
      "lock",
      "sectionLayout",
      "content",
      "level",
      "href",
      "src",
      "alt",
      "galleryCategory",
      "look",
      "text",
      "columns",
    ] as const)
      if (!equal(node[key], next[key]))
        changes.push({
          targetId: id,
          property: key,
          before: node[key],
          after: next[key],
        });
    for (const key of ["gap", "padding", "align", "tone", "width"] as const)
      if (node.style[key] !== next.style[key])
        changes.push({
          targetId: id,
          property: "style." + key,
          before: node.style[key],
          after: next.style[key],
        });
    for (const effectId of effectIds) {
      const old = node.effects.find((e) => e.presetId === effectId),
        updated = next.effects.find((e) => e.presetId === effectId);
      if (!old || !updated) {
        if (!equal(old, updated))
          changes.push({
            targetId: id,
            property: "effects." + effectId,
            before: old,
            after: updated,
          });
      } else {
        if(old.presetVersion !== updated.presetVersion || old.targetId!==updated.targetId) changes.push({targetId:id,property:"effects."+effectId,before:old,after:updated});
        else for(const key of new Set([...Object.keys(old.validatedControls),...Object.keys(updated.validatedControls)])) if(!equal(old.validatedControls[key],updated.validatedControls[key]))changes.push({targetId:id,property:"effects."+effectId+".validatedControls."+key,before:old.validatedControls[key],after:updated.validatedControls[key]});
      }
    }
    // Effect order is meaningful data even though it does not change the preset registry.
    if (
      !equal(
        node.effects.map((e) => e.presetId),
        next.effects.map((e) => e.presetId),
      ) &&
      node.effects.length === next.effects.length &&
      node.effects.every((e) =>
        next.effects.some((x) => x.presetId === e.presetId),
      )
    )
      changes.push({
        targetId: id,
        property: "effects.order",
        before: node.effects.map((e) => e.presetId),
        after: next.effects.map((e) => e.presetId),
      });
  }
  if ((before.theme ?? "classic") !== (after.theme ?? "classic") && after.sections[0])
    changes.push({ targetId: after.sections[0].id, property: "theme", before: before.theme ?? "classic", after: after.theme ?? "classic" });
  if (!equal(before.designControl, after.designControl) && after.sections[0])
    changes.push({ targetId: after.sections[0].id, property: "designControl", before: before.designControl, after: after.designControl });
  return {
    changes,
    changedIds: [...new Set(changes.map((c) => c.targetId))],
    structureChanged,
    pageChanged: !equal(
      {
        metadata: before.metadata,
        schemaVersion: before.schemaVersion,
        typography: before.typography,
        styles: before.styles,
        responsive: before.responsive,
        chrome: before.chrome,
        pages: [before.home, ...(before.subpages ?? []).map((p) => [p.id, p.title])],
      },
      {
        metadata: after.metadata,
        schemaVersion: after.schemaVersion,
        typography: after.typography,
        styles: after.styles,
        responsive: after.responsive,
        chrome: after.chrome,
        pages: [after.home, ...(after.subpages ?? []).map((p) => [p.id, p.title])],
      },
    ),
  };
}
function authorized(patch: Patch, change: Change): boolean {
  if (patch.targetId !== change.targetId) return false;
  switch (patch.operation) {
    case "set-text":
      return change.property === "content";
    case "set-theme":
      return change.property === "theme" || change.property === "designControl";
    case "replace-section":
    case "move-node":
      return false; // their changes are checked as a whole in validateScope
    case "set-section-layout":
      return change.property === "sectionLayout";
    case "set-lock":
      return change.property === "lock";
    case "set-property":
      return change.property === patch.payload.property;
    case "set-style":
      return Object.keys(patch.payload).some(
        (k) => change.property === "style." + k,
      );
    case "attach-effect":
    case "remove-effect":
      return change.property === "effects." + ("presetId" in patch.payload ? patch.payload.presetId : patch.payload.effectId);
    case "update-effect":
      if ("validatedControls" in patch.payload)
        return Object.keys(patch.payload.validatedControls).some(k=>change.property === "effects."+patch.payload.effectId+".validatedControls."+k);
      return Object.keys(patch.payload.parameters).some(k=> {
        const names:Record<string,string[]>={duration:["durationMs","childDurationMs"],delay:["delayMs"],distance:["distancePx","liftPx"],stagger:["intervalMs"]};
        return (names[k]??[]).some(name=>change.property === "effects."+patch.payload.effectId+".validatedControls."+name);
      });
  }
}
export function validateScope(
  before: PageSpec,
  after: PageSpec,
  patches: Patch[],
) {
  if (
    !PageSchema.safeParse(before).success ||
    !PageSchema.safeParse(after).success
  )
    return false;
  // Replaced sections are compared as placeholders: everything else must match exactly.
  const replaced = new Set(patches.filter((p) => p.operation === "replace-section").map((p) => p.targetId));
  const hollow = (page: PageSpec): PageSpec => {
    if (!replaced.size) return page;
    const blank = (n: PageNode): PageNode => (replaced.has(n.id) ? { id: n.id, type: "section", style: { gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" }, effects: [], children: [] } : n);
    return { ...page, sections: page.sections.map(blank), ...(page.subpages ? { subpages: page.subpages.map((p) => ({ ...p, sections: p.sections.map(blank) })) } : {}) };
  };
  const moved = new Set(patches.filter((p) => p.operation === "move-node").map((p) => p.targetId));
  if (moved.size) return sameNodesMoved(before, after, moved) && patches.every((p) => p.operation === "move-node");
  const diff = diffPages(hollow(before), hollow(after));
  return (
    !diff.structureChanged &&
    !diff.pageChanged &&
    diff.changes.every((c) => patches.some((p) => authorized(p, c)))
  );
}
/** Where every node sits: its parent ("page" for a top-level section) and the page view. */
function placements(page: PageSpec) {
  const out = new Map<string, string>();
  const views = [page.sections, ...(page.subpages ?? []).map((p) => p.sections)];
  views.forEach((sections, v) => {
    const walk = (n: PageNode, parent: string) => { out.set(n.id, v + ":" + parent); n.children?.forEach((c) => walk(c, n.id)); };
    sections.forEach((s) => walk(s, "page"));
  });
  return out;
}
/** A move changes only where the moved elements sit: every node keeps its own data. */
function sameNodesMoved(before: PageSpec, after: PageSpec, moved: Set<string>) {
  const a = indexNodes(before), b = indexNodes(after);
  if (a.size !== b.size) return false;
  const own = (n: PageNode) => JSON.stringify({ ...n, children: undefined });
  for (const [id, n] of a) { const m = b.get(id); if (!m || own(n) !== own(m)) return false; }
  const pa = placements(before), pb = placements(after);
  for (const [id, where] of pa) if (!moved.has(id) && pb.get(id) !== where) return false;
  // The page itself (title, theme, pages) is untouched.
  return !diffPages(before, after).pageChanged && (before.theme ?? "classic") === (after.theme ?? "classic")
    && JSON.stringify(before.designControl) === JSON.stringify(after.designControl);
}
const containerTypes = new Set(["section", "container", "stack", "grid", "card"]);
/** Moves one node; null when the move is not allowed. */
const equalDraftPlacements = (before: PageSpec, after: PageSpec) => {
  const layouts = (page: PageSpec) => [page.draftLayout, ...(page.subpages ?? []).map(view => view.draftLayout)];
  return JSON.stringify(layouts(before)) === JSON.stringify(layouts(after));
};
function moveNode(page: PageSpec, id: string, parentId: string, index: number, positionOnly?: true): PageSpec | PatchError {
  const views: PageNode[][] = [page.sections, ...(page.subpages ?? []).map((p) => p.sections)];
  const sectionOfId = (sections: PageNode[], x: string) => sections.find((s) => indexNodes({ ...page, sections: [s], subpages: undefined }).has(x));
  const v = views.findIndex((sections) => sectionOfId(sections, id));
  if (v < 0) return "TARGET_NOT_FOUND";
  const sections = views[v];
  const fromSection = sectionOfId(sections, id)!;
  const view = v === 0 ? page : page.subpages![v - 1];
  if (positionOnly) {
    const layout = view.draftLayout;
    if (!layout) return "PROPERTY_NOT_ALLOWED";
    const sorted = [...layout.items].sort((a, b) => a.y - b.y || a.x - b.x);
    const from = sorted.find(item => item.id === id), to = sorted[index];
    if (!from || !to || Math.abs(sorted.indexOf(from) - index) !== 1) return "PROPERTY_NOT_ALLOWED";
    if (fromSection.lock?.layout || sectionOfId(sections, to.id)?.lock?.layout) return "LOCKED";
    const draftLayout = { ...layout, items: layout.items.map(item => item.id === id
      ? { ...item, x: to.x, y: to.y } : item.id === to.id ? { ...item, x: from.x, y: from.y } : item) };
    return v === 0 ? { ...page, draftLayout } : { ...page, subpages: page.subpages!.map((p, i) => i === v - 1 ? { ...p, draftLayout } : p) };
  }
  const isSection = fromSection.id === id;
  if (isSection !== (parentId === "page")) return "PROPERTY_NOT_ALLOWED";
  let next: PageNode[];
  if (isSection) {
    const rest = sections.filter((s) => s.id !== id);
    next = [...rest.slice(0, index), fromSection, ...rest.slice(index)];
  } else {
    const toSection = sectionOfId(sections, parentId);
    if (!toSection) return "TARGET_NOT_FOUND";
    // A section whose layout is locked keeps its elements where they are.
    if (fromSection.lock?.layout || toSection.lock?.layout) return "LOCKED";
    let moving: PageNode | undefined;
    const take = (n: PageNode): PageNode => {
      if (!n.children) return n;
      const hit = n.children.find((c) => c.id === id);
      if (hit) moving = hit;
      return { ...n, children: n.children.filter((c) => c.id !== id).map(take) };
    };
    const without = sections.map(take);
    if (!moving) return "TARGET_NOT_FOUND";
    // Not into itself or anything inside it.
    if (indexNodes({ ...page, sections: [moving], subpages: undefined }).has(parentId)) return "PROPERTY_NOT_ALLOWED";
    let placed = false;
    const put = (n: PageNode): PageNode => {
      if (n.id === parentId) {
        if (!containerTypes.has(n.type)) return n;
        placed = true;
        const kids = n.children ?? [];
        return { ...n, children: [...kids.slice(0, index), moving!, ...kids.slice(index)] };
      }
      return n.children ? { ...n, children: n.children.map(put) } : n;
    };
    next = without.map(put);
    if (!placed) return "PROPERTY_NOT_ALLOWED";
  }
  return v === 0 ? { ...page, sections: next } : { ...page, subpages: page.subpages!.map((p, i) => (i === v - 1 ? { ...p, sections: next } : p)) };
}
/** Pictures and outside links a page uses. */
function pagePools(page: PageSpec) {
  const pictures = new Set<string>(), links = new Set<string>();
  const walk = (n: PageNode) => {
    if (n.src) pictures.add(n.src);
    if (n.media && "images" in n.media) n.media.images.forEach((s) => pictures.add(s));
    if (n.href && !n.href.startsWith("#")) links.add(n.href);
    n.children?.forEach(walk);
  };
  allSections(page).forEach(walk);
  return { pictures, links };
}
function bounded(input: unknown) {
  let count = 0,
    chars = 0;
  const seen = new WeakSet<object>();
  const walk = (v: unknown, d: number): boolean => {
    // A rewritten section (replace-section) nests deeper and carries more text than other patches.
    if (++count > 8000 || d > 28) return false;
    if (typeof v === "string") {
      chars += v.length;
      return chars <= 60000;
    }
    if (v && typeof v === "object") {
      if (seen.has(v)) return false;
      seen.add(v);
      return Object.keys(v).every(
        (k) =>
          !["__proto__", "constructor", "prototype"].includes(k) &&
          walk((v as Record<string, unknown>)[k], d + 1),
      );
    }
    return true;
  };
  return walk(input, 0);
}
export function createPageSession(input: unknown): PageSession {
  const page = PageSchema.parse(input);
  return {
    sessionId: crypto.randomUUID(),
    revision: 0,
    history: { past: [], present: page, future: [] },
    diff: null,
  };
}
function updateNode(node: PageNode, p: Patch): PageNode | PatchError {
  switch (p.operation) {
    case "set-text":
      return ["heading", "paragraph", "button", "form"].includes(node.type)
        ? { ...node, content: p.payload.content }
        : "PROPERTY_NOT_ALLOWED";
    case "set-property": {
      const { property, value } = p.payload;
      const allowed = {
        level: ["heading"],
        href: ["button", "form"],
        src: ["image"],
        alt: ["image"],
        galleryCategory: ["image", "card"],
        look: ["image"],
        text: ["heading", "paragraph", "button", "card"],
        columns: ["grid"],
      };
      if (!(allowed[property] as string[]).includes(node.type))
        return "PROPERTY_NOT_ALLOWED";
      // Each property is explicitly enumerated; no arbitrary object paths or keys.
      switch (property) {
        case "level":
          return { ...node, level: value };
        case "href":
          return { ...node, href: value };
        case "src":
          return { ...node, src: value };
        case "galleryCategory": {
          const { galleryCategory: _previousCategory, ...rest } = node;
          return value === null ? rest : { ...node, galleryCategory: value };
        }
        case "alt":
          return { ...node, alt: value };
        case "columns":
          return { ...node, columns: value };
        case "text":
          return Object.keys(value).length ? { ...node, text: value } : (({ text: _t, ...rest }) => (void _t, rest))(node);
        case "look":
          return Object.keys(value).length ? { ...node, look: value } : (({ look: _l, ...rest }) => (void _l, rest))(node);
      }
    }
    case "set-section-layout":
      if (node.type !== "section") return "PROPERTY_NOT_ALLOWED";
      if (node.lock?.layout) return "LOCKED";
      if (sectionLayoutIssue(node, p.payload)) return "INVALID_PATCH";
      return { ...node, sectionLayout: p.payload };
    case "set-style":
      return { ...node, style: { ...node.style, ...p.payload } };
    case "attach-effect": {
      const motion = "presetId" in p.payload ? p.payload : legacyMotion(p.payload,node.id) as MotionInstance;
      return node.effects.some(e=>e.presetId===motion.presetId)?"EFFECT_CONFLICT":{...node,effects:[...node.effects,motion]};
    }
    case "update-effect": {
      if(!node.effects.some(e=>e.presetId===p.payload.effectId))return "EFFECT_CONFLICT";
      try{return {...node,effects:node.effects.map(e=>e.presetId===p.payload.effectId?updateMotion(e,"validatedControls" in p.payload?p.payload.validatedControls:p.payload.parameters,!("validatedControls" in p.payload)):e)};}catch{return "INVALID_PATCH";}
    }
    case "set-theme": return node;
    case "replace-section": return node;
    case "move-node": return node;
    case "set-lock": return node.type === "section" ? (Object.values(p.payload.lock).some(Boolean) ? { ...node, lock: p.payload.lock } : (({ lock: _l, ...rest }) => (void _l, rest))(node)) : "PROPERTY_NOT_ALLOWED";
    case "remove-effect": return !node.effects.some(e=>e.presetId===p.payload.effectId)?"EFFECT_CONFLICT":{...node,effects:node.effects.filter(e=>e.presetId!==p.payload.effectId)};
  }
}
export type PatchResult =
  | {
      ok: true;
      state: PageSession;
      before: PageSpec;
      after: PageSpec;
      diff: PageDiff;
      affectsOtherComponents: false;
      changed: boolean;
    }
  | { ok: false; state: PageSession; code: PatchError; error: string };
export function applyPatchBatch(
  state: PageSession,
  input: unknown,
  allowedTargetIds: readonly string[],
): PatchResult {
  const fail = (code: PatchError): PatchResult => ({
    ok: false,
    state,
    code,
    error: patchMessages[code],
  });
  if (!bounded(input)) return fail("INVALID_PATCH");
  const parsed = BatchSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_PATCH");
  const batch = parsed.data;
  if (
    batch.sessionId !== state.sessionId ||
    batch.baseRevision !== state.revision
  )
    return fail("STALE_REVISION");
  const original = state.history.present;
  if (!PageSchema.safeParse(original).success) return fail("INVALID_PAGE");
  const available = indexNodes(original);
  if (batch.patches.some((p) => !available.has(p.targetId)))
    return fail("TARGET_NOT_FOUND");
  if (batch.patches.some((p) => !allowedTargetIds.includes(p.targetId)))
    return fail("SCOPE_VIOLATION");
  let candidate = original;
  for (const p of batch.patches) {
    const target = indexNodes(candidate).get(p.targetId);
    if (!target) return fail("TARGET_NOT_FOUND");
    if (p.operation === "replace-section") {
      const top = allSections(candidate).some((n) => n.id === p.targetId);
      if (!top || p.payload.section.id !== p.targetId || p.payload.section.type !== "section") return fail("PROPERTY_NOT_ALLOWED");
      // Only the site's own pictures and links.
      const own = pagePools(original), next = pagePools({ ...candidate, sections: [p.payload.section], subpages: undefined });
      if ([...next.pictures].some((x) => !own.pictures.has(x)) || [...next.links].some((x) => !own.links.has(x))) return fail("SCOPE_VIOLATION");
      // A rewrite may not touch what the author locked, nor change the lock itself.
      if (JSON.stringify(target.sectionLayout) !== JSON.stringify(p.payload.section.sectionLayout)) return fail("LOCKED");
      if (JSON.stringify(target.lock ?? {}) !== JSON.stringify(p.payload.section.lock ?? {}) || lockViolation(target, p.payload.section)) return fail("LOCKED");
      const swap = (n: PageNode) => (n.id === p.targetId ? p.payload.section : n);
      candidate = { ...candidate, sections: candidate.sections.map(swap), ...(candidate.subpages ? { subpages: candidate.subpages.map((x) => ({ ...x, sections: x.sections.map(swap) })) } : {}) };
      if (!PageSchema.safeParse(candidate).success) return fail("INVALID_PAGE");
      continue;
    }
    if (p.operation === "move-node") {
      const moved = moveNode(candidate, p.targetId, p.payload.parentId, p.payload.index, p.payload.positionOnly);
      if (typeof moved === "string") return fail(moved);
      candidate = moved;
      if (!PageSchema.safeParse(candidate).success) return fail("INVALID_PAGE");
      continue;
    }
    if (p.operation === "set-theme") {
      if (candidate.sections[0]?.id !== target.id) return fail("PROPERTY_NOT_ALLOWED");
      const { designControl, concept, theme } = candidate;
      candidate = { ...candidate, theme: p.payload.theme, designControl: {
        ...designControl, style: true,
        layoutTheme: designControl?.layoutTheme === undefined ? theme ?? null : designControl.layoutTheme,
        layoutConcept: designControl?.layoutConcept === undefined ? concept ?? null : designControl.layoutConcept,
        conceptMotion: designControl?.conceptMotion ?? Boolean(concept && parallaxConcepts.includes(concept)),
      } };
      continue;
    }
    if (p.operation === "set-section-layout") {
      const view = [candidate, ...(candidate.subpages ?? [])].find(view => view.sections.some(section => section.id === target.id));
      if (!view || view.draftLayout) return fail("PROPERTY_NOT_ALLOWED");
    }
    const updated = updateNode(target, p);
    if (typeof updated === "string") return fail(updated);
    const replace = (n: PageNode): PageNode => {
      if (n.id === p.targetId) return updated;
      if (!n.children) return n;
      const children = n.children.map(replace);
      return children.some((c, i) => c !== n.children![i])
        ? { ...n, children }
        : n;
    };
    candidate = {
      ...candidate,
      sections: candidate.sections.map(replace),
      ...(candidate.subpages ? { subpages: candidate.subpages.map((p) => ({ ...p, sections: p.sections.map(replace) })) } : {}),
    };
    if (!PageSchema.safeParse(candidate).success) return fail("INVALID_PAGE");
  }
  const checked = PageSchema.safeParse(candidate);
  if (!checked.success) return fail("INVALID_PAGE");
  const after = reconcilePage(original, checked.data);
  if (!validateScope(original, after, batch.patches))
    return fail("SCOPE_VIOLATION");
  const diff = diffPages(original, after);
  const placementChanged = batch.patches.some(p => p.operation === "move-node" && p.payload.positionOnly)
    && !equalDraftPlacements(original, after);
  const changed = diff.changes.length > 0 || diff.structureChanged || placementChanged;
  const history = changed ? commitHistory(state.history, after) : state.history;
  return {
    ok: true,
    state: changed
      ? { ...state, revision: state.revision + 1, history, diff }
      : state,
    before: original,
    after: changed ? after : original,
    diff,
    affectsOtherComponents: false,
    changed,
  };
}
export function travelPage(
  state: PageSession,
  direction: "undo" | "redo",
): PageSession {
  const history =
    direction === "undo"
      ? undoHistory(state.history)
      : redoHistory(state.history);
  return history === state.history
    ? state
    : {
        ...state,
        revision: state.revision + 1,
        history,
        diff: diffPages(state.history.present, history.present),
      };
}
