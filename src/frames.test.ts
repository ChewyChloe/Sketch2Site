import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, createNode, type CanvasSpec } from "./spec";
import { createBlock } from "./blockTemplates";
import { createSiteCandidate } from "./siteGeneration";
import { ImageLookSchema, lookStyle, PageSchema, type PageSpec } from "./pageSpec";
import { applyPatchBatch, createPageSession, indexNodes } from "./patch";
import { interpretAnnotation } from "./annotate";
import { syncSiteChange } from "./siteSync";
import { materialize, verifyPreservation } from "./generation";

function collageDraft(): CanvasSpec {
  const base: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, layoutMode: "reflow" } };
  const block = createBlock(base, "collage")!;
  return CanvasSchema.parse({ ...base, metadata: { ...base.metadata, height: Math.max(1200, block.height) }, nodes: block.nodes });
}
const images = (page: PageSpec) => [...indexNodes(page).values()].filter((n) => n.type === "image");

describe("image frames", () => {
  it("validates looks strictly and only on images", () => {
    expect(ImageLookSchema.safeParse({ frame: "heart", zoom: 2, focusX: 30, filter: "warm", flipX: true }).success).toBe(true);
    expect(ImageLookSchema.safeParse({ frame: "triangle" }).success).toBe(false);
    expect(ImageLookSchema.safeParse({ zoom: 9 }).success).toBe(false);
    expect(ImageLookSchema.safeParse({ brightness: 10, css: "url(x)" }).success).toBe(false);
    const draft = collageDraft();
    const heading = draft.nodes.find((n) => n.type === "heading")!;
    expect(CanvasSchema.safeParse({ ...draft, nodes: draft.nodes.map((n) => (n === heading ? { ...n, look: { frame: "circle" } } : n)) }).success).toBe(false);
    expect(lookStyle({ zoom: 2, flipX: true, focusX: 20, filter: "mono", brightness: 10 })).toMatchObject({ transform: "scale(-2, 2)", objectPosition: "20% 50%", filter: "grayscale(1) brightness(1.1)" });
  });

  it("carries frames into the site and rejects output that changes them", () => {
    const draft = collageDraft();
    const page = createSiteCandidate(draft).page;
    expect(PageSchema.safeParse(page).success).toBe(true);
    expect(images(page).map((n) => n.look?.frame)).toEqual(["rounded", "rounded", "rounded"]);
    const tampered = structuredClone(page);
    images(tampered)[0].look = { frame: "heart" };
    expect(() => verifyPreservation(draft, tampered)).toThrow();
    expect(typeof materialize).toBe("function");
  });

  it("lets annotations change frames and photo looks, and syncs them to the draft", () => {
    const draft = collageDraft();
    const page = createSiteCandidate(draft).page;
    const img = images(page)[0];
    const r = interpretAnnotation(page, img.id, "換成愛心框，黑白濾鏡，亮一點，左右翻轉");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const session = createPageSession(page);
    const applied = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: r.patches }, r.scope);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(indexNodes(applied.after).get(img.id)!.look).toEqual({ frame: "heart", filter: "mono", brightness: 15, flipX: true });
    const synced = syncSiteChange(draft, page, applied.after)!;
    expect(synced.nodes.find((n) => n.id === img.id)!.look).toEqual({ frame: "heart", filter: "mono", brightness: 15, flipX: true });
    // Motion words stay motion: "圓形展開" is the circle reveal, not a circle frame.
    const motion = interpretAnnotation(page, img.id, "加圓形展開");
    expect(motion.ok && motion.summary.join()).toContain("圓形遮罩擴展");
  });

  it("adds an empty frame node that stays valid in a normal draft", () => {
    const node = { ...createNode("image", 100, 100), content: "照片", look: { frame: "phone" as const } };
    expect(CanvasSchema.safeParse({ ...blank(), nodes: [node] }).success).toBe(true);
  });
});
