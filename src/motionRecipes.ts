import { CanvasSchema, type CanvasNode, type CanvasSpec } from "./spec";
import { combinationReason, createMotion, numericContent, targetReason, withinMotionBudget, type MotionInstance } from "./motion";
import { defaultControls, type MotionId } from "./motionCatalog";
import { smartLayout, suggestTheme } from "./smartLayout";
import { moodThemes } from "./brief";
import type { SectionRole } from "./pageSpec";

// Motion recipes: pick fitting presets from the motion library for each draft
// element, based on the section it will become. Only elements without motion are
// touched, every pick goes through the same target / combination / budget checks
// as a manual pick, and the result is still a normal, editable draft.

export type MotionStyle = "lively" | "calm";
type Slot = { role: SectionRole; kind: "title" | "heading" | "text" | "button" | "card" | "image" | "form"; index: number; count: number };

const calmMoods = new Set(["簡約", "專業"]);
export const motionStyleFor = (spec: CanvasSpec): MotionStyle =>
  calmMoods.has(spec.metadata.brief?.mood ?? "") || (spec.metadata.brief?.style && spec.metadata.brief.style.motion !== "lively") ? "calm" : "lively";

// Motion supports the content and stays quiet (docs/SITE_AESTHETICS.md): one gentle entrance per
// element, small press feedback on buttons. "lively" adds a little more movement, never spectacle.
function pick(slot: Slot, node: CanvasNode, style: MotionStyle): MotionId[] {
  const lively = style === "lively";
  const { role, kind } = slot;
  if (kind === "title") return [lively ? "split-line-assembly" : "slide-up"];
  if (kind === "heading") return [lively && role !== "cta" ? "slide-up" : "fade-in"];
  if (kind === "text") {
    // A © year is not a statistic to count up.
    if (numericContent(node.content) && !/^\s*(©|Copyright|版權)/i.test(node.content)) return ["count-up"];
    return ["fade-in"];
  }
  if (kind === "button") return ["press-feedback"];
  if (kind === "card") {
    if (role === "faq") return ["disclosure-panel"];
    return [lively ? "stagger-reveal" : "fade-in"];
  }
  if (kind === "image") return [lively && role === "hero" ? "cinematic-image-pan" : "image-reveal"];
  return ["fade-in"];
}

function slots(spec: CanvasSpec): Map<string, Slot> {
  const out = new Map<string, Slot>();
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  for (const section of smartLayout(spec).sections) {
    const all = [...section.intro, ...section.items, ...section.outro, ...section.aside];
    const cards = all.filter((i) => byId.get(i.sourceId)?.type === "card");
    for (const item of all) {
      const node = byId.get(item.sourceId);
      if (!node) continue;
      const kind: Slot["kind"] =
        node.type === "heading" || item.presentation === "heading"
          ? section.role === "hero" && item.headingLevel === 1 ? "title" : "heading"
          : node.type === "text" ? "text" : node.type === "media" ? "image" : node.type;
      out.set(node.id, { role: section.role, kind, index: cards.indexOf(item), count: cards.length });
    }
  }
  return out;
}

// The highlighter palette is fixed (lime / amber / sky); pick the one that suits the expected theme.
const warmThemes = new Set(["sunrise", "blossom", "forest"]);
function highlightColor(spec: CanvasSpec) {
  const theme = moodThemes[spec.metadata.brief?.mood ?? ""] ?? suggestTheme(spec);
  return warmThemes.has(theme) ? "amber" : "sky";
}

function motionFor(node: CanvasNode, id: MotionId, spec: CanvasSpec): MotionInstance | null {
  if (targetReason(node, id)) return null;
  const controls =
    id === "count-up" ? { ...defaultControls(id), ...numericContent(node.content) }
    : id === "hand-drawn-highlight" ? { ...defaultControls(id), color: highlightColor(spec) }
    : defaultControls(id);
  try {
    return createMotion(id, node.id, controls);
  } catch {
    return null;
  }
}

/**
 * Adds recipe motion to elements that have none (optionally only `onlyIds`).
 * Returns the spec unchanged when nothing fits or the result would not validate.
 */
export function enlivenDraft(spec: CanvasSpec, style: MotionStyle = motionStyleFor(spec), onlyIds?: ReadonlySet<string>): CanvasSpec {
  const plan = slots(spec);
  let budget: MotionInstance[] = spec.nodes.flatMap((n) => n.effects);
  const nodes = spec.nodes.map((node) => {
    if (node.effects.length || (onlyIds && !onlyIds.has(node.id))) return node;
    const slot = plan.get(node.id);
    if (!slot) return node;
    const effects: MotionInstance[] = [];
    for (const id of pick(slot, node, style)) {
      const motion = motionFor(node, id, spec);
      if (!motion || combinationReason([...effects, motion]) || !withinMotionBudget([...budget, ...effects, motion])) continue;
      effects.push(motion);
    }
    if (!effects.length) return node;
    budget = [...budget, ...effects];
    return { ...node, effects };
  });
  const next = CanvasSchema.safeParse({ ...spec, nodes });
  return next.success ? next.data : spec;
}

/** Removes every motion from the draft (or from `onlyIds`). */
export function stillDraft(spec: CanvasSpec, onlyIds?: ReadonlySet<string>): CanvasSpec {
  return { ...spec, nodes: spec.nodes.map((n) => (onlyIds && !onlyIds.has(n.id) ? n : n.effects.length ? { ...n, effects: [] } : n)) };
}
