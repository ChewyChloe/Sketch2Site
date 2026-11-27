import { writeFile } from "node:fs/promises";
import { advancedMotionIds, cinematicMotionIds, motionCatalog, motionIds, referenceMotionIds, signatureMotionIds, type MotionId } from "../src/motionCatalog";
import { facetDimensions, motionFacets, type Dimension } from "../src/motionFacets";

// A1: the motion inventory, generated from the code (registry, facets, runtime module).
const runtime = (id: MotionId) =>
  (advancedMotionIds as readonly string[]).includes(id) ? "AdvancedMotion.tsx"
  : (cinematicMotionIds as readonly string[]).includes(id) ? "CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx"
  : (signatureMotionIds as readonly string[]).includes(id) ? "SignatureMotion.tsx"
  : (referenceMotionIds as readonly string[]).includes(id) ? "ReferenceMotion.tsx"
  : id === "physics-tag-field" ? "PhysicsTags.tsx" : id === "fold-reveal" ? "FoldReveal.tsx" : "MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx";
const label = (dim: Dimension, values: string[]) => values.map((v) => (facetDimensions[dim].values as Record<string, string>)[v]).join("、");
const lines = [
  "# 動畫盤點（Motion Inventory）",
  "",
  "本檔由 `npm run motion:inventory` 依程式產生，不要手動修改。",
  "",
  "- 定義與參數：src/motionCatalog.ts（Zod 驗證，motionControlSchemas）",
  "- 篩選、搜尋與推薦共用的分類：src/motionFacets.ts",
  "- 套用：patch.ts 的 attach-effect / update-effect / remove-effect，相容性在 motion.ts 的 targetReason 與 combinationReason",
  "- 編輯器：AnimationLibrary.tsx（素材庫）、MotionControls.tsx（參數）",
  "- 匯出：exportProject.ts 把 runtime 原始碼一起放進 React 專案",
  "",
  `共 ${motionIds.length} 種。`,
  "",
  "| ID | 名稱 | 用在 | 什麼時候動 | 樣子 | 想達成 | 程度 | 參數 | 鍵盤 | Runtime |",
  "|---|---|---|---|---|---|---|---|---|---|",
];
for (const id of motionIds) {
  const d = motionCatalog[id], f = motionFacets[id];
  lines.push(`| \`${id}\` | ${d.nameZh} / ${d.nameEn} | ${label("target", f.target)} | ${label("trigger", f.trigger)} | ${label("expression", f.expression)} | ${label("purpose", f.purpose)} | ${label("intensity", f.intensity)} | ${Object.keys(d.controls).join(", ") || "—"} | ${f.keyboard ? "可" : "—"} | ${runtime(id)} |`);
}
await writeFile("docs/MOTION_INVENTORY.md", lines.join("\n") + "\n");
console.log(`Inventory of ${motionIds.length} motions written.`);
