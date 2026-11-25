import type { CanvasNode, CanvasSpec } from "./spec";

// Slide-editor style layout tools for the draft canvas: smart guides with
// snapping, layer order, align / distribute and lock. All pure functions.

export type Box = { x: number; y: number; width: number; height: number };
export type Guide = { axis: "v" | "h"; pos: number; from: number; to: number };

const edgesX = (b: Box) => [b.x, b.x + b.width / 2, b.x + b.width];
const edgesY = (b: Box) => [b.y, b.y + b.height / 2, b.y + b.height];

/**
 * Snaps a moving box to the canvas centre/edges and to other elements' edges and
 * centres (within `threshold` canvas px). Returns the snapped position and the
 * guide lines to draw.
 */
export function snapBox(box: Box, others: readonly Box[], canvas: { width: number; height: number }, threshold: number) {
  const targetsX = [0, canvas.width / 2, canvas.width, ...others.flatMap(edgesX)];
  const targetsY = [0, canvas.height / 2, canvas.height, ...others.flatMap(edgesY)];
  const best = (mine: number[], targets: number[]) => {
    let hit: { delta: number; at: number } | null = null;
    for (const m of mine)
      for (const t of targets) {
        const delta = t - m;
        if (Math.abs(delta) <= threshold && (!hit || Math.abs(delta) < Math.abs(hit.delta))) hit = { delta, at: t };
      }
    return hit;
  };
  const sx = best(edgesX(box), targetsX), sy = best(edgesY(box), targetsY);
  const x = box.x + (sx?.delta ?? 0), y = box.y + (sy?.delta ?? 0);
  const snapped = { ...box, x, y };
  const guides: Guide[] = [];
  // Draw every line the snapped box now touches, spanning the boxes that share it.
  const span = (axis: "v" | "h", pos: number) => {
    const all = [snapped, ...others].filter((b) => (axis === "v" ? edgesX(b) : edgesY(b)).some((e) => Math.abs(e - pos) < 0.5));
    const lo = Math.min(...all.map((b) => (axis === "v" ? b.y : b.x)));
    const hi = Math.max(...all.map((b) => (axis === "v" ? b.y + b.height : b.x + b.width)));
    const isCanvas = pos === (axis === "v" ? canvas.width / 2 : canvas.height / 2) && all.length === 1;
    guides.push({ axis, pos, from: isCanvas ? 0 : lo, to: isCanvas ? (axis === "v" ? canvas.height : canvas.width) : hi });
  };
  if (sx) span("v", sx.at);
  if (sy) span("h", sy.at);
  return { x, y, guides };
}

export type LayerMove = "forward" | "backward" | "front" | "back";
/** Changes drawing order (later = on top) for the selected elements, keeping their relative order. */
export function reorder(canvas: CanvasSpec, ids: readonly string[], move: LayerMove): CanvasSpec {
  const pick = new Set(ids);
  const nodes = [...canvas.nodes];
  if (!nodes.some((n) => pick.has(n.id))) return canvas;
  if (move === "front" || move === "back") {
    const chosen = nodes.filter((n) => pick.has(n.id)), rest = nodes.filter((n) => !pick.has(n.id));
    return { ...canvas, nodes: move === "front" ? [...rest, ...chosen] : [...chosen, ...rest] };
  }
  const order = move === "forward" ? [...nodes.keys()].reverse() : [...nodes.keys()];
  for (const i of order) {
    const j = move === "forward" ? i + 1 : i - 1;
    if (j < 0 || j >= nodes.length || !pick.has(nodes[i].id) || pick.has(nodes[j].id)) continue;
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
  }
  return { ...canvas, nodes };
}

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
/** Aligns the selection to its own bounds (or a single element to the canvas). Locked elements stay put. */
export function alignSelection(canvas: CanvasSpec, ids: readonly string[], mode: AlignMode): CanvasSpec {
  const chosen = canvas.nodes.filter((n) => ids.includes(n.id) && !n.locked);
  if (!chosen.length) return canvas;
  const single = canvas.nodes.filter((n) => ids.includes(n.id)).length === 1;
  const bounds = single
    ? { x: 0, y: 0, width: canvas.metadata.width, height: canvas.metadata.height }
    : (() => {
        const all = canvas.nodes.filter((n) => ids.includes(n.id));
        const x = Math.min(...all.map((n) => n.x)), y = Math.min(...all.map((n) => n.y));
        return { x, y, width: Math.max(...all.map((n) => n.x + n.width)) - x, height: Math.max(...all.map((n) => n.y + n.height)) - y };
      })();
  const place = (n: CanvasNode): Partial<CanvasNode> => {
    switch (mode) {
      case "left": return { x: bounds.x };
      case "hcenter": return { x: Math.round(bounds.x + (bounds.width - n.width) / 2) };
      case "right": return { x: bounds.x + bounds.width - n.width };
      case "top": return { y: bounds.y };
      case "vcenter": return { y: Math.round(bounds.y + (bounds.height - n.height) / 2) };
      case "bottom": return { y: bounds.y + bounds.height - n.height };
    }
  };
  const moved = new Map(chosen.map((n) => [n.id, { ...n, ...place(n) }]));
  return { ...canvas, nodes: canvas.nodes.map((n) => moved.get(n.id) ?? n) };
}

/** Spreads three or more elements so the gaps between them are equal. */
export function distribute(canvas: CanvasSpec, ids: readonly string[], axis: "h" | "v"): CanvasSpec {
  const all = canvas.nodes.filter((n) => ids.includes(n.id));
  if (all.length < 3) return canvas;
  const pos = (n: CanvasNode) => (axis === "h" ? n.x : n.y), size = (n: CanvasNode) => (axis === "h" ? n.width : n.height);
  const sorted = [...all].sort((a, b) => pos(a) - pos(b));
  const start = pos(sorted[0]), end = Math.max(...sorted.map((n) => pos(n) + size(n)));
  const gap = (end - start - sorted.reduce((s, n) => s + size(n), 0)) / (sorted.length - 1);
  const moved = new Map<string, CanvasNode>();
  let at = start;
  for (const n of sorted) {
    if (!n.locked) moved.set(n.id, { ...n, [axis === "h" ? "x" : "y"]: Math.round(at) });
    at += size(n) + gap;
  }
  return { ...canvas, nodes: canvas.nodes.map((n) => moved.get(n.id) ?? n) };
}

/** Locks the selection, or unlocks it when every selected element is already locked. */
export function toggleLock(canvas: CanvasSpec, ids: readonly string[]): { canvas: CanvasSpec; locked: boolean } {
  const chosen = canvas.nodes.filter((n) => ids.includes(n.id));
  const lock = !chosen.every((n) => n.locked);
  return {
    locked: lock,
    canvas: {
      ...canvas,
      nodes: canvas.nodes.map((n) => {
        if (!ids.includes(n.id)) return n;
        if (lock) return { ...n, locked: true };
        const { locked: _l, ...rest } = n;
        void _l;
        return rest;
      }),
    },
  };
}

/**
 * Text boxes grow (or shrink) to fit their text. When a box grows, everything
 * directly below it on the same page (overlapping horizontally) moves down by the
 * same amount, so nothing ends up on top of anything else. The canvas grows in
 * 600px steps when needed. Returns the canvas unchanged when nothing moves.
 */
export function fitHeights(canvas: CanvasSpec, heights: ReadonlyMap<string, number>, maxHeight: number, samePage: (a: CanvasNode, b: CanvasNode) => boolean = () => true): CanvasSpec {
  let nodes = canvas.nodes.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const changed = [...heights.entries()]
    .map(([id, h]) => ({ node: byId.get(id)!, h: Math.max(40, Math.min(1200, Math.round(h))) }))
    .filter(({ node, h }) => node && node.height !== h)
    .sort((a, b) => a.node.y - b.node.y);
  if (!changed.length) return canvas;
  for (const { node, h } of changed) {
    const oldBottom = node.y + node.height, delta = h - node.height;
    node.height = h;
    if (delta <= 0) continue;
    for (const other of nodes) {
      if (other === node || heights.has(other.id) && other.y < node.y || !samePage(node, other)) continue;
      const overlapsX = other.x < node.x + node.width && other.x + other.width > node.x;
      if (overlapsX && other.y >= oldBottom - 4) other.y += delta;
    }
  }
  const bottom = Math.max(...nodes.map((n) => n.y + n.height));
  let height = canvas.metadata.height;
  if (bottom > height) height = Math.min(maxHeight, Math.ceil(bottom / 600) * 600);
  // Anything that would fall off the canvas stays at the bottom edge.
  nodes = nodes.map((n) => (n.y + n.height > height ? { ...n, y: Math.max(0, height - n.height) } : n));
  return { ...canvas, metadata: { ...canvas.metadata, height }, nodes };
}
