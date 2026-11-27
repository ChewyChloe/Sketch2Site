import { useEffect, useRef, useState } from "react";
import { builtInAssets } from "./assetRef";
import { CharacterArt, actionLabels, characterLabels } from "./MediaRuntime";
import { Select } from "./Select";
import { characterActions, characterIds, chartTypeLabels, chartTypes, MediaSchema, object3dShapes, parseVideoUrl, type Media } from "./pageSpec";

// Inspector settings for media elements. Pictures are chosen from the built-in samples and
// the user's own imported photos (or a new upload), never typed in as addresses.
const samples = builtInAssets.filter((r) => r.startsWith("/assets/samples/") || r === "/assets/workspace.svg");
const swatches = ["#9be7b0", "#ffd166", "#ff9f8f", "#a7c7ff", "#d7b4ff", "#ffffff", "#ffb4d6", "#8ee3e3"];
const shapeLabels = { cube: "方塊", coin: "硬幣", ring: "環形相簿" } as const;

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="media-switch" onClick={() => onChange(!on)}>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  );
}

/** Text that is parsed when the field loses focus; a bad value shows why and changes nothing. */
function DataField({ label, hint, value, parse, rows = 5 }: { label: string; hint: string; value: string; parse: (text: string) => string | null; rows?: number }) {
  const [text, setText] = useState(value);
  const [error, setError] = useState("");
  useEffect(() => setText(value), [value]);
  const apply = () => { if (text !== value) setError(parse(text) ?? ""); };
  return (
    <label className="field">
      {label}
      <textarea aria-label={label} rows={rows} value={text} aria-invalid={!!error} onChange={(e) => { setText(e.target.value); setError(""); }} onBlur={apply} />
      {error ? <span className="field-error" role="alert">{error}</span> : <small className="media-note">{hint}</small>}
    </label>
  );
}
const splitCells = (line: string) => line.split(/\s*[|｜\t]\s*/).map((c) => c.trim());

function Pictures({ images, min, max, urlFor, library, onImport, onChange, noun }: {
  images: string[]; min: number; max: number; urlFor: (ref: string) => string; library: string[];
  onImport: (file: File) => Promise<string | null>; onChange: (next: string[]) => void; noun: string;
}) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const move = (i: number, d: number) => { const n = [...images]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div className="media-pictures">
      <div className="media-pictures-head">
        <strong>{noun}</strong>
        <small>{images.length} / {max}</small>
      </div>
      <ol className="media-thumbs">
        {images.map((ref, i) => (
          <li key={i + ref}>
            <img src={urlFor(ref)} alt="" />
            <span className="media-thumb-no">{i + 1}</span>
            <span className="media-thumb-actions">
              <button type="button" aria-label={`第 ${i + 1} 張往前`} disabled={i === 0} onClick={() => move(i, -1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
              <button type="button" aria-label={`第 ${i + 1} 張往後`} disabled={i === images.length - 1} onClick={() => move(i, 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
              <button type="button" aria-label={`移除第 ${i + 1} 張`} disabled={images.length <= min} onClick={() => onChange(images.filter((_, k) => k !== i))}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
            </span>
          </li>
        ))}
        {images.length < max && (
          <li className="media-thumb-add">
            <button type="button" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>＋ 加{noun === "書頁" ? "一頁" : "照片"}</button>
          </li>
        )}
      </ol>
      {picking && images.length < max && (
        <div className="media-picker" role="group" aria-label="選一張照片">
          {[...samples, ...library].map((ref) => (
            <button type="button" key={ref} aria-label={samples.includes(ref as never) ? "範例照片" : "我的照片"} onClick={() => { onChange([...images, ref]); setPicking(false); }}>
              <img src={urlFor(ref)} alt="" />
            </button>
          ))}
          <button type="button" className="media-upload" disabled={busy} onClick={() => file.current?.click()}>{busy ? "上傳中…" : "＋ 上傳"}</button>
          <input ref={file} type="file" accept="image/png,image/jpeg" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            setBusy(true);
            const ref = await onImport(f);
            setBusy(false);
            if (ref) { onChange([...images, ref]); setPicking(false); }
          }} />
        </div>
      )}
    </div>
  );
}

export function MediaControls({ media, onChange, urlFor, library, onImport }: {
  media: Media; onChange: (m: Media) => void; urlFor: (ref: string) => string; library: string[]; onImport: (file: File) => Promise<string | null>;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const videoKey = media.kind === "video" ? media.provider + (media.videoId ?? "") : "";
  useEffect(() => {
    if (media.kind !== "video") return;
    setLink(media.videoId ? (media.provider === "youtube" ? "https://youtu.be/" : "https://vimeo.com/") + media.videoId : "");
    setError("");
  }, [videoKey]);
  const pics = { urlFor, library, onImport };
  switch (media.kind) {
    case "video": {
      const apply = () => {
        if (!link.trim()) return;
        const v = parseVideoUrl(link);
        if (!v) { setError("只能貼 YouTube 或 Vimeo 的影片網址"); return; }
        setError("");
        if (v.provider !== media.provider || v.videoId !== media.videoId) onChange({ ...media, ...v });
      };
      return (
        <div className="media-controls">
          <label className="field">
            影片網址
            <input aria-label="影片網址" placeholder="https://youtu.be/… 或 https://vimeo.com/…" value={link} aria-invalid={!!error}
              onChange={(e) => { setLink(e.target.value); setError(""); }} onBlur={apply} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} />
          </label>
          {error ? <p className="field-error" role="alert">{error}</p> : media.videoId ? <p className="media-note">已設定 {media.provider === "youtube" ? "YouTube" : "Vimeo"} 影片，網站上按播放才會載入</p> : <p className="media-note">還沒有影片，貼上網址後才能生成網站</p>}
          <Switch label="捲到時自動播放（靜音）" on={media.autoplay} onChange={(autoplay) => onChange({ ...media, autoplay })} />
          <Switch label="重複播放" on={media.loop} onChange={(loop) => onChange({ ...media, loop })} />
        </div>
      );
    }
    case "carousel":
      return (
        <div className="media-controls">
          <Pictures {...pics} noun="照片" images={media.images} min={1} max={12} onChange={(images) => onChange({ ...media, images })} />
          <Switch label="自動切換" on={media.autoplay} onChange={(autoplay) => onChange({ ...media, autoplay })} />
          {media.autoplay && (
            <label className="field media-inline">
              每張停留
              <Select label="每張停留秒數" value={String(media.seconds)} onChange={(v) => onChange({ ...media, seconds: Number(v) })} options={[2, 3, 4, 5, 6, 8, 10].map((n) => ({ value: String(n), label: n + " 秒" }))} />
            </label>
          )}
          <Switch label="左右箭頭" on={media.arrows} onChange={(arrows) => onChange({ ...media, arrows })} />
          <Switch label="下方圓點" on={media.dots} onChange={(dots) => onChange({ ...media, dots })} />
        </div>
      );
    case "flipbook":
      return (
        <div className="media-controls">
          <Pictures {...pics} noun="書頁" images={media.images} min={2} max={24} onChange={(images) => onChange({ ...media, images })} />
          <p className="media-note">點右半邊往後翻、左半邊往前翻，也可以左右拖</p>
        </div>
      );
    case "character":
      return (
        <div className="media-controls">
          <div className="media-chars" role="radiogroup" aria-label="角色">
            {characterIds.map((id) => (
              <button type="button" role="radio" key={id} aria-checked={media.character === id} onClick={() => onChange({ ...media, character: id })}>
                <CharacterArt id={id} color={media.color} />
                <span>{characterLabels[id]}</span>
              </button>
            ))}
          </div>
          <div className="media-chips" role="radiogroup" aria-label="動作">
            {characterActions.map((a) => <button type="button" role="radio" key={a} aria-checked={media.action === a} onClick={() => onChange({ ...media, action: a })}>{actionLabels[a]}</button>)}
          </div>
          <div className="media-swatches" role="radiogroup" aria-label="顏色">
            {swatches.map((c) => <button type="button" role="radio" key={c} aria-checked={media.color === c} aria-label={"顏色 " + c} style={{ background: c }} onClick={() => onChange({ ...media, color: c })} />)}
          </div>
        </div>
      );
    case "chart": {
      const lines = media.points.map((p) => `${p.label} ${p.value}`).join("\n");
      const parse = (text: string) => {
        const points = text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
          const m = l.match(/^(.+?)[\s,，:：]+(-?[\d.,]+)\s*$/);
          return m ? { label: m[1].trim().slice(0, 16), value: Number(m[2].replace(/,/g, "")) } : null;
        });
        if (points.some((p) => !p || !Number.isFinite(p.value))) return "每一行寫「名稱 數字」，例如：拿鐵 90";
        const next = { ...media, points: points as { label: string; value: number }[] };
        const ok = MediaSchema.safeParse(next);
        if (!ok.success) return points.length < 2 ? "至少要兩筆資料" : points.length > 12 ? "最多 12 筆資料" : ok.error.issues[0]?.message ?? "資料不正確";
        onChange(ok.data);
        return null;
      };
      return (
        <div className="media-controls">
          <div className="media-chips" role="radiogroup" aria-label="圖表樣式">
            {chartTypes.map((t) => <button type="button" role="radio" key={t} aria-checked={media.chart === t} onClick={() => { const ok = MediaSchema.safeParse({ ...media, chart: t }); if (ok.success) onChange(ok.data); }}>{chartTypeLabels[t]}</button>)}
          </div>
          <DataField label="資料" hint="每一行寫「名稱 數字」，2 到 12 筆" value={lines} parse={parse} />
          <label className="field media-inline">
            單位
            <input aria-label="單位" maxLength={6} placeholder="例如：元、人、%" value={media.unit} onChange={(e) => onChange({ ...media, unit: e.target.value.slice(0, 6) })} />
          </label>
        </div>
      );
    }
    case "table": {
      const lines = media.rows.map((r) => r.join(" | ")).join("\n");
      const parse = (text: string) => {
        const rows = text.split("\n").map((l) => l.trim()).filter(Boolean).map(splitCells);
        const width = Math.max(...rows.map((r) => r.length));
        const next = { ...media, rows: rows.map((r) => [...r, ...Array(width - r.length).fill("")]) };
        const ok = MediaSchema.safeParse(next);
        if (!ok.success) return rows.length > 20 ? "最多 20 列" : width > 6 ? "最多 6 欄" : "表格內容不正確，只能放文字";
        onChange(ok.data);
        return null;
      };
      return (
        <div className="media-controls">
          <DataField label="內容" hint="每一行是一列，欄位之間用 | 分開" value={lines} parse={parse} rows={6} />
          <Switch label="第一列當標題" on={media.header} onChange={(header) => onChange({ ...media, header })} />
        </div>
      );
    }
    case "object3d":
      return (
        <div className="media-controls">
          <div className="media-chips" role="radiogroup" aria-label="形狀">
            {object3dShapes.map((s) => <button type="button" role="radio" key={s} aria-checked={media.shape === s} onClick={() => onChange({ ...media, shape: s })}>{shapeLabels[s]}</button>)}
          </div>
          <Pictures {...pics} noun="照片" images={media.images} min={1} max={8} onChange={(images) => onChange({ ...media, images })} />
          <Switch label="慢慢自己轉" on={media.spin} onChange={(spin) => onChange({ ...media, spin })} />
          <p className="media-note">網站上可以用滑鼠或手指拖著轉</p>
        </div>
      );
  }
}
