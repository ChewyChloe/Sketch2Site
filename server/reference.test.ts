import { afterEach, expect, it, vi } from "vitest";
import { createGenerationServer } from "./api";
import { mockProvider } from "../tests/fixtures/generation";
import { buildReferenceRequest, referenceRules } from "./provider";
import { directionFor, styleFromPixels } from "../src/referenceStyle";

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
  const post = (body: unknown, extra: Record<string, string> = {}) => fetch(base + "/api/generation/reference", { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  return { post };
}
// A tiny but real JPEG header followed by filler bytes.
const jpeg = "data:image/jpeg;base64," + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]).toString("base64");
const usage = { inputTokens: 600, outputTokens: 60, cachedInputTokens: 0, reasoningTokens: 0 };
const answer = { mood: "calm", colorMode: "mono", temperature: "cool", lightness: "light", contrast: "strong", typeFamily: "sans", typeScale: "huge", space: "airy", imagery: "full-bleed", motion: "still", principles: ["color-field", "diagonal-lines", "small-subject", "restrained-brand", "numbered-rhythm"] };

it("returns only fixed style choices plus a direction worked out by trusted code", async () => {
  const provider = { ...mockProvider, describeReference: vi.fn(async () => ({ ...usage, answer })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  const r = await post({ requestId: crypto.randomUUID(), images: [jpeg] });
  expect(r.status).toBe(200);
  const data = await r.json();
  expect(data.style).toEqual({ ...answer, direction: "ocean" });
  // Anything outside the list of techniques is refused.
  const bad = { ...mockProvider, describeReference: vi.fn(async () => ({ ...usage, answer: { ...answer, principles: ["copy-the-layout"] } })) };
  const second = await setup({ provider: bad, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  expect((await second.post({ requestId: crypto.randomUUID(), images: [jpeg] })).status).toBe(502);
  expect(JSON.stringify(data)).not.toContain("base64");
});

it("rejects extra text, non-JPEG data and over-limit calls", async () => {
  const provider = { ...mockProvider, describeReference: vi.fn(async () => ({ ...usage, answer: { ...answer, caption: "抄下來的標題" } })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 1, maxPerMinute: 5 });
  expect((await post({ requestId: crypto.randomUUID(), images: ["data:image/png;base64,AAAA"] })).status).toBe(400);
  expect((await post({ requestId: crypto.randomUUID(), images: ["data:image/jpeg;base64," + Buffer.alloc(200, 1).toString("base64")] })).status).toBe(400);
  expect((await post({ requestId: crypto.randomUUID(), images: [jpeg], note: "x" })).status).toBe(400);
  expect((await post({ requestId: crypto.randomUUID(), images: [jpeg] }, { "X-Sketch-CSRF": "0".repeat(64) })).status).toBe(403);
  // An answer with anything beyond the fixed choices is refused.
  expect((await post({ requestId: crypto.randomUUID(), images: [jpeg] })).status).toBe(502);
  expect((await post({ requestId: crypto.randomUUID(), images: [jpeg] })).status).toBe(429);
});

it("sends the picture at low detail with rules that forbid copying", () => {
  const req = buildReferenceRequest({ requestId: crypto.randomUUID(), images: [jpeg] });
  expect(JSON.stringify(req.input[1])).toContain('"detail":"low"');
  expect(req.store).toBe(false);
  expect(referenceRules).toMatch(/Never transcribe/);
  expect(referenceRules).toMatch(/must not copy/);
});

it("reads a picture's look locally and picks a direction", () => {
  // A dark picture → the night direction; a pale, quiet picture → light and airy.
  const dark = new Array(20 * 20 * 4).fill(0).map((_, i) => (i % 4 === 3 ? 255 : 18));
  expect(styleFromPixels(dark, 20, 20)!.direction).toBe("midnight");
  const pale = new Array(20 * 20 * 4).fill(0).map((_, i) => (i % 4 === 3 ? 255 : i % 4 === 2 ? 236 : 244));
  const s = styleFromPixels(pale, 20, 20)!;
  expect([s.lightness, s.space]).toEqual(["light", "airy"]);
  expect(directionFor({ ...s, mood: "warm", typeFamily: "serif", temperature: "warm" })).toBe("forest");
  // One blue filling the frame, crossed by slanted lines: colour field and diagonal lines.
  const lanes: number[] = [];
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const line = (x + y * 2) % 12 < 1; lanes.push(...(line ? [240, 244, 248, 255] : [40, 110, 200, 255])); }
  const lane = styleFromPixels(lanes, 40, 40)!;
  expect(lane.principles).toEqual(expect.arrayContaining(["color-field", "diagonal-lines"]));
});

it("takes one to five pictures in one call and refuses six", async () => {
  const provider = { ...mockProvider, describeReference: vi.fn(async () => ({ ...usage, answer })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  expect((await post({ requestId: crypto.randomUUID(), images: Array(5).fill(jpeg) })).status).toBe(200);
  expect(provider.describeReference).toHaveBeenCalledTimes(1);
  expect((await post({ requestId: crypto.randomUUID(), images: Array(6).fill(jpeg) })).status).toBe(400);
  expect((await post({ requestId: crypto.randomUUID(), images: [] })).status).toBe(400);
  expect(buildReferenceRequest({ requestId: crypto.randomUUID(), images: [jpeg, jpeg, jpeg] }).input[1].content).toHaveLength(3);
});
