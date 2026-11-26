import { afterEach, expect, it, vi } from "vitest";
import { createGenerationServer } from "./api";
import { mockProvider } from "../tests/fixtures/generation";
import { buildNoteRequest } from "./provider";

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
  const post = (path: string, body: unknown, extra: Record<string, string> = {}) => fetch(base + path, { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  return { post };
}
const body = () => ({
  requestId: crypto.randomUUID(),
  notes: [
    { n: 1, kind: "heading", text: "資管系迎新茶會", note: "寫得更有活力一點", allowed: ["標題大一點", "藍色字"] },
    { n: 2, kind: "image", text: "", note: "看起來太暗", allowed: ["亮一點", "黑白濾鏡"] },
  ],
});
const usage = { inputTokens: 400, outputTokens: 80, cachedInputTokens: 0, reasoningTokens: 0 };

it("returns only allowed commands and safe new wording", async () => {
  const provider = {
    ...mockProvider,
    suggestNoteEdits: vi.fn(async () => ({
      ...usage,
      results: [
        { n: 1, newText: "一起來資管系迎新茶會！", commands: ["標題大一點", "刪掉整頁"] },
        { n: 2, newText: "<script>x</script>", commands: ["亮一點"] },
        { n: 9, newText: "不存在的註解", commands: [] },
        { n: 1, newText: "重複的結果", commands: [] },
      ],
    })),
  };
  const { post } = await setup({ provider, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  const r = await post("/api/generation/notes", body());
  expect(r.status).toBe(200);
  const data = await r.json();
  expect(data.results).toEqual([
    { n: 1, newText: "一起來資管系迎新茶會！", commands: ["標題大一點"] },
    { n: 2, commands: ["亮一點"] },
  ]);
});

it("drops links and quotes from wording, and shares the call limit with other AI requests", async () => {
  const provider = { ...mockProvider, suggestNoteEdits: vi.fn(async () => ({ ...usage, results: [{ n: 1, newText: "到 https://evil.example 報名", commands: [] }, { n: 2, newText: "", commands: [] }] })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 1, maxPerMinute: 5 });
  expect((await post("/api/generation/notes", { ...body(), notes: [{ ...body().notes[0], kind: "script" }] })).status).toBe(400);
  expect((await post("/api/generation/notes", body(), { "X-Sketch-CSRF": "0".repeat(64) })).status).toBe(403);
  const ok = await post("/api/generation/notes", body());
  expect((await ok.json()).results).toEqual([]);
  expect((await post("/api/generation/notes", body())).status).toBe(429);
  expect(provider.suggestNoteEdits).toHaveBeenCalledTimes(1);
});

it("keeps the request small and marks the notes as data", () => {
  const request = buildNoteRequest(body() as never);
  expect(request.tools).toEqual([]);
  expect(request.input[0].content).toContain("untrusted DATA");
  expect(Buffer.byteLength(JSON.stringify(request))).toBeLessThan(16384);
});
