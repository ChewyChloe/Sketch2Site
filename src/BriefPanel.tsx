import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { briefOptions, emptyBrief, suggestion, type Brief, type BriefField } from "./brief";

/**
 * Text field with an inline, greyed-out continuation from a local phrase list.
 * Tab or → (at the end) accepts, Esc dismisses. Tab only takes over while a
 * suggestion is showing, so keyboard navigation is otherwise unchanged.
 */
export function GhostField({
  id,
  label,
  value,
  onChange,
  purpose,
  maxLength,
  multiline = false,
  placeholder,
  onEscape,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  purpose: string;
  maxLength: number;
  multiline?: boolean;
  placeholder?: string;
  onEscape?: () => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const mirror = useRef<HTMLDivElement>(null);
  const rest = focused && dismissed !== value && value.length < maxLength ? suggestion(value, purpose) : "";
  const accept = () => onChange((value + rest).slice(0, maxLength));
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const atEnd = e.currentTarget.selectionStart === value.length && e.currentTarget.selectionEnd === value.length;
    if (rest && e.key === "Tab" && !e.shiftKey && atEnd) { e.preventDefault(); accept(); }
    else if (rest && e.key === "ArrowRight" && atEnd) { e.preventDefault(); accept(); }
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (rest) setDismissed(value);
      else onEscape?.();
    }
  };
  const common = {
    id,
    value,
    maxLength,
    placeholder,
    "aria-describedby": id + "-hint",
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    onKeyDown,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onScroll: (e: { currentTarget: HTMLElement }) => { if (mirror.current) mirror.current.scrollTop = e.currentTarget.scrollTop; },
  };
  return (
    <label className={"ghost-field" + (multiline ? " multi" : "")} htmlFor={id}>
      <span className="ghost-label">{label}</span>
      <span className="ghost-box">
        <div className="ghost-mirror" ref={mirror} aria-hidden="true">
          <span className="ghost-typed">{value}</span>
          <span className="ghost-rest">{rest}</span>
        </div>
        {multiline ? <textarea rows={5} {...common} /> : <input type="text" autoComplete="off" {...common} />}
      </span>
      <span id={id + "-hint"} className="ghost-hint" aria-live="polite">
        {rest ? <>建議：…{rest}　<kbd>Tab</kbd> 補上・<kbd>Esc</kbd> 略過</> : `${value.length} / ${maxLength}`}
      </span>
    </label>
  );
}

const blankLabels: Record<BriefField, string> = { audience: "誰會看", purpose: "網站用途", mood: "感覺", focus: "最想被注意的" };
const order: BriefField[] = ["audience", "purpose", "mood", "focus"];

export function BriefPanel({
  initial,
  aiReady,
  onClose,
  onGenerate,
}: {
  initial?: Partial<Brief>;
  aiReady: boolean;
  onClose: (brief: Brief) => void;
  onGenerate: (brief: Brief) => void;
}) {
  const [brief, setBrief] = useState<Brief>({ ...emptyBrief, ...initial });
  const [active, setActive] = useState<BriefField | null>(initial?.audience ? null : "audience");
  const [custom, setCustom] = useState("");
  const [moreOpen, setMoreOpen] = useState(Boolean(initial?.details));
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const set = (field: keyof Brief, value: string) => setBrief((b) => ({ ...b, [field]: value }));
  const choose = (field: BriefField, value: string) => {
    set(field, value.trim().slice(0, 20));
    setCustom("");
    const next = order[order.indexOf(field) + 1];
    setActive(next && !brief[next] ? next : null);
  };
  const blank = (field: BriefField) => (
    <button
      ref={field === "audience" ? first : undefined}
      type="button"
      className={"brief-blank" + (brief[field] ? " filled" : "") + (active === field ? " active" : "")}
      aria-expanded={active === field}
      aria-controls="brief-choices"
      onClick={() => setActive(active === field ? null : field)}
    >
      {brief[field] || blankLabels[field]}
      <span aria-hidden="true"> ▾</span>
    </button>
  );
  return (
    <div className="brief-panel" role="dialog" aria-label="描述你的網站" onKeyDown={(e) => { if (e.key === "Escape") onClose(brief); }}>
      <div className="brief-head">
        <h2>描述你的網站</h2>
        <button type="button" className="brief-close" aria-label="關閉" onClick={() => onClose(brief)}>×</button>
      </div>
      <p className="brief-sentence">
        這是一個給 {blank("audience")} 看的 {blank("purpose")} 網站，感覺要 {blank("mood")}，最想讓人注意到 {blank("focus")}。
      </p>
      {active && (
        <div className="brief-choices" id="brief-choices" role="group" aria-label={"選擇" + blankLabels[active]}>
          {briefOptions[active].map((option) => (
            <button key={option} type="button" aria-pressed={brief[active] === option} onClick={() => choose(active, option)}>{option}</button>
          ))}
          <form className="brief-custom" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) choose(active, custom); }}>
            <input aria-label={"自己輸入" + blankLabels[active]} placeholder="自己輸入…" maxLength={20} value={custom} onChange={(e) => setCustom(e.target.value)} />
          </form>
          {brief[active] && <button type="button" className="brief-clear" onClick={() => { set(active, ""); setActive(null); }}>清除</button>}
        </div>
      )}
      <GhostField id="brief-note" label="一句話補充（選填）" value={brief.note} purpose={brief.purpose} maxLength={100} placeholder="例如：主色想用學校的藍色" onChange={(v) => set("note", v)} onEscape={() => onClose(brief)} />
      {moreOpen ? (
        <GhostField id="brief-details" label="詳細說明（選填）" multiline value={brief.details ?? ""} purpose={brief.purpose} maxLength={600} placeholder="想寫多少都可以：目標、風格參考、哪些內容要特別強調……" onChange={(v) => set("details", v)} onEscape={() => onClose(brief)} />
      ) : (
        <button type="button" className="brief-more" onClick={() => setMoreOpen(true)}>想寫更多？展開詳細說明</button>
      )}
      <p className="brief-note">
        {aiReady
          ? "AI 會參考以上所有描述排版；不會改寫或新增你的文字內容。"
          : "目前沒有接 AI：「感覺」決定配色，「最想被注意的」會把對應區塊往前排；補充文字要接上 AI 後才會生效。"}
      </p>
      <div className="brief-actions">
        <button type="button" className="brief-reset" onClick={() => { setBrief(emptyBrief); setActive("audience"); }}>全部清除</button>
        <button type="button" className="primary" onClick={() => onGenerate(brief)}>用這個描述生成網站</button>
      </div>
    </div>
  );
}
