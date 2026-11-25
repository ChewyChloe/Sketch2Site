import { useEffect, useRef, useState } from "react";
import { brandRadii, radiusLabels, radiusPx, contrast, fixContrast, fontIds, fontLabels, fontStacks, inkOn, latinFontIds, latinFontLabels, latinFontStacks, smartPalette, type Brand, type FontId, type LatinFontId } from "./pageSpec";

const weightLabels: Record<number, string> = { 400: "一般", 500: "中等", 600: "半粗", 700: "粗", 800: "特粗", 900: "最粗" };
const typePresets: [string, NonNullable<Brand["type"]>][] = [
  ["大方", { h1Size: 64, h1Weight: 800, h2Size: 40, h2Weight: 700, bodySize: 17, bodyWeight: 400 }],
  ["精緻", { h1Size: 56, h1Weight: 600, h2Size: 36, h2Weight: 600, bodySize: 16, bodyWeight: 400 }],
  ["活潑", { h1Size: 72, h1Weight: 900, h2Size: 44, h2Weight: 800, bodySize: 18, bodyWeight: 500 }],
];
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
    if (next.type && !Object.values(next.type).some((v) => v !== undefined)) delete next.type;
    onChange(next.colors.length || next.headingFont || next.bodyFont || next.headingFontLatin || next.bodyFontLatin || next.logo || next.logoAlt || next.icon || next.radius || next.type ? next : undefined);
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
  const [uploading, setUploading] = useState<"logo" | "logoAlt" | "icon" | null>(null);
  const logoPicker = (key: "logo" | "logoAlt" | "icon", name: string, hint: string) => (
    <div className="brand-logo-group">
      <div className="brand-logo-label"><strong>{name}</strong><small>{hint}</small></div>
      <div className="brand-logo-row">
        {logos.map((ref) => (
          <button key={ref} type="button" className="brand-logo" aria-pressed={b[key] === ref} aria-label={key === "logo" ? "使用這張圖當標誌" : `${name}用這張圖`} onClick={() => set({ [key]: b[key] === ref ? undefined : ref })}>
            {urlFor(ref) ? <img src={urlFor(ref)!} alt="" /> : "圖片"}
          </button>
        ))}
        <button type="button" className="brand-upload" disabled={busy} onClick={() => { setUploading(key); fileInput.current?.click(); }}>{busy && uploading === key ? "上傳中…" : "＋ 上傳"}</button>
      </div>
    </div>
  );
  const primary = b.primary;
  const logoUrl = b.logo ? urlFor(b.logo) : null;
  const headingFamily = [b.headingFontLatin && latinFontStacks[b.headingFontLatin], b.headingFont ? fontStacks[b.headingFont] : "var(--heading-font)"].filter(Boolean).join(", ");
  const bodyFamily = [b.bodyFontLatin && latinFontStacks[b.bodyFontLatin], b.bodyFont ? fontStacks[b.bodyFont] : "var(--font)"].filter(Boolean).join(", ");
  return (
    <div className="brand-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="brand-panel" role="dialog" aria-label="品牌模板設定" onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}>
        <div className="brief-head">
          <h2>品牌模板設定</h2>
          <button ref={first} type="button" className="brief-close" aria-label="關閉" onClick={onClose}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
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
                  {!check && <span aria-hidden="true" />}
                  {check && (
                    <span className={"brand-contrast" + (ok ? " is-ok" : " is-low")} title={`WCAG 建議至少 ${check.min}:1`}>
                      {check.ratio.toFixed(1)}:1 {ok ? "清楚" : "太淡"}
                    </span>
                  )}
                  {!(check && !ok) && <span aria-hidden="true" />}
                  {check && !ok && <button type="button" className="brand-fix" onClick={() => set({ [r.key]: check.fix() })}>幫我調清楚</button>}
                  {value && r.key !== "primary" ? <button type="button" className="brand-remove-role" aria-label={"不用" + r.name} onClick={() => set({ [r.key]: undefined })}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button> : <span className="brand-remove-spacer" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </section>
        <section className="brand-fonts">
          <h3>字型</h3>
          {cjkSelect("headingFont", "標題中文字型")}
          {latinSelect("headingFontLatin", "標題英文字型")}
          {cjkSelect("bodyFont", "內文中文字型")}
          {latinSelect("bodyFontLatin", "內文英文字型")}
        </section>
        <section>
          <h3>圓角</h3>
          <div className="brand-chips" role="group" aria-label="圓角">
            {brandRadii.map((r) => (
              <button key={r} type="button" aria-pressed={b.radius === r} onClick={() => set({ radius: b.radius === r ? undefined : r })}>
                <i style={{ borderRadius: Math.min(radiusPx[r].button, 14) }} aria-hidden="true" />{radiusLabels[r]}
              </button>
            ))}
          </div>
        </section>
        <section className="brand-type">
          <h3>文字搭配</h3>
          <div className="brand-chips" role="group" aria-label="文字搭配範本">
            {typePresets.map(([name, t]) => (
              <button key={name} type="button" aria-pressed={JSON.stringify(b.type ?? {}) === JSON.stringify(t)} onClick={() => set({ type: t })}>{name}</button>
            ))}
          </div>
          {([["h1", "標題"], ["h2", "副標題"], ["body", "內文"]] as const).map(([k, name]) => {
            const sizeKey = (k + "Size") as "h1Size" | "h2Size" | "bodySize", weightKey = (k + "Weight") as "h1Weight" | "h2Weight" | "bodyWeight";
            const sizes = k === "h1" ? [40, 48, 56, 64, 72, 80] : k === "h2" ? [28, 32, 36, 40, 44, 48] : [15, 16, 17, 18, 20];
            const weights = k === "body" ? [400, 500, 600] : [500, 600, 700, 800, 900];
            return (
              <div key={k} className="brand-type-row">
                <span>{name}</span>
                <select aria-label={name + "字級"} value={b.type?.[sizeKey] ?? ""} onChange={(e) => set({ type: { ...b.type, [sizeKey]: e.target.value ? Number(e.target.value) : undefined } })}>
                  <option value="">跟著主題</option>
                  {sizes.map((v) => <option key={v} value={v}>{v} px</option>)}
                </select>
                <select aria-label={name + "粗細"} value={b.type?.[weightKey] ?? ""} onChange={(e) => set({ type: { ...b.type, [weightKey]: e.target.value ? Number(e.target.value) : undefined } as Brand["type"] })}>
                  <option value="">跟著主題</option>
                  {weights.map((v) => <option key={v} value={v}>{weightLabels[v]}</option>)}
                </select>
              </div>
            );
          })}
        </section>
        <section>
          <h3>標誌與圖標</h3>
          {logoPicker("logo", "主標誌", "放在網站最上面")}
          {logoPicker("logoAlt", "次要標誌", "放在網站最下面")}
          {logoPicker("icon", "網站圖標", "瀏覽器分頁上的小圖")}
        </section>
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
            const key = uploading ?? "logo";
            setBusy(true);
            const ref = await onImportLogo(file);
            setBusy(false);
            if (ref) set({ [key]: ref });
          }}
        />
        <section className="brand-preview" aria-label="預覽" style={{ fontFamily: bodyFamily, background: b.secondary, color: b.neutral }}>
          <div className="brand-preview-nav">
            {logoUrl && <img src={logoUrl} alt="" />}
            <strong>我的網站</strong>
          </div>
          <h4 style={{ fontFamily: headingFamily, fontWeight: b.type?.h1Weight, fontSize: b.type?.h1Size ? Math.round(b.type.h1Size * 0.45) : undefined }}>Hello 標題長這樣</h4>
          <p>內文長這樣 Body text 123，<mark style={b.accent ? { background: b.accent, color: inkOn(b.accent) } : undefined}>重點</mark>會用強調色</p>
          <span className="brand-preview-button" style={{ ...(primary ? { background: primary, color: inkOn(primary) } : {}), ...(b.radius ? { borderRadius: radiusPx[b.radius].button } : {}) }}>按鈕長這樣</span>
        </section>
        <div className="brief-actions">
          <button type="button" className="brief-reset" onClick={() => onChange(undefined)}>全部清除</button>
          <button type="button" className="primary" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
