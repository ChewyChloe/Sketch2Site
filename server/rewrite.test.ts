import { afterEach, expect, it, vi } from "vitest";
import { createGenerationServer } from "./api";
import { mockProvider } from "../tests/fixtures/generation";
import { buildRewriteRequest, type RewriteInput } from "./provider";
import { PageSchema, type PageNode, type PageSpec } from "../src/pageSpec";

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
const styleOf = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" }) as const;
const ids = Object.fromEntries(["s1", "s2", "h1", "h2", "grid", "i1", "i2"].map((k) => [k, crypto.randomUUID()]));
const page = PageSchema.parse({
  schemaVersion: 2, metadata: { title: "攝影社", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 2 },
  sections: [
    { id: ids.s1, type: "section", style: styleOf(), effects: [], children: [{ id: ids.h1, type: "heading", level: 1, content: "攝影社，新學期招生中", style: styleOf(), effects: [] }] },
    { id: ids.s2, type: "section", style: styleOf(), effects: [], children: [
      { id: ids.h2, type: "heading", level: 2, content: "上學期作品", style: styleOf(), effects: [] },
      { id: ids.grid, type: "grid", columns: 2, style: styleOf(), effects: [], children: [
        { id: ids.i1, type: "image", src: "/assets/samples/camera.jpg", alt: "相機", style: styleOf(), effects: [] },
        { id: ids.i2, type: "image", src: "/assets/samples/club-exhibit.jpg", alt: "展覽", style: styleOf(), effects: [] },
      ] },
    ] },
  ],
}) as PageSpec;
const body = () => ({ requestId: crypto.randomUUID(), page, notes: [{ n: 1, nodeId: ids.i1, note: "把照片做成旋轉木馬滾動" }] });
const usage = { inputTokens: 1200, outputTokens: 300, cachedInputTokens: 0, reasoningTokens: 0 };
/** The model's answer: refs and keys taken from what it was sent. */
const answerFor = (input: RewriteInput) => {
  const gallery = input.site[1] as { ref: string; children: { ref: string; children?: { image: string }[] }[] };
  return {
    sections: [
      { ref: gallery.ref, node: { ref: gallery.ref, type: "section", children: [{ ref: gallery.children[0].ref, type: "heading" }, { type: "media", content: "", media: { kind: "carousel", images: gallery.children[1].children!.map((x) => x.image) } }] } },
      { ref: (input.site[0] as { ref: string }).ref, node: { type: "section", children: [] } }, // not a target: ignored
    ],
    notes: [{ n: 1, summary: "照片改成輪播" }, { n: 5, summary: "沒問過的註解" }],
  };
};

it("sends the whole site in compact form and returns the rewritten section, checked", async () => {
  let sent: RewriteInput | undefined;
  const provider = { ...mockProvider, rewriteSections: vi.fn(async (input: RewriteInput) => ((sent = input), { ...usage, answer: answerFor(input) })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  const r = await post("/api/generation/rewrite", body());
  expect(r.status).toBe(200);
  const data = await r.json();
  // The model saw every section, by short refs and keys only.
  expect(sent!.site).toHaveLength(2);
  expect(JSON.stringify(sent)).not.toMatch(/\/assets\/|[0-9a-f]{8}-[0-9a-f]{4}-/);
  expect(sent!.targets).toEqual([(sent!.site[1] as { ref: string }).ref]);
  expect(data.notes).toEqual([{ n: 1, summary: "照片改成輪播" }]);
  expect(data.sections).toHaveLength(1);
  const section = data.sections[0] as PageNode;
  expect(section.id).toBe(ids.s2);
  expect(section.children![0].id).toBe(ids.h2);
  expect(section.children![1].media).toMatchObject({ kind: "carousel", images: ["/assets/samples/camera.jpg", "/assets/samples/club-exhibit.jpg"] });
});

it("drops a section that breaks the rules and refuses bad input", async () => {
  const provider = { ...mockProvider, rewriteSections: vi.fn(async (input: RewriteInput) => ({ ...usage, answer: { sections: [{ ref: input.targets[0], node: { ref: input.targets[0], type: "section", children: [{ type: "image", image: "P9", alt: "外來的圖" }] } }], notes: [] } })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 1, maxPerMinute: 5 });
  expect((await post("/api/generation/rewrite", { ...body(), page: { nope: true } })).status).toBe(400);
  expect((await post("/api/generation/rewrite", { ...body(), notes: [{ n: 1, nodeId: crypto.randomUUID(), note: "x" }] })).status).toBe(400);
  expect((await post("/api/generation/rewrite", body(), { "X-Sketch-CSRF": "0".repeat(64) })).status).toBe(403);
  const ok = await post("/api/generation/rewrite", body());
  expect(ok.status).toBe(200);
  expect((await ok.json()).sections).toEqual([]);
  // Shares the call limit with the other AI requests.
  expect((await post("/api/generation/rewrite", body())).status).toBe(429);
  expect(provider.rewriteSections).toHaveBeenCalledTimes(1);
});

it("rejects an answer that is not the expected shape", async () => {
  const provider = { ...mockProvider, rewriteSections: vi.fn(async () => ({ ...usage, answer: { sections: "<script>" } })) };
  const { post } = await setup({ provider, testMode: true, maxCalls: 5, maxPerMinute: 5 });
  expect((await post("/api/generation/rewrite", body())).status).toBe(502);
});

it("marks the site and notes as data and uses no tools", () => {
  const request = buildRewriteRequest({ site: [], pictures: [], links: [], targets: ["e1"], notes: [{ n: 1, element: "e2", note: "x" }] });
  expect(request.tools).toEqual([]);
  expect(request.input[0].content).toContain("untrusted DATA");
  expect(request.input[0].content).toContain("JSON");
});
