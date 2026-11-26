import { cleanDirections, DirectionSchema } from "./directions";
import { toJSONSchema, z } from "zod";
import type { CanvasSpec } from "./spec";
import { conceptIds, sectionRoles, themeIds } from "./pageSpec";
import { LayoutV2Schema, type LayoutV2 } from "./generation";
import { smartLayout } from "./smartLayout";

// Outline-based AI: instead of sending the whole draft, the local planner lays the
// page out first and the model only sees a short outline (one line per section).
// It answers with a small refinement (theme, order, per-section role / layout /
// tone), which trusted code checks and applies to the local plan. The request
// stays small however large the draft is, and the model never handles page text.

export const RefineSchema = z
  .object({
    theme: z.enum(themeIds),
    // One design concept the whole site follows (docs/REFERENCE_STUDY.md), or none.
    concept: z.enum([...conceptIds, "none"]),
    // Three clearly different directions for the author to compare (docs/WORKFLOW_STUDY.md).
    directions: z.array(DirectionSchema).length(3),
    nav: z.boolean(),
    // Kept for compatibility; trusted code keeps the author's section order and ignores it.
    order: z.array(z.number().int().min(0).max(19)).max(20),
    sections: z
      .array(
        z
          .object({
            i: z.number().int().min(0).max(19),
            role: z.enum(sectionRoles),
            layout: z.enum(["stack", "grid"]),
            columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            tone: z.enum(["plain", "soft"]),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
export type Refine = z.infer<typeof RefineSchema>;
export const refineJSONSchema = toJSONSchema(RefineSchema, { target: "draft-7" });

const preview = (s: string, n = 24) => (s.length > n ? s.slice(0, n) + "…" : s);

/** One short line of facts per planned section (no full text, no ids, no positions). */
export function outlineOf(canvas: CanvasSpec, plan: LayoutV2 = smartLayout(canvas)) {
  const byId = new Map(canvas.nodes.map((n) => [n.id, n]));
  return {
    name: preview(canvas.metadata.name, 40),
    ...(canvas.metadata.brief ? { brief: canvas.metadata.brief } : {}),
    constraints: canvas.constraints,
    sections: plan.sections.map((s, i) => {
      const all = [...s.intro, ...s.items, ...s.outro, ...s.aside].map((it) => byId.get(it.sourceId)).filter(Boolean) as CanvasSpec["nodes"];
      const counts: Record<string, number> = {};
      for (const n of all) counts[n.type] = (counts[n.type] ?? 0) + 1;
      const heading = all.find((n) => n.type === "heading");
      const prices = all.filter((n) => n.type === "card" && /\d/.test(n.content)).length;
      const questions = all.filter((n) => n.type === "card" && /[?？]/.test(n.content.split("\n")[0])).length;
      return {
        i,
        role: s.role,
        heading: heading ? preview(heading.content) : "",
        // First line of up to three cards, so the model knows what the section is about.
        ...(all.some((n) => n.type === "card") ? { cards: all.filter((n) => n.type === "card").slice(0, 3).map((n) => preview(n.content.split("\n")[0], 12)) } : {}),
        counts,
        ...(prices ? { cardsWithNumbers: prices } : {}),
        ...(questions ? { questionCards: questions } : {}),
        layout: s.layout,
        columns: s.columns,
        effects: [...new Set(all.flatMap((n) => n.effects.map((e) => e.presetId)))].slice(0, 6),
      };
    }),
  };
}

/** Applies a checked refinement to the local plan; anything that does not fit is ignored. */
export function applyRefine(plan: LayoutV2, refine: Refine): LayoutV2 {
  const sections = plan.sections.map((s) => ({ ...s }));
  for (const r of refine.sections) {
    const s = sections[r.i];
    if (!s) continue;
    // Hero stays the opening section; other roles may be renamed (affects styling only).
    if (r.role !== "hero" && s.role !== "hero") s.role = r.role;
    s.tone = s.role === "hero" ? s.tone : r.tone;
    // A grid needs repeated items; FAQs and contact forms always read as a list (paid test finding).
    if (r.layout === "grid" && s.items.length >= 2 && s.role !== "faq" && s.role !== "contact") {
      s.layout = "grid";
      s.columns = Math.min(r.columns, s.items.length) as 1 | 2 | 3;
    } else if (r.layout === "stack" || s.role === "faq" || s.role === "contact") {
      s.layout = "stack";
      s.columns = 1;
    }
  }
  // Section order is the author's: the draft's reading order (plus the brief's focus, which the
  // local planner already applied). The model's order is not used (paid test finding).
  const ordered = sections;
  const directions = cleanDirections(refine.directions);
  const next = { ...plan, theme: refine.theme, nav: refine.nav, sections: ordered, ...(refine.concept && refine.concept !== "none" ? { concept: refine.concept } : {}), ...(directions ? { directions } : {}) };
  const parsed = LayoutV2Schema.safeParse(next);
  return parsed.success ? (parsed.data as LayoutV2) : plan;
}
