import { useEffect, useRef, useState } from "react";
import { useEscapeToClose } from "./useEscape";
import { shortNavLabel, type NavSettings, type NavStyle } from "./pageSpec";
import type { CanvasSpec } from "./spec";

// 導覽列 settings: where the site's menu sits and which headings (or pages) it lists.
// Changes apply to the generated site, like the brand kit.
const styles: { id: NavStyle; name: string; hint: string }[] = [
  { id: "top-sticky", name: "頂部固定", hint: "捲動時一直在最上面" },
  { id: "top-static", name: "頂部不固定", hint: "跟著頁面一起捲走" },
  { id: "top-autohide", name: "往下捲時藏起", hint: "往上捲就出現" },
  { id: "side-left", name: "左側目錄", hint: "像論文目錄，可收起" },
  { id: "side-right", name: "右側目錄", hint: "像論文目錄，可收起" },
  { id: "floating", name: "懸浮", hint: "浮在頁面上方的膠囊" },
  { id: "dots", name: "側邊點點", hint: "每段一個點，捲到哪裡亮哪裡" },
  { id: "none", name: "不顯示", hint: "網站沒有選單" },
];

function Thumb({ id }: { id: NavStyle }) {
  const lines = (x: number, w: number, y0: number) => [0, 1, 2, 3].map((i) => <rect key={i} x={x} y={y0 + i * 7} width={i === 0 ? w * 0.7 : w} height="3" rx="1.5" className="t-line" />);
  return (
    <svg viewBox="0 0 64 44" aria-hidden="true" className="nav-thumb">
      <rect x="0.5" y="0.5" width="63" height="43" rx="5" className="t-page" />
      {id.startsWith("top") && <rect x="0.5" y="0.5" width="63" height="9" rx="5" className={"t-bar" + (id === "top-static" ? " is-soft" : "")} />}
      {id === "top-autohide" && <path d="M54 6.5l3-3 3 3" className="t-arrow" />}
      {id === "side-left" && <rect x="0.5" y="0.5" width="15" height="43" rx="5" className="t-bar" />}
      {id === "side-right" && <rect x="48.5" y="0.5" width="15" height="43" rx="5" className="t-bar" />}
      {id === "floating" && <rect x="14" y="4" width="36" height="7" rx="3.5" className="t-bar" />}
      {id === "dots" && [0, 1, 2, 3].map((i) => <circle key={i} cx="57" cy={12 + i * 7} r={i === 1 ? 2.6 : 1.8} className="t-bar" />)}
      {id === "side-left" ? lines(21, 37, 9) : id === "side-right" ? lines(6, 37, 9) : lines(8, id === "dots" ? 40 : 48, id === "none" || id === "dots" ? 8 : 16)}
    </svg>
  );
}

export type NavCandidate = { id: string; label: string; place: string };
/** What the menu can list: the pages of a multi-page site, otherwise the headings in reading order. */
export function navCandidates(spec: CanvasSpec): NavCandidate[] {
  const pages = spec.metadata.pages;
  if (pages && pages.length > 1) return pages.map((p, i) => ({ id: p.id, label: p.name, place: i === 0 ? "首頁" : "頁面" }));
  return spec.nodes
    .filter((n) => (n.type === "heading" || n.type === "card") && n.content.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((n) => ({ id: n.id, label: shortNavLabel(n.content), place: n.type === "heading" ? "標題" : "卡片" }));
}
/** First time: headings after the page title are shown; with no such headings, card titles are. */
function defaultHidden(candidates: NavCandidate[], multi: boolean): Set<string> {
  if (multi) return new Set();
  const headings = candidates.filter((c) => c.place === "標題");
  const rest = headings.slice(1);
  if (rest.length) return new Set(candidates.filter((c) => c.place !== "標題" || c === headings[0]).map((c) => c.id));
  const cards = candidates.filter((c) => c.place === "卡片");
  return new Set(candidates.filter((c) => c.place === "標題" || cards.indexOf(c) >= 5).map((c) => c.id));
}
/** The list shown in the window: saved order first, new headings after; the top heading starts hidden. */
export function navRows(spec: CanvasSpec): { id: string; label: string; original: string; place: string; hidden: boolean }[] {
  const candidates = navCandidates(spec), saved = spec.metadata.nav?.items;
  const multi = (spec.metadata.pages?.length ?? 0) > 1;
  if (!saved) { const off = defaultHidden(candidates, multi); return candidates.map((c) => ({ id: c.id, label: c.label, original: c.label, place: c.place, hidden: off.has(c.id) })); }
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const known = new Set(saved.map((s) => s.id));
  return [
    ...saved.flatMap((s) => { const c = byId.get(s.id); return c ? [{ id: c.id, label: s.label ?? c.label, original: c.label, place: c.place, hidden: !!s.hidden }] : []; }),
    // Added after the menu was set up: listed, but off until switched on (matches the site).
    ...candidates.filter((c) => !known.has(c.id)).map((c) => ({ id: c.id, label: c.label, original: c.label, place: c.place, hidden: true })),
  ];
}

export function NavPanel({ spec, onChange, onClose }: { spec: CanvasSpec; onChange: (nav: NavSettings | undefined) => void; onClose: () => void }) {
  const nav = spec.metadata.nav;
  const style = nav?.style ?? "top-sticky";
  const rows = navRows(spec);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  useEscapeToClose(onClose);
  const save = (next: { style?: NavStyle; rows?: typeof rows }) => {
    const r = next.rows ?? rows;
    onChange({
      style: next.style ?? style,
      items: r.map((row) => ({ id: row.id, ...(row.label.trim() && row.label.trim() !== row.original ? { label: row.label.trim().slice(0, 24) } : {}), ...(row.hidden ? { hidden: true } : {}) })),
    });
  };
  const move = (i: number, d: number) => { const r = [...rows]; const [x] = r.splice(i, 1); r.splice(i + d, 0, x); save({ rows: r }); };
  const shown = rows.filter((r) => !r.hidden).length;
  return (
    <div className="brand-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="brand-panel nav-panel" role="dialog" aria-label="導覽列">
        <div className="brief-head">
          <h2>導覽列</h2>
          <button ref={first} type="button" className="brief-close" aria-label="關閉" onClick={onClose}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <p className="brand-lead"><span className="nowrap-phrase">網站的選單放哪裡、</span><span className="nowrap-phrase">列出哪些項目</span></p>
        <section>
          <h3>樣式</h3>
          <div className="nav-styles" role="radiogroup" aria-label="導覽列樣式">
            {styles.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={style === s.id} className="nav-style" onClick={() => save({ style: s.id })}>
                <Thumb id={s.id} />
                <strong>{s.name}</strong>
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
          <p className="nav-note">手機上每種樣式都會收成一個「選單」按鈕</p>
        </section>
        {style !== "none" && (
          <section>
            <div className="nav-items-head">
              <h3>選單項目</h3>
              {rows.length > 0 && <small>顯示 {shown} / {rows.length} 項{shown > 8 ? "，最多列出 8 項" : ""}</small>}
            </div>
            {rows.length === 0 ? (
              <p className="nav-note">先在畫布上放「標題」，這裡就會出現可以放進選單的項目</p>
            ) : (
              <ol className="nav-items">
                {rows.map((row, i) => (
                  <li key={row.id} className={row.hidden ? "is-hidden" : undefined}>
                    <span className="nav-order">
                      <button type="button" aria-label={"上移「" + row.original + "」"} disabled={i === 0} onClick={() => move(i, -1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></button>
                      <button type="button" aria-label={"下移「" + row.original + "」"} disabled={i === rows.length - 1} onClick={() => move(i, 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
                    </span>
                    <LabelInput row={row} onCommit={(label) => save({ rows: rows.map((r) => (r.id === row.id ? { ...r, label } : r)) })} />
                    <button type="button" className="nav-toggle" aria-pressed={!row.hidden} aria-label={(row.hidden ? "顯示「" : "隱藏「") + row.original + "」"} onClick={() => save({ rows: rows.map((r) => (r.id === row.id ? { ...r, hidden: !r.hidden } : r)) })}>
                      {row.hidden ? "隱藏中" : "顯示"}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
        <div className="nav-foot">
          <button type="button" className="nav-reset" disabled={!nav} onClick={() => onChange(undefined)}>恢復預設</button>
          <button type="button" className="primary" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}

// Names are saved when leaving the field (or on Enter), so typing is one undo step, not one per letter.
function LabelInput({ row, onCommit }: { row: { id: string; label: string; original: string; place: string }; onCommit: (label: string) => void }) {
  const [value, setValue] = useState(row.label);
  useEffect(() => setValue(row.label), [row.label]);
  const commit = () => { const v = value.trim() || row.original; if (v !== row.label) onCommit(v); else setValue(row.label); };
  return (
    <label className="nav-label">
      <small>{row.place}{row.label !== row.original ? "：" + row.original : ""}</small>
      <input value={value} maxLength={24} aria-label={"「" + row.original + "」在選單上的名稱"} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }} />
    </label>
  );
}
