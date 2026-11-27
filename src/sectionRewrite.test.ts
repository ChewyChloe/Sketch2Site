import { describe, expect, it } from "vitest";
import { createMotion } from "./motion";
import { PageSchema, type PageNode, type PageSpec } from "./pageSpec";
import { compactSite, fromCompact, RewriteError, sectionOf, sitePools, type CompactNode } from "./sectionRewrite";
import { applyPatchBatch, createPageSession, travelPage } from "./patch";

const styleOf = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" }) as const;
const id = () => crypto.randomUUID();
function site() {
  const [s1, s2, h1, b1, h2, grid, i1, i2, i3] = Array.from({ length: 9 }, id);
  const img = (nid: string, src: string): PageNode => ({ id: nid, type: "image", src, alt: "作品", style: styleOf(), effects: [createMotion("fade-in", nid)] });
  const page = PageSchema.parse({
    schemaVersion: 2,
    metadata: { title: "攝影社", language: "zh-Hant" },
    typography: "sans",
    styles: "neutral",
    responsive: { mobileColumns: 1, desktopColumns: 2 },
    sections: [
      { id: s1, type: "section", role: "hero", style: styleOf(), effects: [], children: [
        { id: h1, type: "heading", level: 1, content: "攝影社，新學期招生中", style: styleOf(), effects: [] },
        { id: b1, type: "button", content: "立即報名", href: "https://forms.example.com/join", style: styleOf(), effects: [] },
      ] },
      { id: s2, type: "section", role: "gallery", style: styleOf(), effects: [], children: [
        { id: h2, type: "heading", level: 2, content: "上學期作品", style: styleOf(), effects: [] },
        { id: grid, type: "grid", columns: 3, style: styleOf(), effects: [], children: [img(i1, "/assets/samples/club-exhibit.jpg"), img(i2, "/assets/samples/camera.jpg"), img(i3, "/assets/samples/club-camera.jpg")] },
      ] },
    ],
  }) as PageSpec;
  return { page, ids: { s1, s2, h1, b1, h2, grid, i1, i2, i3 } };
}
/** The gallery turned into a carousel, as the model would write it. */
function carousel(page: PageSpec): CompactNode {
  const c = compactSite(page);
  const gallery = c.sections[1];
  const heading = gallery.children![0], grid = gallery.children![1];
  return { ref: gallery.ref, type: "section", children: [heading, { type: "media", content: "上學期作品", media: { kind: "carousel", images: grid.children!.map((x) => x.image!), autoplay: true, seconds: 4 } }] };
}

describe("compact site for the model", () => {
  it("uses short refs and picture and link keys, never addresses", () => {
    const { page } = site();
    const c = compactSite(page);
    expect(c.pictures).toEqual(["P1", "P2", "P3"]);
    expect(c.links).toEqual(["L1"]);
    const text = JSON.stringify(c.sections);
    expect(text).not.toMatch(/https:|\/assets\/|[0-9a-f]{8}-[0-9a-f]{4}/);
    expect(c.sections[0].children![1]).toMatchObject({ type: "button", link: "L1" });
    expect(c.sections[1].children![1].children![0]).toMatchObject({ type: "image", image: "P1", motions: ["fade-in"] });
  });
});

describe("turning a rewritten section back into the site", () => {
  it("builds a carousel from the site's own pictures and keeps kept elements' ids", () => {
    const { page, ids } = site();
    const section = fromCompact(page, ids.s2, carousel(page));
    expect(section.id).toBe(ids.s2);
    expect(section.children![0].id).toBe(ids.h2);
    const media = section.children![1];
    expect(media.type).toBe("media");
    expect(media.media).toMatchObject({ kind: "carousel", images: ["/assets/samples/club-exhibit.jpg", "/assets/samples/camera.jpg", "/assets/samples/club-camera.jpg"] });
    expect(media.id).not.toBe(ids.grid);
  });
  it("keeps a kept element's motion and drops motions it cannot use", () => {
    const { page, ids } = site();
    const c = compactSite(page);
    const gallery = structuredClone(c.sections[1]);
    gallery.children![1].children![0].look = { frame: "circle" };
    const out = fromCompact(page, ids.s2, gallery);
    const first = out.children![1].children![0];
    expect(first.id).toBe(ids.i1);
    expect(first.effects.map((e) => e.presetId)).toEqual(["fade-in"]);
    expect(first.look).toEqual({ frame: "circle" });
  });
  it("refuses pictures, links and elements that are not the site's own", () => {
    const { page, ids } = site();
    const c = compactSite(page);
    const bad: CompactNode[] = [
      { ...carousel(page), children: [{ type: "image", image: "P9", alt: "x" }] }, // unknown picture key
      { ref: c.sections[1].ref, type: "section", children: [c.sections[0].children![0]] }, // ref from another section
      { ref: c.sections[1].ref, type: "section", children: [c.sections[1].children![0], c.sections[1].children![0]] }, // same ref twice
      { ref: c.sections[1].ref, type: "section", children: [{ type: "button", content: "去看看", link: "L7" }] }, // unknown link
      { ref: c.sections[1].ref, type: "section", children: [{ type: "media", content: "", media: { kind: "video" } }] }, // new video
      { ref: c.sections[1].ref, type: "section", children: [{ type: "form", content: "姓名" }] }, // new form
      { ref: c.sections[1].ref, type: "grid", children: [] }, // top must be a section
    ];
    for (const node of bad) expect(() => fromCompact(page, ids.s2, node)).toThrow(RewriteError);
  });
  it("finds the section that holds an element", () => {
    const { page, ids } = site();
    expect(sectionOf(page, ids.i2)?.id).toBe(ids.s2);
    expect(sitePools(page).links).toEqual(["https://forms.example.com/join"]);
  });
});

describe("replace-section patch", () => {
  const apply = (page: PageSpec, section: PageNode, scope: string[]) => {
    const s = createPageSession(page);
    return applyPatchBatch(s, { schemaVersion: 1, sessionId: s.sessionId, baseRevision: 0, patches: [{ operation: "replace-section", targetId: section.id, payload: { section } }] }, scope);
  };
  it("replaces one section, leaves the others exactly as they were, and undoes in one step", () => {
    const { page, ids } = site();
    const section = fromCompact(page, ids.s2, carousel(page));
    const r = apply(page, section, [ids.s2]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.after.sections[0]).toEqual(page.sections[0]);
    expect(r.after.sections[1].children![1].media?.kind).toBe("carousel");
    expect(travelPage(r.state, "undo").history.present).toEqual(page);
  });
  it("refuses outside pictures or links, another id, or a section out of scope", () => {
    const { page, ids } = site();
    const good = fromCompact(page, ids.s2, carousel(page));
    const foreignPic = structuredClone(good);
    foreignPic.children![1].media = { kind: "carousel", images: ["/assets/samples/cafe.jpg"], autoplay: true, seconds: 4, arrows: true, dots: true };
    const foreignLink = structuredClone(good);
    foreignLink.children!.push({ id: id(), type: "button", content: "看看", href: "https://other.example.com/", style: styleOf(), effects: [] });
    expect(apply(page, foreignPic, [ids.s2]).ok).toBe(false);
    expect(apply(page, foreignLink, [ids.s2]).ok).toBe(false);
    expect(apply(page, { ...good, id: id() }, [ids.s2]).ok).toBe(false);
    expect(apply(page, good, [ids.s1]).ok).toBe(false);
  });
  it("cannot be used to change another section", () => {
    const { page, ids } = site();
    const s = createPageSession(page);
    const hero = structuredClone(page.sections[0]);
    hero.children![0].content = "改掉別區";
    const r = applyPatchBatch(s, { schemaVersion: 1, sessionId: s.sessionId, baseRevision: 0, patches: [{ operation: "replace-section", targetId: ids.s2, payload: { section: { ...hero, id: ids.s2 } } }] }, [ids.s2]);
    // Reusing another section's element ids is refused by the page schema (duplicate ids).
    expect(r.ok).toBe(false);
    expect(() => fromCompact(page, ids.s2, { ref: compactSite(page).sections[1].ref, type: "section", children: [{ ref: compactSite(page).refOf(ids.h1), type: "heading", content: "x" }] })).toThrow(RewriteError);
  });
});
