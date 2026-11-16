import { motionCatalog, motionIds, type MotionId } from "../src/motionCatalog";
// Original server-only layout guidance. Never shipped with the browser or exported website.
const briefs: Record<MotionId, [
    string,
    string
]> = {
    "fade-in": ["內容自然出現，優先保留閱讀。", "使用已實作的opacity進場，設定合法時長、延遲與觸發時機；同一元素不重複進場。"],
    "slide-up": ["以小幅垂直位移建立進場節奏。", "映射既有translateY與opacity，不以margin或top重排布局；最終停在來源元件位置。"],
    "scale-in": ["柔和呈現圖片或容器，不以彈跳搶走注意。", "只在中心點縮放與淡入，最終scale為1；不要修改原始尺寸。"],
    "hover-lift": ["直接操作應有即時、可反向的回饋。", "使用受控translateY與陰影Token，hover和keyboard focus同等處理。"],
    "hover-glow": ["低調提示互動性，文字仍是焦點。", "光暈使用現有主題色；只映射合法強度、擴散及時長，不輸出任意CSS。"],
    "stagger-reveal": ["以有限時間差提示群組的閱讀順序。", "使用實際子元素與index延遲，reverse只改動畫順序，不改DOM；總延遲不超過1200ms。"],
    "breathing-glow": ["以平緩節奏提示一個重要操作，避免閃爍。", "使用與內容分離的受控光暈層，opacity慢速循環；disabled停止，hover／focus優先。"],
    "curved-path-text": ["曲線服務短文字的辨識，不犧牲繁中可讀性。", "由可信元件計算SVG path及textPath；保留讀屏原文，長文退回水平文字，不接受SVG字串。"],
    "count-up": ["突出使用者已提供的數字，不能製造業績。", "由RAF時間進度與Intl.NumberFormat變化數字，終點精確；原始數值須與終值相符。"],
    "flip-card": ["將使用者提供的兩面內容視為同一張卡片。", "映射受控雙層卡片，pointer或鍵盤切換；隱藏面inert，不得編造背面或讓焦點留在隱藏面。"],
    "physics-tag-field": ["用有界、可操作的標籤呈現真實文字集合。", "映射本機Canvas 2D固定步長求解器，限制數量、速度、碰撞迭代與旋轉；拖曳保留偏移、拋動保留有限速度，離屏暫停並清理。"],
    "fold-reveal": ["讓揭露動作與指標保持空間一致，顯示使用者的下一層內容。", "以可信雙層與受控裁切／transform，追蹤指定折角；釋放依閾值及速度收斂，快速反向從當前進度接手；鍵盤有直接切換。"],
    "letter-assembly": ["讓原文字素像短句的節拍依序歸位，完整語意始終可讀。", "按字素建立可信呈現層，以distancePx、durationMs與intervalMs控制短距離位移及淡入；保留單份讀屏原文，總延遲限制1200ms，長文與reduced-motion直接顯示，不接收HTML。"],
    "accent-stroke": ["用一條克制的主題色線段提示原文重點，讓裝飾服從閱讀。", "在文字底部建立不占布局且不攔截事件的可信裝飾層，以durationMs展開scaleX，線寬只讀thicknessPx；多行文字不遮字，reduced-motion顯示靜態線，不生成任意CSS或文案。"],
    "image-reveal": ["讓影像像展幕一樣逐步顯露，終點呈現完整原圖。", "只對既有圖片建立受控裁切進場；direction僅horizontal或vertical，時長讀durationMs，保持尺寸、比例與alt，進入視區只播一次；無動畫API或reduced-motion直接顯示並清理Observer與動畫。"],
    "magnetic-control": ["在可預期的小範圍內回應指標，維持操作目標的穩定性。", "僅按鈕以自身中心計算正規化指標偏移，向量長度限制strengthPx，依responseMs平滑回應；離開、取消與失焦回到原位，disabled、粗指標與reduced-motion停用位移，保留連結、鍵盤焦點與事件清理。"],
    "press-feedback": ["以短促收縮確認按壓，放開後回到原始尺寸，不承諾操作結果。", "只在按鈕或卡片的有效按壓期間套用scale與durationMs；pointerup、pointercancel、blur及鍵盤釋放均復原，忽略重複按鍵和disabled，保持既有啟動語意，reduced-motion取消縮放並清理監聽。"],
    "focus-transfer": ["讓群組中當前閱讀項更清楚，同時保留其餘內容的可見性。", "要求至少兩個實際直接子元素；focus-within優先於hover，作用項opacity為1，其餘為inactiveOpacity，以durationMs過渡，離開群組全部復原；不移動焦點、不改DOM、不設inert，reduced-motion維持全部可見並清理事件。"],
    "scroll-progress": ["以區塊實際通過視區的程度提供安靜的閱讀位置提示，不假稱完成閱讀。", "為容器建立主題色裝飾進度線，線寬只讀thicknessPx；依實際捲動根、視區與區塊尺寸計算並夾限0到1，以scaleX更新，resize重新量測；事件以RAF合併，離屏暫停，卸載清理，reduced-motion隱藏線，不劫持捲動。"],
    "disclosure-panel": ["讓卡片先呈現摘要，再由使用者選擇查看原有補充內容。", "僅卡片：首個實際子元素保留為摘要，執行時展開或收合其後所有子元素，durationMs控制高度過渡；提供獨立鍵盤可操作切換鈕及aria-expanded／aria-controls，收合前安全移回焦點，隱藏區域inert；無後續子項靜態降級，reduced-motion立即切換，不編造內容或巢狀互動。"],
};
export const serverMotionRegistry = Object.fromEntries(motionIds.map(id => [id, { ...motionCatalog[id], designIntent: briefs[id][0], implementationBrief: briefs[id][1] }])) as Record<MotionId, typeof motionCatalog[MotionId] & {
    designIntent: string;
    implementationBrief: string;
}>;
export function motionGenerationContext(ids: readonly MotionId[]) {
    return [...new Set(ids)].map(id => ({ presetId: id, presetVersion: 1, designIntent: serverMotionRegistry[id].designIntent, implementationBrief: serverMotionRegistry[id].implementationBrief, constraints: serverMotionRegistry[id].constraints }));
}
