import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { describeStyle, maxReferences, mergeStyles, prepareReference, type ReferenceStyle } from "./referenceStyle";
import { requestReferenceStyle } from "./referenceRequest";
import { useEscapeToClose } from "./useEscape";
import { briefOptions, emptyBrief, suggestion, type Brief, type BriefField } from "./brief";
import { readHabits } from "./habits";
import { avoidIds, avoidLabels, heroIds, heroLabels, lightnessIds, lightnessLabels, type Ask } from "./directions";

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
const questions: Record<BriefField, string> = { audience: "誰會看這個網站？", purpose: "網站要做什麼？", mood: "想要什麼感覺？", focus: "最想讓人注意什麼？" };
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
  useEscapeToClose(() => onClose(brief));
  const [active, setActive] = useState<BriefField | null>(initial?.audience ? null : "audience");
  const [custom, setCustom] = useState("");
  const [moreOpen, setMoreOpen] = useState(Boolean(initial?.details));
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  // Reference pictures (up to five): read locally at once; the AI looks at them only when the
  // site is generated. They stay in this panel's memory and are never saved; only the style is.
  const [references, setReferences] = useState<{ jpeg: string; preview: string; style: ReferenceStyle }[]>([]);
  const [refBusy, setRefBusy] = useState<"" | "reading" | "asking">("");
  const [refNote, setRefNote] = useState("");
  const pictureInput = useRef<HTMLInputElement>(null);
  const keepReferences = (next: typeof references) => {
    setReferences(next);
    setBrief((b) => ({ ...b, style: mergeStyles(next.map((r) => r.style)) }));
  };
  const generate = async () => {
    if (references.length && aiReady) {
      setRefBusy("asking");
      try {
        const style = await requestReferenceStyle(references.map((r) => r.jpeg));
        onGenerate({ ...brief, style });
        return;
      } catch {
        setRefNote("AI 這次沒看到參考圖，先用你電腦上讀出的風格");
      } finally {
        setRefBusy("");
      }
    }
    onGenerate(brief);
  };
  const set = (field: keyof Brief, value: string) => setBrief((b) => ({ ...b, [field]: value }));
  const ask: Ask = brief.ask ?? {};
  const [habitsWithAsk] = useState(() => readHabits().filter((h) => h.ask));
  const setAsk = (patch: Partial<Ask>) => setBrief((b) => {
    const next = { ...(b.ask ?? {}), ...patch };
    for (const k of Object.keys(next) as (keyof Ask)[]) if (next[k] === undefined || (Array.isArray(next[k]) && k === "lightness" && !(next[k] as unknown[]).length)) delete next[k];
    return { ...b, ask: Object.keys(next).length ? next : undefined };
  });
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
      <span>{brief[field] || "選一個"}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
  );
  return (
    <div className="brief-panel" role="dialog" aria-label="描述你的網站">
      <div className="brief-head">
        <h2>描述你的網站</h2>
        <button type="button" className="brief-close" aria-label="關閉" onClick={() => onClose(brief)}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </div>
      <div className="brief-rows">
        {order.map((field) => (
          <div key={field} className={"brief-row" + (active === field ? " is-active" : "")}>
            <span className="brief-q">{questions[field]}</span>
            {blank(field)}
            {active === field && (
              <div className="brief-choices" id="brief-choices" role="group" aria-label={"選擇" + blankLabels[field]}>
                {briefOptions[field].map((option) => (
                  <button key={option} type="button" aria-pressed={brief[field] === option} onClick={() => choose(field, option)}>{option}</button>
                ))}
                <form className="brief-custom" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) choose(field, custom); }}>
                  <input aria-label={"自己輸入" + blankLabels[field]} placeholder="自己輸入…" maxLength={20} value={custom} onChange={(e) => setCustom(e.target.value)} />
                </form>
                {brief[field] && <button type="button" className="brief-clear" onClick={() => { set(field, ""); setActive(null); }}>清除</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      <GhostField id="brief-note" label="一句話補充（選填）" value={brief.note} purpose={brief.purpose} maxLength={100} placeholder="例如：主色想用學校的藍色" onChange={(v) => set("note", v)} onEscape={() => onClose(brief)} />
      {moreOpen ? (
        <GhostField id="brief-details" label="詳細說明（選填）" multiline value={brief.details ?? ""} purpose={brief.purpose} maxLength={600} placeholder="例如：目標、喜歡的風格、想強調的內容" onChange={(v) => set("details", v)} onEscape={() => onClose(brief)} />
      ) : (
        <button type="button" className="brief-more" onClick={() => setMoreOpen(true)}>想寫更多？展開詳細說明</button>
      )}
      <section className="brief-ask" aria-label="先問清楚">
        <div className="brief-reference-head">
          <strong>先問清楚（選填）</strong>
          <small>答得越具體，三個方向越準</small>
        </div>
        {habitsWithAsk.length > 0 && (
          <div className="brief-ask-row" role="group" aria-label="帶入我的風格">
            <span>帶入我的風格（之後還能改）</span>
            <div className="brief-ask-chips">
              {habitsWithAsk.map((h) => <button key={h.id} type="button" onClick={() => setBrief((b) => ({ ...b, ask: h.ask }))}>{h.name}</button>)}
            </div>
          </div>
        )}
        <label className="brief-ask-row">
          <span>喜歡哪些網站或品牌</span>
          <input aria-label="喜歡哪些網站或品牌" maxLength={80} placeholder="例如：無印良品、蔦屋書店、某個學校網站" value={ask.refs ?? ""} onChange={(e) => setAsk({ refs: e.target.value || undefined })} />
        </label>
        <div className="brief-ask-row" role="group" aria-label="想要的感覺">
          <span>想要的感覺（可複選）</span>
          <div className="brief-ask-chips">
            {lightnessIds.map((id) => {
              const on = ask.lightness?.includes(id) ?? false;
              return <button key={id} type="button" aria-pressed={on} onClick={() => setAsk({ lightness: on ? ask.lightness!.filter((x) => x !== id) : [...(ask.lightness ?? []), id] })}>{lightnessLabels[id]}</button>;
            })}
          </div>
        </div>
        <div className="brief-ask-row" role="radiogroup" aria-label="首屏怎麼講">
          <span>首屏怎麼講</span>
          <div className="brief-ask-chips">
            {heroIds.map((id) => <button key={id} type="button" role="radio" aria-checked={ask.hero === id} onClick={() => setAsk({ hero: ask.hero === id ? undefined : id })}>{heroLabels[id]}</button>)}
          </div>
        </div>
        <div className="brief-ask-row" role="group" aria-label="一定不要">
          <span>一定不要（點掉就允許）</span>
          <div className="brief-ask-chips">
            {avoidIds.map((id) => {
              const on = (ask.avoid ?? avoidIds).includes(id);
              return <button key={id} type="button" aria-pressed={on} onClick={() => { const cur = ask.avoid ?? [...avoidIds]; setAsk({ avoid: on ? cur.filter((x) => x !== id) : [...cur, id] }); }}>{avoidLabels[id]}</button>;
            })}
          </div>
        </div>
      </section>
      <section className="brief-reference" aria-label="參考圖片">
        <div className="brief-reference-head">
          <strong>參考圖片（選填）</strong>
          <small>最多 5 張，學它們為什麼好看，不照抄內容或排版</small>
        </div>
        {references.length > 0 && (
          <ul className="brief-reference-thumbs" aria-label="已選的參考圖">
            {references.map((r, i) => (
              <li key={r.preview}>
                <img src={r.preview} alt={`參考圖片縮圖 ${i + 1}`} />
                <button type="button" className="brief-clear" aria-label={`移除第 ${i + 1} 張參考圖`} onClick={() => { keepReferences(references.filter((_, k) => k !== i)); setRefNote(""); }}>×</button>
              </li>
            ))}
          </ul>
        )}
        {references.length > 0 && brief.style && (
          <div className="brief-reference-card">
            {describeStyle(brief.style).length ? (
              <ul className="brief-reference-principles" aria-label="看到的設計手法">
                {describeStyle(brief.style).map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    <span>{p.why}</span>
                    <small>用在你的網站：{p.use}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{references.length > 1 ? "這幾張圖看不出共同的設計手法，換更有特色的試試" : "這張圖看不出明顯的設計手法，換一張更有特色的試試"}</p>
            )}
          </div>
        )}
        {references.length < maxReferences && (
          <button type="button" className="brief-reference-add" disabled={refBusy === "reading"} onClick={() => pictureInput.current?.click()}>
            {refBusy === "reading" ? "讀取中…" : references.length ? `＋ 再加一張（${references.length}/${maxReferences}）` : `＋ 上傳參考圖（最多 ${maxReferences} 張）`}
          </button>
        )}
        <small className="brief-reference-privacy">
          {aiReady ? "上面是電腦先看出的手法；生成時 AI 會再看一次縮小的圖，找出它們的共同點，補上字體、構圖這些，圖片不會保存，也不會用到圖裡的文字或標誌" : "這些手法是在你的電腦上讀出的，圖片不會上傳；字體、構圖要開啟 AI 才看得出來"}
        </small>
        {refNote && <p className="brief-reference-msg" role="status">{refNote}</p>}
        <input
          ref={pictureInput}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          aria-label="選參考圖"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])].slice(0, maxReferences - references.length);
            const skipped = (e.target.files?.length ?? 0) - files.length;
            e.target.value = "";
            if (!files.length) return;
            setRefBusy("reading");
            setRefNote("");
            const read = (await Promise.all(files.map((f) => prepareReference(f)))).filter((x): x is NonNullable<typeof x> => !!x);
            setRefBusy("");
            const failed = files.length - read.length;
            keepReferences([...references, ...read].slice(0, maxReferences));
            if (failed || skipped) setRefNote([failed ? `${failed} 張讀不到，換 PNG 或 JPG 試試` : "", skipped ? `最多 ${maxReferences} 張，多的沒有加入` : ""].filter(Boolean).join("；"));
          }}
        />
      </section>
      <p className="brief-note">
        {aiReady
          ? "AI 會照這些描述，並看一張縮小的草稿圖來排版；草稿圖不會保存，你寫的字一個都不會改"
          : "選的感覺會換成搭配的顏色，想被注意的區塊會放前面"}
      </p>
      <div className="brief-actions">
        <button type="button" className="brief-reset" onClick={() => { setBrief(emptyBrief); setReferences([]); setRefNote(""); setActive("audience"); }}>全部清除</button>
        <button type="button" className="primary" disabled={refBusy !== ""} onClick={() => void generate()}>{refBusy === "asking" ? "AI 正在看參考圖…" : "用這個描述生成網站"}</button>
      </div>
    </div>
  );
}
