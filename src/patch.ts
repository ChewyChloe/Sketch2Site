import { z } from "zod";
import {
  PageSchema,
  EffectSchema,
  effectIds,
  href,
  localAssets,
  reconcilePage,
  type PageSpec,
  type PageNode,
} from "./pageSpec";
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
          .object({ property: z.literal("src"), value: z.enum(localAssets) })
          .strict(),
        z.object({ property: z.literal("alt"), value: plainText }).strict(),
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
      payload: EffectSchema,
    })
    .strict(),
  z
    .object({
      operation: z.literal("update-effect"),
      targetId,
      payload: z.object({ effectId: z.enum(effectIds), parameters }).strict(),
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
    patches: z.array(PatchSchema).min(1).max(20),
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
  | "SCOPE_VIOLATION";
export const patchMessages: Record<PatchError, string> = {
  INVALID_PATCH: "修改格式或數值無效，請檢查後重試。",
  INVALID_PAGE: "修改不符合頁面規則，原頁面已保留。",
  STALE_REVISION: "頁面已更新，請重新選取後再套用。",
  TARGET_NOT_FOUND: "找不到指定元素，請重新選取。",
  PROPERTY_NOT_ALLOWED: "此元素不支援這項修改。",
  EFFECT_CONFLICT: "動畫不存在或已附加，請重新檢查。",
  SCOPE_VIOLATION: "修改超出指定範圍，原頁面已保留。",
};
export function indexNodes(page: PageSpec) {
  const map = new Map<string, PageNode>();
  const walk = (n: PageNode) => {
    map.set(n.id, n);
    n.children?.forEach(walk);
  };
  page.sections.forEach(walk);
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
      before.sections.map((n) => n.id),
      after.sections.map((n) => n.id),
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
      "content",
      "level",
      "href",
      "src",
      "alt",
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
      const old = node.effects.find((e) => e.effectId === effectId),
        updated = next.effects.find((e) => e.effectId === effectId);
      if (!old || !updated) {
        if (!equal(old, updated))
          changes.push({
            targetId: id,
            property: "effects." + effectId,
            before: old,
            after: updated,
          });
      } else
        for (const key of ["duration", "delay", "distance", "stagger"] as const)
          if (old[key] !== updated[key])
            changes.push({
              targetId: id,
              property: "effects." + effectId + "." + key,
              before: old[key],
              after: updated[key],
            });
    }
    // Effect order is meaningful data even though it does not change the preset registry.
    if (
      !equal(
        node.effects.map((e) => e.effectId),
        next.effects.map((e) => e.effectId),
      ) &&
      node.effects.length === next.effects.length &&
      node.effects.every((e) =>
        next.effects.some((x) => x.effectId === e.effectId),
      )
    )
      changes.push({
        targetId: id,
        property: "effects.order",
        before: node.effects.map((e) => e.effectId),
        after: next.effects.map((e) => e.effectId),
      });
  }
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
      },
      {
        metadata: after.metadata,
        schemaVersion: after.schemaVersion,
        typography: after.typography,
        styles: after.styles,
        responsive: after.responsive,
      },
    ),
  };
}
function authorized(patch: Patch, change: Change): boolean {
  if (patch.targetId !== change.targetId) return false;
  switch (patch.operation) {
    case "set-text":
      return change.property === "content";
    case "set-property":
      return change.property === patch.payload.property;
    case "set-style":
      return Object.keys(patch.payload).some(
        (k) => change.property === "style." + k,
      );
    case "attach-effect":
    case "remove-effect":
      return change.property === "effects." + patch.payload.effectId;
    case "update-effect":
      return Object.keys(patch.payload.parameters).some(
        (k) =>
          change.property === "effects." + patch.payload.effectId + "." + k,
      );
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
  const diff = diffPages(before, after);
  return (
    !diff.structureChanged &&
    !diff.pageChanged &&
    diff.changes.every((c) => patches.some((p) => authorized(p, c)))
  );
}
function bounded(input: unknown) {
  let count = 0,
    chars = 0;
  const seen = new WeakSet<object>();
  const walk = (v: unknown, d: number): boolean => {
    if (++count > 2000 || d > 8) return false;
    if (typeof v === "string") {
      chars += v.length;
      return chars <= 16000;
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
      return ["heading", "paragraph", "button"].includes(node.type)
        ? { ...node, content: p.payload.content }
        : "PROPERTY_NOT_ALLOWED";
    case "set-property": {
      const { property, value } = p.payload;
      const allowed = {
        level: ["heading"],
        href: ["button"],
        src: ["image"],
        alt: ["image"],
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
        case "alt":
          return { ...node, alt: value };
        case "columns":
          return { ...node, columns: value };
      }
    }
    case "set-style":
      return { ...node, style: { ...node.style, ...p.payload } };
    case "attach-effect":
      return node.effects.some((e) => e.effectId === p.payload.effectId)
        ? "EFFECT_CONFLICT"
        : { ...node, effects: [...node.effects, p.payload] };
    case "update-effect":
      return !node.effects.some((e) => e.effectId === p.payload.effectId)
        ? "EFFECT_CONFLICT"
        : {
            ...node,
            effects: node.effects.map((e) =>
              e.effectId === p.payload.effectId
                ? { ...e, ...p.payload.parameters }
                : e,
            ),
          };
    case "remove-effect":
      return !node.effects.some((e) => e.effectId === p.payload.effectId)
        ? "EFFECT_CONFLICT"
        : {
            ...node,
            effects: node.effects.filter(
              (e) => e.effectId !== p.payload.effectId,
            ),
          };
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
    candidate = { ...candidate, sections: candidate.sections.map(replace) };
    if (!PageSchema.safeParse(candidate).success) return fail("INVALID_PAGE");
  }
  const checked = PageSchema.safeParse(candidate);
  if (!checked.success) return fail("INVALID_PAGE");
  const after = reconcilePage(original, checked.data);
  if (!validateScope(original, after, batch.patches))
    return fail("SCOPE_VIOLATION");
  const diff = diffPages(original, after);
  const changed = diff.changes.length > 0;
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
