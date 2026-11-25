import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from "react";
import {
  bounds,
  contains,
  localPoint,
  marqueeTypes,
  effectMime,
  type Annotation,
  type Point,
} from "./visualEditing";
import { componentIdFromElement, type PageNode } from "./pageSpec";
export type VisualMode = "browse" | "select" | "pen";
export function VisualSurface({
  children,
  mode,
  selected,
  onSelect,
  onDropEffect,
  canDrop,
  dragging,
  annotations,
  onAnnotation,
  sessionId,
  revision,
}: {
  children: ReactNode;
  mode: VisualMode;
  selected: string[];
  onSelect(ids: string[]): void;
  onDropEffect(id: string, effect: string): void;
  canDrop(id: string): boolean;
  dragging: boolean;
  annotations: Annotation[];
  onAnnotation(a: Annotation): void;
  sessionId: string;
  revision: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    pointerId: number;
    start: Point;
    points: Point[];
    id: string | null;
    drawing: boolean;
    revision: number;
  } | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const el = root.current!;
    const measure = () =>
      setSize({ width: el.offsetWidth || 1, height: el.offsetHeight || 1 });
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    gesture.current = null;
    setPoints([]);
  }, [size.width, size.height]);
  useEffect(() => {
    if (!dragging) setHover(null);
  }, [dragging]);
  useEffect(() => {
    gesture.current = null;
    setPoints([]);
    setHover(null);
  }, [mode, sessionId, revision]);
  useEffect(() => {
    const el = root.current!;
    el.querySelectorAll<HTMLElement>("[data-page-id]").forEach((node) => {
      node.toggleAttribute("data-drop-target", node.dataset.pageId === hover);
      node.toggleAttribute(
        "data-drop-invalid",
        node.dataset.pageId === hover && !canDrop(node.dataset.pageId!),
      );
      if (selected.includes(node.dataset.pageId!))
        node.setAttribute("data-page-selected", "true");
      else node.removeAttribute("data-page-selected");
    });
  }, [selected, hover, children, canDrop]);
  function point(e: { clientX: number; clientY: number }) {
    const el = root.current!,
      r = el.getBoundingClientRect();
    return localPoint(
      { x: e.clientX, y: e.clientY },
      { x: r.x, y: r.y, width: r.width, height: r.height },
      el.offsetWidth,
      el.offsetHeight,
    );
  }
  function finish(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    setPoints([]);
    if (root.current?.hasPointerCapture(e.pointerId))
      root.current.releasePointerCapture(e.pointerId);
    if (g.revision !== revision) return;
    if (mode === "pen") {
      const el = root.current!,
        r = el.getBoundingClientRect();
      const ps = [...g.points, point(e)].slice(0, 2000);
      onAnnotation({
        schemaVersion: 1,
        coordinateSpace: "preview-css-pixels",
        id: crypto.randomUUID(),
        sessionId,
        revision,
        geometry: {
          width: el.offsetWidth,
          height: el.offsetHeight,
          scaleX: r.width / el.offsetWidth,
          scaleY: r.height / el.offsetHeight,
        },
        points: ps,
        bounds: bounds(ps),
      });
    } else if (
      g.drawing &&
      Math.hypot(point(e).x - g.start.x, point(e).y - g.start.y) > 4
    ) {
      const box = bounds([g.start, point(e)]),
        el = root.current!,
        r = el.getBoundingClientRect();
      const ids: string[] = [];
      el.querySelectorAll<HTMLElement>("[data-page-id]").forEach((n) => {
        if (!marqueeTypes.has(n.dataset.pageType as PageNode["type"])) return;
        const nr = n.getBoundingClientRect();
        const p = localPoint(
          { x: nr.x, y: nr.y },
          { x: r.x, y: r.y, width: r.width, height: r.height },
          el.offsetWidth,
          el.offsetHeight,
        );
        if (
          contains(box, {
            ...p,
            width: (nr.width * el.offsetWidth) / r.width,
            height: (nr.height * el.offsetHeight) / r.height,
          })
        )
          ids.push(n.dataset.pageId!);
      });
      onSelect(ids);
    } else onSelect(g.id ? [g.id] : []);
  }
  const visibleAnnotations = annotations.filter(
    (a) =>
      a.sessionId === sessionId &&
      a.revision === revision &&
      Math.abs(a.geometry.width - size.width) < 1 &&
      Math.abs(a.geometry.height - size.height) < 1,
  );
  const box = points.length ? bounds(points) : null;
  return (
    <div
      ref={root}
      className={"visual-surface mode-" + mode}
      data-testid="visual-surface"
      data-preview-width={size.width}
      data-preview-height={size.height}
      onClickCapture={(e) => {
        if (mode === "browse" && !componentIdFromElement(e.target as Element))
          onSelect([]);
        if (mode !== "browse") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerDownCapture={(e) => {
        if (mode === "browse" || e.button !== 0 || !e.isPrimary) return;
        e.preventDefault();
        const id = componentIdFromElement(e.target as Element);
        const target = (e.target as Element).closest<HTMLElement>(
          "[data-page-id]",
        );
        const drawing =
          mode === "pen" ||
          !target ||
          ["section", "container", "stack", "grid"].includes(
            target.dataset.pageType!,
          );
        const p = point(e);
        gesture.current = {
          pointerId: e.pointerId,
          start: p,
          points: [p],
          id,
          drawing,
          revision,
        };
        root.current!.setPointerCapture(e.pointerId);
        setPoints([p]);
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (!g || g.pointerId !== e.pointerId) return;
        const p = point(e);
        if (mode === "pen") {
          if (g.points.length < 1999) g.points.push(p);
          setPoints([...g.points]);
        } else if (g.drawing) setPoints([g.start, p]);
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        gesture.current = null;
        setPoints([]);
      }}
      onLostPointerCapture={() => {
        gesture.current = null;
        setPoints([]);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(effectMime)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setHover(componentIdFromElement(e.target as Element));
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setHover(null);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(effectMime)) return;
        e.preventDefault();
        const id = componentIdFromElement(e.target as Element);
        setHover(null);
        if (id) onDropEffect(id, e.dataTransfer.getData(effectMime));
      }}
    >
      {children}
      <svg
        className="annotation-layer"
        role="group"
        aria-label="預覽註記圖層"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
      >
        {visibleAnnotations.map((a) => (
          <polyline
            key={a.id}
            data-annotation-id={a.id}
            data-geometry={JSON.stringify(a.geometry)}
            points={a.points.map((p) => `${p.x},${p.y}`).join(" ")}
          />
        ))}
        {mode === "pen" && points.length > 0 && (
          <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} />
        )}
        {mode === "select" && box && gesture.current?.drawing && (
          <rect
            data-testid="marquee"
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
          />
        )}
      </svg>
      {mode === "pen" && visibleAnnotations.length < annotations.length && (
        <small className="annotation-status">
          版面已變更，舊註記暫時隱藏
        </small>
      )}
    </div>
  );
}
