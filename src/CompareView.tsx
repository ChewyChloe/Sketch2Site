import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageRenderer } from "./PageRenderer";
import type { PageSpec } from "./pageSpec";

/**
 * Before / after: the two versions are drawn on top of each other and a handle wipes between
 * them. When the change was limited to some sections, only those sections are shown, so the
 * difference is easy to see. Keyboard: the handle is a slider (arrow keys, Home, End).
 */
export function onlySections(page: PageSpec, ids?: readonly string[]): PageSpec {
  if (!ids?.length) return page;
  const keep = page.sections.filter((s) => ids.includes(s.id));
  return keep.length ? { ...page, sections: keep, subpages: undefined, home: undefined } : page;
}

export function CompareView({
  before,
  after,
  sections,
  title = "修改前後比較",
  beforeLabel = "修改前",
  afterLabel = "修改後",
  onClose,
  actions,
}: {
  before: PageSpec;
  after: PageSpec;
  sections?: readonly string[];
  title?: string;
  beforeLabel?: string;
  afterLabel?: string;
  onClose(): void;
  actions?: React.ReactNode;
}) {
  const [split, setSplit] = useState(50);
  const stage = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onClose]);
  const drag = (e: React.PointerEvent) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    const move = (x: number) => setSplit(Math.min(100, Math.max(0, ((x - box.left) / box.width) * 100)));
    move(e.clientX);
    const onMove = (m: PointerEvent) => move(m.clientX);
    const stop = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  };
  const a = onlySections(before, sections), b = onlySections(after, sections);
  return createPortal(
    <div className="compare-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="compare-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <div className="compare-actions">
            {actions}
            <button ref={close} type="button" className="check-close" aria-label="關閉比較" onClick={onClose}>×</button>
          </div>
        </header>
        <p className="compare-hint">拖曳中間的把手，左邊是{beforeLabel}，右邊是{afterLabel}</p>
        <div className="compare-stage" ref={stage} onPointerDown={drag} style={{ ["--split" as string]: split + "%" }}>
          <div className="compare-layer compare-after" aria-label={afterLabel}>
            <PageRenderer input={b} />
          </div>
          <div className="compare-layer compare-before" aria-label={beforeLabel} aria-hidden={split < 2 ? true : undefined}>
            <PageRenderer input={a} />
          </div>
          <span className="compare-tag before" aria-hidden="true">{beforeLabel}</span>
          <span className="compare-tag after" aria-hidden="true">{afterLabel}</span>
          <div
            className="compare-handle"
            role="slider"
            tabIndex={0}
            aria-label="比較位置"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split)}
            aria-valuetext={`${beforeLabel} ${Math.round(split)}%`}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 20 : 5;
              if (e.key === "ArrowLeft") setSplit((v) => Math.max(0, v - step));
              else if (e.key === "ArrowRight") setSplit((v) => Math.min(100, v + step));
              else if (e.key === "Home") setSplit(0);
              else if (e.key === "End") setSplit(100);
              else return;
              e.preventDefault();
            }}
          >
            <span aria-hidden="true">‹ ›</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
