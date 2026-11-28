import { configFromEnv } from "./config";
import { createGenerationServer } from "./api";
import { openAIProvider } from "./provider";
import { authConfigFrom } from "./auth";
import { captureWithPlaywright } from "./inspirationCapture";
const config = configFromEnv(process.env);
const server = createGenerationServer({
  provider: config.enabled
    ? openAIProvider(config.apiKey!, config.model)
    : undefined,
  inputRate: config.enabled ? config.inputRate : undefined,
  outputRate: config.enabled ? config.outputRate : undefined,
  cachedInputRate: config.enabled ? config.cachedInputRate : undefined,
  maxCalls: config.maxCalls,
  // Web inspiration screenshots (free; robots.txt respected). web_search calls: US$10 per 1,000.
  capture: config.enabled ? (url) => captureWithPlaywright(url) : undefined,
  searchCallUsd: 0.01,
  budgetUsd: config.budgetUsd,
  // Sign-in: SESSION_SECRET (≥32 chars) plus GOOGLE_CLIENT_ID and/or GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET.
  auth: authConfigFrom({ PUBLIC_ORIGIN: "http://127.0.0.1:5173", ...process.env }),
  onUsage: (usage) =>
    console.info(
      JSON.stringify({ event: "generation_usage", model: config.model, ...usage }),
    ),
});
server.listen(8787, "127.0.0.1", () =>
  console.info("Sketch2Site generation API listening on loopback:8787"),
);
