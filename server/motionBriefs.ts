import { motionCatalog, motionIds, type MotionId } from "../src/motionCatalog";
// Original server-only layout guidance. Never shipped with the browser or exported website.
const briefs:Record<MotionId,[string,string]>={
 "fade-in":["內容自然出現，優先保留閱讀。","使用已實作的opacity進場，設定合法時長、延遲與觸發時機；同一元素不重複進場。"],
 "slide-up":["以小幅垂直位移建立進場節奏。","映射既有translateY與opacity，不以margin或top重排布局；最終停在來源元件位置。"],
 "scale-in":["柔和呈現圖片或容器，不以彈跳搶走注意。","只在中心點縮放與淡入，最終scale為1；不要修改原始尺寸。"],
 "hover-lift":["直接操作應有即時、可反向的回饋。","使用受控translateY與陰影Token，hover和keyboard focus同等處理。"],
 "hover-glow":["低調提示互動性，文字仍是焦點。","光暈使用現有主題色；只映射合法強度、擴散及時長，不輸出任意CSS。"],
 "stagger-reveal":["以有限時間差提示群組的閱讀順序。","使用實際子元素與index延遲，reverse只改動畫順序，不改DOM；總延遲不超過1200ms。"],
 "breathing-glow":["以平緩節奏提示一個重要操作，避免閃爍。","使用與內容分離的受控光暈層，opacity慢速循環；disabled停止，hover／focus優先。"],
 "curved-path-text":["曲線服務短文字的辨識，不犧牲繁中可讀性。","由可信元件計算SVG path及textPath；保留讀屏原文，長文退回水平文字，不接受SVG字串。"],
 "count-up":["突出使用者已提供的數字，不能製造業績。","由RAF時間進度與Intl.NumberFormat變化數字，終點精確；原始數值須與終值相符。"],
 "flip-card":["將使用者提供的兩面內容視為同一張卡片。","映射受控雙層卡片，pointer或鍵盤切換；隱藏面inert，不得編造背面或讓焦點留在隱藏面。"],
 "physics-tag-field":["用有界、可操作的標籤呈現真實文字集合。","映射本機Canvas 2D固定步長求解器，限制數量、速度、碰撞迭代與旋轉；拖曳保留偏移、拋動保留有限速度，離屏暫停並清理。"],
 "fold-reveal":["讓揭露動作與指標保持空間一致，顯示使用者的下一層內容。","以可信雙層與受控裁切／transform，追蹤指定折角；釋放依閾值及速度收斂，快速反向從當前進度接手；鍵盤有直接切換。"],
};
export const serverMotionRegistry=Object.fromEntries(motionIds.map(id=>[id,{...motionCatalog[id],designIntent:briefs[id][0],implementationBrief:briefs[id][1]}])) as Record<MotionId,typeof motionCatalog[MotionId]&{designIntent:string;implementationBrief:string}>;
export function motionGenerationContext(ids: readonly MotionId[]) {
 return [...new Set(ids)].map(id=>({presetId:id,presetVersion:1,designIntent:serverMotionRegistry[id].designIntent,implementationBrief:serverMotionRegistry[id].implementationBrief,constraints:serverMotionRegistry[id].constraints}));
}
