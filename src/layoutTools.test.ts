import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, createNode, type CanvasNode, type CanvasSpec } from "./spec";
import { alignSelection, distribute, fitHeights, reorder, snapBox, spacingAround, toggleLock } from "./layoutTools";

const box = (x: number, y: number, width = 100, height = 50, type: CanvasNode["type"] = "text") => ({ ...createNode(type, x, y), width, height });
const draft = (...nodes: CanvasNode[]): CanvasSpec => CanvasSchema.parse({ ...blank(), nodes });

describe("layout tools", () => {
  it("snaps to other elements and the canvas centre and reports guides", () => {
    const other = { x: 200, y: 300, width: 100, height: 50 };
    const r = snapBox({ x: 204, y: 400, width: 100, height: 40 }, [other], { width: 1440, height: 1200 }, 6);
    expect(r.x).toBe(200);
    expect(r.guides[0]).toMatchObject({ axis: "v", pos: 200, from: 300, to: 440 });
    const centre = snapBox({ x: 667, y: 10, width: 100, height: 40 }, [], { width: 1440, height: 1200 }, 6);
    expect(centre.x).toBe(670);
    expect(centre.guides[0]).toMatchObject({ axis: "v", pos: 720, from: 0, to: 1200 });
    expect(snapBox({ x: 230, y: 700, width: 100, height: 40 }, [other], { width: 1440, height: 1200 }, 6).guides).toEqual([]);
  });

  it("reorders layers, keeping the selection's relative order", () => {
    const [a, b, c, d] = [box(0, 0), box(0, 100), box(0, 200), box(0, 300)];
    const spec = draft(a, b, c, d);
    const ids = (s: CanvasSpec) => s.nodes.map((n) => n.id);
    expect(ids(reorder(spec, [a.id], "forward"))).toEqual([b.id, a.id, c.id, d.id]);
    expect(ids(reorder(spec, [a.id, b.id], "front"))).toEqual([c.id, d.id, a.id, b.id]);
    expect(ids(reorder(spec, [d.id], "back"))).toEqual([d.id, a.id, b.id, c.id]);
    expect(ids(reorder(spec, [a.id], "backward"))).toEqual(ids(spec));
  });

  it("aligns to the selection (or the canvas for one element) and distributes evenly", () => {
    const [a, b, c] = [box(100, 0, 100), box(300, 100, 200), box(800, 200, 100)];
    const spec = draft(a, b, c);
    const at = (s: CanvasSpec) => s.nodes.map((n) => [n.x, n.y]);
    expect(at(alignSelection(spec, [a.id, b.id, c.id], "left"))).toEqual([[100, 0], [100, 100], [100, 200]]);
    expect(at(alignSelection(spec, [a.id, b.id, c.id], "right")).map(([x]) => x)).toEqual([800, 700, 800]);
    expect(alignSelection(spec, [a.id], "hcenter").nodes[0].x).toBe(670);
    // 3 boxes from 100 to 900 with widths 100+200+100 leave two equal gaps of 200.
    expect(at(distribute(spec, [a.id, b.id, c.id], "h")).map(([x]) => x)).toEqual([100, 400, 800]);
    expect(distribute(spec, [a.id, b.id], "h")).toBe(spec);
  });

  it("locks and unlocks; locked elements are not moved by align or distribute", () => {
    const [a, b] = [box(100, 0), box(400, 100)];
    const locked = toggleLock(draft(a, b), [a.id]);
    expect(locked.locked).toBe(true);
    expect(CanvasSchema.safeParse(locked.canvas).success).toBe(true);
    expect(alignSelection(locked.canvas, [a.id, b.id], "left").nodes.map((n) => n.x)).toEqual([100, 100]);
    expect(alignSelection(locked.canvas, [a.id], "right").nodes[0].x).toBe(100);
    const unlocked = toggleLock(locked.canvas, [a.id]);
    expect(unlocked.locked).toBe(false);
    expect("locked" in unlocked.canvas.nodes[0]).toBe(false);
  });
});

describe("text boxes fit their text", () => {
  it("grows a box and pushes what is below it, leaving other columns alone", () => {
    const top = box(80, 80, 400, 60), below = box(80, 160, 400, 60), side = box(600, 160, 300, 60);
    const spec = draft(top, below, side);
    const next = fitHeights(spec, new Map([[top.id, 120]]), 4800);
    const at = (id: string) => next.nodes.find((n) => n.id === id)!;
    expect(at(top.id).height).toBe(120);
    expect(at(below.id).y).toBe(220);
    expect(at(side.id).y).toBe(160);
    // Shrinking only shrinks the box.
    const smaller = fitHeights(spec, new Map([[top.id, 40]]), 4800);
    expect(smaller.nodes.find((n) => n.id === below.id)!.y).toBe(160);
    expect(fitHeights(spec, new Map([[top.id, 60]]), 4800)).toBe(spec);
  });
  it("grows the canvas in steps when text runs past the bottom", () => {
    const last = box(80, 1100, 400, 80);
    const next = fitHeights(draft(last), new Map([[last.id, 300]]), 4800);
    expect(next.metadata.height).toBe(1800);
    expect(CanvasSchema.safeParse(next).success).toBe(true);
  });
});

describe("Alt distances", () => {
  it("measures to the nearest element on each side, or to the canvas edge", () => {
    const box = { x: 200, y: 300, width: 100, height: 50 };
    const others = [{ x: 40, y: 310, width: 100, height: 20 }, { x: 400, y: 100, width: 50, height: 50 }, { x: 220, y: 100, width: 40, height: 40 }];
    const m = spacingAround(box, others, { width: 1440, height: 1200 });
    const by = (axis: string, x1: number) => m.find((s) => s.axis === axis && (s.x1 === x1 || s.y1 === x1));
    expect(by("h", 140)?.length).toBe(60); // left neighbour ends at 140
    expect(by("h", 300)?.length).toBe(1140); // nothing overlaps on the right: canvas edge
    expect(by("v", 140)?.length).toBe(160); // the box above ends at 140
    expect(by("v", 350)?.length).toBe(850); // canvas bottom
  });
});
