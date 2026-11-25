import { afterEach, expect, it, vi } from "vitest";
import { createGenerationServer } from "./api";
import { mockProvider } from "../tests/fixtures/generation";
import { buildCopyRequest } from "./provider";
import { cleanOptions } from "../src/copySuggest";

const servers: ReturnType<typeof createGenerationServer>[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => { s.closeAllConnections(); s.close(() => r()); })));
});
async function setup(options: Parameters<typeof createGenerationServer>[0]) {
  const server = createGenerationServer(options);
  servers.push(server);
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  const status = await fetch(base + "/api/generation/status");
  const info = await status.json();
  const headers = { Origin: "http://127.0.0.1:5173", "Content-Type": "application/json", Cookie: status.headers.get("set-cookie")!.split(";")[0], "X-Sketch-CSRF": info.csrfToken };
  const post = (body: unknown, extra: Record<string, string> = {}) => fetch(base + "/api/generation/copy", { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  return { post };
}
const body = (text = "每天一杯，剛剛好的手沖咖啡") => ({ requestId: crypto.randomUUID(), kind: "heading", text, purpose: "店家介紹", mood: "溫暖" });

it("returns cleaned suggestions through the guarded route", async () => {
  const { post } = await setup({ provider: mockProvider, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  const r = await post(body());
  expect(r.status).toBe(200);
  const data = await r.json();
  // The link option and the unchanged original are dropped.
  expect(data.options).toEqual(["每天一杯，剛剛好的手沖咖啡（建議一）", "每天一杯，剛剛好的手沖咖啡（建議二）"]);
  expect(data.usage.estimatedCostUsd).toBeGreaterThan(0);
});

it("shares the call limit, rejects bad input, CSRF failures and duplicates", async () => {
  const suggest = vi.fn(mockProvider.suggestCopy!);
  const { post } = await setup({ provider: { ...mockProvider, suggestCopy: suggest }, testMode: true, maxCalls: 1, maxPerMinute: 5 });
  expect((await post({ ...body(), kind: "script" })).status).toBe(400);
  expect((await post({ ...body(), extra: "x" })).status).toBe(400);
  expect((await post(body(), { "X-Sketch-CSRF": "0".repeat(64) })).status).toBe(403);
  const first = body();
  expect((await post(first)).status).toBe(200);
  expect((await post(first)).status).toBe(409);
  expect((await post(body())).status).toBe(429);
  expect(suggest).toHaveBeenCalledTimes(1);
});

it("is not configured without a provider that can suggest copy", async () => {
  const { post } = await setup({ provider: { generate: mockProvider.generate }, testMode: true });
  expect((await post(body())).status).toBe(503);
});

it("builds a small strict request and cleans unsafe options", () => {
  const r = buildCopyRequest({ requestId: crypto.randomUUID(), kind: "button", text: "立即報名" });
  expect(r).toMatchObject({ model: "gpt-6-luna", tools: [], store: false, max_output_tokens: 1024 });
  expect(Buffer.byteLength(JSON.stringify(r))).toBeLessThan(8192);
  expect(cleanOptions("button", "立即報名", ["馬上報名", "<b>報名</b>", "立即報名", "這是一個太長太長太長太長的按鈕文字", "馬上報名", "javascript:alert(1)", "一起\n報名"])).toEqual(["馬上報名", "一起 報名"]);
});
