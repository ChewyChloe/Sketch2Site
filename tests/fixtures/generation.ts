export { generationFixtures } from "../../src/demoFixtures";
import type { Layout } from "../../src/generation";
import type { Intent, LayoutProvider } from "../../server/provider";
// Test-only planner, never imported by the production API. It is not evidence of AI quality.
export function mockLayout(intent: Intent): Layout {
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
};
