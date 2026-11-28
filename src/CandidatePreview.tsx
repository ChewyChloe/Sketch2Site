import { hasImplicitLayoutLock } from "./sectionLayout";
import { useEffect, useMemo, useState } from "react";
import { deleteHabit, readHabits, saveHabit, type Habit } from "./habits";
import { allSections, conceptIds, parallaxConcepts, conceptText, pickableThemes, themeIds, themeLabels, type ConceptId, type PageSpec, type ThemeId } from "./pageSpec";
import { PageRenderer } from "./PageRenderer";
import { ThumbnailRender } from "./PageRuntime";
import type { CandidateResult } from "./demo";
import { DeviceToggle } from "./DeviceToggle";
import { composeLabels, planText, type PlanId } from "./compositionPlan";
import { applyArt, describeArt } from "./artDirection";
import type { Direction } from "./directions";
import { describeTaste, preferredPlans, recordTaste, resetTaste } from "./preferences";
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
  const [control, setControl] = useState(candidate.page.designControl);
  const implicitLayoutLock = hasImplicitLayoutLock(candidate.page);
  const preserveMotion = () => control?.conceptMotion ?? Boolean(concept && parallaxConcepts.includes(concept));
  const [extras, setExtras] = useState(candidate.page.extras ?? {});
  const [composition, setComposition] = useState(candidate.page.composition);
  // The candidate's own geometry (compositionPlan.ts); a layout lock keeps the page's geometry.
  const [plan, setPlan] = useState<PlanId | undefined>(candidate.page.plan);
  // The chosen direction's own composition per area and its art direction (AI-decided).
  const [chosen, setChosen] = useState<Direction | null>(null);
  // Diverge, then converge: three directions side by side, then three variants of the chosen one.
  const directions = useMemo(() => {
    const ds = candidate.directions ?? directionsFor(candidate.page, brief);
    // Learned taste (this device only) puts the most chosen geometry on the first direction;
    // the three stay different. Without any taste the AI's or the material's order stands.
    const learned = describeTaste().length > 0;
    const plans = ds.map((d) => d.plan).filter((p): p is PlanId => !!p);
    if (!learned || plans.length !== 3) return ds;
    const order = preferredPlans(plans);
    return ds.map((d, i) => ({ ...d, plan: order[i] }));
  }, [candidate, brief]);
  useEffect(() => { if (!candidate.page.plan && !hasImplicitLayoutLock(candidate.page)) setPlan(directions[0]?.plan ?? undefined); }, [directions, candidate.page]);
  const [variant, setVariant] = useState(0);
  const [compareOpen, setCompareOpen] = useState(true);
  // 我的風格: saved looks offered again, never applied on their own.
  const [habits, setHabits] = useState<Habit[]>(readHabits);
  // What was learned from earlier choices (preferences.ts), shown so it can be reset.
  const [taste, setTaste] = useState<string[]>(() => describeTaste());
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
    const dir = hasImplicitLayoutLock(candidate.page) ? null : chosen ?? directions[0] ?? null;
    const base = applyArt({ ...candidate.page, theme, concept, composition, plan, ...(dir?.compose ? { compose: dir.compose } : {}), designControl: control, ...(extras.pricingBuilder || extras.galleryViews ? { extras } : {}) }, dir?.art ?? undefined);
    const picked = habitVariant?.variant ?? (variant ? variants[variant] : undefined);
    return picked ? applyDirection(base, { ...current, plan, compose: dir?.compose, art: dir?.art }, picked) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.page, theme, concept, composition, plan, chosen, directions, control, extras, variant, habitVariant]);
  const thumbs = useMemo(() => directions.map((d) => firstTwo(applyDirection(candidate.page, d, undefined))), [directions, candidate.page]);
  const keepLockedGeometry = () => {
    if (implicitLayoutLock) setControl({
      ...control,
      layoutConcept: control?.layoutConcept === undefined ? concept ?? null : control.layoutConcept,
      layoutTheme: control?.layoutTheme === undefined ? theme : control.layoutTheme,
    });
  };
  const chooseDirection = (i: number) => {
    const d = directions[i];
    keepLockedGeometry();
    if (!control?.style) {
      setTheme(d.theme);
      setConcept(d.concept === "none" ? undefined : d.concept);
    }
    if (!control?.composition && !implicitLayoutLock) setComposition(d.composition === "editorial" ? "editorial" : undefined);
    if (!implicitLayoutLock) { setPlan(d.plan ?? undefined); setChosen(d); }
    setVariant(0);
    setHabitVariant(null);
  };
  const applyHabit = (h: Habit) => {
    keepLockedGeometry();
    if (!control?.style) {
      setTheme(h.direction.theme);
      setConcept(h.direction.concept === "none" ? undefined : h.direction.concept);
    }
    if (!control?.composition && !implicitLayoutLock) setComposition(h.direction.composition === "editorial" ? "editorial" : undefined);
    setVariant(-1);
    setHabitVariant(control?.style ? null : { id: h.id, variant: { label: h.variantLabel, brand: h.variant } });
  };
  const pickComposition = (value: "editorial" | undefined) => {
    setComposition(value);
    setControl({ ...control, composition: true });
  };
  const pickStyle = (value: { theme?: ThemeId; concept?: ConceptId }) => {
    setControl({
      ...control, style: true, conceptMotion: preserveMotion(),
      layoutConcept: control?.layoutConcept === undefined ? concept ?? null : control.layoutConcept,
      layoutTheme: control?.layoutTheme === undefined ? theme : control.layoutTheme,
    });
    if ("theme" in value && value.theme) setTheme(value.theme);
    if ("concept" in value) setConcept(value.concept);
    setVariant(0);
    setHabitVariant(null);
  };
  const currentName = directions.find((d) => sameDirection(d, theme, concept, composition, plan))?.name ?? "我的風格";
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
          {/* 使用此版本 stays put; replacing an earlier site asks in a small card below it. */}
          <span className="replace-anchor">
            <button
              className="primary"
              aria-expanded={replacing ? confirming : undefined}
              disabled={stale || saving}
              onClick={async () => {
                // Replacing an existing site asks once; the first site is used right away.
                if (replacing) { setConfirming((v) => !v); return; }
                setSaving(true);
                try {
                  if (page.plan) recordTaste(`plan:${page.plan}`, 3, "direction");
                  await onAccept(page);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving && !confirming ? "儲存中…" : "使用此版本"}
            </button>
            {confirming && (
              <span className="replace-confirm" role="group" aria-label="確認取代目前的網站">
                <span>會取代目前的網站，之後可以換回上一版</span>
                <span className="replace-confirm-actions">
                  <button type="button" disabled={saving} onClick={() => setConfirming(false)}>先不要</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={stale || saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        if (page.plan) recordTaste(`plan:${page.plan}`, 3, "direction");
                  await onAccept(page);
                      } finally {
                        setSaving(false);
                        setConfirming(false);
                      }
                    }}
                  >
                    {saving ? "儲存中…" : "取代網站"}
                  </button>
                </span>
              </span>
            )}
          </span>
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
        {implicitLayoutLock && <small>已有區塊鎖定原版面，可到區塊屬性逐區調整。</small>}
        <button role="radio" aria-checked={!composition} disabled={implicitLayoutLock} className="concept-chip" title="每一段整齊排好" onClick={() => pickComposition(undefined)}>整齊</button>
        <button role="radio" aria-checked={composition === "editorial"} disabled={implicitLayoutLock} className="concept-chip" title="字壓在照片上、照片錯落、每一段排法不同" onClick={() => pickComposition("editorial")}>編排</button>
      </div>
      <div className="theme-picker concept-picker" role="radiogroup" aria-label="設計概念">
        <span>設計概念</span>
        <button role="radio" aria-checked={!concept} className="concept-chip" onClick={() => pickStyle({ concept: undefined })}>不用概念</button>
        {conceptIds.map((id) => (
          <button key={id} role="radio" aria-checked={concept === id} className="concept-chip" title={conceptText[id].idea} onClick={() => pickStyle({ concept: id })}>
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
            onClick={() => pickStyle({ theme: id })}
          >
            <i aria-hidden="true" />
            {themeLabels[id]}
          </button>
        ))}
      </div>
      <label className="field">
        <span><input type="checkbox" checked={preserveMotion()}
          onChange={event => setControl({ ...control, conceptMotion: event.target.checked })} /> 捲動視差</span>
      </label>
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
            <button key={d.name + i} type="button" role="radio" aria-label={d.name + "：" + d.why} aria-checked={sameDirection(d, theme, concept, composition, plan)} className="direction-card" onClick={() => chooseDirection(i)}>
              <span className="direction-thumb" aria-hidden="true" inert><span className="direction-thumb-page"><ThumbnailRender.Provider value={true}><PageRenderer input={thumbs[i]} /></ThumbnailRender.Provider></span></span>
              <strong>{d.name}</strong>
              <small>{d.why}</small>
              {d.compose ? <small className="direction-plan">構圖：{composeLabels.hero[d.compose.hero]}・{composeLabels.gallery[d.compose.gallery]}</small> : d.plan && <small className="direction-plan">構圖：{planText[d.plan].name}</small>}
              {d.art && <small className="direction-art">{describeArt(d.art).join("・")}</small>}
            </button>
          ))}
        </div>}
        {compareOpen && taste.length > 0 && (
          <p className="taste-note" role="note">
            依你過去的選擇排序：{taste.join("；")}
            <button type="button" onClick={() => { resetTaste(); setTaste([]); }}>重設偏好</button>
          </p>
        )}
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
