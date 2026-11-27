import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { TextToolbar } from "./TextToolbar";
import { Select } from "./Select";
import { depthLabels, frameIds, frameLabels, filterLabels, imageFilters, type ImageLook, type PageNode, type TextStyle } from "./pageSpec";

// A toolbar right above the element picked on the site: text style for words, frame and
// filter for pictures, and 註解 to describe anything else. Every change is an ordinary
// patch (checked, undoable, synced back to the draft).
const textTypes: Record<string, string> = { heading: "heading", paragraph: "text", button: "button", card: "card" };

export function SiteToolbar({
  node,
  stage,
  themeColors,
  onApply,
  onNote,
  noteLabel,
  onMoveStart,
  onNudge,
  onCopyStyle,
  onPasteAll,
  brushing,
  sameKindCount = 0,
}: {
  node: PageNode;
  stage: RefObject<HTMLElement | null>;
  themeColors: string[];
  onApply: (patches: unknown[], scope: string[]) => boolean;
  onNote: () => void;
  noteLabel: string;
  /** Pointer down on the drag handle: the element follows the pointer until dropped. */
  onMoveStart?: (e: React.PointerEvent) => void;
  onNudge?: (by: -1 | 1) => void;
  onCopyStyle?: () => void;
  onPasteAll?: () => void;
  brushing?: boolean;
  sameKindCount?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // Whether the element already reads as bold on the page (headings usually do; serif themes do not).
  const [shownBold, setShownBold] = useState(false);
  useLayoutEffect(() => {
    const host = stage.current;
    if (!host) return;
    const place = () => {
      const el = host.querySelector<HTMLElement>(`[data-page-id="${node.id}"]`);
      if (!el) return setPos(null);
      setShownBold(Number.parseInt(getComputedStyle(el).fontWeight, 10) >= 600);
      const r = el.getBoundingClientRect(), s = host.getBoundingClientRect();
      const h = box.current?.offsetHeight ?? 52, w = box.current?.offsetWidth ?? 420;
      // Above the element when there is room, otherwise just below it; never past the sides.
      const above = r.top - s.top - h - 12;
      const top = above >= 4 ? above : r.bottom - s.top + 12;
      const left = Math.max(8, Math.min(r.left - s.left + r.width / 2 - w / 2, s.width - w - 8));
      setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }));
    };
    place();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    ro?.observe(host);
    if (box.current) ro?.observe(box.current);
    return () => ro?.disconnect();
  }, [node, stage]);
  const textType = textTypes[node.type];
  const isImage = node.type === "image";
  // A heading the theme already shows bold: the 粗體 button shows that, and turning it off means normal weight.
  const heavy = node.type === "heading" && (node.text?.bold !== undefined || shownBold);
  const shown: TextStyle = heavy && node.text?.bold === undefined ? { ...node.text, bold: true } : node.text ?? {};
  const setText = (patch: Partial<TextStyle> | null) => {
    if (patch && heavy && "bold" in patch && patch.bold === undefined && shown.bold) patch = { ...patch, bold: false };
    if (patch && heavy && patch.bold === true) patch = { ...patch, bold: undefined };
    const next: TextStyle = patch === null ? {} : { ...(node.text ?? {}), ...patch };
    for (const k of Object.keys(next) as (keyof TextStyle)[]) if (next[k] === undefined) delete next[k];
    onApply([{ operation: "set-property", targetId: node.id, payload: { property: "text", value: next } }], [node.id]);
  };
  const setLook = (patch: Partial<ImageLook>) => {
    const next: ImageLook = { ...(node.look ?? {}), ...patch };
    for (const k of Object.keys(next) as (keyof ImageLook)[]) if (next[k] === undefined) delete next[k];
    onApply([{ operation: "set-property", targetId: node.id, payload: { property: "look", value: next } }], [node.id]);
  };
  const note = (
    <button type="button" className="site-tb-note" aria-label={noteLabel} onClick={onNote}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4h12v9H9l-4 3v-3H4z" /></svg>
      註解
    </button>
  );
  return (
    <div
      ref={box}
      className="site-toolbar"
      role="toolbar"
      aria-label="直接修改這個元件"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {textType ? (
        <TextToolbar style={shown} type={textType} count={1} themeColors={themeColors} onChange={setText} />
      ) : isImage ? (
        <div className="site-tb-image">
          <Select label="相框" title="相框形狀" value={node.look?.frame ?? ""} onChange={(v) => setLook({ frame: (v || undefined) as ImageLook["frame"] })} options={[{ value: "", label: "原本形狀" }, ...frameIds.map((f) => ({ value: f, label: frameLabels[f] }))]} />
          <Select label="立體" title="3D 效果" value={node.look?.depth ?? ""} onChange={(v) => setLook({ depth: (v || undefined) as ImageLook["depth"] })} options={[{ value: "", label: "平面" }, { value: "float", label: depthLabels.float }, { value: "turntable", label: depthLabels.turntable }]} />
          <Select label="濾鏡" title="濾鏡" value={node.look?.filter ?? "none"} onChange={(v) => setLook({ filter: v === "none" ? undefined : (v as ImageLook["filter"]) })} options={imageFilters.map((f) => ({ value: f, label: filterLabels[f] }))} />
        </div>
      ) : (
        <span className="site-tb-hint">說說想怎麼改</span>
      )}
      {(onMoveStart || onCopyStyle) && <span className="site-tb-sep" aria-hidden="true" />}
      {onMoveStart && (
        <span className="site-tb-move" role="group" aria-label="移動">
          <button type="button" className="site-tb-grip" aria-label="拖曳移動" title="按住拖到想放的位置，也可以拖到別的區塊" onPointerDown={(e) => { e.stopPropagation(); onMoveStart(e); }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v16M2 10h16M10 2 7.5 4.5M10 2l2.5 2.5M10 18l-2.5-2.5M10 18l2.5-2.5M2 10l2.5-2.5M2 10l2.5 2.5M18 10l-2.5-2.5M18 10l-2.5 2.5" /></svg>
          </button>
          <button type="button" aria-label="往前移" title="往前移一格" onClick={() => onNudge?.(-1)}>↑</button>
          <button type="button" aria-label="往後移" title="往後移一格" onClick={() => onNudge?.(1)}>↓</button>
        </span>
      )}
      {onCopyStyle && (
        <span className="site-tb-brush" role="group" aria-label="樣式">
          <button type="button" aria-pressed={brushing} title="複製這個元件的樣式，再點別的元件套用（Esc 取消）" onClick={onCopyStyle}>{brushing ? "點要套用的元件" : "複製樣式"}</button>
          {sameKindCount > 0 && <button type="button" title="整個網站同一種元件都換成這個樣式" onClick={onPasteAll}>套用到全部同類（{sameKindCount}）</button>}
        </span>
      )}
      {note}
    </div>
  );
}
