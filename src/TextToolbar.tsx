import { useEffect, useRef, useState } from "react";
import { fontIds, fontLabels, fontStacks, type TextStyle } from "./pageSpec";

// Text toolbar above the canvas (shown when text is selected): font, size,
// colour, highlight, bold / italic / underline / strike, alignment and spacing.
const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
export const textSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120];
export const defaultSize: Record<string, number> = { heading: 32, text: 18, button: 16, card: 16 };
export function stepSize(current: number, up: boolean) {
  return up ? textSizes.find((s) => s > current) ?? 120 : [...textSizes].reverse().find((s) => s < current) ?? 12;
}
const palette = ["#111111", "#5b5f58", "#ffffff", "#e5484d", "#f76b15", "#ffc53d", "#30a46c", "#0d74ce", "#6e56cf", "#d6409f", "#8d5a3b", "#12a594"];
const marks = ["#fff3a3", "#ffd6e7", "#d3f9d8", "#d0ebff", "#e5dbff", "#ffe8cc"];

function Popover({ label, title, children, button }: { label: string; title: string; children: React.ReactNode; button: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className="tt-pop" ref={box} onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setOpen(false))}>
      <button type="button" aria-label={label} title={title} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {button}
      </button>
      {open && (
        <div className="tt-panel" role="group" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function TextToolbar({ style, type, count, onChange, themeColors }: { style: TextStyle; type: string; count: number; onChange: (patch: Partial<TextStyle> | null) => void; themeColors: string[] }) {
  const size = style.size ?? defaultSize[type] ?? 18;
  const toggle = (key: "bold" | "italic" | "underline" | "strike") => onChange({ [key]: style[key] ? undefined : true });
  const aligns: [NonNullable<TextStyle["align"]>, string, string, string][] = [
    ["start", "靠左", `${mod}+Shift+L`, "M4 6h16M4 10h10M4 14h16M4 18h10"],
    ["center", "置中", `${mod}+Shift+E`, "M4 6h16M7 10h10M4 14h16M7 18h10"],
    ["end", "靠右", `${mod}+Shift+R`, "M4 6h16M10 10h10M4 14h16M10 18h10"],
    ["justify", "左右對齊", "", "M4 6h16M4 10h16M4 14h16M4 18h16"],
  ];
  const colors = [...new Set([...themeColors, ...palette])].slice(0, 16);
  return (
    <div className="text-toolbar" role="toolbar" aria-label="文字樣式">
      {count > 1 && <span className="tt-count" style={{ display: "inline" }}>{count} 段文字</span>}
      <label className="tt-font">
        <span className="visually-hidden">字型</span>
        <select aria-label="字型" title="字型" value={style.font ?? ""} style={style.font ? { fontFamily: fontStacks[style.font] } : undefined} onChange={(e) => onChange({ font: (e.target.value || undefined) as TextStyle["font"] })}>
          <option value="">預設字型</option>
          {fontIds.map((f) => (
            <option key={f} value={f} style={{ fontFamily: fontStacks[f] }}>{fontLabels[f]}</option>
          ))}
        </select>
      </label>
      <div className="tt-size" role="group" aria-label="字級">
        <button type="button" aria-label="字變小" title={`字變小（${mod}+Shift+<）`} onClick={() => onChange({ size: stepSize(size, false) })}>−</button>
        <input
          aria-label="字級大小"
          type="number"
          min={12}
          max={120}
          value={size}
          onChange={(e) => {
            const v = Math.round(Number(e.target.value));
            if (v >= 12 && v <= 120) onChange({ size: v });
          }}
        />
        <button type="button" aria-label="字變大" title={`字變大（${mod}+Shift+>）`} onClick={() => onChange({ size: stepSize(size, true) })}>＋</button>
      </div>
      <Popover label="文字顏色" title="文字顏色" button={<span className="tt-color" style={{ "--tt-color": style.color ?? "#111111" } as React.CSSProperties}>A</span>}>
        <div className="tt-swatches">
          {colors.map((c) => (
            <button key={c} type="button" aria-label={"顏色 " + c} aria-pressed={style.color === c} style={{ background: c }} onClick={() => onChange({ color: c })} />
          ))}
        </div>
        <label className="tt-custom">自訂顏色 <input type="color" aria-label="自訂文字顏色" value={style.color ?? "#111111"} onChange={(e) => onChange({ color: e.target.value })} /></label>
        <button type="button" className="tt-reset" onClick={() => onChange({ color: undefined })}>用主題預設顏色</button>
      </Popover>
      <Popover label="螢光筆" title="螢光筆（文字底色）" button={<span className="tt-mark" style={{ "--tt-mark": style.highlight ?? "#fff3a3" } as React.CSSProperties}><Icon d="M15 4l5 5-9 9H6v-5zM4 21h16" /></span>}>
        <div className="tt-swatches">
          {marks.map((c) => (
            <button key={c} type="button" aria-label={"螢光 " + c} aria-pressed={style.highlight === c} style={{ background: c }} onClick={() => onChange({ highlight: c })} />
          ))}
        </div>
        <button type="button" className="tt-reset" onClick={() => onChange({ highlight: undefined })}>不要螢光筆</button>
      </Popover>
      <div className="tt-group" role="group" aria-label="強調">
        <button type="button" aria-label="粗體" title={`粗體（${mod}+B）`} aria-pressed={!!style.bold} onClick={() => toggle("bold")}><b>B</b></button>
        <button type="button" aria-label="斜體" title={`斜體（${mod}+I）`} aria-pressed={!!style.italic} onClick={() => toggle("italic")}><i>I</i></button>
        <button type="button" aria-label="底線" title={`底線（${mod}+U）`} aria-pressed={!!style.underline} onClick={() => toggle("underline")}><u>U</u></button>
        <button type="button" aria-label="刪除線" title="刪除線" aria-pressed={!!style.strike} onClick={() => toggle("strike")}><s>S</s></button>
      </div>
      <div className="tt-group" role="group" aria-label="對齊">
        {aligns.map(([a, label, keys, d]) => (
          <button key={a} type="button" aria-label={"文字" + label} title={keys ? `${label}（${keys}）` : label} aria-pressed={style.align === a} onClick={() => onChange({ align: style.align === a ? undefined : a })}>
            <Icon d={d} />
          </button>
        ))}
      </div>
      <Popover label="間距" title="行距與字距" button={<span className="tt-spacing"><Icon d="M4 7h10M4 12h10M4 17h10M19 5v14M17 7l2-2 2 2M17 17l2 2 2-2" /><span className="tt-label">間距</span></span>}>
        <label className="tt-slider">
          <span>行距 <output>{(style.lineHeight ?? 1.6).toFixed(1)}</output></span>
          <input type="range" aria-label="行距" min={1} max={3} step={0.1} value={style.lineHeight ?? 1.6} onChange={(e) => onChange({ lineHeight: Number(e.target.value) })} />
        </label>
        <label className="tt-slider">
          <span>字距 <output>{(style.letterSpacing ?? 0).toFixed(2)}</output></span>
          <input type="range" aria-label="字距" min={-0.1} max={0.5} step={0.01} value={style.letterSpacing ?? 0} onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })} />
        </label>
        <button type="button" className="tt-reset" onClick={() => onChange({ lineHeight: undefined, letterSpacing: undefined })}>恢復預設間距</button>
      </Popover>
      <button type="button" className="tt-clear" aria-label="清除格式" title="清除這些文字的所有樣式" onClick={() => onChange(null)}><Icon d="M7 21h10M5 15l8-11 6 5-7 9H8zM9 10l6 5" /><span className="tt-label">清除格式</span></button>
    </div>
  );
}
