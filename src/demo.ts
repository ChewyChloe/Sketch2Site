import {
  materialize,
  prepareIntent,
  type GenerationResponse,
  type Layout,
} from "./generation";
import type { CanvasSpec } from "./spec";
export type CandidateResult = Omit<GenerationResponse, "mode"> & {
  mode: GenerationResponse["mode"] | "demo";
};
// Explicit local demonstration only. Never a fallback for a failed AI request.
export function createDemoCandidate(canvas: CanvasSpec): CandidateResult {
  const start = performance.now();
  const intent = prepareIntent(canvas);
  // A heading above body copy should not become a narrow peer column merely
  // because their y coordinates are within the same loose candidate group.
  const groups = intent.candidateGroups.flatMap((group) => {
    const headings = group.filter(
      (id) => canvas.nodes.find((n) => n.id === id)!.type === "heading",
    );
    const rest = group.filter((id) => !headings.includes(id));
    return [...headings.map((id) => [id]), ...(rest.length ? [rest] : [])];
  });
  const layout: Layout = {
    version: 1,
    typography: canvas.constraints.includes("typography:serif")
      ? "serif"
      : "sans",
    theme: "neutral",
    sections: groups.map((group) => {
      const grid =
        canvas.constraints.includes("layout:grid") ||
        (!canvas.constraints.includes("layout:stack") && group.length > 1);
      return {
        layout: grid ? "grid" : "stack",
        columns: grid ? (Math.min(group.length, 3) as 1 | 2 | 3) : 1,
        gap: "large",
        items: group.map((id) => {
          const node = canvas.nodes.find((n) => n.id === id)!;
          return {
            sourceId: id,
            presentation: node.type === "text" ? "paragraph" : node.type,
            headingLevel: 1,
            width: node.type === "image" ? "narrow" : "full",
            align: "start",
            tone: node.type === "card" ? "soft" : "plain",
          };
        }),
      };
    }),
  };
  const page = materialize(canvas, layout);
  return {
    requestId: crypto.randomUUID(),
    page,
    mode: "demo",
    // No model was invoked. These are zeros, not simulated usage estimates.
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      latencyMs: performance.now() - start,
      estimatedCostUsd: 0,
    },
  };
}
