import { useRef } from "react";

// A thin handle on a side panel's inner edge: drag (or use the arrow keys) to change its width.
export function PanelResizer({ side, width, min, max, label, onChange }: { side: "left" | "right"; width: number; min: number; max: number; label: string; onChange: (w: number) => void }) {
  const start = useRef<{ x: number; w: number } | null>(null);
  const clamp = (w: number) => Math.round(Math.min(max, Math.max(min, w)));
  return (
    <div
      className={"panel-resizer is-" + side}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start.current = { x: e.clientX, w: width }; }}
      onPointerMove={(e) => { const s = start.current; if (s) onChange(clamp(s.w + (side === "left" ? e.clientX - s.x : s.x - e.clientX))); }}
      onPointerUp={() => (start.current = null)}
      onPointerCancel={() => (start.current = null)}
      onDoubleClick={() => onChange(clamp(side === "left" ? 260 : 300))}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10;
        if (e.key === "ArrowLeft") { e.preventDefault(); onChange(clamp(width + (side === "left" ? -step : step))); }
        if (e.key === "ArrowRight") { e.preventDefault(); onChange(clamp(width + (side === "left" ? step : -step))); }
      }}
    />
  );
}
