import { configFromEnv } from "./config";
import { createGenerationServer } from "./api";
import { openAIProvider } from "./provider";
const config = configFromEnv(process.env);
const server = createGenerationServer({
  provider: config.enabled
    ? openAIProvider(config.apiKey!, config.model)
    : undefined,
  inputRate: config.enabled ? config.inputRate : undefined,
  outputRate: config.enabled ? config.outputRate : undefined,
  onUsage: (usage) =>
    console.info(JSON.stringify({ event: "generation_usage", ...usage })),
});
server.listen(8787, "127.0.0.1", () =>
  console.info("Sketch2Site generation API listening on loopback:8787"),
);
