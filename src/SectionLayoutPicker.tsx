import { useState } from "react";
import type { PageNode } from "./pageSpec";
import { sectionLayoutIssue, type SectionArrangement, type SectionLayout } from "./sectionLayout";

const presets = [
  { mode: "cards", name: "卡片式", hint: "讓每個項目有自己的邊框", boxes: [[2, 2, 13, 21], [17, 2, 13, 21], [32, 2, 13, 21]] },
  { mode: "bento", name: "大小格拼接", hint: "用大格突出第一個項目", boxes: [[2, 2, 27, 21], [31, 2, 14, 9], [31, 14, 14, 9]] },
  { mode: "split", name: "分屏", hint: "把兩項內容並排", boxes: [[2, 2, 21, 21], [25, 2, 20, 21]] },
  { mode: "grid", name: "多欄網格", hint: "欄寬一致，按列對齊", boxes: [[2, 2, 13, 9], [17, 2, 13, 9], [32, 2, 13, 9], [2, 14, 13, 9], [17, 14, 13, 9], [32, 14, 13, 9]] },
  { mode: "stack", name: "垂直排列", hint: "由上而下依序閱讀", boxes: [[2, 2, 43, 6], [2, 10, 43, 6], [2, 18, 43, 6]] },
  { mode: "masonry", name: "瀑布流", hint: "按欄排列不同高度的內容", boxes: [[2, 2, 13, 14], [2, 18, 13, 5], [17, 2, 13, 7], [17, 11, 13, 12], [32, 2, 13, 21]] },
] as const;

function arrangementFor(mode: SectionArrangement["mode"]): SectionArrangement {
  const gap = "medium";
  if (mode === "stack") return { mode, gap };
  if (mode === "split") return { mode, gap, ratio: "equal" };
  if (mode === "bento") return { mode, gap, columns: 3 };
  return { mode, gap, columns: 3, mobile: "stack" };
}

export default function SectionLayoutPicker({ section, onChange, positionMode }: {
  section: PageNode;
  onChange: (layout: SectionLayout) => void;
  positionMode: boolean;
}) {
  const [message, setMessage] = useState("");
  const value = section.sectionLayout ?? { arrangement: null, fullBleed: false };
  const arrangement = value.arrangement;
  const apply = (next: SectionLayout) => {
    const issue = sectionLayoutIssue(section, next);
    setMessage(issue ?? "");
    if (!issue) onChange(next);
  };
  return (
    <details className="section-layout-picker">
      <summary>區塊布局</summary>
      {positionMode || section.lock?.layout ? <p role="status">{positionMode
        ? "這一頁正使用保留草稿位置。先用智慧排版生成網站，再調整區塊布局。"
        : "這一區的版面已鎖定，解除版面鎖定後可改排列。"}</p> : <>
        <div className="section-layout-options" role="group" aria-label="排列方式">
          {presets.map(({ mode, name, hint, boxes }) => (
            <button key={mode} type="button" aria-pressed={arrangement?.mode === mode}
              onClick={() => apply({ ...value, arrangement: arrangement?.mode === mode ? arrangement : arrangementFor(mode) })}>
              <svg aria-hidden="true" viewBox="0 0 47 25">
                {boxes.map(([x, y, width, height]) => <rect key={x + ":" + y} {...{ x, y, width, height }} rx={mode === "cards" ? 3 : 0} />)}
              </svg>
              <strong>{name}</strong>
              <small>{hint}</small>
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={!arrangement} onClick={() => apply({ ...value, arrangement: null })}>自動排列</button>
        <label><input type="checkbox" checked={value.fullBleed} onChange={event => apply({ ...value, fullBleed: event.target.checked })} />滿版寬度</label>
        {arrangement && <label className="field">項目間距
          <select value={arrangement.gap} onChange={event => apply({ ...value, arrangement: { ...arrangement, gap: event.target.value as SectionArrangement["gap"] } })}>
            <option value="small">緊密</option><option value="medium">適中</option><option value="large">寬鬆</option>
          </select>
        </label>}
        {arrangement && "columns" in arrangement && <label className="field">欄數
          <select value={arrangement.columns} onChange={event => apply({ ...value, arrangement: { ...arrangement, columns: Number(event.target.value) as 2 | 3 } })}>
            <option value="2">兩欄</option><option value="3">三欄</option>
          </select>
        </label>}
        {arrangement?.mode === "split" && <label className="field">分屏比例
          <select value={arrangement.ratio} onChange={event => apply({ ...value, arrangement: { ...arrangement, ratio: event.target.value as typeof arrangement.ratio } })}>
            <option value="equal">等寬</option><option value="left">左寬右窄</option><option value="right">右寬左窄</option>
          </select>
        </label>}
        {arrangement && "mobile" in arrangement && <label className="field">手機排列
          <select value={arrangement.mobile} onChange={event => apply({ ...value, arrangement: { ...arrangement, mobile: event.target.value as typeof arrangement.mobile } })}>
            <option value="stack">垂直排列</option><option value="two">兩欄</option>
          </select>
        </label>}
        {message && <p role="alert">{message}</p>}
      </>}
    </details>
  );
}
