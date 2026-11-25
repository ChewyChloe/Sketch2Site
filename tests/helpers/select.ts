import type { Locator } from "@playwright/test";
/** Picks an option in the app's own dropdown (Select.tsx): by value, by its text ({ label }) or by position ({ index }). */
export async function choose(combobox: Locator, value: string | { label: string } | { index: number }) {
  await combobox.click();
  const list = combobox.page().locator(".ui-select-list");
  const option = typeof value === "string" ? list.locator(`[role="option"][data-value="${value}"]`) : "label" in value ? list.getByRole("option", { name: value.label }) : list.getByRole("option").nth(value.index);
  await option.click();
}
