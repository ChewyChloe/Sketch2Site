import type { AlignMode, LayerMove } from "./layoutTools";

// "位置" panel: layer order, alignment, equal spacing and lock, with plain labels
// and the shortcut shown on hover.
const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);
const layers: [LayerMove, string, string, string][] = [
  ["front", "移到最上層", `${mod}+Alt+]`, "M4 4h11v11H4zM9 9h11v11"],
  ["forward", "上移一層", `${mod}+]`, "M12 19V5M6 11l6-6 6 6"],
  ["backward", "下移一層", `${mod}+[`, "M12 5v14M6 13l6 6 6-6"],
  ["back", "移到最下層", `${mod}+Alt+[`, "M9 9h11v11H9zM4 4h11v11"],
];
const aligns: [AlignMode, string, string][] = [
  ["left", "靠左", "M4 3v18M8 7h12M8 13h7"],
  ["hcenter", "水平置中", "M12 3v18M6 7h12M8 13h8"],
  ["right", "靠右", "M20 3v18M4 7h12M9 13h7"],
  ["top", "靠上", "M3 4h18M7 8v12M13 8v7"],
  ["vcenter", "垂直置中", "M3 12h18M7 6v12M13 8v8"],
  ["bottom", "靠下", "M3 20h18M7 4v12M13 9v7"],
];

export function ArrangePanel({
  count,
  locked,
  onLayer,
  onAlign,
  onDistribute,
  onLock,
}: {
  count: number;
  locked: boolean;
  onLayer: (move: LayerMove) => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: "h" | "v") => void;
  onLock: () => void;
}) {
  return (
    <section className="arrange-panel" aria-label="位置與圖層">
      <h3>位置</h3>
      <div className="arrange-row two" role="group" aria-label="圖層順序">
        {layers.map(([move, label, keys, d]) => (
          <button key={move} type="button" disabled={locked} title={`${label}（${keys}）`} aria-label={label} onClick={() => onLayer(move)}>
            {icon(d)}
            <small>{label}</small>
          </button>
        ))}
      </div>
      <div className="arrange-row" role="group" aria-label={count > 1 ? "對齊選取的元件" : "對齊畫布"}>
        {aligns.map(([mode, label, d]) => (
          <button key={mode} type="button" disabled={locked} title={count > 1 ? `選取的元件${label}` : `在畫布${label}`} aria-label={label} onClick={() => onAlign(mode)}>
            {icon(d)}
            <small>{label}</small>
          </button>
        ))}
      </div>
      {count >= 3 && (
        <div className="arrange-row two" role="group" aria-label="平均分配">
          <button type="button" onClick={() => onDistribute("h")} aria-label="左右平均分配">
            {icon("M4 4v16M20 4v16M10 8h4v8h-4z")}
            <small>左右平均</small>
          </button>
          <button type="button" onClick={() => onDistribute("v")} aria-label="上下平均分配">
            {icon("M4 4h16M4 20h16M8 10h8v4H8z")}
            <small>上下平均</small>
          </button>
        </div>
      )}
      <button type="button" className={"arrange-lock" + (locked ? " is-locked" : "")} aria-pressed={locked} title={`鎖定（Alt+Shift+L）`} onClick={onLock}>
        {icon(locked ? "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" : "M7 11V8a5 5 0 0 1 9.6-2M5 11h14v10H5z")}
        {locked ? "已鎖定，按這裡解鎖" : "鎖定（不會被拖動或刪除）"}
      </button>
    </section>
  );
}
