import { expect, it } from "vitest";
import { pictureKind } from "./PageRuntime";
// 32×32 RGBA thumbnails.
const thumb = (pixel: (x: number, y: number) => [number, number, number]) => {
  const d: number[] = [];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) d.push(...pixel(x, y), 255);
  return d;
};
it("keeps screenshots whole and lets photos be cropped", () => {
  // A slide: flat background with a few bars.
  expect(pictureKind(thumb((x, y) => (y > 20 && x % 8 < 4 ? [30, 140, 110] : [250, 248, 240])))).toBe("screen");
  // A photo, even a dark one: every pixel differs a little from its neighbour.
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) % 23);
  expect(pictureKind(thumb((x, y) => [20 + noise() + x, 18 + noise() + y, 30 + noise()]))).toBe("photo");
});
