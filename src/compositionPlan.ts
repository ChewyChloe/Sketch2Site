// Independent composition for each candidate direction. Colour and concept alone made the three
// candidates look like one layout in three paints; each direction now also carries a geometric
// plan: where the eye lands first, how large the main picture is, and the reading axis. The plan
// is presentation only (one set of constrained CSS rules in compositionPlan.css, shared by the
// editor, the candidates, the site and the React export). Sections whose layout is locked, or
// laid out by hand, keep their own arrangement. Phones fall back to one column in reading order.

export const planIds = ["focus", "headline", "column"] as const;
export type PlanId = (typeof planIds)[number];

export const planText: Record<PlanId, { name: string; idea: string }> = {
  focus: { name: "主圖焦點", idea: "大照片占右邊七成，文字在左邊收窄" },
  headline: { name: "大字導讀", idea: "超大標題先說重點，照片在下面拉滿寬" },
  column: { name: "窄文接寬圖", idea: "窄窄一欄文字，照片從旁邊往下錯開" },
};

/** What each plan does to the opening section, in words a test can check. */
export type Geometry = { focus: "right" | "below" | "offset"; imageScale: number; axis: "left" | "full" | "narrow" };
export const planGeometry: Record<PlanId, Geometry> = {
  focus: { focus: "right", imageScale: 7 / 12, axis: "left" },
  headline: { focus: "below", imageScale: 1, axis: "full" },
  column: { focus: "offset", imageScale: 8 / 12, axis: "narrow" },
};

/** How many of the three axes (focus, main image scale, reading axis) two plans differ in. */
export function geometryDistance(a: PlanId, b: PlanId) {
  const x = planGeometry[a], y = planGeometry[b];
  return (x.focus !== y.focus ? 1 : 0) + (Math.abs(x.imageScale - y.imageScale) >= 0.08 ? 1 : 0) + (x.axis !== y.axis ? 1 : 0);
}

/** Every pair of candidates differs in at least two of the three axes. */
export function distinctEnough(plans: readonly PlanId[]) {
  for (let i = 0; i < plans.length; i++) for (let j = i + 1; j < plans.length; j++) if (geometryDistance(plans[i], plans[j]) < 2) return false;
  return true;
}

/**
 * One plan per direction, all different. A plan the author asked for (or the AI chose) is kept
 * when it can be; the rest are filled in the order that suits the material: with pictures the
 * picture-led plan comes first, without them the type-led one.
 */
export function assignPlans(wanted: readonly (PlanId | undefined)[], pictures: number, reorder: (order: PlanId[]) => PlanId[] = (o) => o): PlanId[] {
  // Learned taste (preferences.ts) may move a plan forward; what was asked for always stays.
  const order: PlanId[] = reorder(pictures > 0 ? ["focus", "headline", "column"] : ["headline", "column", "focus"]);
  const chosen: (PlanId | undefined)[] = [];
  for (const w of wanted) chosen.push(w && !chosen.includes(w) ? w : undefined);
  const used = new Set(chosen.filter((p): p is PlanId => !!p));
  return chosen.map((p) => {
    if (p) return p;
    const next = order.find((o) => !used.has(o)) ?? order[0];
    used.add(next);
    return next;
  });
}
