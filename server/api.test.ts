import { afterEach, it, expect, vi } from "vitest";
import { createGenerationServer } from "./api";
import {
  generationFixtures,
  mockProvider,
  mockLayout,
  mockRefine,
} from "../tests/fixtures/generation";
import { GenerationError } from "../src/generation";
import { configFromEnv, defaultModel } from "./config";
import { openAIProvider, ProviderFailure } from "./provider";
import { prepareIntent } from "../src/generation";
const servers: ReturnType<typeof createGenerationServer>[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise<void>((resolve) => {
          s.closeAllConnections();
          s.close(() => resolve());
        }),
    ),
  );
});
async function setup(
  options: Parameters<typeof createGenerationServer>[0] = {
    provider: mockProvider,
    testMode: true,
    inputRate: 0.4,
    outputRate: 1.6,
  },
) {
  const server = createGenerationServer(options);
  servers.push(server);
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  const port = (server.address() as { port: number }).port,
    base = "http://127.0.0.1:" + port;
  const status = await fetch(base + "/api/generation/status");
  const info = await status.json();
  const headers = {
    Origin: "http://127.0.0.1:5173",
    "Content-Type": "application/json",
    Cookie: status.headers.get("set-cookie")!.split(";")[0],
    "X-Sketch-CSRF": info.csrfToken,
  };
  const post = (body: unknown, extra: Record<string, string> = {}) =>
    fetch(base + "/api/generation", {
      method: "POST",
      headers: { ...headers, ...extra },
      body: JSON.stringify(body),
    });
  return { base, info, post };
}
const request = () => ({
  requestId: crypto.randomUUID(),
  canvasSpec: generationFixtures()[0],
});
it("runs the complete actual HTTP pipeline with only an injected Mock Provider", async () => {
  const calls = vi.fn(mockProvider.generate),
    api = await setup({
      provider: { generate: calls },
      testMode: true,
      inputRate: 0.4,
      outputRate: 1.6,
    });
  const body = request(),
    response = await api.post(body),
    data = await response.json();
  expect(response.status).toBe(200);
  expect(data.mode).toBe("mock");
  expect(data.page.schemaVersion).toBe(2);
  expect(data.requestId).toBe(body.requestId);
  expect(calls).toHaveBeenCalledTimes(1);
  expect(data.usage.estimatedCostUsd).toBeGreaterThan(0);
  const duplicate = await api.post(body);
  expect(duplicate.status).toBe(409);
  expect(calls).toHaveBeenCalledTimes(1);
});
it("missing key/config is safe and never instantiates a paid call", async () => {
  expect(configFromEnv({}).enabled).toBe(false);
  expect(
    configFromEnv({ SKETCH_AI_ENABLED: "true", SKETCH_AI_API_KEY: "test-only" })
      .enabled,
  ).toBe(false);
  const api = await setup({});
  expect(api.info.configured).toBe(false);
  expect((await (await api.post(request())).json()).code).toBe(
    "NOT_CONFIGURED",
  );
});
it("enforces origin, CSRF, content-type, size and schema on the backend", async () => {
  const api = await setup();
  for (const headers of [
    { Origin: "https://evil.example" },
    { "X-Sketch-CSRF": "wrong" },
    { "X-Sketch-CSRF": "é".repeat(64) },
    { Cookie: "" },
  ] as Record<string, string>[])
    expect((await api.post(request(), headers)).status).toBe(403);
  expect(
    (await api.post(request(), { "Content-Type": "text/plain" })).status,
  ).toBe(413);
  expect(
    (await api.post({ ...request(), padding: "x".repeat(33000) })).status,
  ).toBe(400);
  // The size limit leaves room for a small draft drawing, and no more.
  expect(
    (await api.post({ ...request(), padding: "x".repeat(160000) })).status,
  ).toBe(413);
  expect(
    (await api.post({ ...request(), canvasSpec: { script: "eval" } })).status,
  ).toBe(400);
});
it("applies concurrency and timeout limits even if a provider ignores cancellation", async () => {
  let release!: (v: Awaited<ReturnType<typeof mockProvider.generate>>) => void;
  const api = await setup({
    provider: {
      generate: () =>
        new Promise((res) => {
          release = res;
        }),
    },
    timeoutMs: 30,
    inputRate: 0.4,
    outputRate: 1.6,
  });
  const first = api.post(request());
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  expect((await (await api.post(request())).json()).code).toBe("BUSY");
  expect((await (await first).json()).code).toBe("TIMEOUT");
  expect((await (await api.post(request())).json()).code).toBe("BUSY");
  release({ layout: {}, inputTokens: 0, outputTokens: 0 });
});
it("reserves process call/budget limits without retries or private draft logs", async () => {
  const log = vi.fn(),
    call = vi.fn(mockProvider.generate);
  const api = await setup({
    provider: { generate: call },
    maxCalls: 1,
    inputRate: 0.4,
    outputRate: 1.6,
    onUsage: log,
  });
  await api.post(request());
  expect((await (await api.post(request())).json()).code).toBe("LIMIT");
  expect(call).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(log.mock.calls)).not.toContain("林的作品集");
  const noBudget = await setup({ provider: mockProvider, budgetUsd: 0 });
  expect((await (await noBudget.post(request())).json()).code).toBe("LIMIT");
});
it.each(["REFUSED", "INCOMPLETE", "INVALID_OUTPUT"] as const)(
  "handles %s without exposing upstream errors or accepting bad output",
  async (code) => {
    const api = await setup({
      provider: {
        async generate() {
          if (code === "INVALID_OUTPUT")
            return {
              layout: { script: "evil" },
              inputTokens: 1,
              outputTokens: 1,
            };
          throw new GenerationError(code);
        },
      },
      inputRate: 0.4,
      outputRate: 1.6,
    });
    const result = await (await api.post(request())).json();
    expect(result).toEqual({ code });
    expect(result.page).toBeUndefined();
  },
);
it("OpenAI official SDK adapter uses strict output, no tools, no retry, store:false; fake transport only", async () => {
  const canvas = generationFixtures()[0],
    intent = prepareIntent(canvas),
    calls: Record<string, unknown>[] = [];
  const provider = openAIProvider(
    "synthetic-server-key",
    defaultModel,
    async (_input, init) => {
      expect(String(_input)).toBe("https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      return new Response(
        JSON.stringify({
          id: "resp_test",
          object: "response",
          status: "completed",
          output: [
            {
              type: "message",
              id: "msg_test",
              role: "assistant",
              status: "completed",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(mockRefine(intent)),
                  annotations: [],
                },
              ],
            },
          ],
          usage: { input_tokens: 500, output_tokens: 600, total_tokens: 1100,
            input_tokens_details: { cached_tokens: 100 },
            output_tokens_details: { reasoning_tokens: 50 } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  );
  const result = await provider.generate(intent, new AbortController().signal);
  // The model's refinement is applied to the local plan by trusted code.
  expect(result.layout).toMatchObject({ version: 2, theme: "ocean" });
  expect(result.cachedInputTokens).toBe(100);
  expect(result.reasoningTokens).toBe(50);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ model: "gpt-6-luna", store: false, max_output_tokens: 4096 });
  expect(calls[0].reasoning).toEqual({ effort: "low" });
  expect(calls[0].tools).toEqual([]);
  expect(calls[0].service_tier).toBe("default");
  expect(calls[0].tool_choice).toBe("none");
  expect(calls[0].prompt_cache_options).toEqual({mode:"implicit",ttl:"30m"});
  expect(JSON.stringify(calls[0])).not.toContain("synthetic-server-key");
  expect(calls[0].text).toMatchObject({
    format: { type: "json_schema", strict: true },
  });
});
it("requires explicit price review, keeps model configuration server-side, and enforces minute limits", async () => {
  const env = {
    SKETCH_AI_ENABLED: "true",
    SKETCH_AI_API_KEY: "synthetic-key",
    SKETCH_AI_PRICING_REVIEWED: "true",
    SKETCH_AI_INPUT_USD_PER_MILLION: ".4",
    SKETCH_AI_OUTPUT_USD_PER_MILLION: "1.6",
    SKETCH_AI_CACHED_INPUT_USD_PER_MILLION: ".1",
    SKETCH_AI_MODEL_REVIEWED: "true",
    SKETCH_AI_MAX_CALLS: "1",
    SKETCH_AI_BUDGET_USD: ".1",
  };
  expect(configFromEnv(env).enabled).toBe(true);
  expect(
    configFromEnv({ ...env, SKETCH_AI_MODEL: "expensive-model" }).enabled,
  ).toBe(false);
  for (const change of [
    { SKETCH_AI_MODEL: "gpt-4.1-mini-2025-04-14" },
    { SKETCH_AI_MODEL_REVIEWED: "false" },
    { SKETCH_AI_MAX_CALLS: "6" },
    { SKETCH_AI_MAX_CALLS: "1.5" },
    { SKETCH_AI_MAX_CALLS: "0" },
    { SKETCH_AI_BUDGET_USD: "" },
    { SKETCH_AI_BUDGET_USD: ".26" },
    { SKETCH_AI_BUDGET_USD: "Infinity" },
    { SKETCH_AI_INPUT_USD_PER_MILLION: "NaN" },
    { SKETCH_AI_CACHED_INPUT_USD_PER_MILLION: "" },
    { SKETCH_AI_CACHED_INPUT_USD_PER_MILLION: "1" },
  ]) expect(configFromEnv({ ...env, ...change }).enabled).toBe(false);
  expect(configFromEnv({ ...env, SKETCH_AI_MODEL: "gpt-6.1-sol" }).enabled).toBe(false);
  expect(configFromEnv({ ...env, SKETCH_AI_MAX_CALLS: undefined }).maxCalls).toBe(1);
  expect(
    configFromEnv({ ...env, SKETCH_AI_PRICING_REVIEWED: "false" }).enabled,
  ).toBe(false);
  const api = await setup({
    provider: mockProvider,
    maxPerMinute: 1,
    inputRate: 0.4,
    outputRate: 1.6,
  });
  await api.post(request());
  expect((await (await api.post(request())).json()).code).toBe("LIMIT");
});
it("sanitizes arbitrary upstream errors instead of reflecting private paths or keys", async () => {
  const api = await setup({
    provider: {
      async generate() {
        throw Error("synthetic-key /private/service/config");
      },
    },
    inputRate: 0.4,
    outputRate: 1.6,
  });
  expect(await (await api.post(request())).json()).toEqual({
    code: "UNAVAILABLE",
  });
});
it("accounts cached/reasoning tokens without double billing output, including failed validation/refusal", async () => {
  const usage = { inputTokens: 500, outputTokens: 600, cachedInputTokens: 100, reasoningTokens: 50 };
  for (const outcome of ["PASS", "INVALID_OUTPUT", "REFUSED"] as const) {
    const log = vi.fn();
    const api = await setup({
      inputRate: .4, cachedInputRate: .1, outputRate: 1.6, onUsage: log,
      provider: { async generate(intent) {
        if (outcome === "REFUSED") throw new ProviderFailure("REFUSED", usage);
        return { ...usage, layout: outcome === "PASS" ? mockLayout(intent) : {} };
      } },
    });
    const res = await api.post(request());
    expect(res.status).toBe(outcome === "PASS" ? 200 : 502);
    const entry = log.mock.calls[0][0];
    expect(entry).toMatchObject({ ...usage, outcome });
    expect(entry.estimatedCostUsd).toBeCloseTo((400 * .4 + 100 * .1 + 600 * 1.6) / 1e6);
    expect(JSON.stringify(entry)).not.toContain("林的作品集");
  }
});
it("rejects invalid usage and records unavailable usage as null on transport failure", async () => {
  const invalid = await setup({ provider: { async generate(intent) {
    return { layout: mockLayout(intent), inputTokens: 1, outputTokens: 1, cachedInputTokens: 2 };
  } }, inputRate: .4, outputRate: 1.6 });
  expect(await (await invalid.post(request())).json()).toEqual({ code: "INVALID_OUTPUT" });
  const log = vi.fn();
  const failed = await setup({ provider: { async generate() { throw Error("private"); } },
    inputRate: .4, outputRate: 1.6, onUsage: log });
  await failed.post(request());
  expect(log.mock.calls[0][0]).toMatchObject({ inputTokens: null, cachedInputTokens: null, estimatedCostUsd: null });
});
it.each(["refusal", "incomplete", "rate-limit"] as const)(
  "official SDK adapter handles %s with one fake fetch and zero retries",
  async (variant) => {
    let calls = 0;
    const provider = openAIProvider(
      "synthetic-key",
      defaultModel,
      async () => {
        calls++;
        if (variant === "rate-limit")
          return new Response(
            JSON.stringify({
              error: {
                message: "synthetic upstream failure",
                type: "rate_limit_error",
              },
            }),
            { status: 429, headers: { "content-type": "application/json" } },
          );
        return new Response(
          JSON.stringify({
            id: "resp_test",
            object: "response",
            status: variant === "incomplete" ? "incomplete" : "completed",
            output:
              variant === "refusal"
                ? [
                    {
                      type: "message",
                      id: "msg_test",
                      role: "assistant",
                      content: [{ type: "refusal", refusal: "declined" }],
                    },
                  ]
                : [],
            usage: { input_tokens: 5, output_tokens: 5 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );
    const pending = provider.generate(
        prepareIntent(generationFixtures()[0]),
        new AbortController().signal,
      );
    if (variant === "rate-limit") await expect(pending).rejects.toBeTruthy();
    else await expect(pending).rejects.toMatchObject({
      code: variant === "refusal" ? "REFUSED" : "INCOMPLETE",
      usage: { inputTokens: 5, outputTokens: 5, cachedInputTokens: null },
    });
    expect(calls).toBe(1);
  },
);

// Final preflight: fake transport only; no network or live API key.
it.each([429,500,503])("OpenAI provider never retries HTTP %s",async status=>{
 let requests=0;
 const provider=openAIProvider("SKETCH2SITE_RETRY_TEST_CANARY",defaultModel,async()=>{
  requests++;
  return new Response(JSON.stringify({error:{message:"synthetic upstream failure",type:"server_error"}}),{status,headers:{"content-type":"application/json"}});
 });
 await expect(provider.generate(prepareIntent(generationFixtures()[0]),new AbortController().signal)).rejects.toBeDefined();
 expect(requests).toBe(1);
});
