import { describe, expect, it } from "vitest";
import { focusFromLuma } from "./smartCrop";

const grid = (w: number, h: number, paint: (x: number, y: number) => number) => Array.from({ length: w * h }, (_, i) => paint(i % w, Math.floor(i / w)));

describe("smart crop", () => {
  it("finds the detailed area of a photo", () => {
    // A checkered subject in the top-right corner of a flat background.
    const luma = grid(40, 30, (x, y) => (x > 28 && y < 10 ? ((x + y) % 2 ? 255 : 0) : 120));
    const f = focusFromLuma(luma, 40, 30);
    expect(f.focusX).toBeGreaterThan(70);
    expect(f.focusY).toBeLessThan(35);
  });
  it("stays centred on a flat photo", () => {
    expect(focusFromLuma(grid(20, 20, () => 90), 20, 20)).toEqual({ focusX: 50, focusY: 50 });
    expect(focusFromLuma([], 0, 0)).toEqual({ focusX: 50, focusY: 50 });
  });
});
