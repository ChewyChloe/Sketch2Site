// "自動對準重點": estimates where the interesting part of a photo is, locally and
// without any model. It looks for detail (edges) in a small copy of the photo and
// returns the weighted centre of the most detailed area as a crop focus point.
// It is an estimate: plain backgrounds have little detail, subjects have more.

/** Focus point (percent) from a luminance grid (values 0–255, row by row). */
export function focusFromLuma(luma: ArrayLike<number>, width: number, height: number): { focusX: number; focusY: number } {
  if (width < 3 || height < 3) return { focusX: 50, focusY: 50 };
  const energy: number[] = [];
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = luma[i + 1] - luma[i - 1], gy = luma[i + width] - luma[i - width];
      energy.push(Math.abs(gx) + Math.abs(gy));
    }
  // Keep the most detailed fifth of the pixels; ignore flat areas.
  const cut = [...energy].sort((a, b) => b - a)[Math.floor(energy.length * 0.2)] ?? 0;
  let sx = 0, sy = 0, sw = 0;
  energy.forEach((e, k) => {
    if (e <= cut || e === 0) return;
    const x = (k % (width - 2)) + 1, y = Math.floor(k / (width - 2)) + 1;
    // A light pull towards the centre keeps one stray edge from winning.
    const w = e * (1 - 0.35 * Math.hypot(x / width - 0.5, y / height - 0.5));
    sx += x * w;
    sy += y * w;
    sw += w;
  });
  if (!sw) return { focusX: 50, focusY: 50 };
  const round = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
  return { focusX: round(((sx / sw) / (width - 1)) * 100), focusY: round(((sy / sw) / (height - 1)) * 100) };
}

/** Loads the photo (same-origin or blob URL) and estimates its focus point. */
export async function smartFocus(url: string): Promise<{ focusX: number; focusY: number }> {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  const scale = 64 / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.max(3, Math.round(img.naturalWidth * scale)), h = Math.max(3, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { focusX: 50, focusY: 50 };
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const luma = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) luma[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return focusFromLuma(luma, w, h);
}
