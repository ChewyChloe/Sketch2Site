import { describe, expect, it } from "vitest";
import { interpretAnnotation } from "./annotate";
import { starterDrafts } from "./starters";
import { createSiteCandidate } from "./siteGeneration";
import { applyPatchBatch, createPageSession, indexNodes } from "./patch";
import type { PageNode, PageSpec } from "./pageSpec";

const site = () => createSiteCandidate(starterDrafts()[0]).page;
const nodes = (page: PageSpec) => [...indexNodes(page).values()];
const first = (page: PageSpec, pred: (n: PageNode) => boolean) => nodes(page).find(pred)!;

function run(page: PageSpec, targetId: string, text: string) {
  const r = interpretAnnotation(page, targetId, text);
  if (!r.ok || !r.patches.length) return { r, page };
  const session = createPageSession(page);
  const applied = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: 0, patches: r.patches }, r.scope);
  expect(applied.ok).toBe(true);
  return { r, page: applied.ok ? applied.after : page };
}

describe("annotations", () => {
  it("resizes headings and grids", () => {
    const page = site();
    const h2 = first(page, (n) => n.type === "heading" && n.level === 2);
    const bigger = run(page, h2.id, "標題大一點");
    expect(indexNodes(bigger.page).get(h2.id)!.level).toBe(1);
    const card = first(page, (n) => n.type === "card");
    const grid = nodes(page).find((n) => n.type === "grid" && n.children?.some((c) => c.id === card.id))!;
    const wide = run(page, card.id, "卡片放大");
    expect(indexNodes(wide.page).get(grid.id)!.columns).toBe(grid.columns! - 1);
    expect(run(page, card.id, "改成兩欄").page && indexNodes(run(page, card.id, "改成兩欄").page).get(grid.id)!.columns).toBe(2);
  });

  it("handles several requests in one sentence, including theme and motion", () => {
    const page = site();
    const h1 = first(page, (n) => n.type === "heading" && n.level === 1);
    const { r, page: after } = run(page, h1.id, "置中，換成藍色然後加螢光標記");
    expect(r.ok && r.summary.length).toBe(3);
    const node = indexNodes(after).get(h1.id)!;
    expect(node.style?.align).toBe("center");
    expect(after.theme).toBe("ocean");
    expect(node.effects.map((e) => e.presetId)).toContain("hand-drawn-highlight");
  });

  it("only replaces text with the user's quoted words", () => {
    const page = site();
    const button = first(page, (n) => n.type === "button");
    const { page: after } = run(page, button.id, "按鈕改成「馬上預約」");
    expect(indexNodes(after).get(button.id)!.content).toBe("馬上預約");
    const unquoted = interpretAnnotation(page, button.id, "按鈕文字寫得更吸引人");
    expect(unquoted.ok).toBe(false);
    const card = first(page, (n) => n.type === "card");
    const onCard = interpretAnnotation(page, card.id, "改成「新文字」");
    expect(onCard.ok).toBe(false);
  });

  it("removes and swaps motion, and refuses unknown or unsafe requests", () => {
    const page = site();
    const image = first(page, (n) => n.type === "image");
    const swapped = run(page, image.id, "換成百葉窗");
    expect(indexNodes(swapped.page).get(image.id)!.effects.map((e) => e.presetId)).toEqual(["venetian-reveal"]);
    const none = run(swapped.page, image.id, "不要動畫");
    expect(indexNodes(none.page).get(image.id)!.effects).toEqual([]);
    expect(interpretAnnotation(page, image.id, "幫我做一個購物車").ok).toBe(false);
    const button = first(page, (n) => n.type === "button");
    expect(interpretAnnotation(page, button.id, "連到 javascript:alert(1)").ok).toBe(false);
    expect(interpretAnnotation(page, "00000000-0000-4000-8000-000000000000", "置中").ok).toBe(false);
  });
});

describe("annotation targets", () => {
  it("applies card and section wording to the surrounding element", () => {
    const page = site();
    // A pricing card with its quiet entrance; tilt is added alongside it.
    const card = first(page, (n) => n.type === "card" && JSON.stringify(n).includes("NT$"));
    const text = card.children!.find((c) => c.type === "paragraph")!;
    const grid = nodes(page).find((n) => n.type === "grid" && n.children?.some((c) => c.id === card.id))!;
    const wide = run(page, text.id, "卡片放大");
    expect(indexNodes(wide.page).get(grid.id)!.columns).toBe(grid.columns! - 1);
    const tilt = run(page, text.id, "卡片加 3D 傾斜");
    expect(indexNodes(tilt.page).get(card.id)!.effects.map((e) => e.presetId)).toContain("perspective-tilt");
    const roomy = run(page, text.id, "這區留白多一點");
    const section = nodes(page).find((n) => n.type === "section" && JSON.stringify(n).includes(text.id))!;
    expect(indexNodes(roomy.page).get(section.id)!.style?.padding).toBe("large");
  });
});

describe("signature motions by note", () => {
  it("adds a typewriter to a heading and confetti to a button", () => {
    const page = site();
    const h = first(page, (n) => n.type === "heading");
    const typed = run(page, h.id, "加上打字機效果");
    expect(indexNodes(typed.page).get(h.id)!.effects.map((e) => e.presetId)).toContain("typewriter");
    const b = first(page, (n) => n.type === "button");
    const party = run(page, b.id, "按下去要撒花慶祝");
    expect(indexNodes(party.page).get(b.id)!.effects.map((e) => e.presetId)).toContain("confetti-burst");
  });
});

describe("reference motions by note", () => {
  it("maps plain words to the new motions", () => {
    const page = site();
    const h = first(page, (n) => n.type === "heading");
    const img = first(page, (n) => n.type === "image");
    const ids = (pid: string, text: string) => indexNodes(run(page, pid, text).page).get(pid)!.effects.map((e) => e.presetId);
    expect(ids(h.id, "標題改成空心字，滑過再填滿")).toContain("hollow-fill-sweep");
    expect(ids(h.id, "讓字的粗細輪流變化")).toContain("bold-relay");
    expect(ids(img.id, "讓照片滑過時才回彩")).toContain("color-wake");
    expect(ids(img.id, "滑過時讓照片在框裡推近")).toContain("dolly-frame");
  });
});

describe("3D by note", () => {
  it("turns a picture into a floating card or a turntable, and back", () => {
    const page = site();
    const img = first(page, (n) => n.type === "image");
    const float = run(page, img.id, "做成 3D");
    expect(float.r.ok && float.r.summary).toEqual(["做成 3D 浮動立體卡"]);
    expect(indexNodes(float.page).get(img.id)!.look?.depth).toBe("float");
    const turn = run(float.page, img.id, "改成會旋轉的展示台");
    expect(indexNodes(turn.page).get(img.id)!.look?.depth).toBe("turntable");
    const flat = run(turn.page, img.id, "不要 3D 了");
    expect(indexNodes(flat.page).get(img.id)!.look?.depth).toBeUndefined();
    // 左右翻轉 is a flip, not a turntable.
    expect(indexNodes(run(page, img.id, "左右翻轉").page).get(img.id)!.look?.depth).toBeUndefined();
  });
  it("gives a heading extruded lettering", () => {
    const page = site();
    const h = first(page, (n) => n.type === "heading");
    const r = run(page, h.id, "改成立體字");
    expect(indexNodes(r.page).get(h.id)!.text?.depth).toBe(true);
  });
});

it("recognizes a bare floating request and explains unsupported targets", () => {
  const page = site();
  const image = first(page, node => node.type === "image");
  const edit = interpretAnnotation(page, image.id, "漂浮");
  expect(edit).toMatchObject({ ok: true, patches: expect.arrayContaining([expect.objectContaining({ operation: "attach-effect", payload: expect.objectContaining({ presetId: "float-idle" }) })]) });
  const heading = first(page, node => node.type === "heading");
  expect(interpretAnnotation(page, heading.id, "漂浮")).toMatchObject({ ok: false, message: expect.stringContaining("不適合") });
});
