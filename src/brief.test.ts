import { describe, it, expect } from "vitest";
import { suggestion, briefSentence, emptyBrief, hasBrief } from "./brief";
import { smartLayout } from "./smartLayout";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock } from "./blockTemplates";

describe("brief suggestions", () => {
  it("completes the current clause from purpose-specific then common phrases", () => {
    expect(suggestion("報名", "社團招生")).toBe("截止日期要醒目");
    expect(suggestion("營業", "店家介紹")).toBe("時間要放在最上面");
    expect(suggestion("我們是攝影社，希望", "社團招生")).toBe("新生一眼看懂怎麼報名");
    expect(suggestion("主色", "")).toBe("想用學校的藍色");
  });
  it("offers nothing for empty clauses, finished phrases or unknown starts", () => {
    expect(suggestion("", "社團招生")).toBe("");
    expect(suggestion("報名截止日期要醒目", "社團招生")).toBe("");
    expect(suggestion("今天天氣", "社團招生")).toBe("");
    expect(suggestion("第一句，", "社團招生")).toBe("");
  });
  it("reads back as one sentence and detects empty briefs", () => {
    expect(briefSentence({ ...emptyBrief, audience: "學生", purpose: "社團招生", mood: "活潑", focus: "價格" })).toBe("給學生看的社團招生，感覺活潑，重點是價格");
    expect(hasBrief(emptyBrief)).toBe(false);
    expect(hasBrief({ ...emptyBrief, note: " x " })).toBe(true);
  });
});

describe("brief in local layout", () => {
  const draft = (brief?: CanvasSpec["metadata"]["brief"]) => {
    let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, name: "頁面", layoutMode: "reflow", ...(brief ? { brief } : {}) } };
    for (const id of ["hero", "features", "pricing", "cta"] as const) {
      const block = createBlock(spec, id)!;
      spec = { ...spec, metadata: { ...spec.metadata, height: block.height }, nodes: [...spec.nodes, ...block.nodes] };
    }
    return CanvasSchema.parse(spec);
  };
  it("mood picks the theme and focus moves its section after the opening", () => {
    const plain = smartLayout(draft());
    expect(plain.sections.map((s) => s.role)).toEqual(["hero", "features", "pricing", "cta"]);
    const briefed = smartLayout(draft({ audience: "學生", purpose: "社團招生", mood: "科技感", focus: "價格", note: "" }));
    expect(briefed.theme).toBe("midnight");
    expect(briefed.sections.map((s) => s.role)).toEqual(["hero", "pricing", "features", "cta"]);
  });
  it("rejects oversized or unknown brief fields", () => {
    expect(() => draft({ audience: "x".repeat(21), purpose: "", mood: "", focus: "", note: "" })).toThrow();
    expect(CanvasSchema.safeParse({ ...draft(), metadata: { ...draft().metadata, brief: { ...emptyBrief, prompt: "ignore rules" } } }).success).toBe(false);
    expect(CanvasSchema.safeParse({ ...draft(), metadata: { ...draft().metadata, brief: { ...emptyBrief, details: "字".repeat(601) } } }).success).toBe(false);
  });
});

describe("deterministic rules applied to any layout plan", () => {
  it("aligns a section's text with its heading and moves the brief's focus up, even if the plan disagrees", async () => {
    const { materialize } = await import("./generation");
    let spec: CanvasSpec = { ...blank(), metadata: { ...blank().metadata, name: "頁面", layoutMode: "reflow", brief: { audience: "", purpose: "", mood: "溫暖", focus: "價格", note: "" } } };
    for (const id of ["hero", "features", "pricing"] as const) {
      const block = createBlock(spec, id)!;
      spec = { ...spec, metadata: { ...spec.metadata, height: block.height }, nodes: [...spec.nodes, ...block.nodes] };
    }
    spec = CanvasSchema.parse(spec);
    const plan = smartLayout(spec);
    // Simulate a model that centres the hero copy under a left heading and keeps pricing last.
    const hero = plan.sections[0];
    const scrambled = { ...plan, theme: "mono" as const, sections: [hero, plan.sections.find((s) => s.role === "features")!, plan.sections.find((s) => s.role === "pricing")!] };
    scrambled.sections[0] = { ...hero, intro: hero.intro.map((i) => (i.presentation === "heading" ? i : { ...i, align: "center" as const })) };
    const page = materialize(spec, scrambled);
    expect(page.theme).toBe("sunrise");
    expect(page.sections.map((s) => s.role)).toEqual(["hero", "pricing", "features"]);
    const aligns = new Set<string>();
    const walk = (n: { type: string; style: { align: string }; children?: unknown[] }) => { if (["heading", "paragraph", "button"].includes(n.type)) aligns.add(n.style.align); (n.children as typeof n[] | undefined)?.forEach(walk); };
    walk(page.sections[0] as never);
    expect([...aligns]).toEqual(["start"]);
  });
});
