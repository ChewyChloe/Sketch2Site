import { z } from "zod";
import type { PageNode, PageSpec } from "./pageSpec";

// Locking finished sections. A section can lock its text, its pictures and media, and its layout.
// The lock is data on the section and is enforced in code, not only asked of the model:
// - an AI section rewrite that touches a locked part is refused (sectionRewrite.ts and patch.ts),
// - a new generation carries locked parts over from the current site (carryLocks),
// - the lock itself can only be changed by the author (set-lock patch), never by a rewrite.
// The author's own edits on the site are not blocked.

export const SectionLockSchema = z
  .object({ text: z.boolean().optional(), assets: z.boolean().optional(), layout: z.boolean().optional() })
  .strict();
export type SectionLock = z.infer<typeof SectionLockSchema>;
export const lockLabels = { text: "文字", assets: "圖片與媒體", layout: "版面" } as const;
export const isLocked = (lock?: SectionLock) => !!lock && (lock.text || lock.assets || lock.layout) === true;

const walk = (n: PageNode, out: PageNode[] = []) => (out.push(n), n.children?.forEach((c) => walk(c, out)), out);
const textOf = (n: PageNode) => {
  const words = n.type === "heading" || n.type === "paragraph" || n.type === "button" || n.type === "media" ? n.content ?? "" : "";
  const data = n.media?.kind === "chart" ? JSON.stringify([n.media.points, n.media.unit]) : n.media?.kind === "table" ? JSON.stringify(n.media.rows) : "";
  return words + data;
};
const assetsOf = (n: PageNode) => (n.type === "image" ? n.src ?? "" : n.media && "images" in n.media ? n.media.images.join("|") : "");
/** Everything about a node except its words: type, structure, style, frame, media settings, motion. */
const shapeOf = (n: PageNode): unknown => {
  const { content: _c, children, media, src: _s, alt: _a, lock: _l, ...rest } = n;
  const m = media ? (media.kind === "chart" ? { kind: "chart", chart: media.chart } : media.kind === "table" ? { kind: "table", header: media.header } : "images" in media ? { ...media, images: media.images.length } : media) : undefined;
  return { ...rest, ...(m ? { media: m } : {}), children: children?.map(shapeOf) };
};

/** Why `after` breaks `before`'s lock, or null when it keeps every locked part. */
export function lockViolation(before: PageNode, after: PageNode): string | null {
  const lock = before.lock;
  if (!isLocked(lock)) return null;
  if (JSON.stringify(after.lock ?? {}) !== JSON.stringify(lock)) return "鎖定設定只能由你自己改";
  const old = walk(before), next = walk(after);
  const byId = new Map(next.map((n) => [n.id, n]));
  if (lock!.text) {
    const kept = old.filter((n) => textOf(n));
    if (kept.some((n) => byId.get(n.id) === undefined || textOf(byId.get(n.id)!) !== textOf(n))) return "這一區的文字已鎖定";
    const known = new Set(kept.map((n) => n.id));
    if (next.some((n) => textOf(n) && !known.has(n.id))) return "這一區的文字已鎖定";
  }
  if (lock!.assets) {
    const kept = old.filter((n) => assetsOf(n));
    if (kept.some((n) => byId.get(n.id) === undefined || assetsOf(byId.get(n.id)!) !== assetsOf(n))) return "這一區的圖片已鎖定";
    const known = new Set(kept.map((n) => n.id));
    if (next.some((n) => assetsOf(n) && !known.has(n.id))) return "這一區的圖片已鎖定";
  }
  if (lock!.layout && JSON.stringify(shapeOf(before)) !== JSON.stringify(shapeOf(after))) return "這一區的版面已鎖定";
  return null;
}

/**
 * A new generation of the site keeps the locked parts of the current one. Sections are matched
 * by the draft elements they hold (generated ids change; draft ids do not). Layout-locked
 * sections are carried over whole; text and picture locks copy the words and pictures back.
 */
export function carryLocks(current: PageSpec | undefined, next: PageSpec): PageSpec {
  if (!current) return next;
  const locked = [...current.sections, ...(current.subpages ?? []).flatMap((p) => p.sections)].filter((s) => isLocked(s.lock));
  if (!locked.length) return next;
  const carry = (sections: PageNode[]) =>
    sections.map((s) => {
      const ids = new Set(walk(s).map((n) => n.id));
      const old = locked.find((o) => walk(o).some((n) => n.id !== o.id && ids.has(n.id)));
      if (!old) return s;
      if (old.lock!.layout) return { ...old, id: s.id };
      const oldNodes = new Map(walk(old).map((n) => [n.id, n]));
      const copy = (n: PageNode): PageNode => {
        const o = oldNodes.get(n.id);
        let m: PageNode = n;
        if (o && o.type === n.type) {
          if (old.lock!.text && o.content !== undefined) m = { ...m, content: o.content };
          if (old.lock!.text && (o.media?.kind === "chart" || o.media?.kind === "table") && n.media?.kind === o.media.kind) m = { ...m, media: o.media };
          if (old.lock!.assets && o.src) m = { ...m, src: o.src, ...(o.alt ? { alt: o.alt } : {}) };
          if (old.lock!.assets && o.media && "images" in o.media && n.media?.kind === o.media.kind) m = { ...m, media: o.media };
        }
        return m.children ? { ...m, children: m.children.map(copy) } : m;
      };
      return { ...copy(s), lock: old.lock };
    });
  return {
    ...next,
    sections: carry(next.sections),
    ...(next.subpages ? { subpages: next.subpages.map((p) => ({ ...p, sections: carry(p.sections) })) } : {}),
  };
}
