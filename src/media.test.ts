import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, createMediaNode, createNode, type CanvasSpec } from "./spec";
import { createSiteCandidate } from "./siteGeneration";
import { GenerationError } from "./generation";
import { MediaSchema, defaultMedia, mediaKinds, parseVideoUrl, videoEmbedUrl, type PageNode } from "./pageSpec";
import { exportProjectFiles } from "./exportProject";

describe("video links", () => {
  it("accepts YouTube and Vimeo links in their common forms", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
    expect(parseVideoUrl(" https://www.youtube.com/embed/dQw4w9WgXcQ ")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://vimeo.com/76979871")).toEqual({ provider: "vimeo", videoId: "76979871" });
    expect(parseVideoUrl("https://player.vimeo.com/video/76979871?h=x")).toEqual({ provider: "vimeo", videoId: "76979871" });
  });
  it("refuses anything else", () => {
    for (const bad of ["javascript:alert(1)", "https://evil.example/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=short", "https://youtu.be/../x", "https://vimeo.com/abc", "not a url", "ftp://youtube.com/watch?v=dQw4w9WgXcQ"]) expect(parseVideoUrl(bad)).toBeNull();
  });
  it("embeds through the no-cookie player and starts muted only for autoplay", () => {
    expect(videoEmbedUrl({ provider: "youtube", videoId: "dQw4w9WgXcQ", loop: true }, true, true)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1&autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ");
    expect(videoEmbedUrl({ provider: "vimeo", videoId: "76979871", loop: false }, true)).toBe("https://player.vimeo.com/video/76979871?dnt=1&autoplay=1");
  });
});

describe("media settings", () => {
  it("every kind has valid defaults", () => {
    for (const k of mediaKinds) expect(MediaSchema.safeParse(defaultMedia(k)).success).toBe(true);
  });
  it("only the app's own pictures and known options are allowed", () => {
    expect(MediaSchema.safeParse({ ...defaultMedia("carousel"), images: ["https://evil.example/x.jpg"] }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("carousel"), images: [] }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("flipbook"), images: ["/assets/samples/cafe.jpg"] }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("character"), character: "mouse" }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("character"), color: "red" }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("video"), videoId: "<script>" }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("video"), provider: "vimeo", videoId: "dQw4w9WgXcQ" }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...defaultMedia("object3d"), html: "<b>" }).success).toBe(false);
  });
  it("a draft node is media exactly when it has media settings", () => {
    const base = blank();
    expect(CanvasSchema.safeParse({ ...base, nodes: [createMediaNode("carousel", 80, 80)] }).success).toBe(true);
    const { media: _m, ...bare } = createMediaNode("carousel", 80, 80);
    void _m;
    expect(CanvasSchema.safeParse({ ...base, nodes: [bare] }).success).toBe(false);
    expect(CanvasSchema.safeParse({ ...base, nodes: [{ ...createNode("text", 80, 80), media: defaultMedia("character") }] }).success).toBe(false);
  });
});

function withMedia(video = "dQw4w9WgXcQ"): CanvasSpec {
  const base = blank();
  const heading = { ...createNode("heading", 80, 40), content: "我的作品" };
  const nodes = [heading, ...mediaKinds.map((k, i) => createMediaNode(k, 80, 160 + i * 140, 1800))];
  nodes[1] = { ...nodes[1], media: { kind: "video", provider: "youtube", autoplay: false, loop: false, ...(video ? { videoId: video } : {}) } };
  return CanvasSchema.parse({ ...base, metadata: { ...base.metadata, height: 1800 }, nodes });
}
const mediaNodes = (nodes: PageNode[]): PageNode[] => nodes.flatMap((n) => (n.type === "media" ? [n] : mediaNodes(n.children ?? [])));

describe("media on the generated site", () => {
  it("keeps every media setting and caption from the draft, in both layouts", () => {
    for (const layoutMode of ["preserve", "reflow"] as const) {
      const canvas = withMedia();
      const draft = { ...canvas, metadata: { ...canvas.metadata, layoutMode } };
      const page = createSiteCandidate(draft).page;
      const found = mediaNodes(page.sections);
      expect(found.map((n) => n.media?.kind).sort()).toEqual([...mediaKinds].sort());
      for (const n of found) { const src = draft.nodes.find((d) => d.id === n.id)!; expect(n.media).toEqual(src.media); expect(n.content).toBe(src.content); }
    }
  });
  it("builds a page that has only media (no heading or text)", () => {
    for (const layoutMode of ["preserve", "reflow"] as const) {
      const nodes = mediaKinds.map((k, i) => createMediaNode(k, 80, 80 + i * 250, 1800));
      nodes[0] = { ...nodes[0], media: { kind: "video", provider: "youtube", videoId: "dQw4w9WgXcQ", autoplay: false, loop: false } };
      const c = CanvasSchema.parse({ ...blank(), metadata: { ...blank().metadata, height: 1800, layoutMode }, nodes });
      expect(mediaNodes(createSiteCandidate(c).page.sections)).toHaveLength(mediaKinds.length);
    }
  });
  it("is not built while a video has no link", () => {
    expect(() => createSiteCandidate(withMedia(""))).toThrow(GenerationError);
    expect(() => createSiteCandidate(withMedia(""))).toThrow("請先幫影片貼上 YouTube 或 Vimeo 網址");
  });
  it("export carries the media player and the pictures it uses", async () => {
    const page = createSiteCandidate(withMedia()).page;
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string) => new Response(String(url).endsWith(".svg") ? "<svg xmlns='http://www.w3.org/2000/svg'/>" : new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))) as typeof fetch;
    try {
      const files = await exportProjectFiles(page);
      expect(files.some((f) => f.path === "src/MediaRuntime.tsx")).toBe(true);
      expect(files.some((f) => f.path === "public/assets/samples/camera.jpg")).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("reading order of a hand-placed draft", () => {
  it("reads items in the same row left to right even when one sits a little higher", async () => {
    const { readingOrder } = await import("./smartLayout");
    const card = (x: number, y: number, content: string) => ({ ...createNode("card", x, y, 1800), content });
    const a = card(90, 630, "認識學長姐"), b = card(470, 660, "破冰遊戲"), c = card(860, 640, "抽獎時間"), below = card(90, 900, "下一排");
    expect(readingOrder([c, below, b, a]).map((n) => n.content)).toEqual(["認識學長姐", "破冰遊戲", "抽獎時間", "下一排"]);
  });
});

describe("charts and tables", () => {
  it("keep the author's own words and numbers and refuse markup or bad shapes", () => {
    const chart = defaultMedia("chart"), table = defaultMedia("table");
    expect(MediaSchema.safeParse(chart).success).toBe(true);
    expect(MediaSchema.safeParse(table).success).toBe(true);
    expect(MediaSchema.safeParse({ ...chart, points: [{ label: "一", value: 1 }] }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...chart, points: [{ label: "<b>x</b>", value: 1 }, { label: "y", value: 2 }] }).success).toBe(false);
    expect(MediaSchema.safeParse({ kind: "chart", chart: "pie", unit: "", points: [{ label: "a", value: -1 }, { label: "b", value: 2 }] }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...table, rows: [["a", "b"], ["c"]] }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...table, rows: [["https://evil.example"]] }).success).toBe(false);
  });
});
