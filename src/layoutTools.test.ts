import { describe, expect, it } from "vitest";
import { blank, CanvasSchema, createNode, type CanvasNode, type CanvasSpec } from "./spec";
import { alignSelection, distribute, reorder, snapBox, toggleLock } from "./layoutTools";

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
