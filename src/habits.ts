import { z } from "zod";
import { AskSchema, DirectionSchema } from "./directions";
import { BrandSchema } from "./pageSpec";

// 我的風格: a look the author liked, kept like a reusable habit. Offered next time, never applied
// on its own. Stored only in this browser (shared by all projects), never uploaded.
export const HabitSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(12),
    direction: DirectionSchema,
    variant: BrandSchema.partial().pick({ primary: true, headingFont: true, headingFontLatin: true }).strict(),
    variantLabel: z.string().max(12),
    ask: AskSchema.optional(),
    savedAt: z.number().int(),
  })
  .strict();
export type Habit = z.infer<typeof HabitSchema>;
export const maxHabits = 8;
const key = "sketch2site.habits.v1";

export function readHabits(): Habit[] {
  try {
    const parsed = z.array(HabitSchema).max(maxHabits).safeParse(JSON.parse(localStorage.getItem(key) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
function write(list: Habit[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event("sketch-habits-changed"));
    return true;
  } catch {
    return false;
  }
}
/** Saves a habit (newest first); the oldest drops off past the limit. Same name replaces. */
export function saveHabit(h: Omit<Habit, "id" | "savedAt">): Habit | null {
  const habit = HabitSchema.safeParse({ ...h, id: crypto.randomUUID(), savedAt: Date.now() });
  if (!habit.success) return null;
  const list = [habit.data, ...readHabits().filter((x) => x.name !== habit.data.name)].slice(0, maxHabits);
  return write(list) ? habit.data : null;
}
export function deleteHabit(id: string) {
  return write(readHabits().filter((h) => h.id !== id));
}
