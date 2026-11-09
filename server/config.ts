// Candidate only: SDK recognition does not establish API access or feature support.
export const defaultModel = "gpt-6-luna";
export const candidateModels = [defaultModel, "gpt-6.1-sol"] as const;
export function configFromEnv(env: NodeJS.ProcessEnv) {
  const inputRate = Number(env.SKETCH_AI_INPUT_USD_PER_MILLION),
    outputRate = Number(env.SKETCH_AI_OUTPUT_USD_PER_MILLION);
  const model = env.SKETCH_AI_MODEL ?? defaultModel;
  const apiKey = env.SKETCH_AI_API_KEY || env.OPENAI_API_KEY;
  const cachedInputRate = Number(env.SKETCH_AI_CACHED_INPUT_USD_PER_MILLION);
  const maxCalls = Number(env.SKETCH_AI_MAX_CALLS ?? 1);
  const budgetUsd = Number(env.SKETCH_AI_BUDGET_USD);
  const reviewed =
    env.SKETCH_AI_PRICING_REVIEWED === "true" &&
    inputRate > 0 &&
    inputRate <= 2 &&
    outputRate > 0 &&
    outputRate <= 8 &&
    env.SKETCH_AI_CACHED_INPUT_USD_PER_MILLION?.trim() !== "" &&
    env.SKETCH_AI_CACHED_INPUT_USD_PER_MILLION !== undefined &&
    Number.isFinite(cachedInputRate) &&
    cachedInputRate >= 0 &&
    cachedInputRate <= inputRate;
  return {
    apiKey,
    model,
    inputRate,
    outputRate,
    cachedInputRate,
    maxCalls,
    budgetUsd,
    enabled:
      env.SKETCH_AI_ENABLED === "true" &&
      Boolean(apiKey) &&
      reviewed &&
      env.SKETCH_AI_MODEL_REVIEWED === "true" &&
      Number.isInteger(maxCalls) &&
      maxCalls >= 1 &&
      maxCalls <= 5 &&
      budgetUsd > 0 &&
      budgetUsd <= 0.25 &&
      candidateModels.some((candidate) => candidate === model),
  };
}
