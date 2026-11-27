import { materialize } from "./generation";
import { plannedSourceIds, smartLayout } from "./smartLayout";
import SectionLayoutPicker, { SectionLayoutThumbnail } from "./SectionLayoutPicker";
import { allSections, themeLabels, type PageSpec } from "./pageSpec";
import { requestedSectionLayout, sectionSourceIds, type SectionLayout } from "./sectionLayout";
import { effectLabels } from "./visualEditing";
import { referencePurposeLabels, referenceHints } from "./referenceStyle";
import { avoidLabels, heroLabels, lightnessLabels } from "./directions";
import { outlineOf } from "./outline";
import { pageDraft, type CanvasSpec } from "./spec";

const purposes = {
  hero: "開場", features: "特色", content: "主要內容", gallery: "圖片展示",
  pricing: "價目", faq: "常見問題", contact: "聯絡", cta: "行動邀請",
  footer: "頁尾", menu: "菜單",
} as const;

export function generationPages(draft: CanvasSpec) {
  return (draft.metadata.pages ?? [{ id: null, name: "首頁" }]).map(({ id, name }) => ({
    id, name, draft: pageDraft(draft, id),
  }));
}

export function GenerationReview({ draft, aiReady, savedSite, onDraftChange }: {
  draft: CanvasSpec;
  aiReady: boolean;
  savedSite?: PageSpec | null;
  onDraftChange: (draft: CanvasSpec) => void;
}) {
  const brief = draft.metadata.brief;
  const automatic = aiReady && (draft.metadata.pages?.length ?? 0) < 2 ? "交由 AI 決定" : "由本機排版決定";
  const referenceTheme = referenceHints(brief?.style, brief?.referencePurposes)?.direction;
  const style = [
    brief?.mood, referenceHints(brief?.style, brief?.referencePurposes)?.direction,
    brief?.referencePurposes?.map(id => referencePurposeLabels[id]).join("、") || (brief?.style && "整體風格參考"),
    brief?.ask?.lightness?.map(id => lightnessLabels[id]).join("、"),
    draft.metadata.brand && "自訂品牌",
    draft.metadata.siteOverrides?.theme && "自訂網站主題",
  ].filter(Boolean).join("，");
  const animated = draft.nodes.filter(node => node.effects.length > 0).length;
  return (
    <section aria-label="生成前需求摘要">
      <h2>確認設計計畫</h2>
      <dl>
        <dt>網站目的</dt><dd>{brief?.purpose || automatic}</dd>
        <dt>目標受眾</dt><dd>{brief?.audience || automatic}</dd>
        <dt>重點與首屏</dt><dd>{[brief?.focus, brief?.ask?.hero && heroLabels[brief.ask.hero]].filter(Boolean).join("，") || automatic}</dd>
        <dt>視覺風格</dt><dd>{style ? "已指定：" + style : automatic}</dd>
        <dt>布局偏好</dt><dd>{draft.metadata.layoutMode === "reflow" ? "已指定：智慧排版" : "保留草稿位置"}{draft.metadata.layoutMode === "reflow" && "；未指定的區塊" + automatic}</dd>
        <dt>動畫偏好</dt><dd>{animated ? `保留 ${animated} 個元件的既有動畫` : "草稿尚未設定動畫"}</dd>
        <dt>避用項目</dt><dd>{brief?.ask?.avoid?.map(id => avoidLabels[id]).join("、") || "未指定"}</dd>
        {(brief?.note || brief?.details || brief?.ask?.refs) && <><dt>其他要求</dt><dd>{[brief.note, brief.details, brief.ask?.refs].filter(Boolean).join("；")}</dd></>}
      </dl>
      {generationPages(draft).map(view => (
        <SectionPlan key={view.id ?? "home"} view={view} draft={draft}
          savedSite={savedSite} automatic={automatic} onDraftChange={onDraftChange} />
      ))}
    </section>
  );
}

function SectionPlan({ view, draft, savedSite, automatic, onDraftChange }: {
  view: ReturnType<typeof generationPages>[number];
  draft: CanvasSpec;
  savedSite?: PageSpec | null;
  automatic: string;
  onDraftChange: (draft: CanvasSpec) => void;
}) {
  const plan = smartLayout(view.draft);
  const outline = outlineOf(view.draft, plan);
  const sourceIds = new Set(view.draft.nodes.map(node => node.id));
  const locked = savedSite ? allSections(savedSite).filter(section => section.lock?.layout)
    .map(section => new Set(sectionSourceIds(section, sourceIds))) : [];
  const positionMode = draft.metadata.layoutMode !== "reflow";
  let rendered: PageSpec | undefined;
  try {
    if (view.draft.nodes.length) rendered = materialize(view.draft, plan);
  } catch {
    // Drafts with incomplete links or incompatible prior layouts still have an editable brief.
  }
  const anchors = plan.sections.map(section => plannedSourceIds(section)[0]);
  const isLocked = (index: number) => plannedSourceIds(plan.sections[index]).some(id => locked.some(group => group.has(id)));
  const move = (from: number, to: number) => {
    const order = [...anchors];
    [order[from], order[to]] = [order[to], order[from]];
    const otherPages = (draft.metadata.sectionOrder ?? []).filter(id => !sourceIds.has(id));
    onDraftChange({ ...draft, metadata: { ...draft.metadata, sectionOrder: [...otherPages, ...order] } });
  };
  const setLayout = (ids: string[], layout: SectionLayout) => {
    const overrides = draft.metadata.siteOverrides;
    const items = { ...overrides?.items };
    for (const id of ids) delete items["layout:" + id];
    if (layout.arrangement || layout.fullBleed) items["layout:" + ids[0]] = { sectionLayout: layout };
    onDraftChange({ ...draft, metadata: {
      ...draft.metadata, siteOverrides: { ...overrides, items },
    } });
  };
  return <section aria-label={view.name} className="generation-section-plan">
    <h3>{view.name}的區塊順序</h3>
    {positionMode && <p>目前保留草稿位置。切換到智慧排版後可調整這裡的區塊順序和布局。</p>}
    {!rendered && view.draft.nodes.length > 0 && <p>目前無法預覽區塊布局，請確認草稿內容、連結及既有布局設定。</p>}
    <ol>{outline.sections.map((section, index) => {
      const planned = plan.sections[index];
      const ids = plannedSourceIds(planned);
      const selected = requestedSectionLayout(draft.metadata.siteOverrides?.items, ids);
      const sectionNode = rendered?.sections[index];
      const name = section.heading || purposes[section.role];
      const locked = isLocked(index);
      const ordered = ids.some(id => draft.metadata.sectionOrder?.includes(id));
      const details = Object.entries(section.counts).map(([kind, count]) => {
        const labels: Record<string, string> = { heading: "標題", text: "文字", button: "按鈕", image: "圖片", card: "卡片", form: "表單", media: "媒體" };
        return `${count} 個${labels[kind] ?? kind}`;
      }).join("、");
      return <li key={anchors[index]} aria-label={name}>
        <strong>{name}</strong>
        <p>{purposes[section.role]} · {details} · {ordered ? "順序已指定" : "目前建議順序"}</p>
        {section.cards?.length ? <p>{section.cards.join("、")}</p> : null}
        <SectionLayoutThumbnail mode={selected?.arrangement?.mode ?? (planned.layout === "grid" ? "grid" : planned.aside.length ? "split" : "stack")} />
        <p>{locked ? "版面已鎖定" : selected ? "布局已指定" : automatic}{selected?.fullBleed ? " · 滿版" : ""}</p>
        <p>{section.effects.length ? "保留動畫：" + section.effects.map(id => effectLabels[id]).join("、") : "這區沒有既有動畫"}</p>
        {!positionMode && <>
          <button type="button" disabled={locked || index === 0 || isLocked(index - 1)} onClick={() => move(index, index - 1)}>上移</button>
          <button type="button" disabled={locked || index + 1 === anchors.length || isLocked(index + 1)} onClick={() => move(index, index + 1)}>下移</button>
        </>}
        {sectionNode && <SectionLayoutPicker section={locked ? { ...sectionNode, lock: { layout: true } } : sectionNode}
          positionMode={positionMode} onChange={layout => setLayout(ids, layout)} />}
      </li>;
    })}</ol>
  </section>;
}
