import {
  materialize,
  prepareIntent,
  type GenerationResponse,
  type Layout,
} from "./generation";
import type { CanvasSpec } from "./spec";
import { smartLayout } from "./smartLayout";
export type CandidateResult = Omit<GenerationResponse, "mode"> & {
  mode: GenerationResponse["mode"] | "demo";
};
// Explicit local demonstration only. Never a fallback for a failed AI request.
export function createDemoCandidate(canvas: CanvasSpec): CandidateResult {
  const start = performance.now();
  const intent = prepareIntent(canvas);
  const layout: Layout = smartLayout(intent.canvas);
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
