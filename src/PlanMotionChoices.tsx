import { useState } from "react";
import { createSiteCandidate } from "./siteGeneration";
import { draftMotionSuggestions, applyDraftMotionSuggestion } from "./motionRecipes";
import { effectLabels } from "./visualEditing";
import { PageRenderer } from "./PageRenderer";
import type { PageSpec } from "./pageSpec";
import type { CanvasSpec } from "./spec";

const names = { heading: "標題", text: "文字", button: "按鈕", card: "卡片", image: "圖片", form: "表單", media: "媒體" };

export function PlanMotionChoices({ draft, view, ids, name, protectedIds, onChange }: {
  draft: CanvasSpec;
  view: CanvasSpec;
  ids: readonly string[];
  name: string;
  protectedIds: ReadonlySet<string>;
  onChange: (draft: CanvasSpec) => void;
}) {
  const available = ids.map(id => draft.nodes.find(node => node.id === id))
    .filter(node => node && !node.locked && !node.effects.length && !protectedIds.has(node.id));
  const [selected, setSelected] = useState("");
  const [description, setDescription] = useState("");
  const [trial, setTrial] = useState<{ input: PageSpec; key: number } | null>(null);
  const [notice, setNotice] = useState("");
  const selectedId = available.find(node => node?.id === selected)?.id ?? available[0]?.id;
  const suggestions = selectedId ? draftMotionSuggestions(view, selectedId, description) : [];
  const useSuggestion = (index: number, preview: boolean) => {
    const effect = suggestions[index].effect;
    const next = applyDraftMotionSuggestion(draft, effect, protectedIds);
    if (!next) {
      setNotice("此元件或動態限制已變更，請重新選擇");
      return;
    }
    try {
      const result = createSiteCandidate(next);
      if (preview) setTrial(previous => ({ input: result.page, key: (previous?.key ?? 0) + 1 }));
      else {
        onChange(next);
        setTrial(null);
        setNotice("已套用：" + effectLabels[effect.presetId]);
      }
    } catch {
      setNotice("目前草稿或布局無法搭配這個動畫，已保留原設定");
    }
  };
  return <details className="plan-motion-choices">
    <summary>動畫推薦</summary>
    {!selectedId ? <p>此區沒有可新增動畫的未鎖定元件。</p> : <>
      <label className="field">推薦元件
        <select value={selectedId} onChange={event => { setSelected(event.target.value); setTrial(null); setNotice(""); }}>
          {available.map(node => node && <option key={node.id} value={node.id}>{names[node.type]}：{node.content.slice(0, 24) || "未命名"}</option>)}
        </select>
      </label>
      <label className="field">想要的動畫效果（選填）
        <input value={description} maxLength={100} onChange={event => { setDescription(event.target.value); setTrial(null); }} placeholder="例如：輕柔淡入" />
      </label>
      {suggestions.length ? <ul aria-label={`${name}的動畫推薦`}>
        {suggestions.map(({ effect, reasons }, index) => <li key={effect.presetId}>
          <strong>{effectLabels[effect.presetId]}</strong>
          <p>{name} · {reasons.join("、")}</p>
          <button type="button" onClick={() => useSuggestion(index, true)}>試看{effectLabels[effect.presetId]}</button>
          <button type="button" onClick={() => useSuggestion(index, false)}>套用{effectLabels[effect.presetId]}</button>
        </li>)}
      </ul> : <p>目前沒有符合描述與元件條件的動畫。</p>}
    </>}
    {trial && <section aria-label="推薦動畫試看">
      <button type="button" onClick={() => setTrial(null)}>取消試看</button>
      <button type="button" onClick={() => setTrial({ ...trial, key: trial.key + 1 })}>重播試看</button>
      <div className="plan-motion-preview" onClickCapture={event => {
        if ((event.target as Element).closest("a")) event.preventDefault();
      }}><PageRenderer key={trial.key} input={trial.input} motionPreview /></div>
    </section>}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
