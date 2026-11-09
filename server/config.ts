export const defaultModel = "gpt-4.1-mini-2025-04-14";
export function configFromEnv(env: NodeJS.ProcessEnv) {
  const inputRate = Number(env.SKETCH_AI_INPUT_USD_PER_MILLION),
    outputRate = Number(env.SKETCH_AI_OUTPUT_USD_PER_MILLION);
  const model = env.SKETCH_AI_MODEL ?? defaultModel;
  const apiKey = env.SKETCH_AI_API_KEY || env.OPENAI_API_KEY;
  const reviewed =
    env.SKETCH_AI_PRICING_REVIEWED === "true" &&
    inputRate > 0 &&
    inputRate <= 2 &&
    outputRate > 0 &&
    outputRate <= 8;
  return {
    apiKey,
    model,
    inputRate,
    outputRate,
    enabled:
      env.SKETCH_AI_ENABLED === "true" &&
      Boolean(apiKey) &&
      reviewed &&
      [defaultModel, "gpt-4.1-mini"].includes(model),
  };
}
