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
export const motionStyleFor = (spec: CanvasSpec): MotionStyle => (calmMoods.has(spec.metadata.brief?.mood ?? "") ? "calm" : "lively");

function pick(slot: Slot, node: CanvasNode, style: MotionStyle): MotionId[] {
  const lively = style === "lively";
  const { role, kind } = slot;
  if (kind === "title") return [lively ? "letter-assembly" : "split-line-assembly"];
  if (kind === "heading") {
    if (role === "cta") return [lively ? "gradient-text-flow" : "slide-up"];
    return [lively ? "hand-drawn-highlight" : "slide-up"];
  }
  if (kind === "text") {
    if (numericContent(node.content)) return ["count-up"];
    return [lively ? (role === "hero" ? "slide-up" : "blur-in") : "fade-in"];
  }
  if (kind === "button") {
    if (role === "cta") return [lively ? "breathing-glow" : "press-feedback"];
    if (role === "contact") return [lively ? "confetti-burst" : "press-feedback"];
    return [lively ? (role === "hero" ? "shine-sweep" : "jelly-press") : "press-feedback"];
  }
  if (kind === "card") {
    if (role === "faq") return ["disclosure-panel"];
    if (role === "pricing") return slot.index === 1 && slot.count === 3 && lively ? ["border-light-trace"] : ["hover-lift"];
    return [lively ? "perspective-tilt" : "hover-lift"];
  }
  if (kind === "image") {
    if (role === "hero") return [lively ? "circular-mask-expansion" : "image-reveal"];
    return [lively ? "venetian-reveal" : "image-reveal"];
  }
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
