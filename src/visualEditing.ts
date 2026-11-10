import type { PageNode } from "./pageSpec";
export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type PreviewGeometry = {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
};
export type Annotation = {
  schemaVersion: 1;
  coordinateSpace: "preview-css-pixels";
  id: string;
  sessionId: string;
  revision: number;
  geometry: PreviewGeometry;
  points: Point[];
  bounds: Rect;
};
export function localPoint(
  client: Point,
  rect: Rect,
  width: number,
  height: number,
): Point {
  return {
    x: Math.max(0, Math.min(width, ((client.x - rect.x) * width) / rect.width)),
    y: Math.max(
      0,
      Math.min(height, ((client.y - rect.y) * height) / rect.height),
    ),
  };
}
export function bounds(points: Point[]): Rect {
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function contains(outer: Rect, inner: Rect) {
  return (
    inner.width > 0 &&
    inner.height > 0 &&
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}
export const marqueeTypes = new Set<PageNode["type"]>([
  "heading",
  "paragraph",
  "button",
  "image",
  "card",
]);
export const effectLabels = {
  "fade-in": "淡入",
  "slide-up": "向上滑入",
  "scale-in": "縮放進入",
  "hover-lift": "懸停上浮",
  "hover-glow": "懸停強調",
  "stagger-reveal": "依序顯示",
} as const;
export const effectMime = "application/x-sketch2site-effect";

export const nodeLabels: Record<PageNode["type"], string> = {
  section: "區塊",
  container: "容器",
  heading: "標題",
  paragraph: "正文",
  button: "按鈕",
  image: "圖片",
  card: "卡片",
  stack: "堆疊",
  grid: "網格",
};
