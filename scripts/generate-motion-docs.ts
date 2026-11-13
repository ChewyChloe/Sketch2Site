import { writeFile } from "node:fs/promises";
import { motionIds, motionCatalog } from "../src/motionCatalog";
import { serverMotionRegistry } from "../server/motionBriefs";
const lines = ["# Animation Specs / Motion Spec Library", "", "本檔由 `npm run motion:docs` 依 TypeScript Registry 產生，不手動維護第二份參數清單。", "來源：src/motionCatalog.ts（公開規格及參數Schema）、server/motionBriefs.ts（後端原創生成指引）。未參考／匯入第三方動畫網站的Prompt、預覽或程式。", "", "PageSpec與CanvasSpec的舊效果需經版本化相容層；新效果僅在Renderer、編輯及匯出均驗證後標記DONE。", "", "| Preset | 中文名稱 | 狀態 | 類別 | 複雜度 |", "| --- | --- | --- | --- | --- |"];
for (const id of motionIds) {
    const d = motionCatalog[id];
    lines.push(`| ${id} | ${d.nameZh} | ${d.status} | ${d.category} | ${d.complexity} |`);
}
for (const id of motionIds) {
    const d = serverMotionRegistry[id];
    lines.push("", `## ${d.nameZh} / ${d.nameEn}`, "", `- Preset: \`${id}\` / version ${d.specVersion}`, `- 狀態：${d.status}`, `- 說明：${d.summary}`, `- 適用：${d.bestFor}`, `- targetType：${d.targetType.join("、")}`, `- interactionType：${d.interactionType.join("、")}`, `- techBase：${d.techBase}`, `- previewComponent：${d.previewComponent}`, `- tags：${d.tags.join("、")}`, `- rendererMapping：${d.rendererMapping}`, `- exportMapping：${d.exportMapping}`, "", "| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |", "| --- | --- | --- | --- | --- |");
    for (const [key, c] of Object.entries(d.controls))
        lines.push(`| ${key} | ${c.label} | ${c.kind} | ${c.default === undefined ? "使用者必填" : JSON.stringify(c.default)} | ${c.options?.join(" / ") ?? `${c.min ?? ""}–${c.max ?? ""}${c.step ? `; step ${c.step}` : ""}`} |`);
    lines.push("", `**designIntent**：${d.designIntent}`, "", `**implementationBrief**：${d.implementationBrief}`, "", `**compatibilityRules**：${d.compatibilityRules}`, "", `**constraints**：${d.constraints.join("；")}`, "", `**reducedMotionFallback**：${d.reducedMotionFallback}`);
}
await writeFile("ANIMATION_SPECS.md", lines.join("\n") + "\n");
console.log("Generated 12 motion specifications from the registry; no API invoked.");
