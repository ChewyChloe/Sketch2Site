import { useEffect, useRef, useState } from "react";
import { contrast, fixContrast, fontIds, fontLabels, fontStacks, inkOn, latinFontIds, latinFontLabels, latinFontStacks, smartPalette, type Brand, type FontId, type LatinFontId } from "./pageSpec";

const suggestions = ["#0d74ce", "#e5484d", "#f76b15", "#30a46c", "#6e56cf", "#d6409f", "#111111", "#ffc53d"];
type Role = "primary" | "secondary" | "accent" | "neutral";
// What each colour is for, and the WCAG contrast it has to reach (4.5:1 text, 3:1 large text and edges).
const roles: { key: Role; name: string; use: string; check: (b: Brand, c: string) => { ratio: number; min: number; fix: () => string } }[] = [
  { key: "primary", name: "主色", use: "按鈕、連結", check: (_b, c) => ({ ratio: contrast(c, "#ffffff"), min: 3, fix: () => fixContrast(c, "#ffffff", 3) }) },
  { key: "secondary", name: "副色", use: "區塊底色", check: (b, c) => { const text = b.neutral ?? "#17231e"; return { ratio: contrast(c, text), min: 4.5, fix: () => fixContrast(c, text, 4.5) }; } },
  { key: "accent", name: "強調色", use: "重點標示、選取框", check: (_b, c) => ({ ratio: contrast(c, "#ffffff"), min: 3, fix: () => fixContrast(c, "#ffffff", 3) }) },
  { key: "neutral", name: "中性色", use: "內文文字", check: (b, c) => { const bg = b.secondary ?? "#ffffff"; const r = Math.min(contrast(c, "#ffffff"), contrast(c, bg)); return { ratio: r, min: 4.5, fix: () => fixContrast(fixContrast(c, "#ffffff", 4.5), bg, 4.5) }; } },
];

/**
 * Brand kit: the project's colours (four roles, each checked against WCAG contrast),
 * Chinese + English fonts and logo. Changes apply right away and can be undone.
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
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const set = (patch: Partial<Brand>) => {
    const next: Brand = { ...b, ...patch };
    for (const k of Object.keys(next) as (keyof Brand)[]) if (next[k] === undefined) delete next[k];
    // The colour list (used by the text toolbar) follows the roles, main colour first.
    next.colors = [...new Set([next.primary, next.secondary, next.accent, next.neutral].filter((c): c is string => Boolean(c)))];
    onChange(next.colors.length || next.headingFont || next.bodyFont || next.headingFontLatin || next.bodyFontLatin || next.logo ? next : undefined);
  };
  // Picking a main colour for the first time fills the other roles with a matching palette.
  const pickPrimary = (c: string) => {
    const color = c.toLowerCase();
    set(b.secondary || b.accent || b.neutral ? { primary: color } : { primary: color, ...smartPalette(color) });
  };
  const cjkSelect = (key: "headingFont" | "bodyFont", label: string) => (
    <label className="brand-font">
      <span>{label}</span>
      <select aria-label={label} value={b[key] ?? ""} style={b[key] ? { fontFamily: fontStacks[b[key]!] } : undefined} onChange={(e) => set({ [key]: (e.target.value || undefined) as FontId | undefined })}>
        <option value="">跟著主題</option>
        {fontIds.map((f) => (
          <option key={f} value={f} style={{ fontFamily: fontStacks[f] }}>{fontLabels[f]}</option>
        ))}
      </select>
    </label>
  );
  const latinSelect = (key: "headingFontLatin" | "bodyFontLatin", label: string) => (
    <label className="brand-font">
      <span>{label}</span>
      <select aria-label={label} value={b[key] ?? ""} style={b[key] ? { fontFamily: latinFontStacks[b[key]!] } : undefined} onChange={(e) => set({ [key]: (e.target.value || undefined) as LatinFontId | undefined })}>
        <option value="">跟中文一樣</option>
        {latinFontIds.map((f) => (
          <option key={f} value={f} style={{ fontFamily: latinFontStacks[f] }}>{latinFontLabels[f]}</option>
        ))}
      </select>
    </label>
  );
  const primary = b.primary;
  const logoUrl = b.logo ? urlFor(b.logo) : null;
  const headingFamily = [b.headingFontLatin && latinFontStacks[b.headingFontLatin], b.headingFont ? fontStacks[b.headingFont] : "var(--heading-font)"].filter(Boolean).join(", ");
  const bodyFamily = [b.bodyFontLatin && latinFontStacks[b.bodyFontLatin], b.bodyFont ? fontStacks[b.bodyFont] : "var(--font)"].filter(Boolean).join(", ");
  return (
    <div className="brand-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="brand-panel" role="dialog" aria-label="品牌工具組" onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}>
        <div className="brief-head">
          <h2>品牌工具組</h2>
          <button ref={first} type="button" className="brief-close" aria-label="關閉" onClick={onClose}>×</button>
        </div>
        <p className="brand-lead">設定一次，整個網站的顏色、字型和標誌都會跟著換</p>
        <section>
          <div className="brand-colors-head">
            <h3>顏色</h3>
            {primary && <button type="button" className="brand-smart" onClick={() => set(smartPalette(primary))}>依主色重新配色</button>}
          </div>
          {!primary && (
            <div className="brand-suggest" role="group" aria-label="常用品牌色">
              <span>先挑一個主色，其他顏色會自動配好</span>
              {suggestions.map((c) => (
                <button key={c} type="button" style={{ background: c }} aria-label={"主色用 " + c} onClick={() => pickPrimary(c)} />
              ))}
            </div>
          )}
          <div className="brand-roles">
            {roles.map((r) => {
              const value = b[r.key];
              const check = value ? r.check(b, value) : null;
              const ok = check ? check.ratio >= check.min : true;
              return (
                <div key={r.key} className={"brand-role" + (value ? "" : " is-empty")}>
                  <label className="brand-swatch" style={value ? { background: value, color: inkOn(value) } : undefined}>
                    <input type="color" aria-label={r.name} value={value ?? "#cccccc"} onChange={(e) => (r.key === "primary" ? pickPrimary(e.target.value) : set({ [r.key]: e.target.value.toLowerCase() }))} />
                    <span aria-hidden="true">{value ? "" : "＋"}</span>
                  </label>
                  <div className="brand-role-text">
                    <strong>{r.name}</strong>
                    <small>{r.use}{value ? ` · ${value}` : ""}</small>
                  </div>
                  {check && (
                    <span className={"brand-contrast" + (ok ? " is-ok" : " is-low")} title={`WCAG 建議至少 ${check.min}:1`}>
                      {check.ratio.toFixed(1)}:1 {ok ? "清楚" : "太淡"}
                    </span>
                  )}
                  {check && !ok && <button type="button" className="brand-fix" onClick={() => set({ [r.key]: check.fix() })}>幫我調清楚</button>}
                  {value && r.key !== "primary" && <button type="button" className="brand-remove-role" aria-label={"不用" + r.name} onClick={() => set({ [r.key]: undefined })}>×</button>}
                </div>
              );
            })}
          </div>
          <p className="brand-rule">內文和背景至少 4.5:1，大字和按鈕邊框至少 3:1（WCAG）</p>
        </section>
        <section className="brand-fonts">
          <h3>字型</h3>
          {cjkSelect("headingFont", "標題中文字型")}
          {latinSelect("headingFontLatin", "標題英文字型")}
          {cjkSelect("bodyFont", "內文中文字型")}
          {latinSelect("bodyFontLatin", "內文英文字型")}
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
        <section className="brand-preview" aria-label="預覽" style={{ fontFamily: bodyFamily, background: b.secondary, color: b.neutral }}>
          <div className="brand-preview-nav">
            {logoUrl && <img src={logoUrl} alt="" />}
            <strong>我的網站</strong>
          </div>
          <h4 style={{ fontFamily: headingFamily }}>Hello 標題長這樣</h4>
          <p>內文長這樣 Body text 123，<mark style={b.accent ? { background: b.accent, color: inkOn(b.accent) } : undefined}>重點</mark>會用強調色</p>
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
