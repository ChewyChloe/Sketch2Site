import { useEffect, useMemo, useState } from "react";
import { deleteHabit, readHabits, saveHabit, type Habit } from "./habits";
import { allSections, conceptIds, conceptText, pickableThemes, themeIds, themeLabels, type ConceptId, type PageSpec, type ThemeId } from "./pageSpec";
import { PageRenderer } from "./PageRenderer";
import { ThumbnailRender } from "./PageRuntime";
import type { CandidateResult } from "./demo";
import { DeviceToggle } from "./DeviceToggle";
import { applyDirection, directionsFor, firstTwo, sameDirection, variantAccent, variantsFor, type Ask, type Variant } from "./directions";
export default function CandidatePreview({
  candidate,
  previewOnly=false,
  aiFallback=false,
  kept=0,
  stale,
  onAccept,
  onBack,
  mobile: mobileProp,
  onMobile,
  replacing = false,
  brief,
}: {
  candidate: CandidateResult;
  previewOnly?:boolean;
  aiFallback?: boolean;
  /** Site tweaks carried over from the previous version. */
  kept?: number;
  stale: boolean;
  onAccept: (page: PageSpec) => Promise<void>;
  onBack: () => void;
  /** Desktop or phone width, shared with the site preview when given. */
  mobile?: boolean;
  onMobile?: (mobile: boolean) => void;
  /** A site was built before: confirm before replacing it. */
  replacing?: boolean;
  /** The author's description, used to work out directions when the AI gave none. */
  brief?: { mood?: string; ask?: Ask } | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [mobileState, setMobileState] = useState(false),
    [saving, setSaving] = useState(false),
    [theme, setTheme] = useState<ThemeId>(candidate.page.theme ?? "classic");
  const mobile = mobileProp ?? mobileState;
  const setMobile = (v: boolean) => (onMobile ? onMobile(v) : setMobileState(v));
  // Theme is a reviewed token set; switching it never touches content.
  const [concept, setConcept] = useState<ConceptId | undefined>(candidate.page.concept);
  const [extras, setExtras] = useState(candidate.page.extras ?? {});
  const [composition, setComposition] = useState(candidate.page.composition);
  // Diverge, then converge: three directions side by side, then three variants of the chosen one.
  const directions = useMemo(() => candidate.directions ?? directionsFor(candidate.page, brief), [candidate, brief]);
  const [variant, setVariant] = useState(0);
  const [compareOpen, setCompareOpen] = useState(true);
  // 我的風格: saved looks offered again, never applied on their own.
  const [habits, setHabits] = useState<Habit[]>(readHabits);
  useEffect(() => {
    const changed = () => setHabits(readHabits());
    window.addEventListener("sketch-habits-changed", changed);
    return () => window.removeEventListener("sketch-habits-changed", changed);
  }, []);
  const [habitVariant, setHabitVariant] = useState<{ id: string; variant: Variant } | null>(null);
  const [saving2, setSaving2] = useState<string | null>(null);
  const [habitNote, setHabitNote] = useState("");
  const current = { name: "", why: "", theme: theme === "sunrise" ? ("classic" as const) : theme, concept: concept ?? ("none" as const), composition: composition === "editorial" ? ("editorial" as const) : ("tidy" as const) };
  const variants = variantsFor(current);
  const page = useMemo(() => {
    const base = { ...candidate.page, theme, concept, composition, ...(extras.pricingBuilder || extras.galleryViews ? { extras } : {}) };
    const chosen = habitVariant?.variant ?? (variant ? variants[variant] : undefined);
    return chosen ? applyDirection(base, current, chosen) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.page, theme, concept, composition, extras, variant, habitVariant]);
  const thumbs = useMemo(() => directions.map((d) => firstTwo(applyDirection(candidate.page, d, undefined))), [directions, candidate.page]);
  const chooseDirection = (i: number) => {
    const d = directions[i];
    setTheme(d.theme);
    setConcept(d.concept === "none" ? undefined : d.concept);
    setComposition(d.composition === "editorial" ? "editorial" : undefined);
    setVariant(0);
    setHabitVariant(null);
  };
  const applyHabit = (h: Habit) => {
    setTheme(h.direction.theme);
    setConcept(h.direction.concept === "none" ? undefined : h.direction.concept);
    setComposition(h.direction.composition === "editorial" ? "editorial" : undefined);
    setVariant(-1);
    setHabitVariant({ id: h.id, variant: { label: h.variantLabel, brand: h.variant } });
  };
  const currentName = directions.find((d) => sameDirection(d, theme, concept, composition))?.name ?? "我的風格";
  const keepHabit = (name: string) => {
    const v = habitVariant?.variant ?? variants[Math.max(variant, 0)];
    const saved = saveHabit({ name, direction: { ...current, name: currentName, why: "我存下來的風格" }, variant: v.brand, variantLabel: v.label, ...(brief?.ask ? { ask: brief.ask } : {}) });
    setHabitNote(saved ? `已存成「${saved.name}」，下次可以一鍵套用` : "這個瀏覽器沒辦法儲存，請檢查是否開了無痕模式");
    setSaving2(null);
  };
  const roles = new Set(allSections(candidate.page).map((s) => s.role));
  return (
    <main className="preview-workspace" aria-label="生成候選預覽">
      <div className="preview-tools">
        <div>
          <strong data-candidate-mode={previewOnly ? "preview" : candidate.mode} data-ai-fallback={aiFallback ? "" : undefined}>
            {previewOnly ? "網站預覽" : "你的網站"}
          </strong>
          <small>
            滿意就按「使用此版本」，不喜歡可以返回草稿再改，你的草稿不會被改動
            {kept > 0 && ` 已保留你在網站上的 ${kept} 項版面修改`}
          </small>
        </div>
        <div>
          <DeviceToggle mobile={mobile} onChange={setMobile} />
          {confirming ? (
            <span className="replace-confirm" role="group" aria-label="確認取代目前的網站">
              <span>會取代目前的網站，之後可以換回上一版</span>
              <button
                className="primary"
                disabled={stale || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onAccept(page);
                  } finally {
                    setSaving(false);
                    setConfirming(false);
                  }
                }}
              >
                {saving ? "儲存中…" : "取代網站"}
              </button>
              <button type="button" disabled={saving} onClick={() => setConfirming(false)}>先不要</button>
            </span>
          ) : (
          <button
            className="primary"
            disabled={stale || saving}
            onClick={async () => {
              // Replacing an existing site asks once; the first site is used right away.
              if (replacing) { setConfirming(true); return; }
              setSaving(true);
              try {
                await onAccept(page);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "儲存中…" : "使用此版本"}
          </button>
          )}
          <button disabled={saving} onClick={onBack}>
            返回草稿
          </button>
        </div>
      </div>
      {(roles.has("pricing") || roles.has("gallery")) && (
        <div className="theme-picker extras-picker" role="group" aria-label="互動功能">
          <span>互動功能</span>
          {roles.has("pricing") && <button type="button" className="concept-chip" aria-pressed={!!extras.pricingBuilder} title="訪客勾選項目，馬上算出合計" onClick={() => setExtras((x) => ({ ...x, pricingBuilder: !x.pricingBuilder }))}>互動價目表</button>}
          {roles.has("gallery") && <button type="button" className="concept-chip" aria-pressed={!!extras.galleryViews} title="訪客可以切換大圖、網格、清單" onClick={() => setExtras((x) => ({ ...x, galleryViews: !x.galleryViews }))}>作品瀏覽切換</button>}
        </div>
      )}
      <details className="fine-tune">
        <summary>細調：構圖、設計概念、主題</summary>
      <div className="theme-picker concept-picker" role="radiogroup" aria-label="構圖">
        <span>構圖</span>
        <button role="radio" aria-checked={!composition} className="concept-chip" title="每一段整齊排好" onClick={() => setComposition(undefined)}>整齊</button>
        <button role="radio" aria-checked={composition === "editorial"} className="concept-chip" title="字壓在照片上、照片錯落、每一段排法不同" onClick={() => setComposition("editorial")}>編排</button>
      </div>
      <div className="theme-picker concept-picker" role="radiogroup" aria-label="設計概念">
        <span>設計概念</span>
        <button role="radio" aria-checked={!concept} className="concept-chip" onClick={() => setConcept(undefined)}>不用概念</button>
        {conceptIds.map((id) => (
          <button key={id} role="radio" aria-checked={concept === id} className="concept-chip" title={conceptText[id].idea} onClick={() => setConcept(id)}>
            {conceptText[id].name}
          </button>
        ))}
      </div>
      <div className="theme-picker" role="radiogroup" aria-label="網站主題">
        <span>主題</span>
        {pickableThemes.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={theme === id}
            className={"theme-swatch theme-swatch-" + id}
            onClick={() => setTheme(id)}
          >
            <i aria-hidden="true" />
            {themeLabels[id]}
          </button>
        ))}
      </div>
      </details>
      {stale && (
        <p role="alert" className="preview-error">
          草稿已更新，請返回草稿重新生成
        </p>
      )}
      <div className="preview-scroll">
        <div className={"preview-frame " + (mobile ? "mobile" : "desktop")}>
          <PageRenderer input={page} />
        </div>
      </div>
      {/* After the live preview in the page order (so it stays the first rendered page); shown above it. */}
      <section className="direction-compare" aria-label="比較三個方向">
        <div className="direction-compare-head">
          <h3>先選一個方向</h3>
          <button type="button" className="direction-toggle" aria-expanded={compareOpen} onClick={() => setCompareOpen((v) => !v)}>{compareOpen ? "收起方向" : "比較三個方向"}</button>
        </div>
        {compareOpen && <div className="direction-cards" role="radiogroup" aria-label="三個方向">
          {directions.map((d, i) => (
            <button key={d.name + i} type="button" role="radio" aria-label={d.name + "：" + d.why} aria-checked={sameDirection(d, theme, concept, composition)} className="direction-card" onClick={() => chooseDirection(i)}>
              <span className="direction-thumb" aria-hidden="true" inert><span className="direction-thumb-page"><ThumbnailRender.Provider value={true}><PageRenderer input={thumbs[i]} /></ThumbnailRender.Provider></span></span>
              <strong>{d.name}</strong>
              <small>{d.why}</small>
            </button>
          ))}
        </div>}
        <div className="theme-picker variant-picker" role="radiogroup" aria-label="同一方向的變化">
          <span>再挑一種變化</span>
          {variants.map((v, i) => (
            <button key={v.label} type="button" role="radio" aria-checked={variant === i} className="concept-chip" onClick={() => { setVariant(i); setHabitVariant(null); }}>
              {variantAccent(v) && <i className="variant-dot" style={{ background: variantAccent(v) }} aria-hidden="true" />}
              {v.label}
            </button>
          ))}
          {saving2 === null ? (
            <button type="button" className="concept-chip habit-save" onClick={() => setSaving2(currentName)}>存成我的風格</button>
          ) : (
            <form className="habit-form" onSubmit={(e) => { e.preventDefault(); if (saving2.trim()) keepHabit(saving2.trim()); }}>
              <input aria-label="風格名稱" maxLength={12} value={saving2} autoFocus onChange={(e) => setSaving2(e.target.value)} />
              <button type="submit" className="concept-chip">儲存</button>
              <button type="button" className="concept-chip" onClick={() => setSaving2(null)}>取消</button>
            </form>
          )}
        </div>
        {habitNote && <p className="habit-note" role="status">{habitNote}</p>}
        {habits.length > 0 && (
          <div className="theme-picker habit-picker" role="group" aria-label="我的風格">
            <span>我的風格</span>
            {habits.map((h) => (
              <span key={h.id} className="habit-chip">
                <button type="button" className="concept-chip" aria-pressed={habitVariant?.id === h.id} title={h.variantLabel} onClick={() => applyHabit(h)}>{h.name}</button>
                <button type="button" className="habit-del" aria-label={"刪除我的風格：" + h.name} onClick={() => { deleteHabit(h.id); if (habitVariant?.id === h.id) setHabitVariant(null); }}>×</button>
              </span>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
