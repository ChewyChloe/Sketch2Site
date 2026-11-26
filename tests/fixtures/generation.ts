import { outlineOf } from "../../src/outline";
export { generationFixtures } from "../../src/demoFixtures";
import type { Layout, LayoutV1 } from "../../src/generation";
import type { Intent, LayoutProvider } from "../../server/provider";
// Test-only planner, never imported by the production API. It is not evidence of AI quality.
export function mockLayout(intent: Intent): LayoutV1 {
  return {
    version: 1,
    typography: intent.canvas.constraints.includes("typography:serif")
      ? "serif"
      : "sans",
    theme: "neutral",
    sections: intent.candidateGroups.map((group) => ({
      layout: group.length > 1 ? "grid" : "stack",
      columns: Math.min(group.length, 3) as 1 | 2 | 3,
      gap: "large",
      items: group.map((id) => {
        const node = intent.canvas.nodes.find((n) => n.id === id)!;
        return {
          sourceId: id,
          presentation: node.type === "text" ? "paragraph" : node.type,
          headingLevel: 1,
          width: node.type === "image" ? "narrow" : "full",
          align: "start",
          tone: node.type === "card" ? "soft" : "plain",
        };
      }),
    })),
  };
}
export const mockProvider: LayoutProvider = {
  async generate(intent) {
    return { layout: mockLayout(intent), inputTokens: 250, outputTokens: 400 };
  },
  // Deterministic stand-in for copy suggestions (test server only).
  async suggestCopy(input) {
    const base = input.text.replace(/\s+/g, " ").slice(0, input.kind === "button" ? 6 : 20);
    return { options: [`${base}（建議一）`, `${base}（建議二）`, `看看 https://evil.example`, base], inputTokens: 120, outputTokens: 60 };
  },
};

/** A valid outline refinement for the real-provider adapter tests (keeps the local plan's order). */
export function mockRefine(intent: { canvas: Parameters<typeof outlineOf>[0] }) {
  const outline = outlineOf(intent.canvas);
  return {
    theme: "ocean",
    concept: "none",
    nav: outline.sections.length >= 3,
    order: outline.sections.map((s) => s.i),
    sections: outline.sections.map((s) => ({ i: s.i, role: s.role, layout: s.layout, columns: s.columns, tone: "soft" })),
  };
}
