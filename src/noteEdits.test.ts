import { describe, expect, it, vi } from "vitest";
import { blank, CanvasSchema, createNode } from "./spec";
import { createSiteCandidate } from "./siteGeneration";
import { processNotes } from "./NoteBatch";
import { GenerationError } from "./generation";
import { allSections, type PageNode } from "./pageSpec";

function site() {
  const base = blank();
  const nodes = [{ ...createNode("heading", 80, 40), content: "資管系迎新茶會" }, { ...createNode("text", 80, 200), content: "12/15 晚上七點，管理學院一樓" }];
  const page = createSiteCandidate(CanvasSchema.parse({ ...base, metadata: { ...base.metadata, layoutMode: "reflow" }, nodes })).page;
  const all: PageNode[] = [];
  const walk = (n: PageNode) => { all.push(n); n.children?.forEach(walk); };
  allSections(page).forEach(walk);
  return { page, heading: all.find((n) => n.type === "heading")!, text: all.find((n) => n.type === "paragraph")! };
}

describe("batch notes", () => {
  it("reads what it can locally, sends only the rest to the AI in one request, and reads the AI's answer locally", async () => {
    const { page, heading, text } = site();
    const ask = vi.fn(async () => [{ n: 2, newText: "12/15 晚上七點見，管理學院一樓", commands: ["粗體"] }]);
    const { outcomes } = await processNotes(page, [
      { key: "a", nodeId: heading.id, text: "置中" },
      { key: "b", nodeId: text.id, text: "寫得更口語一點" },
      { key: "c", nodeId: heading.id, text: "幫我加一個購物車" },
    ], ask, new AbortController().signal);
    expect(ask).toHaveBeenCalledTimes(1);
    const sent = (ask.mock.calls[0] as unknown as [{ n: number; note: string }[]])[0];
    expect(sent.map((x) => [x.n, x.note])).toEqual([[2, "寫得更口語一點"], [3, "幫我加一個購物車"]]);
    expect(outcomes.map((o) => o.by)).toEqual(["local", "ai", "none"]);
    expect(outcomes[1].summary).toContain("12/15 晚上七點見");
    expect(outcomes[1].scope).toEqual([text.id]);
    expect(outcomes[2].patches).toEqual([]);
  });
  it("without AI, notes it cannot read are explained and nothing is guessed", async () => {
    const { page, heading } = site();
    const ask = vi.fn(async () => { throw new GenerationError("NOT_CONFIGURED"); });
    const { outcomes, aiError } = await processNotes(page, [{ key: "a", nodeId: heading.id, text: "更有質感" }], ask, new AbortController().signal);
    expect(aiError).toContain("AI 目前沒有開啟");
    expect(outcomes[0].by).toBe("none");
    expect(outcomes[0].summary).toContain("看不懂");
  });
  it("sends the brief along and treats the same text back as no change", async () => {
    const { page, heading } = site();
    const ask = vi.fn(async () => [{ n: 1, newText: "資管系迎新茶會", commands: [] }]);
    const brief = { audience: "新生", purpose: "活動", mood: "活潑" };
    const { outcomes } = await processNotes(page, [{ key: "a", nodeId: heading.id, text: "寫得更熱情一點" }], ask, new AbortController().signal, brief);
    expect((ask.mock.calls[0] as unknown[])[2]).toEqual(brief);
    expect(outcomes[0].by).toBe("none");
    expect(outcomes[0].patches).toEqual([]);
    expect(outcomes[0].summary).toContain("AI 沒有改這則");
  });
});
