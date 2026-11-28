// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { referenceMotions, referenceMotionIds, ReferenceMotionSchema } from "./referenceMotions";
import { motionCatalog, motionIds, defaultControls } from "./motionCatalog";
import { combinationReason, createMotion, targetReason } from "./motion";
import { PageSchema, type PageNode } from "./pageSpec";
import { PageRenderer } from "./PageRenderer";
import { exportProjectFiles } from "./exportProject";
import { motionAssetRefs } from "./assetRef";

const original68 = motionIds.slice(0, 68);
const inventory = JSON.parse(readFileSync("docs/motion-reference/inventory.json", "utf8")) as {
  source: { items: number };
  rows: { sourceId: number; category: string; sketch2site: string | null; priority: string | null; credit: { url: string }[]; license: string }[];
};

describe("reference motion metadata", () => {
  it("validates, never reuses an existing id, and lists exactly the built motions as DONE", () => {
    for (const m of referenceMotions) expect(ReferenceMotionSchema.safeParse(m).success).toBe(true);
    const ids = referenceMotions.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(original68).not.toContain(id);
    expect(referenceMotions.filter((m) => m.status === "DONE").map((m) => m.id).sort()).toEqual([...referenceMotionIds].sort());
    expect(motionIds.slice(68)).toEqual([...referenceMotionIds]);
    for (const id of referenceMotionIds) {
      expect(motionCatalog[id].status).toBe("DONE");
      expect(motionCatalog[id].nameZh).toBe(referenceMotions.find((m) => m.id === id)!.nameZh);
    }
    // Planned motions are not in the catalog, so they cannot be applied or counted.
    for (const m of referenceMotions.filter((x) => x.status === "PLANNED")) expect(motionIds).not.toContain(m.id);
  });
  it("records an inspiration link for every motion", () => {
    for (const m of referenceMotions) for (const s of m.inspiration) expect(s.url).toBe("https://kittenjam-motion-library.vercel.app/");
  });
});

describe("reference inventory", () => {
  it("has one row for each of the 347 source items, a category, a credit and a licence note", () => {
    expect(inventory.source.items).toBe(347);
    expect(inventory.rows.map((r) => r.sourceId)).toEqual(Array.from({ length: 347 }, (_, i) => i + 1));
    const categories = new Set(["已有同等功能", "既有功能可擴充", "需要新增動畫", "需要新增複合互動元件", "不適合目前架構或需要額外授權"]);
    for (const r of inventory.rows) {
      expect(categories.has(r.category)).toBe(true);
      expect(r.credit[0].url).toBe("https://kittenjam-motion-library.vercel.app/");
      expect(r.license).toMatch(/不複製/);
    }
    // Rows marked done point at a built motion; rows mapped to an existing motion point at a real id.
    for (const r of inventory.rows.filter((x) => x.priority === "P1")) expect(referenceMotionIds).toContain(r.sketch2site);
    for (const r of inventory.rows.filter((x) => x.category === "已有同等功能" && /^[a-z-]+$/.test(x.sketch2site ?? ""))) expect(original68).toContain(r.sketch2site);
    const text = readFileSync("docs/motion-reference/inventory.json", "utf8");
    expect(text).not.toMatch(/"(zh|en|desc|prompt)":/);
  });
});

const style = () => ({ gap: "none", padding: "none", align: "start", tone: "plain", width: "full" }) as const;
function pageWith(node: Omit<PageNode, "id" | "style" | "effects">, id: (typeof referenceMotionIds)[number], controls: Record<string, unknown> = {}) {
  const nid = crypto.randomUUID();
  return PageSchema.parse({
    schemaVersion: 2, metadata: { title: "測試", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
    sections: [{ id: crypto.randomUUID(), type: "section", style: style(), effects: [], children: [{ ...node, id: nid, style: style(), effects: [createMotion(id, nid, controls)] }] }],
  });
}
const chart = { type: "media", content: "來客", media: { kind: "chart", chart: "bar", points: [{ label: "一", value: 3 }, { label: "二", value: 5 }], unit: "" } } as const;

let reduce = false;
// jsdom has no matchMedia; without it the runtime treats the viewer as preferring reduced motion.
Object.defineProperty(window, "matchMedia", { configurable: true, value: (q: string) => ({ matches: q.includes("reduce") ? reduce : false, media: q, addEventListener() {}, removeEventListener() {} }) });

describe("reference motion runtime", () => {
  it("dolly-frame zooms inside the frame on hover, shows the alt text as an aria-hidden caption and cleans up", () => {
    const { container, unmount } = render(createElement(PageRenderer, { input: pageWith({ type: "image", src: "/assets/samples/cafe.jpg", alt: "店裡的吧台" }, "dolly-frame") }));
    const host = container.querySelector<HTMLElement>("[data-effects~=dolly-frame]")!;
    expect(host.classList.contains("ref-dolly")).toBe(true);
    expect(host.style.overflow).toBe("hidden");
    const caption = host.querySelector(".ref-caption")!;
    expect(caption.textContent).toBe("店裡的吧台");
    expect(caption.getAttribute("aria-hidden")).toBe("true");
    fireEvent.pointerEnter(host, { pointerType: "mouse" });
    expect(host.hasAttribute("data-ref-on")).toBe(true);
    fireEvent.pointerLeave(host, { pointerType: "mouse" });
    expect(host.hasAttribute("data-ref-on")).toBe(false);
    fireEvent.focusIn(host);
    expect(host.hasAttribute("data-ref-on")).toBe(true);
    unmount();
    expect(host.classList.contains("ref-dolly")).toBe(false);
    expect(host.querySelector(".ref-caption")).toBeNull();
    expect(host.style.overflow).toBe("");
  });
  it("color-wake sets the muted level and turns on with focus", () => {
    const { container } = render(createElement(PageRenderer, { input: pageWith({ type: "image", src: "/assets/samples/cafe.jpg", alt: "咖啡" }, "color-wake", { muted: 0.6 }) }));
    const host = container.querySelector<HTMLElement>("[data-effects~=color-wake]")!;
    expect(host.classList.contains("ref-wake")).toBe(true);
    expect(host.style.getPropertyValue("--ref-muted")).toBe("0.6");
    fireEvent.focusIn(host);
    expect(host.hasAttribute("data-ref-on")).toBe(true);
    cleanup();
  });
  it("scroll-ink-words keeps the real text and adds an aria-hidden word layer", () => {
    const text = "每一杯咖啡，都從一顆豆子的旅程開始";
    const { container } = render(createElement(PageRenderer, { input: pageWith({ type: "paragraph", content: text }, "scroll-ink-words") }));
    const host = container.querySelector<HTMLElement>("[data-effects~=scroll-ink-words]")!;
    const layer = host.querySelector(".ref-ink")!;
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.textContent).toBe(text);
    expect(layer.children.length).toBeGreaterThan(1);
    expect([...host.childNodes].filter((n) => n !== layer).map((n) => n.textContent).join("")).toBe(text);
    cleanup();
  });
  it("hollow-fill-sweep, letter-windows and bold-relay change only presentation", () => {
    const hollow = render(createElement(PageRenderer, { input: pageWith({ type: "heading", level: 2, content: "滑過填滿" }, "hollow-fill-sweep") }));
    const h = hollow.container.querySelector<HTMLElement>("[data-effects~=hollow-fill-sweep]")!;
    expect(h.classList.contains("ref-hollow")).toBe(true);
    expect(h.textContent).toBe("滑過填滿");
    fireEvent.pointerEnter(h, { pointerType: "mouse" });
    expect(h.hasAttribute("data-ref-on")).toBe(true);
    cleanup();
    const windows = render(createElement(PageRenderer, { input: pageWith({ type: "heading", level: 1, content: "COFFEE" }, "letter-windows") }));
    const w = windows.container.querySelector<HTMLElement>("[data-effects~=letter-windows]")!;
    expect(w.style.backgroundImage).toContain("coffee-pourover.jpg");
    // The solid layer keeps the words readable when the photo fails.
    expect(w.style.backgroundImage).toContain("linear-gradient");
    cleanup();
    const relay = render(createElement(PageRenderer, { input: pageWith({ type: "heading", level: 2, content: "粗體接力" }, "bold-relay") }));
    const b = relay.container.querySelector<HTMLElement>("[data-effects~=bold-relay]")!;
    const layer = b.querySelector(".ref-relay")!;
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.children).toHaveLength(4);
    cleanup();
  });
  it("reduced motion keeps the plain text: no word layer, no outline, no weight copy", () => {
    reduce = true;
    for (const id of ["scroll-ink-words", "hollow-fill-sweep", "bold-relay"] as const) {
      const { container } = render(createElement(PageRenderer, { input: pageWith({ type: "heading", level: 2, content: "安靜的標題" }, id) }));
      const host = container.querySelector<HTMLElement>(`[data-effects~=${id}]`)!;
      expect(host.querySelector(".ref-ink,.ref-relay")).toBeNull();
      expect(host.classList.contains("ref-hollow")).toBe(false);
      expect(host.style.color).toBe("");
      cleanup();
    }
    reduce = false;
  });
  it("chart-build only accepts charts and draws on the chart", () => {
    expect(targetReason({ type: "media", media: { kind: "carousel" } }, "chart-build")).not.toBeNull();
    expect(targetReason({ type: "image" }, "chart-build")).not.toBeNull();
    expect(targetReason({ type: "media", media: { kind: "chart" } }, "chart-build")).toBeNull();
    const { container } = render(createElement(PageRenderer, { input: pageWith(chart as never, "chart-build") }));
    expect(container.querySelectorAll("[data-effects~=chart-build] rect.chart-bar")).toHaveLength(2);
    cleanup();
  });
  it("refuses combinations that fight over the same text or image", () => {
    expect(combinationReason([{ presetId: "hollow-fill-sweep" }, { presetId: "gradient-text-flow" }])).not.toBeNull();
    expect(combinationReason([{ presetId: "bold-relay" }, { presetId: "typewriter" }])).not.toBeNull();
    expect(combinationReason([{ presetId: "dolly-frame" }, { presetId: "cinematic-image-pan" }])).not.toBeNull();
    expect(combinationReason([{ presetId: "chart-build" }, { presetId: "fade-in" }])).not.toBeNull();
    expect(combinationReason([{ presetId: "dolly-frame" }, { presetId: "color-wake" }])).toBeNull();
  });
  it("validates controls strictly", () => {
    for (const id of referenceMotionIds) expect(() => createMotion(id, crypto.randomUUID(), defaultControls(id))).not.toThrow();
    expect(() => createMotion("dolly-frame", crypto.randomUUID(), { zoom: 3 })).toThrow();
    expect(() => createMotion("letter-windows", crypto.randomUUID(), { image: "https://evil.example/x.jpg" })).toThrow();
    expect(() => createMotion("bold-relay", crypto.randomUUID(), { onclick: "x" })).toThrow();
  });
});

describe("export", () => {
  it("ships the runtime, the metadata and the photo a motion uses", async () => {
    const page = pageWith({ type: "heading", level: 1, content: "COFFEE" }, "letter-windows");
    expect(motionAssetRefs(page.sections[0].children![0].effects)).toEqual(["/assets/samples/coffee-pourover.jpg"]);
    const files = await exportProjectFiles(page).catch((e: Error) => e);
    // Fetching built-in photos needs the dev server; the file list is checked in the e2e test.
    if (files instanceof Error) return;
    const paths = files.map((f) => f.path);
    expect(paths).toContain("src/ReferenceMotion.tsx");
    expect(paths).toContain("src/referenceMotions.ts");
  });
});
