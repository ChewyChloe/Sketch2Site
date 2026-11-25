import { useEffect, useRef } from "react";

const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
const groups: [string, [string, string][]][] = [
  ["基本", [[`${mod} Z`, "還原"], [`${mod} Shift Z`, "重做"], [`${mod} S`, "儲存"], ["Delete", "刪除"], ["Esc", "取消選取"], ["Tab", "選下一個元件"], ["?", "打開這個說明"]]],
  ["新增與複製", [["T", "新增文字"], [`${mod} C / V / X`, "複製／貼上／剪下"], [`${mod} D`, "複製一份"], ["Alt ＋ 拖曳", "拖出一份複製品"], [`${mod} Shift C / V`, "複製／貼上格式"]]],
  ["移動與排列", [["方向鍵", "移動 1 格（加 Shift 移 10 格）"], ["拖曳時按 Alt", "暫停自動對齊"], [`${mod} G`, "群組"], [`${mod} Shift G`, "取消群組"], [`${mod} ] / [`, "上移／下移一層"], [`${mod} Alt ] / [`, "移到最上層／最下層"], ["Alt Shift L", "鎖定／解鎖"], [`${mod} A`, "全選"]]],
  ["文字", [["雙擊", "直接打字"], [`${mod} B`, "粗體"], [`${mod} I`, "斜體"], [`${mod} U`, "底線"], [`${mod} Shift L / E / R`, "靠左／置中／靠右"], [`${mod} Shift > / <`, "字變大／變小"]]],
  ["圖片與畫面", [["雙擊照片", "調整裁切"], ["把照片拖進相框", "放入照片"], [`${mod} ＋ / －`, "放大／縮小畫布"], [`${mod} 0`, "符合寬度"]]],
];

/** All keyboard shortcuts in plain words, opened with "?" or the 快捷鍵 button. */
export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);
  return (
    <div className="shortcuts-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        className="shortcuts-panel"
        role="dialog"
        aria-label="快捷鍵"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "?") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="shortcuts-head">
          <h2>快捷鍵</h2>
          <button type="button" aria-label="關閉快捷鍵說明" onClick={onClose}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <p>不用背，用滑鼠一樣做得到，想快一點再用鍵盤</p>
        <div className="shortcuts-grid">
          {groups.map(([title, items]) => (
            <section key={title}>
              <h3>{title}</h3>
              <dl>
                {items.map(([keys, what]) => (
                  <div key={keys}>
                    <dt>{keys.split(" ").map((k, i) => <kbd key={i}>{k}</kbd>)}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
