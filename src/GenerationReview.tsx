import { describeStyle } from "./referenceStyle";
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

export function GenerationReview({ draft, aiReady }: { draft: CanvasSpec; aiReady: boolean }) {
  const brief = draft.metadata.brief;
  const automatic = aiReady && (draft.metadata.pages?.length ?? 0) < 2 ? "交由 AI 決定" : "由本機排版決定";
  const style = [
    brief?.mood, brief?.style ? describeStyle(brief.style).map(item => item.name).join("、") : undefined,
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
        <section key={view.id ?? "home"} aria-label={view.name}>
          <h3>{view.name}的區塊順序</h3>
          <ol>{outlineOf(view.draft).sections.map(section =>
            <li key={section.i}>{section.heading || purposes[section.role]} · {purposes[section.role]}</li>
          )}</ol>
        </section>
      ))}
    </section>
  );
}
