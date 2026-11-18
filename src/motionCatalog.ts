import { z } from "zod";
export const advancedMotionIds = ["character-decode", "split-line-assembly", "rolling-characters", "hand-drawn-highlight", "kinetic-text-wave", "cursor-spotlight", "liquid-button-fill", "radial-ink-ripple", "orbiting-icon", "border-light-trace", "perspective-tilt", "venetian-reveal", "circular-mask-expansion", "cinematic-image-pan", "card-deck-fan", "layered-parallax", "grid-diagonal-turn", "svg-path-drawing", "numeric-gauge-sweep", "scroll-milestones"] as const;
export const motionIds = ["fade-in", "slide-up", "scale-in", "hover-lift", "hover-glow", "stagger-reveal", "breathing-glow", "curved-path-text", "count-up", "flip-card", "physics-tag-field", "fold-reveal", "letter-assembly", "accent-stroke", "image-reveal", "magnetic-control", "press-feedback", "focus-transfer", "scroll-progress", "disclosure-panel", ...advancedMotionIds] as const;
export type MotionId = typeof motionIds[number];
export type ControlValue = string | number | boolean | string[];
export type MotionControls = Record<string, ControlValue>;
export type Control = {
    label: string;
    kind: "number" | "select" | "boolean" | "text" | "lines";
    default?: ControlValue;
    min?: number;
    max?: number;
    step?: number;
    options?: readonly string[];
    required?: boolean;
};
export type MotionDefinition = {
    id: MotionId;
    specVersion: 1;
    nameZh: string;
    nameEn: string;
    category: "進場" | "互動" | "內容" | "資訊";
    summary: string;
    bestFor: string;
    previewMapping: MotionId;
    targetType: readonly string[];
    tags: readonly string[];
    interactionType: readonly string[];
    techBase: string;
    complexity: "low" | "medium" | "high";
    controls: Record<string, Control>;
    constraints: readonly string[];
    reducedMotionFallback: string;
    compatibilityRules: string;
    rendererMapping: MotionId;
    exportMapping: string;
    status: "PARTIAL" | "DONE" | "NOT STARTED";
};
const number = (label: string, value: number, min: number, max: number, step = 1): Control => ({ label, kind: "number", default: value, min, max, step });
const select = (label: string, value: string, options: readonly string[]): Control => ({ label, kind: "select", default: value, options });
const boolean = (label: string, value: boolean): Control => ({ label, kind: "boolean", default: value });
const easing = select("速度曲線", "smooth", ["smooth", "linear", "ease-out"]);
const trigger = select("播放時機", "in-view", ["enter", "in-view"]);
const dataText = (label: string, max = 1000): Control => ({ label, kind: "text", required: true, min: 1, max });
const define = (id: MotionId, nameZh: string, nameEn: string, category: MotionDefinition["category"], summary: string, bestFor: string, targetType: readonly string[], complexity: MotionDefinition["complexity"], interactionType: readonly string[], controls: Record<string, Control>, constraints: string[], fallback: string, rules: string): MotionDefinition => ({ id, specVersion: 1, nameZh, nameEn, category, summary, bestFor, targetType, complexity, interactionType, controls, constraints, reducedMotionFallback: fallback, compatibilityRules: rules, techBase: id === "count-up" ? "requestAnimationFrame / Intl.NumberFormat" : id === "flip-card" ? "CSS 3D Transform" : id === "fold-reveal" ? "Pointer Events / clipped polygon / requestAnimationFrame" : id === "breathing-glow" ? "CSS opacity keyframes" : id === "physics-tag-field" ? "Canvas 2D / fixed-step local solver" : id === "curved-path-text" ? "SVG textPath / Web Animations" : "Web Animations / CSS / Pointer Events", tags: [category, bestFor], previewMapping: id, rendererMapping: id, exportMapping: "shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS", status: "DONE" });
// Public, versioned, controlled definitions. Server-only generation briefs are NOT imported here.
export const motionCatalog: Record<MotionId, MotionDefinition> = {
    "fade-in": define("fade-in", "淡入", "Fade In", "進場", "內容從透明自然顯現。", "標題、段落與圖片", ["text", "heading", "paragraph", "image", "card", "container", "button", "section", "stack", "grid"], "low", ["on-enter", "scroll-enter"], { durationMs: number("時長（毫秒）", 450, 150, 1200), delayMs: number("延遲（毫秒）", 0, 0, 1000), easing, trigger }, ["不改變布局尺寸", "進場只播一次"], "直接顯示內容", "適用文字、圖片及內容容器"),
    "slide-up": define("slide-up", "向上滑入", "Slide Up", "進場", "輕微上移，同時淡入。", "介紹、圖片與卡片", ["text", "heading", "paragraph", "image", "card", "container", "button", "section", "stack", "grid"], "low", ["on-enter", "scroll-enter"], { distancePx: number("位移（像素）", 24, 8, 64), durationMs: number("時長（毫秒）", 500, 180, 1200), delayMs: number("延遲（毫秒）", 0, 0, 1000), easing, trigger }, ["僅transform與opacity", "不改變文件布局"], "取消位移，直接顯示", "適用文字、圖片及內容容器"),
    "scale-in": define("scale-in", "縮放進入", "Scale In", "進場", "從略小尺寸平滑顯現。", "圖片與重點區塊", ["image", "card", "container", "section", "stack", "grid"], "low", ["on-enter"], { initialScale: number("起始比例", .94, .85, .99, .01), durationMs: number("時長（毫秒）", 420, 180, 900), delayMs: number("延遲（毫秒）", 0, 0, 800) }, ["不造成layout shift", "不過度縮放文字"], "靜態顯示", "限圖片與容器，不縮放一般段落"),
    "hover-lift": define("hover-lift", "懸停浮起", "Hover Lift", "互動", "移入或聚焦時輕微浮起。", "卡片、圖片與按鈕", ["card", "button", "image", "container", "section", "stack", "grid"], "low", ["hover", "focus"], { liftPx: number("浮起（像素）", 5, 2, 12), durationMs: number("時長（毫秒）", 180, 100, 400), shadowIntensity: select("陰影", "subtle", ["none", "subtle", "medium"]) }, ["不改變布局", "移出可立即反向"], "靜態邊框強調", "不套用於一般正文"),
    "hover-glow": define("hover-glow", "懸停光暈", "Hover Glow", "互動", "以主題色柔和強調邊緣。", "按鈕與互動卡片", ["button", "card"], "low", ["hover", "focus"], { intensity: select("強度", "subtle", ["subtle", "medium"]), spreadPx: number("擴散（像素）", 8, 2, 20), durationMs: number("時長（毫秒）", 200, 100, 500) }, ["不使用任意顏色", "保留文字對比"], "靜態主題邊框", "限按鈕或卡片"),
    "stagger-reveal": define("stagger-reveal", "依序顯示", "Stagger Reveal", "進場", "讓群組內容依序顯現。", "列表與作品群組", ["card", "container", "section", "stack", "grid"], "medium", ["on-enter", "scroll-enter"], { intervalMs: number("間隔（毫秒）", 100, 40, 300), childDurationMs: number("子項時長（毫秒）", 400, 150, 900), direction: select("順序", "forward", ["forward", "reverse"]), revealStyle: select("顯示方式", "slide-up", ["fade", "slide-up", "scale"]) }, ["至少兩個實際子元素", "總延遲上限1200ms", "不改DOM順序"], "所有內容直接顯示", "草稿卡片需至少兩行非空文字；正式頁面至少兩個子元素"),
    "breathing-glow": define("breathing-glow", "呼吸光按鈕", "Breathing Glow Button", "互動", "以平緩亮度節奏標示主要行動。", "主要行動按鈕", ["button"], "medium", ["idle-loop", "hover", "focus"], { cycleMs: number("週期（毫秒）", 3200, 2000, 6000), intensity: select("強度", "subtle", ["subtle", "medium"]), spreadPx: number("擴散（像素）", 12, 4, 24), pauseOnHover: boolean("懸停時暫停", true) }, ["不快速閃爍", "不縮放按鈕", "disabled不播放", "hover與focus優先"], "停止循環，保留靜態邊框", "僅按鈕；不可與hover-glow重疊"),
    "curved-path-text": define("curved-path-text", "曲線文字", "Curved Path Text", "內容", "讓短文字沿自製弧線呈現。", "品牌標語與短標題", ["text", "heading", "paragraph"], "medium", ["on-enter", "scroll-enter"], { curvature: select("曲度", "gentle", ["gentle", "medium", "strong"]), direction: select("弧線方向", "upward", ["upward", "downward"]), revealDurationMs: number("揭露時長（毫秒）", 900, 300, 1800), textAlign: select("文字對齊", "center", ["start", "center", "end"]) }, ["保留原文供讀屏", "超過240字或8行改水平文字；一般文字依實際字寬分行", "只產生可信SVG path"], "靜態曲線或水平文字", "只套用文字；不可與count-up合用"),
    "count-up": define("count-up", "數字遞增", "Count Up", "內容", "從起始值變化至使用者的真實數值。", "已有的統計數字", ["text", "heading", "paragraph"], "medium", ["on-enter", "scroll-enter"], { startValue: number("起始數字", 0, -1e9, 1e9, .01), endValue: { label: "最終數字", kind: "number", required: true, min: -1e9, max: 1e9, step: .01 }, durationMs: number("時長（毫秒）", 1200, 300, 3000), decimals: number("小數位數", 0, 0, 4), locale: select("數字格式", "zh-TW", ["zh-TW", "en-US"]), prefix: { label: "前綴", kind: "text", default: "", max: 30 }, suffix: { label: "後綴", kind: "text", default: "", max: 30 } }, ["終值必須來自原始文字", "不編造統計", "不循環", "使用tabular numerals"], "直接顯示精確終值", "原文需為合法數字（含受控前後綴）"),
    "flip-card": define("flip-card", "雙面卡片", "Flip Card", "內容", "點擊翻面，閱讀使用者提供的另一面。", "作品與詳情卡片", ["card"], "medium", ["click", "keyboard", "hover"], { axis: select("翻轉軸", "y", ["x", "y"]), durationMs: number("時長（毫秒）", 500, 250, 900), perspectivePx: number("透視（像素）", 1000, 600, 1600), trigger: select("觸發方式", "click", ["click", "hover"]), backText: dataText("背面內容") }, ["背面由使用者提供", "不可操作隱藏面", "Enter與Space支援", "雙面尺寸穩定"], "直接切換兩面，不旋轉", "限卡片；與fold-reveal互斥"),
    "physics-tag-field": define("physics-tag-field", "物理標籤場", "Physics Tag Field", "互動", "標籤落下、碰撞，並可拖曳拋動。", "技能與分類標籤", ["card", "container", "section", "stack", "grid"], "high", ["autoplay", "drag", "throw"], { labels: { label: "標籤（每行一個）", kind: "lines", required: true, min: 1, max: 24 }, gravity: number("重力", .5, 0, 2, .05), friction: number("摩擦", .92, .75, .99, .01), restitution: number("彈性", .5, 0, .8, .05), spawnIntervalMs: number("落下間隔（毫秒）", 160, 60, 500), maxTags: number("標籤上限", 12, 1, 24), draggable: boolean("允許拖曳", true), collisionEnabled: boolean("啟用碰撞", true) }, ["最多24個標籤，每個最多24字", "固定60Hz步長；重力以px/step²計", "離屏暫停並清理RAF", "高DPI與resize需保留標籤", "觸控拖曳模式可退出"], "純文字靜態列表", "限容器；與stagger/flip/fold互斥；狹窄或標籤過密的容器改靜態列表"),
    "fold-reveal": define("fold-reveal", "折頁揭露", "Fold Reveal", "內容", "拖曳折角，揭露使用者提供的下層內容。", "前後對照與介紹卡片", ["card", "container", "section"], "high", ["drag", "click", "keyboard"], { foldCorner: select("折角", "top-right", ["top-right", "bottom-right", "top-left", "bottom-left"]), revealThreshold: number("完成門檻", .45, .2, .8, .05), springResponse: number("回彈時間（秒）", .4, .15, .8, .05), foldShadow: select("折頁陰影", "subtle", ["none", "subtle"]), clickToToggle: boolean("允許點擊切換", true), underText: dataText("下層內容") }, ["下層由使用者提供", "拖曳保留偏移", "快速反向不跳位", "點擊與鍵盤有等效操作", "只用自製遮罩與transform"], "直接切換內容", "與flip/physics互斥"),
    "letter-assembly": define("letter-assembly", "逐字聚合", "Letter Assembly", "進場", "字元以短距離依序歸位，組成完整原文。", "短標題與介紹文字", ["text", "heading", "paragraph"], "medium", ["scroll-enter"], { durationMs: number("時長（毫秒）", 600, 200, 1200), distancePx: number("位移（像素）", 12, 0, 32), intervalMs: number("字元間隔（毫秒）", 35, 10, 100) }, ["依字素切分，不拆散組合字", "保留原文與讀屏順序", "總延遲上限1200ms；長文靜態降級"], "直接顯示完整原文", "僅文字、標題與段落"),
    "accent-stroke": define("accent-stroke", "重點描線", "Accent Stroke", "內容", "主題色細線沿文字底部展開，提示閱讀重點。", "重點標題與說明", ["text", "heading", "paragraph"], "low", ["scroll-enter"], { durationMs: number("時長（毫秒）", 600, 200, 1200), thicknessPx: number("線寬（像素）", 2, 1, 6) }, ["使用既有主題色", "裝飾線不遮字、不改布局", "不新增或改寫原文"], "顯示靜態底線", "僅文字、標題與段落"),
    "image-reveal": define("image-reveal", "影像展幕", "Image Reveal", "進場", "以單向展開的裁切範圍揭露完整圖片。", "作品與介紹圖片", ["image"], "low", ["scroll-enter"], { durationMs: number("時長（毫秒）", 700, 200, 1400), direction: select("展開方向", "horizontal", ["horizontal", "vertical"]) }, ["保留圖片比例與替代文字", "只裁切、不變更來源", "進場只播一次"], "直接顯示完整圖片", "僅適用於圖片元件"),
    "magnetic-control": define("magnetic-control", "磁吸按鈕", "Magnetic Control", "互動", "按鈕在有限範圍內跟隨指標，離開後回到原位。", "主要操作按鈕", ["button"], "medium", ["pointer-move", "hover", "focus"], { strengthPx: number("吸附幅度（像素）", 6, 0, 12), responseMs: number("回應時間（毫秒）", 180, 80, 400) }, ["位移不超過設定幅度", "不攔截連結或觸控捲動", "離開、失焦與取消時歸位", "disabled不播放"], "保持原位，保留鍵盤焦點提示", "僅按鈕；鍵盤與觸控不追蹤指標"),
    "press-feedback": define("press-feedback", "按壓回饋", "Press Feedback", "互動", "按下時輕微收縮，放開即回復。", "按鈕與可操作卡片", ["button", "card"], "low", ["pointer-down", "keyboard"], { scale: number("按壓比例", .97, .9, 1, .01), durationMs: number("時長（毫秒）", 140, 80, 300) }, ["pointerup與pointercancel均復原", "鍵盤啟動有等效回饋", "不新增導航或改變既有操作", "disabled不播放"], "取消縮放，保留原操作與焦點提示", "僅適用於按鈕與卡片"),
    "focus-transfer": define("focus-transfer", "群組焦點轉移", "Focus Transfer", "互動", "聚焦子項時降低其他子項亮度，指引群組閱讀。", "多項內容群組", ["card", "container", "section", "stack", "grid"], "medium", ["hover", "focus-within"], { inactiveOpacity: number("非作用項透明度", .5, .3, 1, .05), durationMs: number("時長（毫秒）", 200, 100, 500) }, ["至少兩個實際直接子元素", "鍵盤焦點優先於指標", "離開群組後全部復原", "不隱藏內容、不改DOM順序"], "全部子項維持完整透明度", "限至少兩個子元素的卡片、容器、區塊、堆疊或網格"),
    "scroll-progress": define("scroll-progress", "區塊閱讀進度", "Scroll Progress", "資訊", "細線依區塊通過可視範圍的比例更新。", "長內容與閱讀區塊", ["card", "container", "section", "stack", "grid"], "medium", ["scroll"], { thicknessPx: number("線寬（像素）", 3, 1, 8) }, ["進度限制在0到1", "追蹤實際捲動容器與區塊尺寸", "裝飾線不占布局、不攔截操作", "卸載清理事件、Observer與RAF"], "隱藏動態進度線，完整保留內容", "僅卡片、容器、區塊、堆疊或網格；不更改捲動行為"),
    "disclosure-panel": define("disclosure-panel", "詳情收合", "Disclosure Panel", "內容", "保留首個子項作摘要，以明確操作展開或收合其餘內容。", "卡片補充說明", ["card"], "medium", ["click", "keyboard"], { durationMs: number("時長（毫秒）", 240, 100, 600) }, ["首個子項始終顯示", "執行時展開或收合第一項之後的實際子元素", "使用aria-expanded與aria-controls", "收合前移回內部焦點，隱藏內容不可操作", "無後續子項時靜態顯示"], "立即切換展開與收合，不播放過渡", "僅卡片；使用既有子元素，不要求額外內容字串"),
    "character-decode": define("character-decode", "字元解碼", "Character Decode", "進場", "符號由左至右解出原文，已完成的字元保持穩定。", "文字、標題與段落", ["text", "heading", "paragraph"], "medium", ["scroll-enter"], {decodeSpeedMs: number("解碼速度（毫秒）", 45, 20, 100, 1), characterDelayMs: number("字元延遲（毫秒）", 35, 10, 80, 1)}, ["最多100字素，最長3500ms，完成字元不再修改", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "split-line-assembly": define("split-line-assembly", "文字分行組合", "Split Line Assembly", "進場", "依實際換行量測，以交替方向與逐行遮罩組合原文。", "文字、標題與段落", ["text", "heading", "paragraph"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 650, 200, 1200, 1), staggerMs: number("行間隔（毫秒）", 100, 30, 180, 1), distancePx: number("位移（像素）", 22, 4, 40, 1)}, ["最多100字素及12行，依Range量測真實換行；resize恢復原文", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "rolling-characters": define("rolling-characters", "滾輪文字", "Rolling Characters", "進場", "字元在獨立視窗中垂直滾動，最後保留可選取原文。", "文字、標題與段落", ["text", "heading", "paragraph"], "medium", ["scroll-enter", "text-change"], {durationMs: number("時長（毫秒）", 800, 300, 1400, 1), staggerMs: number("字元間隔（毫秒）", 25, 10, 60, 1)}, ["最多100字素，最終保留原生可選文字；文字變更重播", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "hand-drawn-highlight": define("hand-drawn-highlight", "手繪螢光標記", "Hand-Drawn Highlight", "內容", "帶有輕微不規則邊緣的底色逐行劃過文字後方。", "文字、標題與段落", ["text", "heading", "paragraph"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 700, 200, 1400, 1), thickness: number("標記厚度（百分比）", 55, 20, 85, 1), color: select("標記底色", "lime", ["lime", "amber", "sky"])}, ["不規則多行底色，受控調色盤並保留原文字色", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "kinetic-text-wave": define("kinetic-text-wave", "動態文字波浪", "Kinetic Text Wave", "互動", "依字序傳遞有限的位移與旋轉，結束回原位。", "文字、標題與段落", ["text", "heading", "paragraph"], "medium", ["scroll-enter", "hover", "focus"], {durationMs: number("時長（毫秒）", 650, 200, 1200, 1), amplitudePx: number("波幅（像素）", 8, 2, 16, 1), trigger: select("播放時機", "in-view", ["in-view", "hover"])}, ["最多100字素，有限波浪後回原位；hover可用focus及觸控啟動", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "cursor-spotlight": define("cursor-spotlight", "游標聚光", "Cursor Spotlight", "互動", "按鈕固定不動，局部柔光追蹤游標並於離開後消退。", "操作按鈕", ["button"], "medium", ["pointer-move", "focus"], {radiusPx: number("聚光半徑（像素）", 60, 24, 100, 1), durationMs: number("時長（毫秒）", 180, 100, 400, 1)}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "liquid-button-fill": define("liquid-button-fill", "液態填充", "Liquid Button Fill", "互動", "弧形液面由底部升起，移開後退回，不改文字。", "操作按鈕", ["button"], "medium", ["hover", "focus"], {durationMs: number("時長（毫秒）", 420, 150, 800, 1), color: select("填充色", "lime", ["lime", "amber", "sky"])}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "radial-ink-ripple": define("radial-ink-ripple", "墨水漣漪", "Radial Ink Ripple", "互動", "從實際按壓位置擴散柔和墨圈，完成後移除。", "操作按鈕", ["button"], "medium", ["click", "keyboard"], {durationMs: number("時長（毫秒）", 550, 200, 900, 1)}, ["同時最多3圈，完成或卸載移除；鍵盤使用中心", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "orbiting-icon": define("orbiting-icon", "環繞圖示", "Orbiting Icon", "互動", "受控箭頭沿一次短弧線移動，離開後回復。", "操作按鈕", ["button"], "medium", ["hover", "focus"], {durationMs: number("時長（毫秒）", 450, 180, 900, 1), direction: select("繞行方向", "clockwise", ["clockwise", "counterclockwise"])}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "border-light-trace": define("border-light-trace", "邊框光線流動", "Border Light Trace", "互動", "細光線沿實際圓角邊框繞行一次，鍵盤聚焦同樣可見。", "button、card", ["button", "card"], "medium", ["hover", "focus"], {durationMs: number("時長（毫秒）", 900, 300, 1600, 1), thicknessPx: number("線寬（像素）", 2, 1, 3, 1)}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "perspective-tilt": define("perspective-tilt", "透視傾斜", "Perspective Tilt", "互動", "有限的雙軸透視回應游標，離開後回正。", "卡片與圖片", ["card", "image"], "medium", ["pointer-move"], {maxAngle: number("最大角度", 5, 1, 8, 1), responseMs: number("回正時長（毫秒）", 250, 100, 500, 1)}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "venetian-reveal": define("venetian-reveal", "百葉窗揭露", "Venetian Reveal", "進場", "水平條帶依序展開同一張圖片，最終沒有縫隙。", "圖片與作品展示", ["image"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 850, 300, 1500, 1), strips: number("遮罩條數", 6, 3, 10, 1), direction: select("播放方向", "forward", ["forward", "reverse"])}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "circular-mask-expansion": define("circular-mask-expansion", "圓形遮罩擴展", "Circular Mask Expansion", "進場", "從中央或角落的圓形遮罩擴展成完整圖片。", "圖片與作品展示", ["image"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 850, 300, 1500, 1), origin: select("圓心", "center", ["center", "top-left", "top-right", "bottom-left", "bottom-right"])}, ["不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "cinematic-image-pan": define("cinematic-image-pan", "電影式鏡頭移動", "Cinematic Image Pan", "進場", "固定畫框內緩慢推移與縮放，最多播放三次。", "圖片與作品展示", ["image"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 6000, 2500, 10000, 1), iterations: number("播放次數", 1, 1, 3, 1), direction: select("移動方向", "forward", ["forward", "reverse"])}, ["最多3次循環，離屏及背景頁暫停；不複製圖片或增加網路請求", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "card-deck-fan": define("card-deck-fan", "卡片扇形展開", "Card Deck Fan", "互動", "原有子卡片輕微向兩側旋開，離開後收回，內容始終可操作。", "卡片與內容群組", ["card", "container", "section", "stack", "grid"], "medium", ["hover", "focus-within"], {angle: number("展開角度", 4, 1, 7, 1), distancePx: number("展開距離（像素）", 8, 2, 12, 1), durationMs: number("時長（毫秒）", 320, 150, 700, 1)}, ["最多12個真實子項，無新內容或背面；位移受限且不產生捲軸", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "layered-parallax": define("layered-parallax", "分層視差", "Layered Parallax", "資訊", "前三個原有內容層以不同的有限速度通過視區。", "卡片與內容群組", ["card", "container", "section", "stack", "grid"], "medium", ["scroll"], {distancePx: number("最大位移（像素）", 12, 2, 20, 1)}, ["最多3層，最大20px，不劫持捲動；每幀至多一次更新", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "grid-diagonal-turn": define("grid-diagonal-turn", "網格對角翻入", "Grid Diagonal Turn", "進場", "原有網格子項沿行列對角線依序作輕微透視翻入。", "卡片與內容群組", ["card", "container", "section", "stack", "grid"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 600, 250, 1000, 1), staggerMs: number("對角間隔（毫秒）", 80, 30, 150, 1), order: select("展開順序", "row", ["row", "column", "center"])}, ["最多24子項同時動畫，依實測行列排序；最大延遲1000ms", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "svg-path-drawing": define("svg-path-drawing", "路徑描繪", "SVG Path Drawing", "內容", "安全的內建裝飾路徑以描線方式成形，不接受外部SVG。", "卡片與內容群組", ["card", "container", "section", "stack", "grid"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 1000, 300, 1800, 1), thicknessPx: number("線寬（像素）", 2, 1, 5, 1), color: select("線條顏色", "theme", ["theme", "lime", "amber", "sky"]), shape: select("圖形", "curve", ["curve", "arrow", "check"])}, ["只接受curve、arrow、check內建path，不接受外部SVG或腳本", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "numeric-gauge-sweep": define("numeric-gauge-sweep", "數值儀表掃描", "Numeric Gauge Sweep", "內容", "真實百分比文字保持不變，半圓儀表由零掃描至該值。", "文字、標題與段落", ["text", "heading", "paragraph"], "medium", ["scroll-enter"], {durationMs: number("時長（毫秒）", 1000, 300, 1800, 1)}, ["僅原始0到100數值或百分比，數字不變、只掃描儀表", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
    "scroll-milestones": define("scroll-milestones", "區塊閱讀里程碑", "Scroll Milestones", "資訊", "依指定區塊的閱讀位置，逐段點亮離散節點而非連續進度線。", "卡片與內容群組", ["card", "container", "section", "stack", "grid"], "medium", ["scroll"], {steps: number("里程碑數量", 5, 3, 8, 1), orientation: select("方向", "horizontal", ["horizontal", "vertical"])}, ["3到8個離散節點，只監控指定區塊與其實際捲動根", "不改寫來源內容或網路資產", "動畫有界，卸載清理事件、Observer及動畫"], "靜態保留原始內容；互動操作仍可使用", "只套用相容元件；受控參數及全頁資源限額"),
};
export function controlsSchema(id: MotionId) {
    const fields: Record<string, z.ZodType> = {};
    for (const [key, c] of Object.entries(motionCatalog[id].controls)) {
        let s: z.ZodType;
        if (c.kind === "number") {
            let n = z.number().finite().min(c.min ?? -1e9).max(c.max ?? 1e9);
            if (c.step === 1)
                n = n.int();
            s = n;
        }
        else if (c.kind === "select")
            s = z.enum(c.options as [
                string,
                ...string[]
            ]);
        else if (c.kind === "boolean")
            s = z.boolean();
        else if (c.kind === "lines")
            s = z.array(z.string().trim().min(1).max(24).refine(v => !/<\s*\/?[a-z][^>]*>|\bon[a-z]+\s*=|javascript\s*:/i.test(v), "只接受純文字")).min(c.min ?? 1).max(c.max ?? 24).refine(a => new Set(a).size === a.length, "標籤不可重複");
        else
            s = z.string().min(c.min ?? 0).max(c.max ?? 1000).refine(v => !c.required || v.trim().length > 0, "請填寫內容").refine(v => !/<\s*\/?[a-z][^>]*>|\bon[a-z]+\s*=|javascript\s*:|<\s*!/i.test(v), "只接受純文字");
        fields[key] = c.default !== undefined ? s.default(c.default) : s;
    }
    return z.object(fields).strict() as z.ZodType<MotionControls>;
}
export const motionControlSchemas = Object.fromEntries(motionIds.map(id => [id, controlsSchema(id)])) as Record<MotionId, z.ZodType<MotionControls>>;
export const defaultControls = (id: MotionId): MotionControls => Object.fromEntries(Object.entries(motionCatalog[id].controls).filter(([, v]) => v.default !== undefined).map(([k, v]) => [k, structuredClone(v.default!)]));
