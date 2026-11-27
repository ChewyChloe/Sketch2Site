import { describe, expect, it, vi } from "vitest";
import { blank, CanvasSchema, createNode } from "./spec";
import { createSiteCandidate } from "./siteGeneration";
import { processNotes, type RewriteAnswer } from "./NoteBatch";
import { GenerationError } from "./generation";
import { allSections, type PageNode, type PageSpec } from "./pageSpec";
import { sectionOf } from "./sectionRewrite";

function site() {
  const base = blank();
  const nodes = [{ ...createNode("heading", 80, 40), content: "資管系迎新茶會" }, { ...createNode("text", 80, 200), content: "12/15 晚上七點，管理學院一樓" }];
  const page = createSiteCandidate(CanvasSchema.parse({ ...base, metadata: { ...base.metadata, layoutMode: "reflow" }, nodes })).page;
  const all: PageNode[] = [];
  const walk = (n: PageNode) => { all.push(n); n.children?.forEach(walk); };
  allSections(page).forEach(walk);
  return { page, heading: all.find((n) => n.type === "heading")!, text: all.find((n) => n.type === "paragraph")! };
}
/** The model's answer: the note's section with the paragraph reworded. */
function reworded(page: PageSpec, textId: string, content: string): PageNode {
  const section = structuredClone(sectionOf(page, textId)!);
  const walk = (n: PageNode) => { if (n.id === textId) n.content = content; n.children?.forEach(walk); };
  walk(section);
  return section;
}

describe("batch notes", () => {
  it("does what it reads locally and sends the rest, with the whole site, to the AI in one request", async () => {
    const { page, heading, text } = site();
    const twoSections = sectionOf(page, heading.id)!.id !== sectionOf(page, text.id)!.id;
    const ask = vi.fn(async (p: PageSpec): Promise<RewriteAnswer> => ({ sections: [reworded(p, text.id, "12/15 晚上七點見，管理學院一樓")], notes: [{ n: 2, summary: "改得更口語" }] }));
    const { outcomes } = await processNotes(page, [
      { key: "a", nodeId: heading.id, text: "置中" },
      { key: "b", nodeId: text.id, text: "寫得更口語一點" },
    ], ask, new AbortController().signal);
    expect(ask).toHaveBeenCalledTimes(1);
    const [sentPage, sent] = ask.mock.calls[0] as unknown as [PageSpec, { n: number; nodeId: string; note: string }[]];
    expect(sentPage).toBe(page);
    expect(sent.map((x) => x.note)).toContain("寫得更口語一點");
    expect(outcomes[1].by).toBe("ai");
    expect(outcomes[1].summary).toBe("改得更口語");
    // One patch for the rewritten section, carried by the first note in it.
    const patches = outcomes.flatMap((o) => o.patches);
    expect(patches).toContainEqual({ operation: "replace-section", targetId: sectionOf(page, text.id)!.id, payload: { section: expect.any(Object) } });
    // A note the reader understood stays local unless its section is being rewritten anyway.
    if (twoSections) expect(outcomes[0].by).toBe("local");
    else expect(outcomes[0].by).toBe("ai");
  });
  it("without AI, notes it fully understood still work and the rest are explained", async () => {
    const { page, heading } = site();
    const ask = vi.fn(async (): Promise<RewriteAnswer> => { throw new GenerationError("NOT_CONFIGURED"); });
    const { outcomes, aiError } = await processNotes(page, [{ key: "a", nodeId: heading.id, text: "置中" }, { key: "b", nodeId: heading.id, text: "更有質感" }], ask, new AbortController().signal);
    expect(aiError).toContain("AI 目前沒有開啟");
    expect(outcomes[0].by).toBe("local");
    expect(outcomes[1].by).toBe("none");
    expect(outcomes[1].summary).toContain("看不懂");
  });
  it("sends the brief along and treats an unchanged section as no change", async () => {
    const { page, heading } = site();
    const ask = vi.fn(async (p: PageSpec): Promise<RewriteAnswer> => ({ sections: [structuredClone(sectionOf(p, heading.id)!)], notes: [] }));
    const brief = { audience: "新生", purpose: "活動", mood: "活潑" };
    const { outcomes } = await processNotes(page, [{ key: "a", nodeId: heading.id, text: "寫得更熱情一點" }], ask, new AbortController().signal, brief);
    expect((ask.mock.calls[0] as unknown[])[3]).toEqual(brief);
    expect(outcomes[0].by).toBe("none");
    expect(outcomes[0].patches).toEqual([]);
    expect(outcomes[0].summary).toContain("AI 沒有改這則");
  });
});
