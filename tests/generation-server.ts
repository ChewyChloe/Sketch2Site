import { createGenerationServer } from "../server/api";
import { mockProvider } from "./fixtures/generation";
// This executable is ONLY started by Playwright. Production index.ts cannot select Mock mode.
createGenerationServer({
  provider: mockProvider,
  testMode: true,
  inputRate: 0.4,
  outputRate: 1.6,
  maxCalls: 1000,
  maxPerMinute: 1000,
  budgetUsd: 100,
}).listen(8788, "127.0.0.1");
