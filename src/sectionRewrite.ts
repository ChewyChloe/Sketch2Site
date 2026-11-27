import { z } from "zod";
import { createMotion, combinationReason, targetReason, type MotionId } from "./motion";
import { imageSource } from "./assetRef";
import { lockViolation } from "./sectionLock";
import {
  allSections,
  ImageLookSchema,
  MediaSchema,
  PageNodeSchema,
  sectionRoles,
  styleSchema,
  TextStyleSchema,
  type Media,
  type PageNode,
  type PageSpec,
} from "./pageSpec";

// AI notes rewrite whole sections. The model reads the whole site (every section, in a compact
// form with short references) and returns new versions of the sections that have notes. It may
// restructure them freely (turn three photos into a carousel, reorder, regroup, reword), but:
// - it can only use pictures and links that are already on the site (by key, never addresses),
// - existing elements keep their identity through their ref, so draft sync and motion survive,
// - every answer is converted back and checked against the page schema here and again when
//   the patch is applied; any other section must stay exactly as it was.

const MAX_NODES = 120;
const MAX_DEPTH = 8;
/** Entrance motions the model may add to new elements; anything else stays as the author set it. */
export const rewriteMotions = ["fade-in", "slide-up", "scale-in", "blur-in", "stagger-reveal", "float-idle"] as const satisfies readonly MotionId[];
const plain = (s: string) => !/<\s*\/?[a-z!]|https?:|www\.|javascript:|\bon[a-z]+\s*=|[\u0000-\u0008\u000b-\u001f\u007f]/i.test(s);
const text = (max: number) => z.string().max(max).refine(plain, "只接受純文字");

const compactTypes = ["section", "container", "card", "stack", "grid", "heading", "paragraph", "button", "image", "media", "form"] as const;
export type CompactNode = {
  ref?: string;
  type: (typeof compactTypes)[number];
  role?: (typeof sectionRoles)[number];
  content?: string;
  level?: 1 | 2 | 3;
  link?: string;
  image?: string;
  alt?: string;
  look?: z.infer<typeof ImageLookSchema>;
  media?: { kind: "carousel" | "flipbook" | "object3d" | "character" | "video" | "chart" | "table"; images?: string[]; autoplay?: boolean; seconds?: number; arrows?: boolean; dots?: boolean; shape?: "cube" | "coin" | "ring"; spin?: boolean; chart?: "bar" | "line" | "pie"; points?: { label: string; value: number }[]; unit?: string; rows?: string[][]; header?: boolean };
  text?: z.infer<typeof TextStyleSchema>;
  columns?: 1 | 2 | 3;
  style?: Partial<z.infer<typeof styleSchema>>;
  motions?: string[];
  /** Read only: what the author locked in this section (text, assets, layout). */
  locked?: ("text" | "assets" | "layout")[];
  children?: CompactNode[];
};
const CompactNodeSchema: z.ZodType<CompactNode> = z.lazy(() =>
  z
    .object({
      ref: z.string().regex(/^e\d{1,4}$/).optional(),
      type: z.enum(compactTypes),
      role: z.enum(sectionRoles).optional(),
      content: text(2000).optional(),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      link: z.string().regex(/^(L\d{1,3}|#e\d{1,4})$/).optional(),
      image: z.string().regex(/^P\d{1,3}$/).optional(),
      alt: text(200).optional(),
      look: ImageLookSchema.optional(),
      media: z
        .object({
          kind: z.enum(["carousel", "flipbook", "object3d", "character", "video", "chart", "table"]),
          images: z.array(z.string().regex(/^P\d{1,3}$/)).max(12).optional(),
          autoplay: z.boolean().optional(),
          seconds: z.number().int().min(2).max(10).optional(),
          arrows: z.boolean().optional(),
          dots: z.boolean().optional(),
          shape: z.enum(["cube", "coin", "ring"]).optional(),
          spin: z.boolean().optional(),
          chart: z.enum(["bar", "line", "pie"]).optional(),
          points: z.array(z.object({ label: text(16), value: z.number().finite() }).strict()).max(12).optional(),
          unit: text(6).optional(),
          rows: z.array(z.array(text(60)).max(6)).max(20).optional(),
          header: z.boolean().optional(),
        })
        .strict()
        .optional(),
      text: TextStyleSchema.optional(),
      columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      style: styleSchema.partial().optional(),
      motions: z.array(z.string().max(40)).max(4).optional(),
      locked: z.array(z.enum(["text", "assets", "layout"])).max(3).optional(),
      children: z.array(CompactNodeSchema).max(40).optional(),
    })
    .strict(),
);

export const RewriteRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    // The whole site; the server converts it to the compact form the model reads.
    page: z.unknown(),
    notes: z
      .array(z.object({ n: z.number().int().min(1).max(20), nodeId: z.string().uuid(), note: z.string().trim().min(1).max(300) }).strict())
      .min(1)
      .max(12),
    audience: z.string().trim().max(20).optional(),
    purpose: z.string().trim().max(20).optional(),
    mood: z.string().trim().max(20).optional(),
  })
  .strict();
export type RewriteRequest = z.infer<typeof RewriteRequestSchema>;

/** What the model answers. */
export const RewriteOutputSchema = z
  .object({
    sections: z.array(z.object({ ref: z.string().regex(/^e\d{1,4}$/), node: CompactNodeSchema }).strict()).max(6),
    notes: z.array(z.object({ n: z.number().int().min(1).max(20), summary: text(60) }).strict()).max(12),
  })
  .strict();
export type RewriteOutput = z.infer<typeof RewriteOutputSchema>;

/** What the server returns: finished sections (real ids) and one line per note. */
export const RewriteResponseSchema = z
  .object({
    requestId: z.string().uuid(),
    sections: z.array(PageNodeSchema).max(6),
    notes: z.array(z.object({ n: z.number().int(), summary: z.string().max(60) }).strict()).max(12),
  })
  .strict();

/** Pictures and links already on the site: the only ones a rewrite may use. */
export function sitePools(page: PageSpec) {
  const pictures: string[] = [], links: string[] = [];
  const add = (list: string[], v: string | undefined) => v && !list.includes(v) && list.push(v);
  const walk = (n: PageNode) => {
    if (n.type === "image") add(pictures, n.src);
    if (n.media && "images" in n.media) n.media.images.forEach((s) => add(pictures, s));
    if (n.href && !n.href.startsWith("#") && n.type !== "form") add(links, n.href);
    n.children?.forEach(walk);
  };
  allSections(page).forEach(walk);
  return { pictures, links };
}

/** The site as the model reads it: short refs instead of ids, picture and link keys instead of addresses. */
export function compactSite(page: PageSpec) {
  const { pictures, links } = sitePools(page);
  const refs = new Map<string, string>(), ids = new Map<string, string>();
  let count = 0;
  const refOf = (id: string) => {
    if (!refs.has(id)) { const r = "e" + ++count; refs.set(id, r); ids.set(r, id); }
    return refs.get(id)!;
  };
  allSections(page).forEach(function index(n) { refOf(n.id); n.children?.forEach(index); });
  const toCompact = (n: PageNode): CompactNode => {
    const c: CompactNode = { ref: refOf(n.id), type: n.type };
    if (n.role) c.role = n.role;
    if (n.content !== undefined && n.type !== "form") c.content = n.content;
    if (n.type === "form") c.content = "(contact form)";
    if (n.level) c.level = n.level;
    if (n.href && n.type !== "form") c.link = n.href.startsWith("#") ? "#" + refOf(n.href.slice(1)) : "L" + (links.indexOf(n.href) + 1);
    if (n.src) c.image = "P" + (pictures.indexOf(n.src) + 1);
    if (n.alt) c.alt = n.alt;
    if (n.look) c.look = n.look;
    if (n.media) {
      const m = n.media;
      c.media = m.kind === "video" ? { kind: "video" } : m.kind === "character" ? { kind: "character" } : m.kind === "chart" ? { kind: "chart", chart: m.chart, points: m.points, unit: m.unit } : m.kind === "table" ? { kind: "table", rows: m.rows, header: m.header } : { kind: m.kind, images: m.images.map((s) => "P" + (pictures.indexOf(s) + 1)), ...(m.kind === "carousel" ? { autoplay: m.autoplay, seconds: m.seconds, arrows: m.arrows, dots: m.dots } : {}), ...(m.kind === "object3d" ? { shape: m.shape, spin: m.spin } : {}) };
    }
    if (n.text) c.text = n.text;
    if (n.columns) c.columns = n.columns;
    c.style = n.style;
    if (n.effects.length) c.motions = n.effects.map((e) => e.presetId);
    if (n.lock) c.locked = (["text", "assets", "layout"] as const).filter((k) => n.lock![k]);
    if (n.children) c.children = n.children.map(toCompact);
    return c;
  };
  return {
    sections: allSections(page).map(toCompact),
    pictures: pictures.map((_, i) => "P" + (i + 1)),
    links: links.map((_, i) => "L" + (i + 1)),
    refOf,
    idOf: (ref: string) => ids.get(ref),
    pictureOf: (key: string) => pictures[Number(key.slice(1)) - 1],
    linkOf: (key: string) => links[Number(key.slice(1)) - 1],
  };
}

/** The top-level section that holds a node. */
export function sectionOf(page: PageSpec, nodeId: string): PageNode | undefined {
  const has = (n: PageNode): boolean => n.id === nodeId || (n.children ?? []).some(has);
  return allSections(page).find(has);
}

export class RewriteError extends Error {}
/**
 * Turns one rewritten section back into a page node: refs become the original ids (only refs
 * from this same section, each once), keys become the site's own pictures and links, new
 * elements get new ids, kept elements keep their motion. Throws RewriteError when anything
 * is out of bounds; the result is checked by the page node schema.
 */
export function fromCompact(page: PageSpec, sectionId: string, input: CompactNode, newId: () => string = () => crypto.randomUUID()): PageNode {
  const site = compactSite(page);
  const section = allSections(page).find((s) => s.id === sectionId);
  if (!section) throw new RewriteError("section not found");
  const original = new Map<string, PageNode>();
  (function walk(n: PageNode) { original.set(n.id, n); n.children?.forEach(walk); })(section);
  const used = new Set<string>();
  let count = 0;
  const fail = (why: string): never => { throw new RewriteError(why); };
  const pic = (key: string) => site.pictureOf(key) ?? fail("unknown picture " + key);
  const build = (c: CompactNode, depth: number, top: boolean): PageNode => {
    if (++count > MAX_NODES || depth > MAX_DEPTH) fail("too large");
    let id: string;
    let old: PageNode | undefined;
    if (top) {
      if (c.type !== "section") fail("top must be a section");
      id = sectionId;
      old = section;
      used.add(sectionId);
    } else if (c.ref) {
      const oid = site.idOf(c.ref);
      if (!oid || !original.has(oid) || oid === sectionId || used.has(oid)) fail("bad ref " + c.ref);
      used.add(oid!);
      id = oid!;
      old = original.get(oid!);
    } else id = newId();
    const same = old && old.type === c.type ? old : undefined;
    const node: Record<string, unknown> = { id, type: c.type, style: { ...(same?.style ?? {}), ...(c.style ?? {}) }, effects: [] };
    // Motion: kept as the author set it unless the model lists motions; new ones are entrances only.
    if (c.motions) {
      for (const m of c.motions) {
        const kept = same?.effects.find((e) => e.presetId === m);
        if (kept) (node.effects as unknown[]).push(kept);
        else if ((rewriteMotions as readonly string[]).includes(m)) (node.effects as unknown[]).push(createMotion(m as MotionId, id));
      }
    } else if (same) node.effects = same.effects;
    if (c.type === "section" && (c.role ?? same?.role)) node.role = c.role ?? same?.role;
    // The lock stays exactly as the author set it; the model cannot add or remove one.
    if (top && section.lock) node.lock = section.lock;
    const container = ["section", "container", "card", "stack", "grid"].includes(c.type);
    if (container) node.children = (c.children ?? []).map((k) => build(k, depth + 1, false));
    if (c.type === "grid") node.columns = c.columns ?? same?.columns ?? 2;
    if (c.type === "card" && (c.text ?? same?.text)) node.text = c.text ?? same?.text;
    if (c.type === "heading" || c.type === "paragraph" || c.type === "button") {
      node.content = c.content ?? same?.content ?? fail("missing text");
      if (c.text ?? same?.text) node.text = c.text ?? same?.text;
    }
    if (c.type === "heading") node.level = c.level ?? same?.level ?? 2;
    if (c.type === "button") {
      const link = c.link ? (c.link.startsWith("#") ? "#" + (site.idOf(c.link.slice(1)) ?? fail("bad anchor")) : site.linkOf(c.link) ?? fail("unknown link")) : same?.href;
      node.href = link ?? fail("button needs a link");
    }
    if (c.type === "image") {
      node.src = c.image ? pic(c.image) : same?.src ?? fail("image needs a picture");
      node.alt = c.alt ?? same?.alt ?? "照片";
      if (c.look ?? same?.look) node.look = c.look ?? same?.look;
    }
    if (c.type === "form") {
      // A form keeps its fields and receiving address; it can only be moved.
      if (!same) fail("forms cannot be created");
      node.content = same!.content;
      node.href = same!.href;
    }
    if (c.type === "media") {
      node.content = c.content ?? same?.content ?? "";
      const m = c.media ?? (same?.media ? { kind: same.media.kind } : fail("media needs a kind"));
      let media: Media;
      if (m.kind === "video" || m.kind === "character") {
        // No new videos or characters: only an existing one can be kept.
        if (!same?.media || same.media.kind !== m.kind) fail("cannot create " + m.kind);
        media = same!.media!;
      } else if (m.kind === "chart") {
        // Charts and tables hold the author's own words and numbers, rearranged or as the note asks.
        media = { kind: "chart", chart: m.chart ?? "bar", points: m.points ?? [], unit: m.unit ?? "" };
      } else if (m.kind === "table") {
        media = { kind: "table", rows: m.rows ?? [], header: m.header ?? true };
      } else {
        const images = (m.images ?? []).map(pic);
        media =
          m.kind === "carousel" ? { kind: "carousel", images, autoplay: m.autoplay ?? true, seconds: m.seconds ?? 4, arrows: m.arrows ?? true, dots: m.dots ?? true }
          : m.kind === "flipbook" ? { kind: "flipbook", images }
          : { kind: "object3d", shape: m.shape ?? "cube", images, spin: m.spin ?? true };
      }
      const ok = MediaSchema.safeParse(media);
      if (!ok.success) fail("bad media");
      node.media = ok.data;
    }
    // Drop motions that do not suit the new element or clash; the author can add them back.
    const effects = node.effects as PageNode["effects"];
    const fit = effects.filter((e) => !targetReason(node as unknown as PageNode, e.presetId, e.presetVersion));
    node.effects = combinationReason(fit) ? fit.slice(0, 1) : fit;
    return node as unknown as PageNode;
  };
  const built = build(input, 0, true);
  const parsed = PageNodeSchema.safeParse(built);
  if (!parsed.success) fail("schema: " + (parsed.error.issues[0]?.message ?? ""));
  const locked = lockViolation(section, parsed.data!);
  if (locked) fail("locked: " + locked);
  // Pictures must still be the site's own (the schema allows any built-in sample).
  const { pictures } = sitePools(page);
  (function check(n: PageNode) {
    if (n.src && !pictures.includes(n.src)) fail("foreign picture");
    if (n.media && "images" in n.media && n.media.images.some((s) => !pictures.includes(s) || !imageSource.safeParse(s).success)) fail("foreign picture");
    n.children?.forEach(check);
  })(parsed.data!);
  return parsed.data!;
}

