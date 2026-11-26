import type { CanvasSpec } from "./spec";
import { isLocalAsset } from "./assetRef";
import { readAsset } from "./assets";

import { snapshotLimits, SnapshotSchemaPattern } from "./draftSnapshotRules";

type Node = CanvasSpec["nodes"][number];
const defaultSize: Record<string, number> = { heading: 40, text: 18, card: 16, button: 16 };

async function loadPicture(ref: string): Promise<CanvasImageSource | null> {
  try {
    if (isLocalAsset(ref)) {
      const asset = await readAsset(ref);
      return asset ? await createImageBitmap(asset.blob) : null;
    }
    const img = new Image();
    img.src = import.meta.env.BASE_URL + ref.slice(1);
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function drawCover(ctx: CanvasRenderingContext2D, pic: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const pw = (pic as { width: number }).width, ph = (pic as { height: number }).height;
  if (!pw || !ph) return;
  const s = Math.max(w / pw, h / ph), sw = w / s, sh = h / s;
  ctx.drawImage(pic, (pw - sw) / 2, (ph - sh) / 2, sw, sh, x, y, w, h);
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, size: number, bold: boolean, align: CanvasTextAlign = "left") {
  ctx.font = `${bold ? 700 : 400} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const tx = align === "center" ? x + w / 2 : x;
  if (align === "right") x -= w;
  let line = "", ly = y;
  for (const ch of text.replace(/\s+/g, " ")) {
    if (ch === "\n" || ctx.measureText(line + ch).width > w) {
      ctx.fillText(line, tx, ly);
      ly += size * 1.3;
      line = ch === "\n" ? "" : ch;
      if (ly + size > y + h) return;
    } else line += ch;
  }
  if (line) ctx.fillText(line, tx, ly);
}

/**
 * Draws the author's draft canvas into a small JPEG for the AI to judge emphasis, photos and mood.
 * Built from the draft data (not a screen capture), so nothing else on screen can leak in.
 * Returns null when the browser cannot draw it; generation then goes ahead without a picture.
 */
export async function draftSnapshot(spec: CanvasSpec): Promise<string | null> {
  try {
    const { width, height } = spec.metadata;
    const scale = Math.min(snapshotLimits.width / width, snapshotLimits.maxHeight / height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const nodes = [...spec.nodes].sort((a, b) => a.zIndex - b.zIndex);
    const pictures = new Map<string, CanvasImageSource | null>();
    await Promise.all(
      [...new Set(nodes.flatMap((n) => (n.type === "image" && n.assetId ? [n.assetId] : [])))].map(async (ref) => pictures.set(ref, await loadPicture(ref))),
    );
    for (const n of nodes as Node[]) {
      const x = n.x * scale, y = n.y * scale, w = n.width * scale, h = n.height * scale;
      const size = Math.max(5, ((n.textStyle?.size ?? defaultSize[n.type] ?? 16) * scale));
      if (n.type === "image") {
        const pic = n.assetId ? pictures.get(n.assetId) : null;
        if (pic) drawCover(ctx, pic, x, y, w, h);
        else { ctx.fillStyle = "#d9d9d9"; ctx.fillRect(x, y, w, h); }
      } else if (n.type === "button") {
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.min(h / 2, 8));
        ctx.fill();
        ctx.fillStyle = "#fff";
        drawText(ctx, n.content, x, y + (h - size) / 2, w, h, size, true, "center");
      } else if (n.type === "card") {
        ctx.strokeStyle = "#bbb";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "#333";
        drawText(ctx, n.content, x + 4, y + 4, w - 8, h - 8, size, false);
      } else if (n.type === "heading" || n.type === "text") {
        ctx.fillStyle = "#111";
        const align = n.textStyle?.align === "center" ? "center" : n.textStyle?.align === "end" ? "right" : "left";
        drawText(ctx, n.content, align === "right" ? x + w : x, y, w, h, size, n.type === "heading", align);
      } else {
        ctx.fillStyle = "#eee";
        ctx.fillRect(x, y, w, h);
      }
    }
    for (const q of [0.7, 0.5, 0.35]) {
      const url = canvas.toDataURL("image/jpeg", q);
      if (url.length <= snapshotLimits.maxChars && SnapshotSchemaPattern.test(url)) return url;
    }
    return null;
  } catch {
    return null;
  }
}
