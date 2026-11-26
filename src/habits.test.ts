// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { deleteHabit, maxHabits, readHabits, saveHabit } from "./habits";

const d = { name: "暗場", why: "我存下來的風格", concept: "darkroom" as const, theme: "midnight" as const, composition: "tidy" as const };
beforeEach(() => localStorage.clear());
it("saves, replaces by name, caps the list and deletes", () => {
  expect(readHabits()).toEqual([]);
  const a = saveHabit({ name: "社團暗場", direction: d, variant: { primary: "#e8c547", headingFont: "serif" }, variantLabel: "襯線標題", ask: { lightness: ["dark"] } })!;
  expect(readHabits()[0]).toMatchObject({ name: "社團暗場", variantLabel: "襯線標題", ask: { lightness: ["dark"] } });
  saveHabit({ name: "社團暗場", direction: d, variant: {}, variantLabel: "原本" });
  expect(readHabits()).toHaveLength(1);
  expect(readHabits()[0].variantLabel).toBe("原本");
  for (let i = 0; i < 12; i++) saveHabit({ name: "風格" + i, direction: d, variant: {}, variantLabel: "原本" });
  expect(readHabits()).toHaveLength(maxHabits);
  deleteHabit(readHabits()[0].id);
  expect(readHabits()).toHaveLength(maxHabits - 1);
  expect(a.id).toMatch(/-/);
});
it("refuses bad data and survives a broken store", () => {
  expect(saveHabit({ name: "", direction: d, variant: {}, variantLabel: "原本" })).toBeNull();
  expect(saveHabit({ name: "x", direction: d, variant: { primary: "red" } as never, variantLabel: "原本" })).toBeNull();
  localStorage.setItem("sketch2site.habits.v1", "{not json");
  expect(readHabits()).toEqual([]);
  localStorage.setItem("sketch2site.habits.v1", JSON.stringify([{ name: "<script>" }]));
  expect(readHabits()).toEqual([]);
});
