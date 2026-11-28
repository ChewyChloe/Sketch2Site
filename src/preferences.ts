import { planIds, planText, type PlanId } from "./compositionPlan";

// Personal taste, learned from what the person actually does, kept on this device only.
// - Picking a candidate direction is an explicit choice: +3 for its composition plan.
// - Keeping the Visual Critic's fixes is a weak signal: +1 for calmer reading (narrow measure,
//   alternating backgrounds, more space).
// Undo takes an event back. Each dimension is capped, so one habit never decides everything,
// and an explicit choice made now always wins over what was learned.

export type TasteDimension = `plan:${PlanId}` | "rhythm" | "measure" | "space";
export type TasteEvent = { id: string; dimension: TasteDimension; weight: number; at: string; source: "direction" | "critic" };
const KEY = "sketch2site.taste";
const CAP = 9;

const read = (): TasteEvent[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((e) => e && typeof e.dimension === "string" && typeof e.weight === "number").slice(-200) : [];
  } catch {
    return [];
  }
};
const write = (events: TasteEvent[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(events.slice(-200))); } catch { /* not remembered */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sketch-taste-changed"));
};

export function recordTaste(dimension: TasteDimension, weight: number, source: TasteEvent["source"]): string {
  const id = crypto.randomUUID();
  write([...read(), { id, dimension, weight, at: new Date().toISOString(), source }]);
  return id;
}
/** Undo: the event no longer counts. */
export const forgetTaste = (id: string) => write(read().filter((e) => e.id !== id));
export const resetTaste = () => write([]);
export const tasteEvents = read;

/** Current weight per dimension, each capped at ±CAP. */
export function tasteScores(events: TasteEvent[] = read()): Partial<Record<TasteDimension, number>> {
  const out: Partial<Record<TasteDimension, number>> = {};
  for (const e of events) out[e.dimension] = Math.max(-CAP, Math.min(CAP, (out[e.dimension] ?? 0) + e.weight));
  return out;
}

/** Plans ordered by learned taste (ties keep the material's own order). */
export function preferredPlans(base: readonly PlanId[], scores = tasteScores()): PlanId[] {
  return [...base].sort((a, b) => (scores[`plan:${b}`] ?? 0) - (scores[`plan:${a}`] ?? 0) || base.indexOf(a) - base.indexOf(b));
}

/** In plain words, for the person to see what was learned. */
export function describeTaste(scores = tasteScores()): string[] {
  const lines: string[] = [];
  const plans = planIds.filter((p) => (scores[`plan:${p}`] ?? 0) > 0).sort((a, b) => (scores[`plan:${b}`] ?? 0) - (scores[`plan:${a}`] ?? 0));
  if (plans.length) lines.push("常選的構圖：" + plans.map((p) => planText[p].name).join("、"));
  if ((scores.measure ?? 0) > 0) lines.push("喜歡較窄、好讀的文字欄");
  if ((scores.rhythm ?? 0) > 0) lines.push("喜歡段落底色有變化");
  if ((scores.space ?? 0) > 0) lines.push("喜歡比較寬鬆的間距");
  return lines;
}
