import { createMotion, combinationReason, targetReason, type MotionId } from "./motion";
import type { Brand, PageNode, PageSpec } from "./pageSpec";
import { artLabels, type ArtDirection } from "./artDirectionSchema";
export * from "./artDirectionSchema";

// Art direction decided by the AI BEFORE the layout, per candidate (design-first prompting:
// "lock one system"; build-awwwards-quality-sites: write a compact direction first; MIT).
// Seven implementable lines: a thesis, the type system, space, picture treatment, one
// signature device, accent discipline and a motion narrative. Trusted code maps each value to
// things the site already has (brand fonts, CSS tokens, the existing 100 motions); nothing
// new is drawn, and the author's own choices always win.

/** The seven lines in words, for the author to read on the candidate. */
export function describeArt(a: ArtDirection) {
  return [a.thesis, artLabels.typeSystem[a.typeSystem], artLabels.space[a.space], artLabels.imagery[a.imagery], artLabels.signature[a.signature], artLabels.accent[a.accent]];
}

const typeFonts: Record<ArtDirection["typeSystem"], Partial<Brand>> = {
  "editorial-serif": { headingFont: "serif", headingFontLatin: "classic" },
  grotesk: { headingFont: "sans", headingFontLatin: "geometric" },
  "mono-accent": { headingFont: "sans", headingFontLatin: "mono" },
  "quiet-sans": { headingFont: "sans", headingFontLatin: "sans" },
};

/**
 * Applies an art direction to a page: fonts only where the author chose none, CSS tokens for
 * space, pictures, signature and accent, and motions from the existing library on elements
 * that have none, in sections that are not locked, when compatible. Nothing else changes.
 */
export function applyArt(page: PageSpec, art: ArtDirection | undefined): PageSpec {
  const { artDirection: _old, ...rest } = page;
  if (!art) return rest;
  const own = page.brand ?? { colors: [] };
  const fonts = Object.fromEntries(Object.entries(typeFonts[art.typeSystem]).filter(([k]) => own[k as keyof Brand] === undefined));
  const brand = Object.keys(fonts).length ? { ...own, ...fonts } as Brand : page.brand;
  const add = (n: PageNode, id: MotionId | null | undefined): PageNode => {
    if (!id || n.effects.length || targetReason(n, id) || combinationReason([{ presetId: id }])) return n;
    try { return { ...n, effects: [createMotion(id, n.id)] }; } catch { return n; }
  };
  const walk = (n: PageNode, inHero: boolean, locked: boolean): PageNode => {
    let m = n;
    if (!locked) {
      if (n.type === "heading" && inHero && n.level === 1) m = add(n, art.motion.hero);
      else if (n.type === "heading") m = add(n, art.motion.headings);
      else if (n.type === "button") m = add(n, art.motion.actions);
      else if (n.type === "image") m = add(n, art.motion.images);
    }
    return m.children ? { ...m, children: m.children.map((c) => walk(c, inHero, locked)) } : m;
  };
  const sections = (list: PageNode[]) => list.map((s) => walk(s, s.role === "hero", !!s.lock));
  return {
    ...rest,
    artDirection: art,
    ...(brand ? { brand } : {}),
    sections: sections(page.sections),
    ...(page.subpages ? { subpages: page.subpages.map((p) => ({ ...p, sections: sections(p.sections) })) } : {}),
  };
}
