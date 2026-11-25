import { useEffect, useRef, useState } from "react";
import { fontIds, fontLabels, fontStacks, inkOn, type Brand, type FontId } from "./pageSpec";

const suggestions = ["#0d74ce", "#e5484d", "#f76b15", "#30a46c", "#6e56cf", "#d6409f", "#111111", "#ffc53d"];

/**
 * Brand kit: the project's colours, fonts and logo. Changes apply right away
 * (each one can be undone) and show in the preview card.
 */
export function BrandPanel({
  brand,
  logos,
  urlFor,
  onChange,
  onImportLogo,
  onClose,
}: {
  brand: Brand | undefined;
  logos: string[];
  urlFor: (ref: string) => string | null;
  onChange: (brand: Brand | undefined) => void;
  onImportLogo: (file: File) => Promise<string | null>;
  onClose: () => void;
}) {
  const b: Brand = brand ?? { colors: [] };
  const [picked, setPicked] = useState("#0d74ce");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const set = (patch: Partial<Brand>) => {
    const next: Brand = { ...b, ...patch };
    for (const k of Object.keys(next) as (keyof Brand)[]) if (next[k] === undefined) delete next[k];
    onChange(next.colors.length || next.primary || next.headingFont || next.bodyFont || next.logo ? next : undefined);
  };
  const addColor = (c: string) => {
    const color = c.toLowerCase();
    if (b.colors.includes(color) || b.colors.length >= 10) return;
    set({ colors: [...b.colors, color], primary: b.primary ?? color });
  };
  const removeColor = (c: string) => {
    const colors = b.colors.filter((x) => x !== c);
    set({ colors, primary: b.primary === c ? colors[0] : b.primary });
  };
  const fontSelect = (key: "headingFont" | "bodyFont", label: string) => (
    <label className="brand-font">
      <span>{label}</span>
      <select aria-label={label} value={b[key] ?? ""} style={{ fontFamily: fontStacks[b[key] ?? "sans"] }} onChange={(e) => set({ [key]: (e.target.value || undefined) as FontId | undefined })}>
        <option value="">跟著主題</option>
        {fontIds.map((f) => (
          <option key={f} value={f} style={{ fontFamily: fontStacks[f] }}>{fontLabels[f]}</option>
        ))}
      </select>
    </label>
  );
  const primary = b.primary;
  const logoUrl = b.logo ? urlFor(b.logo) : null;
  return (
    <div className="brand-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="brand-panel" role="dialog" aria-label="品牌工具組" onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}>
        <div className="brief-head">
          <h2>品牌工具組</h2>
          <button ref={first} type="button" className="brief-close" aria-label="關閉" onClick={onClose}>×</button>
        </div>
        <p className="brand-lead">設定一次，整個網站的按鈕顏色、字型和標誌都會跟著換。</p>
        <section>
          <h3>品牌色 <small>（點一下設成主色：按鈕和重點會用它）</small></h3>
          <div className="brand-colors">
            {b.colors.map((c) => (
              <div key={c} className={"brand-color" + (primary === c ? " is-primary" : "")}>
                <button type="button" style={{ background: c, color: inkOn(c) }} aria-label={(primary === c ? "主色 " : "設為主色 ") + c} aria-pressed={primary === c} onClick={() => set({ primary: c })}>
                  {primary === c ? "主色" : ""}
                </button>
                <button type="button" className="brand-remove" aria-label={"移除顏色 " + c} onClick={() => removeColor(c)}>×</button>
              </div>
            ))}
            {b.colors.length < 10 && (
              <div className="brand-add">
                <input type="color" aria-label="挑選要加入的顏色" value={picked} onChange={(e) => setPicked(e.target.value)} />
                <button type="button" onClick={() => addColor(picked)}>加入顏色</button>
              </div>
            )}
          </div>
          {!b.colors.length && (
            <div className="brand-suggest" role="group" aria-label="常用品牌色">
              <span>沒有想法？先選一個：</span>
              {suggestions.map((c) => (
                <button key={c} type="button" style={{ background: c }} aria-label={"加入 " + c} onClick={() => addColor(c)} />
              ))}
            </div>
          )}
        </section>
        <section className="brand-fonts">
          <h3>字型</h3>
          {fontSelect("headingFont", "標題字型")}
          {fontSelect("bodyFont", "內文字型")}
        </section>
        <section>
          <h3>標誌（Logo）</h3>
          <div className="brand-logo-row">
            {logos.map((ref) => (
              <button key={ref} type="button" className="brand-logo" aria-pressed={b.logo === ref} aria-label="使用這張圖當標誌" onClick={() => set({ logo: b.logo === ref ? undefined : ref })}>
                {urlFor(ref) ? <img src={urlFor(ref)!} alt="" /> : "圖片"}
              </button>
            ))}
            <button type="button" className="brand-upload" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? "上傳中…" : "＋ 上傳標誌"}</button>
            {b.logo && <button type="button" className="brand-upload" onClick={() => set({ logo: undefined })}>不用標誌</button>}
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="image/png,image/jpeg"
              aria-label="上傳標誌圖片"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                const ref = await onImportLogo(file);
                setBusy(false);
                if (ref) set({ logo: ref });
              }}
            />
          </div>
        </section>
        <section className="brand-preview" aria-label="預覽" style={{ fontFamily: fontStacks[b.bodyFont ?? "sans"] }}>
          <div className="brand-preview-nav">
            {logoUrl && <img src={logoUrl} alt="" />}
            <strong>我的網站</strong>
          </div>
          <h4 style={{ fontFamily: fontStacks[b.headingFont ?? "sans"] }}>標題長這樣</h4>
          <p>內文長這樣，看看讀起來舒不舒服。</p>
          <span className="brand-preview-button" style={primary ? { background: primary, color: inkOn(primary) } : undefined}>按鈕長這樣</span>
        </section>
        <div className="brief-actions">
          <button type="button" className="brief-reset" onClick={() => onChange(undefined)}>全部清除</button>
          <button type="button" className="primary" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
