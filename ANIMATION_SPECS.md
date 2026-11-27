# Animation Specs / Motion Spec Library

本檔由 `npm run motion:docs` 依 TypeScript Registry 產生，不手動維護第二份參數清單。
來源：src/motionCatalog.ts（公開規格及參數Schema）、server/motionBriefs.ts（後端原創生成指引）。未參考／匯入第三方動畫網站的Prompt、預覽或程式。

PageSpec與CanvasSpec的舊效果需經版本化相容層；新效果僅在Renderer、編輯及匯出均驗證後標記DONE。

| Preset | 中文名稱 | 狀態 | 類別 | 複雜度 |
| --- | --- | --- | --- | --- |
| fade-in | 淡入 | DONE | 進場 | low |
| slide-up | 向上滑入 | DONE | 進場 | low |
| scale-in | 縮放進入 | DONE | 進場 | low |
| hover-lift | 懸停浮起 | DONE | 互動 | low |
| hover-glow | 懸停光暈 | DONE | 互動 | low |
| stagger-reveal | 依序顯示 | DONE | 進場 | medium |
| breathing-glow | 呼吸光按鈕 | DONE | 互動 | medium |
| curved-path-text | 曲線文字 | DONE | 內容 | medium |
| count-up | 數字遞增 | DONE | 內容 | medium |
| flip-card | 雙面卡片 | DONE | 內容 | medium |
| physics-tag-field | 物理標籤場 | DONE | 互動 | high |
| fold-reveal | 折頁揭露 | DONE | 內容 | high |
| letter-assembly | 逐字聚合 | DONE | 進場 | medium |
| accent-stroke | 重點描線 | DONE | 內容 | low |
| image-reveal | 影像展幕 | DONE | 進場 | low |
| magnetic-control | 磁吸按鈕 | DONE | 互動 | medium |
| press-feedback | 按壓回饋 | DONE | 互動 | low |
| focus-transfer | 群組焦點轉移 | DONE | 互動 | medium |
| scroll-progress | 區塊閱讀進度 | DONE | 資訊 | medium |
| disclosure-panel | 詳情收合 | DONE | 內容 | medium |
| character-decode | 字元解碼 | DONE | 進場 | medium |
| split-line-assembly | 文字分行組合 | DONE | 進場 | medium |
| rolling-characters | 滾輪文字 | DONE | 進場 | medium |
| hand-drawn-highlight | 手繪螢光標記 | DONE | 內容 | medium |
| kinetic-text-wave | 動態文字波浪 | DONE | 互動 | medium |
| cursor-spotlight | 游標聚光 | DONE | 互動 | medium |
| liquid-button-fill | 液態填充 | DONE | 互動 | medium |
| radial-ink-ripple | 墨水漣漪 | DONE | 互動 | medium |
| orbiting-icon | 環繞圖示 | DONE | 互動 | medium |
| border-light-trace | 邊框光線流動 | DONE | 互動 | medium |
| perspective-tilt | 透視傾斜 | DONE | 互動 | medium |
| venetian-reveal | 百葉窗揭露 | DONE | 進場 | medium |
| circular-mask-expansion | 圓形遮罩擴展 | DONE | 進場 | medium |
| cinematic-image-pan | 電影式鏡頭移動 | DONE | 進場 | medium |
| card-deck-fan | 卡片扇形展開 | DONE | 互動 | medium |
| layered-parallax | 分層視差 | DONE | 資訊 | medium |
| grid-diagonal-turn | 網格對角翻入 | DONE | 進場 | medium |
| svg-path-drawing | 路徑描繪 | DONE | 內容 | medium |
| numeric-gauge-sweep | 數值儀表掃描 | DONE | 內容 | medium |
| scroll-milestones | 區塊閱讀里程碑 | DONE | 資訊 | medium |
| text-morph-transition | 文字形態轉換 | DONE | 內容 | high |
| elastic-word-bounce | 彈性片語跳動 | DONE | 進場 | high |
| text-spotlight-reveal | 聚光文字顯影 | DONE | 互動 | high |
| typographic-stretch | 字體延展回彈 | DONE | 互動 | high |
| cursor-trail-particles | 游標粒子軌跡 | DONE | 互動 | high |
| cursor-image-follower | 游標圖片跟隨 | DONE | 互動 | high |
| gooey-blob-merge | 黏性圓球融合 | DONE | 互動 | high |
| directional-hover-wipe | 方向感應滑入 | DONE | 互動 | high |
| spring-drag-snap | 彈性拖曳吸附 | DONE | 互動 | high |
| pixel-dissolve | 像素消散 | DONE | 進場 | high |
| shutter-lens-transition | 鏡頭快門 | DONE | 進場 | high |
| glitch-slice-reveal | 切片故障顯影 | DONE | 進場 | high |
| liquid-distortion-reveal | 液態扭曲顯影 | DONE | 進場 | high |
| card-stack-shuffle | 卡片堆疊洗牌 | DONE | 互動 | high |
| horizontal-scroll-gallery | 橫向捲動畫廊 | DONE | 資訊 | high |
| sticky-section-morph | 固定區塊形態切換 | DONE | 資訊 | high |
| scroll-image-sequence | 逐格圖片序列 | DONE | 資訊 | high |
| pinned-story-panels | 分鏡敘事面板 | DONE | 資訊 | high |
| particle-constellation | 粒子星座連線 | DONE | 互動 | high |
| elastic-svg-morph | 彈性圖形變形 | DONE | 內容 | high |

## 淡入 / Fade In

- Preset: `fade-in` / version 1
- 狀態：DONE
- 說明：內容從透明自然顯現。
- 適用：標題、段落與圖片
- targetType：text、heading、paragraph、image、card、container、button、section、stack、grid
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：fade-in
- tags：進場、標題、段落與圖片
- rendererMapping：fade-in
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 450 | 150–1200; step 1 |
| delayMs | 延遲（毫秒） | number | 0 | 0–1000; step 1 |
| easing | 速度曲線 | select | "smooth" | smooth / linear / ease-out |
| trigger | 播放時機 | select | "in-view" | enter / in-view |

**designIntent**：內容自然出現，優先保留閱讀。

**implementationBrief**：使用已實作的opacity進場，設定合法時長、延遲與觸發時機；同一元素不重複進場。

**compatibilityRules**：適用文字、圖片及內容容器

**constraints**：不改變布局尺寸；進場只播一次

**reducedMotionFallback**：直接顯示內容

## 向上滑入 / Slide Up

- Preset: `slide-up` / version 1
- 狀態：DONE
- 說明：輕微上移，同時淡入。
- 適用：介紹、圖片與卡片
- targetType：text、heading、paragraph、image、card、container、button、section、stack、grid
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：slide-up
- tags：進場、介紹、圖片與卡片
- rendererMapping：slide-up
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| distancePx | 位移（像素） | number | 24 | 8–64; step 1 |
| durationMs | 時長（毫秒） | number | 500 | 180–1200; step 1 |
| delayMs | 延遲（毫秒） | number | 0 | 0–1000; step 1 |
| easing | 速度曲線 | select | "smooth" | smooth / linear / ease-out |
| trigger | 播放時機 | select | "in-view" | enter / in-view |

**designIntent**：以小幅垂直位移建立進場節奏。

**implementationBrief**：映射既有translateY與opacity，不以margin或top重排布局；最終停在來源元件位置。

**compatibilityRules**：適用文字、圖片及內容容器

**constraints**：僅transform與opacity；不改變文件布局

**reducedMotionFallback**：取消位移，直接顯示

## 縮放進入 / Scale In

- Preset: `scale-in` / version 1
- 狀態：DONE
- 說明：從略小尺寸平滑顯現。
- 適用：圖片與重點區塊
- targetType：image、card、container、section、stack、grid
- interactionType：on-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：scale-in
- tags：進場、圖片與重點區塊
- rendererMapping：scale-in
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| initialScale | 起始比例 | number | 0.94 | 0.85–0.99; step 0.01 |
| durationMs | 時長（毫秒） | number | 420 | 180–900; step 1 |
| delayMs | 延遲（毫秒） | number | 0 | 0–800; step 1 |

**designIntent**：柔和呈現圖片或容器，不以彈跳搶走注意。

**implementationBrief**：只在中心點縮放與淡入，最終scale為1；不要修改原始尺寸。

**compatibilityRules**：限圖片與容器，不縮放一般段落

**constraints**：不造成layout shift；不過度縮放文字

**reducedMotionFallback**：靜態顯示

## 懸停浮起 / Hover Lift

- Preset: `hover-lift` / version 1
- 狀態：DONE
- 說明：移入或聚焦時輕微浮起。
- 適用：卡片、圖片與按鈕
- targetType：card、button、image、container、section、stack、grid
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：hover-lift
- tags：互動、卡片、圖片與按鈕
- rendererMapping：hover-lift
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| liftPx | 浮起（像素） | number | 5 | 2–12; step 1 |
| durationMs | 時長（毫秒） | number | 180 | 100–400; step 1 |
| shadowIntensity | 陰影 | select | "subtle" | none / subtle / medium |

**designIntent**：直接操作應有即時、可反向的回饋。

**implementationBrief**：使用受控translateY與陰影Token，hover和keyboard focus同等處理。

**compatibilityRules**：不套用於一般正文

**constraints**：不改變布局；移出可立即反向

**reducedMotionFallback**：靜態邊框強調

## 懸停光暈 / Hover Glow

- Preset: `hover-glow` / version 1
- 狀態：DONE
- 說明：以主題色柔和強調邊緣。
- 適用：按鈕與互動卡片
- targetType：button、card
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：hover-glow
- tags：互動、按鈕與互動卡片
- rendererMapping：hover-glow
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| intensity | 強度 | select | "subtle" | subtle / medium |
| spreadPx | 擴散（像素） | number | 8 | 2–20; step 1 |
| durationMs | 時長（毫秒） | number | 200 | 100–500; step 1 |

**designIntent**：低調提示互動性，文字仍是焦點。

**implementationBrief**：光暈使用現有主題色；只映射合法強度、擴散及時長，不輸出任意CSS。

**compatibilityRules**：限按鈕或卡片

**constraints**：不使用任意顏色；保留文字對比

**reducedMotionFallback**：靜態主題邊框

## 依序顯示 / Stagger Reveal

- Preset: `stagger-reveal` / version 1
- 狀態：DONE
- 說明：讓群組內容依序顯現。
- 適用：列表與作品群組
- targetType：card、container、section、stack、grid
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：stagger-reveal
- tags：進場、列表與作品群組
- rendererMapping：stagger-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| intervalMs | 間隔（毫秒） | number | 100 | 40–300; step 1 |
| childDurationMs | 子項時長（毫秒） | number | 400 | 150–900; step 1 |
| direction | 順序 | select | "forward" | forward / reverse |
| revealStyle | 顯示方式 | select | "slide-up" | fade / slide-up / scale |

**designIntent**：以有限時間差提示群組的閱讀順序。

**implementationBrief**：使用實際子元素與index延遲，reverse只改動畫順序，不改DOM；總延遲不超過1200ms。

**compatibilityRules**：草稿卡片需至少兩行非空文字；正式頁面至少兩個子元素

**constraints**：至少兩個實際子元素；總延遲上限1200ms；不改DOM順序

**reducedMotionFallback**：所有內容直接顯示

## 呼吸光按鈕 / Breathing Glow Button

- Preset: `breathing-glow` / version 1
- 狀態：DONE
- 說明：以平緩亮度節奏標示主要行動。
- 適用：主要行動按鈕
- targetType：button
- interactionType：idle-loop、hover、focus
- techBase：CSS opacity keyframes
- previewMapping：breathing-glow
- tags：互動、主要行動按鈕
- rendererMapping：breathing-glow
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| cycleMs | 週期（毫秒） | number | 3200 | 2000–6000; step 1 |
| intensity | 強度 | select | "subtle" | subtle / medium |
| spreadPx | 擴散（像素） | number | 12 | 4–24; step 1 |
| pauseOnHover | 懸停時暫停 | boolean | true | – |

**designIntent**：以平緩節奏提示一個重要操作，避免閃爍。

**implementationBrief**：使用與內容分離的受控光暈層，opacity慢速循環；disabled停止，hover／focus優先。

**compatibilityRules**：僅按鈕；不可與hover-glow重疊

**constraints**：不快速閃爍；不縮放按鈕；disabled不播放；hover與focus優先

**reducedMotionFallback**：停止循環，保留靜態邊框

## 曲線文字 / Curved Path Text

- Preset: `curved-path-text` / version 1
- 狀態：DONE
- 說明：讓短文字沿自製弧線呈現。
- 適用：品牌標語與短標題
- targetType：text、heading、paragraph
- interactionType：on-enter、scroll-enter
- techBase：SVG textPath / Web Animations
- previewMapping：curved-path-text
- tags：內容、品牌標語與短標題
- rendererMapping：curved-path-text
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| curvature | 曲度 | select | "gentle" | gentle / medium / strong |
| direction | 弧線方向 | select | "upward" | upward / downward |
| revealDurationMs | 揭露時長（毫秒） | number | 900 | 300–1800; step 1 |
| textAlign | 文字對齊 | select | "center" | start / center / end |

**designIntent**：曲線服務短文字的辨識，不犧牲繁中可讀性。

**implementationBrief**：由可信元件計算SVG path及textPath；保留讀屏原文，長文退回水平文字，不接受SVG字串。

**compatibilityRules**：只套用文字；不可與count-up合用

**constraints**：保留原文供讀屏；超過240字或8行改水平文字；一般文字依實際字寬分行；只產生可信SVG path

**reducedMotionFallback**：靜態曲線或水平文字

## 數字遞增 / Count Up

- Preset: `count-up` / version 1
- 狀態：DONE
- 說明：從起始值變化至使用者的真實數值。
- 適用：已有的統計數字
- targetType：text、heading、paragraph
- interactionType：on-enter、scroll-enter
- techBase：requestAnimationFrame / Intl.NumberFormat
- previewMapping：count-up
- tags：內容、已有的統計數字
- rendererMapping：count-up
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| cadence | 數字節奏 | select | "smooth" | smooth / impact |
| startValue | 起始數字 | number | 0 | -1000000000–1000000000; step 0.01 |
| endValue | 最終數字 | number | 使用者必填 | -1000000000–1000000000; step 0.01 |
| durationMs | 時長（毫秒） | number | 1200 | 300–3000; step 1 |
| decimals | 小數位數 | number | 0 | 0–4; step 1 |
| locale | 數字格式 | select | "zh-TW" | zh-TW / en-US |
| prefix | 前綴 | text | "" | –30 |
| suffix | 後綴 | text | "" | –30 |

**designIntent**：突出使用者已提供的數字，不能製造業績。

**implementationBrief**：由RAF時間進度與Intl.NumberFormat變化數字，終點精確；原始數值須與終值相符。

**compatibilityRules**：原文需為合法數字（含受控前後綴）

**constraints**：終值必須來自原始文字；不編造統計；不循環；落點模式限相差一至六的整數倒數，時長至少 600ms；其他數值沿用平滑計數；使用tabular numerals

**reducedMotionFallback**：直接顯示精確終值

## 雙面卡片 / Flip Card

- Preset: `flip-card` / version 1
- 狀態：DONE
- 說明：點擊翻面，閱讀使用者提供的另一面。
- 適用：作品與詳情卡片
- targetType：card
- interactionType：click、keyboard、hover
- techBase：CSS 3D Transform
- previewMapping：flip-card
- tags：內容、作品與詳情卡片
- rendererMapping：flip-card
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| axis | 翻轉軸 | select | "y" | x / y |
| durationMs | 時長（毫秒） | number | 500 | 250–900; step 1 |
| perspectivePx | 透視（像素） | number | 1000 | 600–1600; step 1 |
| trigger | 觸發方式 | select | "click" | click / hover |
| backText | 背面內容 | text | 使用者必填 | 1–1000 |

**designIntent**：將使用者提供的兩面內容視為同一張卡片。

**implementationBrief**：映射受控雙層卡片，pointer或鍵盤切換；隱藏面inert，不得編造背面或讓焦點留在隱藏面。

**compatibilityRules**：限卡片；與fold-reveal互斥

**constraints**：背面由使用者提供；不可操作隱藏面；Enter與Space支援；雙面尺寸穩定

**reducedMotionFallback**：直接切換兩面，不旋轉

## 物理標籤場 / Physics Tag Field

- Preset: `physics-tag-field` / version 1
- 狀態：DONE
- 說明：標籤落下、碰撞，並可拖曳拋動。
- 適用：技能與分類標籤
- targetType：card、container、section、stack、grid
- interactionType：autoplay、drag、throw
- techBase：Canvas 2D / fixed-step local solver
- previewMapping：physics-tag-field
- tags：互動、技能與分類標籤
- rendererMapping：physics-tag-field
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| labels | 標籤（每行一個） | lines | 使用者必填 | 1–24 |
| gravity | 重力 | number | 0.5 | 0–2; step 0.05 |
| friction | 摩擦 | number | 0.92 | 0.75–0.99; step 0.01 |
| restitution | 彈性 | number | 0.5 | 0–0.8; step 0.05 |
| spawnIntervalMs | 落下間隔（毫秒） | number | 160 | 60–500; step 1 |
| maxTags | 標籤上限 | number | 12 | 1–24; step 1 |
| draggable | 允許拖曳 | boolean | true | – |
| collisionEnabled | 啟用碰撞 | boolean | true | – |

**designIntent**：用有界、可操作的標籤呈現真實文字集合。

**implementationBrief**：映射本機Canvas 2D固定步長求解器，限制數量、速度、碰撞迭代與旋轉；拖曳保留偏移、拋動保留有限速度，離屏暫停並清理。

**compatibilityRules**：限容器；與stagger/flip/fold互斥；狹窄或標籤過密的容器改靜態列表

**constraints**：最多24個標籤，每個最多24字；固定60Hz步長；重力以px/step²計；離屏暫停並清理RAF；高DPI與resize需保留標籤；觸控拖曳模式可退出

**reducedMotionFallback**：純文字靜態列表

## 折頁揭露 / Fold Reveal

- Preset: `fold-reveal` / version 1
- 狀態：DONE
- 說明：拖曳折角，揭露使用者提供的下層內容。
- 適用：前後對照與介紹卡片
- targetType：card、container、section
- interactionType：drag、click、keyboard
- techBase：Pointer Events / clipped polygon / requestAnimationFrame
- previewMapping：fold-reveal
- tags：內容、前後對照與介紹卡片
- rendererMapping：fold-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| foldCorner | 折角 | select | "top-right" | top-right / bottom-right / top-left / bottom-left |
| revealThreshold | 完成門檻 | number | 0.45 | 0.2–0.8; step 0.05 |
| springResponse | 回彈時間（秒） | number | 0.4 | 0.15–0.8; step 0.05 |
| foldShadow | 折頁陰影 | select | "subtle" | none / subtle |
| clickToToggle | 允許點擊切換 | boolean | true | – |
| underText | 下層內容 | text | 使用者必填 | 1–1000 |

**designIntent**：讓揭露動作與指標保持空間一致，顯示使用者的下一層內容。

**implementationBrief**：以可信雙層與受控裁切／transform，追蹤指定折角；釋放依閾值及速度收斂，快速反向從當前進度接手；鍵盤有直接切換。

**compatibilityRules**：與flip/physics互斥

**constraints**：下層由使用者提供；拖曳保留偏移；快速反向不跳位；點擊與鍵盤有等效操作；只用自製遮罩與transform

**reducedMotionFallback**：直接切換內容

## 逐字聚合 / Letter Assembly

- Preset: `letter-assembly` / version 1
- 狀態：DONE
- 說明：字元以短距離依序歸位，組成完整原文。
- 適用：短標題與介紹文字
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：letter-assembly
- tags：進場、短標題與介紹文字
- rendererMapping：letter-assembly
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 600 | 200–1200; step 1 |
| distancePx | 位移（像素） | number | 12 | 0–32; step 1 |
| intervalMs | 字元間隔（毫秒） | number | 35 | 10–100; step 1 |

**designIntent**：讓原文字素像短句的節拍依序歸位，完整語意始終可讀。

**implementationBrief**：按字素建立可信呈現層，以distancePx、durationMs與intervalMs控制短距離位移及淡入；保留單份讀屏原文，總延遲限制1200ms，長文與reduced-motion直接顯示，不接收HTML。

**compatibilityRules**：僅文字、標題與段落

**constraints**：依字素切分，不拆散組合字；保留原文與讀屏順序；總延遲上限1200ms；長文靜態降級

**reducedMotionFallback**：直接顯示完整原文

## 重點描線 / Accent Stroke

- Preset: `accent-stroke` / version 1
- 狀態：DONE
- 說明：主題色細線沿文字底部展開，提示閱讀重點。
- 適用：重點標題與說明
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：accent-stroke
- tags：內容、重點標題與說明
- rendererMapping：accent-stroke
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 600 | 200–1200; step 1 |
| thicknessPx | 線寬（像素） | number | 2 | 1–6; step 1 |

**designIntent**：用一條克制的主題色線段提示原文重點，讓裝飾服從閱讀。

**implementationBrief**：在文字底部建立不占布局且不攔截事件的可信裝飾層，以durationMs展開scaleX，線寬只讀thicknessPx；多行文字不遮字，reduced-motion顯示靜態線，不生成任意CSS或文案。

**compatibilityRules**：僅文字、標題與段落

**constraints**：使用既有主題色；裝飾線不遮字、不改布局；不新增或改寫原文

**reducedMotionFallback**：顯示靜態底線

## 影像展幕 / Image Reveal

- Preset: `image-reveal` / version 1
- 狀態：DONE
- 說明：以單向展開的裁切範圍揭露完整圖片。
- 適用：作品與介紹圖片
- targetType：image
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：image-reveal
- tags：進場、作品與介紹圖片
- rendererMapping：image-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 700 | 200–1400; step 1 |
| direction | 展開方向 | select | "horizontal" | horizontal / vertical |

**designIntent**：讓影像像展幕一樣逐步顯露，終點呈現完整原圖。

**implementationBrief**：只對既有圖片建立受控裁切進場；direction僅horizontal或vertical，時長讀durationMs，保持尺寸、比例與alt，進入視區只播一次；無動畫API或reduced-motion直接顯示並清理Observer與動畫。

**compatibilityRules**：僅適用於圖片元件

**constraints**：保留圖片比例與替代文字；只裁切、不變更來源；進場只播一次

**reducedMotionFallback**：直接顯示完整圖片

## 磁吸按鈕 / Magnetic Control

- Preset: `magnetic-control` / version 1
- 狀態：DONE
- 說明：按鈕在有限範圍內跟隨指標，離開後回到原位。
- 適用：主要操作按鈕
- targetType：button
- interactionType：pointer-move、hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：magnetic-control
- tags：互動、主要操作按鈕
- rendererMapping：magnetic-control
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| strengthPx | 吸附幅度（像素） | number | 6 | 0–12; step 1 |
| responseMs | 回應時間（毫秒） | number | 180 | 80–400; step 1 |

**designIntent**：在可預期的小範圍內回應指標，維持操作目標的穩定性。

**implementationBrief**：僅按鈕以自身中心計算正規化指標偏移，向量長度限制strengthPx，依responseMs平滑回應；離開、取消與失焦回到原位，disabled、粗指標與reduced-motion停用位移，保留連結、鍵盤焦點與事件清理。

**compatibilityRules**：僅按鈕；鍵盤與觸控不追蹤指標

**constraints**：位移不超過設定幅度；不攔截連結或觸控捲動；離開、失焦與取消時歸位；disabled不播放

**reducedMotionFallback**：保持原位，保留鍵盤焦點提示

## 按壓回饋 / Press Feedback

- Preset: `press-feedback` / version 1
- 狀態：DONE
- 說明：按下時輕微收縮，放開即回復。
- 適用：按鈕與可操作卡片
- targetType：button、card
- interactionType：pointer-down、keyboard
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：press-feedback
- tags：互動、按鈕與可操作卡片
- rendererMapping：press-feedback
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| scale | 按壓比例 | number | 0.97 | 0.9–1; step 0.01 |
| durationMs | 時長（毫秒） | number | 140 | 80–300; step 1 |

**designIntent**：以短促收縮確認按壓，放開後回到原始尺寸，不承諾操作結果。

**implementationBrief**：只在按鈕或卡片的有效按壓期間套用scale與durationMs；pointerup、pointercancel、blur及鍵盤釋放均復原，忽略重複按鍵和disabled，保持既有啟動語意，reduced-motion取消縮放並清理監聽。

**compatibilityRules**：僅適用於按鈕與卡片

**constraints**：pointerup與pointercancel均復原；鍵盤啟動有等效回饋；不新增導航或改變既有操作；disabled不播放

**reducedMotionFallback**：取消縮放，保留原操作與焦點提示

## 群組焦點轉移 / Focus Transfer

- Preset: `focus-transfer` / version 1
- 狀態：DONE
- 說明：聚焦子項時降低其他子項亮度，指引群組閱讀。
- 適用：多項內容群組
- targetType：card、container、section、stack、grid
- interactionType：hover、focus-within
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：focus-transfer
- tags：互動、多項內容群組
- rendererMapping：focus-transfer
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| inactiveOpacity | 非作用項透明度 | number | 0.5 | 0.3–1; step 0.05 |
| durationMs | 時長（毫秒） | number | 200 | 100–500; step 1 |

**designIntent**：讓群組中當前閱讀項更清楚，同時保留其餘內容的可見性。

**implementationBrief**：要求至少兩個實際直接子元素；focus-within優先於hover，作用項opacity為1，其餘為inactiveOpacity，以durationMs過渡，離開群組全部復原；不移動焦點、不改DOM、不設inert，reduced-motion維持全部可見並清理事件。

**compatibilityRules**：限至少兩個子元素的卡片、容器、區塊、堆疊或網格

**constraints**：至少兩個實際直接子元素；鍵盤焦點優先於指標；離開群組後全部復原；不隱藏內容、不改DOM順序

**reducedMotionFallback**：全部子項維持完整透明度

## 區塊閱讀進度 / Scroll Progress

- Preset: `scroll-progress` / version 1
- 狀態：DONE
- 說明：細線依區塊通過可視範圍的比例更新。
- 適用：長內容與閱讀區塊
- targetType：card、container、section、stack、grid
- interactionType：scroll
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：scroll-progress
- tags：資訊、長內容與閱讀區塊
- rendererMapping：scroll-progress
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| thicknessPx | 線寬（像素） | number | 3 | 1–8; step 1 |

**designIntent**：以區塊實際通過視區的程度提供安靜的閱讀位置提示，不假稱完成閱讀。

**implementationBrief**：為容器建立主題色裝飾進度線，線寬只讀thicknessPx；依實際捲動根、視區與區塊尺寸計算並夾限0到1，以scaleX更新，resize重新量測；事件以RAF合併，離屏暫停，卸載清理，reduced-motion隱藏線，不劫持捲動。

**compatibilityRules**：僅卡片、容器、區塊、堆疊或網格；不更改捲動行為

**constraints**：進度限制在0到1；追蹤實際捲動容器與區塊尺寸；裝飾線不占布局、不攔截操作；卸載清理事件、Observer與RAF

**reducedMotionFallback**：隱藏動態進度線，完整保留內容

## 詳情收合 / Disclosure Panel

- Preset: `disclosure-panel` / version 1
- 狀態：DONE
- 說明：保留首個子項作摘要，以明確操作展開或收合其餘內容。
- 適用：卡片補充說明
- targetType：card
- interactionType：click、keyboard
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：disclosure-panel
- tags：內容、卡片補充說明
- rendererMapping：disclosure-panel
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 240 | 100–600; step 1 |

**designIntent**：讓卡片先呈現摘要，再由使用者選擇查看原有補充內容。

**implementationBrief**：僅卡片：首個實際子元素保留為摘要，執行時展開或收合其後所有子元素，durationMs控制高度過渡；提供獨立鍵盤可操作切換鈕及aria-expanded／aria-controls，收合前安全移回焦點，隱藏區域inert；無後續子項靜態降級，reduced-motion立即切換，不編造內容或巢狀互動。

**compatibilityRules**：僅卡片；使用既有子元素，不要求額外內容字串

**constraints**：首個子項始終顯示；執行時展開或收合第一項之後的實際子元素；使用aria-expanded與aria-controls；收合前移回內部焦點，隱藏內容不可操作；無後續子項時靜態顯示

**reducedMotionFallback**：立即切換展開與收合，不播放過渡

## 字元解碼 / Character Decode

- Preset: `character-decode` / version 1
- 狀態：DONE
- 說明：符號由左至右解出原文，已完成的字元保持穩定。
- 適用：文字、標題與段落
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：character-decode
- tags：進場、文字、標題與段落
- rendererMapping：character-decode
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| decodeSpeedMs | 解碼速度（毫秒） | number | 45 | 20–100; step 1 |
| characterDelayMs | 字元延遲（毫秒） | number | 35 | 10–80; step 1 |

**designIntent**：符號由左至右解出原文，已完成的字元保持穩定。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的character-decode受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多100字素，最長3500ms，完成字元不再修改；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 文字分行組合 / Split Line Assembly

- Preset: `split-line-assembly` / version 1
- 狀態：DONE
- 說明：依實際換行量測，以交替方向與逐行遮罩組合原文。
- 適用：文字、標題與段落
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：split-line-assembly
- tags：進場、文字、標題與段落
- rendererMapping：split-line-assembly
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 650 | 200–1200; step 1 |
| staggerMs | 行間隔（毫秒） | number | 100 | 30–180; step 1 |
| distancePx | 位移（像素） | number | 22 | 4–40; step 1 |

**designIntent**：依實際換行量測，以交替方向與逐行遮罩組合原文。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的split-line-assembly受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多100字素及12行，依Range量測真實換行；resize恢復原文；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 滾輪文字 / Rolling Characters

- Preset: `rolling-characters` / version 1
- 狀態：DONE
- 說明：字元在獨立視窗中垂直滾動，最後保留可選取原文。
- 適用：文字、標題與段落
- targetType：text、heading、paragraph
- interactionType：scroll-enter、text-change
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：rolling-characters
- tags：進場、文字、標題與段落
- rendererMapping：rolling-characters
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 800 | 300–1400; step 1 |
| staggerMs | 字元間隔（毫秒） | number | 25 | 10–60; step 1 |

**designIntent**：字元在獨立視窗中垂直滾動，最後保留可選取原文。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的rolling-characters受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多100字素，最終保留原生可選文字；文字變更重播；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 手繪螢光標記 / Hand-Drawn Highlight

- Preset: `hand-drawn-highlight` / version 1
- 狀態：DONE
- 說明：帶有輕微不規則邊緣的底色逐行劃過文字後方。
- 適用：文字、標題與段落
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：hand-drawn-highlight
- tags：內容、文字、標題與段落
- rendererMapping：hand-drawn-highlight
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 700 | 200–1400; step 1 |
| thickness | 標記厚度（百分比） | number | 55 | 20–85; step 1 |
| color | 標記底色 | select | "lime" | lime / amber / sky |

**designIntent**：帶有輕微不規則邊緣的底色逐行劃過文字後方。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的hand-drawn-highlight受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不規則多行底色，受控調色盤並保留原文字色；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 動態文字波浪 / Kinetic Text Wave

- Preset: `kinetic-text-wave` / version 1
- 狀態：DONE
- 說明：依字序傳遞有限的位移與旋轉，結束回原位。
- 適用：文字、標題與段落
- targetType：text、heading、paragraph
- interactionType：scroll-enter、hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：kinetic-text-wave
- tags：互動、文字、標題與段落
- rendererMapping：kinetic-text-wave
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 650 | 200–1200; step 1 |
| amplitudePx | 波幅（像素） | number | 8 | 2–16; step 1 |
| trigger | 播放時機 | select | "in-view" | in-view / hover |

**designIntent**：依字序傳遞有限的位移與旋轉，結束回原位。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的kinetic-text-wave受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多100字素，有限波浪後回原位；hover可用focus及觸控啟動；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 游標聚光 / Cursor Spotlight

- Preset: `cursor-spotlight` / version 1
- 狀態：DONE
- 說明：按鈕固定不動，局部柔光追蹤游標並於離開後消退。
- 適用：操作按鈕
- targetType：button
- interactionType：pointer-move、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：cursor-spotlight
- tags：互動、操作按鈕
- rendererMapping：cursor-spotlight
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| radiusPx | 聚光半徑（像素） | number | 60 | 24–100; step 1 |
| durationMs | 時長（毫秒） | number | 180 | 100–400; step 1 |

**designIntent**：按鈕固定不動，局部柔光追蹤游標並於離開後消退。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的cursor-spotlight受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 液態填充 / Liquid Button Fill

- Preset: `liquid-button-fill` / version 1
- 狀態：DONE
- 說明：弧形液面由底部升起，移開後退回，不改文字。
- 適用：操作按鈕
- targetType：button
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：liquid-button-fill
- tags：互動、操作按鈕
- rendererMapping：liquid-button-fill
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 420 | 150–800; step 1 |
| color | 填充色 | select | "lime" | lime / amber / sky |

**designIntent**：弧形液面由底部升起，移開後退回，不改文字。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的liquid-button-fill受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 墨水漣漪 / Radial Ink Ripple

- Preset: `radial-ink-ripple` / version 1
- 狀態：DONE
- 說明：從實際按壓位置擴散柔和墨圈，完成後移除。
- 適用：操作按鈕
- targetType：button
- interactionType：click、keyboard
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：radial-ink-ripple
- tags：互動、操作按鈕
- rendererMapping：radial-ink-ripple
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 550 | 200–900; step 1 |

**designIntent**：從實際按壓位置擴散柔和墨圈，完成後移除。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的radial-ink-ripple受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：同時最多3圈，完成或卸載移除；鍵盤使用中心；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 環繞圖示 / Orbiting Icon

- Preset: `orbiting-icon` / version 1
- 狀態：DONE
- 說明：受控箭頭沿一次短弧線移動，離開後回復。
- 適用：操作按鈕
- targetType：button
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：orbiting-icon
- tags：互動、操作按鈕
- rendererMapping：orbiting-icon
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 450 | 180–900; step 1 |
| direction | 繞行方向 | select | "clockwise" | clockwise / counterclockwise |

**designIntent**：受控箭頭沿一次短弧線移動，離開後回復。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的orbiting-icon受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 邊框光線流動 / Border Light Trace

- Preset: `border-light-trace` / version 1
- 狀態：DONE
- 說明：細光線沿實際圓角邊框繞行一次，鍵盤聚焦同樣可見。
- 適用：button、card
- targetType：button、card
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：border-light-trace
- tags：互動、button、card
- rendererMapping：border-light-trace
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 900 | 300–1600; step 1 |
| thicknessPx | 線寬（像素） | number | 2 | 1–3; step 1 |

**designIntent**：細光線沿實際圓角邊框繞行一次，鍵盤聚焦同樣可見。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的border-light-trace受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 透視傾斜 / Perspective Tilt

- Preset: `perspective-tilt` / version 1
- 狀態：DONE
- 說明：有限的雙軸透視回應游標，離開後回正。
- 適用：卡片與圖片
- targetType：card、image
- interactionType：pointer-move
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：perspective-tilt
- tags：互動、卡片與圖片
- rendererMapping：perspective-tilt
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| maxAngle | 最大角度 | number | 5 | 1–8; step 1 |
| responseMs | 回正時長（毫秒） | number | 250 | 100–500; step 1 |

**designIntent**：有限的雙軸透視回應游標，離開後回正。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的perspective-tilt受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 百葉窗揭露 / Venetian Reveal

- Preset: `venetian-reveal` / version 1
- 狀態：DONE
- 說明：水平條帶依序展開同一張圖片，最終沒有縫隙。
- 適用：圖片與作品展示
- targetType：image
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：venetian-reveal
- tags：進場、圖片與作品展示
- rendererMapping：venetian-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 850 | 300–1500; step 1 |
| strips | 遮罩條數 | number | 6 | 3–10; step 1 |
| direction | 播放方向 | select | "forward" | forward / reverse |

**designIntent**：水平條帶依序展開同一張圖片，最終沒有縫隙。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的venetian-reveal受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 圓形遮罩擴展 / Circular Mask Expansion

- Preset: `circular-mask-expansion` / version 1
- 狀態：DONE
- 說明：從中央或角落的圓形遮罩擴展成完整圖片。
- 適用：圖片與作品展示
- targetType：image
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：circular-mask-expansion
- tags：進場、圖片與作品展示
- rendererMapping：circular-mask-expansion
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 850 | 300–1500; step 1 |
| origin | 圓心 | select | "center" | center / top-left / top-right / bottom-left / bottom-right |

**designIntent**：從中央或角落的圓形遮罩擴展成完整圖片。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的circular-mask-expansion受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 電影式鏡頭移動 / Cinematic Image Pan

- Preset: `cinematic-image-pan` / version 1
- 狀態：DONE
- 說明：固定畫框內緩慢推移與縮放，最多播放三次。
- 適用：圖片與作品展示
- targetType：image
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：cinematic-image-pan
- tags：進場、圖片與作品展示
- rendererMapping：cinematic-image-pan
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 6000 | 2500–10000; step 1 |
| iterations | 播放次數 | number | 1 | 1–3; step 1 |
| direction | 移動方向 | select | "forward" | forward / reverse |

**designIntent**：固定畫框內緩慢推移與縮放，最多播放三次。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的cinematic-image-pan受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多3次循環，離屏及背景頁暫停；不複製圖片或增加網路請求；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 卡片扇形展開 / Card Deck Fan

- Preset: `card-deck-fan` / version 1
- 狀態：DONE
- 說明：原有子卡片輕微向兩側旋開，離開後收回，內容始終可操作。
- 適用：卡片與內容群組
- targetType：card、container、section、stack、grid
- interactionType：hover、focus-within
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：card-deck-fan
- tags：互動、卡片與內容群組
- rendererMapping：card-deck-fan
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| angle | 展開角度 | number | 4 | 1–7; step 1 |
| distancePx | 展開距離（像素） | number | 8 | 2–12; step 1 |
| durationMs | 時長（毫秒） | number | 320 | 150–700; step 1 |

**designIntent**：原有子卡片輕微向兩側旋開，離開後收回，內容始終可操作。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的card-deck-fan受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多12個真實子項，無新內容或背面；位移受限且不產生捲軸；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 分層視差 / Layered Parallax

- Preset: `layered-parallax` / version 1
- 狀態：DONE
- 說明：前三個原有內容層以不同的有限速度通過視區。
- 適用：卡片與內容群組
- targetType：card、container、section、stack、grid
- interactionType：scroll
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：layered-parallax
- tags：資訊、卡片與內容群組
- rendererMapping：layered-parallax
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| distancePx | 最大位移（像素） | number | 12 | 2–20; step 1 |

**designIntent**：前三個原有內容層以不同的有限速度通過視區。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的layered-parallax受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多3層，最大20px，不劫持捲動；每幀至多一次更新；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 網格對角翻入 / Grid Diagonal Turn

- Preset: `grid-diagonal-turn` / version 1
- 狀態：DONE
- 說明：原有網格子項沿行列對角線依序作輕微透視翻入。
- 適用：卡片與內容群組
- targetType：card、container、section、stack、grid
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：grid-diagonal-turn
- tags：進場、卡片與內容群組
- rendererMapping：grid-diagonal-turn
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 600 | 250–1000; step 1 |
| staggerMs | 對角間隔（毫秒） | number | 80 | 30–150; step 1 |
| order | 展開順序 | select | "row" | row / column / center |

**designIntent**：原有網格子項沿行列對角線依序作輕微透視翻入。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的grid-diagonal-turn受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：最多24子項同時動畫，依實測行列排序；最大延遲1000ms；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 路徑描繪 / SVG Path Drawing

- Preset: `svg-path-drawing` / version 1
- 狀態：DONE
- 說明：安全的內建裝飾路徑以描線方式成形，不接受外部SVG。
- 適用：卡片與內容群組
- targetType：card、container、section、stack、grid
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：svg-path-drawing
- tags：內容、卡片與內容群組
- rendererMapping：svg-path-drawing
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 1000 | 300–1800; step 1 |
| thicknessPx | 線寬（像素） | number | 2 | 1–5; step 1 |
| color | 線條顏色 | select | "theme" | theme / lime / amber / sky |
| shape | 圖形 | select | "curve" | curve / arrow / check |

**designIntent**：安全的內建裝飾路徑以描線方式成形，不接受外部SVG。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的svg-path-drawing受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：只接受curve、arrow、check內建path，不接受外部SVG或腳本；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 數值儀表掃描 / Numeric Gauge Sweep

- Preset: `numeric-gauge-sweep` / version 1
- 狀態：DONE
- 說明：真實百分比文字保持不變，半圓儀表由零掃描至該值。
- 適用：文字、標題與段落
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：numeric-gauge-sweep
- tags：內容、文字、標題與段落
- rendererMapping：numeric-gauge-sweep
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 1000 | 300–1800; step 1 |

**designIntent**：真實百分比文字保持不變，半圓儀表由零掃描至該值。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的numeric-gauge-sweep受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：僅原始0到100數值或百分比，數字不變、只掃描儀表；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 區塊閱讀里程碑 / Scroll Milestones

- Preset: `scroll-milestones` / version 1
- 狀態：DONE
- 說明：依指定區塊的閱讀位置，逐段點亮離散節點而非連續進度線。
- 適用：卡片與內容群組
- targetType：card、container、section、stack、grid
- interactionType：scroll
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：scroll-milestones
- tags：資訊、卡片與內容群組
- rendererMapping：scroll-milestones
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| steps | 里程碑數量 | number | 5 | 3–8; step 1 |
| orientation | 方向 | select | "horizontal" | horizontal / vertical |

**designIntent**：依指定區塊的閱讀位置，逐段點亮離散節點而非連續進度線。生成布局時保留來源的穩定識別與閱讀空間，僅映射受控動態，不擴寫文案。

**implementationBrief**：使用已驗證的scroll-milestones受控Runtime與參數；逐字保留來源、合法目標及現有布局，不生成HTML、SVG或CSS字串；reduced-motion保留內容、離屏暫停並清理。

**compatibilityRules**：只套用相容元件；受控參數及全頁資源限額

**constraints**：3到8個離散節點，只監控指定區塊與其實際捲動根；不改寫來源內容或網路資產；動畫有界，卸載清理事件、Observer及動畫

**reducedMotionFallback**：靜態保留原始內容；互動操作仍可使用

## 文字形態轉換 / Text Morph Transition

- Preset: `text-morph-transition` / version 1
- 狀態：DONE
- 說明：配對相同字素，連續移動至第二段使用者文字；支援不等長。
- 適用：text、heading、paragraph
- targetType：text、heading、paragraph
- interactionType：click、keyboard、on-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：text-morph-transition
- tags：內容、text、heading、paragraph
- rendererMapping：text-morph-transition
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| toText | 目標文字 | text | 使用者必填 | 1–120 |
| durationMs | 時長（毫秒） | number | 800 | 250–1600; step 1 |
| trigger | 播放時機 | select | "click" | click / in-view |

**designIntent**：配對相同字素，連續移動至第二段使用者文字；支援不等長。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控text-morph-transition Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：原文為來源內容，目標文由使用者明確提供；最多80個目標字素／120個來源字素；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 彈性片語跳動 / Elastic Word Bounce

- Preset: `elastic-word-bounce` / version 1
- 狀態：DONE
- 說明：按中英文詞片段跳躍、拉伸、落地與壓縮回彈，不改原文。
- 適用：text、heading、paragraph
- targetType：text、heading、paragraph
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：elastic-word-bounce
- tags：進場、text、heading、paragraph
- rendererMapping：elastic-word-bounce
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| amplitudePx | 跳躍高度 | number | 18 | 4–32; step 1 |
| elasticity | 彈性 | number | 0.6 | 0.1–1; step 0.1 |
| staggerMs | 片語間隔 | number | 70 | 20–140; step 1 |
| durationMs | 時長（毫秒） | number | 750 | 300–1400; step 1 |

**designIntent**：按中英文詞片段跳躍、拉伸、落地與壓縮回彈，不改原文。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控elastic-word-bounce Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：Intl.Segmenter分詞，超量文字靜態保留；延遲最多900ms；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 聚光文字顯影 / Text Spotlight Reveal

- Preset: `text-spotlight-reveal` / version 1
- 狀態：DONE
- 說明：局部文字遮罩由受控光圈揭露；結束恢復完整文字。
- 適用：text、heading、paragraph
- targetType：text、heading、paragraph
- interactionType：hover、focus、on-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：text-spotlight-reveal
- tags：互動、text、heading、paragraph
- rendererMapping：text-spotlight-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| radiusPx | 光圈半徑 | number | 65 | 30–120; step 1 |
| durationMs | 掃描時長（毫秒） | number | 1400 | 500–2500; step 1 |
| trigger | 播放時機 | select | "in-view" | in-view / hover |

**designIntent**：局部文字遮罩由受控光圈揭露；結束恢復完整文字。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控text-spotlight-reveal Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：單一目標局部遮罩，移出／失焦完整顯示，不追蹤全頁；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 字體延展回彈 / Typographic Stretch

- Preset: `typographic-stretch` / version 1
- 狀態：DONE
- 說明：依指標與字元距離局部延展，不重排字距與換行。
- 適用：text、heading、paragraph
- targetType：text、heading、paragraph
- interactionType：pointer-move、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：typographic-stretch
- tags：互動、text、heading、paragraph
- rendererMapping：typographic-stretch
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| maxScale | 最大延展比例 | number | 1.35 | 1.05–1.6; step 0.05 |
| durationMs | 回彈時長（毫秒） | number | 240 | 100–500; step 1 |

**designIntent**：依指標與字元距離局部延展，不重排字距與換行。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控typographic-stretch Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：最多80字素，scaleX最大1.6，保留原生換行；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 游標粒子軌跡 / Cursor Trail Particles

- Preset: `cursor-trail-particles` / version 1
- 狀態：DONE
- 說明：指定區域內的速度感應粒子短暫消散，不做全頁追蹤。
- 適用：card、container、section
- targetType：card、container、section
- interactionType：pointer-move
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：cursor-trail-particles
- tags：互動、card、container、section
- rendererMapping：cursor-trail-particles
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| maxParticles | 粒子上限 | number | 16 | 4–24; step 1 |
| lifetimeMs | 存續時間（毫秒） | number | 550 | 200–900; step 1 |
| sizePx | 粒子尺寸 | number | 4 | 2–8; step 1 |

**designIntent**：指定區域內的速度感應粒子短暫消散，不做全頁追蹤。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控cursor-trail-particles Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：最多24粒子／900ms，只在目標內追蹤，觸控與Reduced Motion停用；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 游標圖片跟隨 / Cursor Image Follower

- Preset: `cursor-image-follower` / version 1
- 狀態：DONE
- 說明：安全素材縮圖慣性跟隨指標，焦點與觸控使用固定縮圖。
- 適用：text、heading、paragraph、button
- targetType：text、heading、paragraph、button
- interactionType：pointer-move、focus、touch
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：cursor-image-follower
- tags：互動、text、heading、paragraph、button
- rendererMapping：cursor-image-follower
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| image | 預覽圖片 | asset | 使用者必填 | – |
| widthPx | 圖片寬度 | number | 100 | 60–160; step 1 |
| responseMs | 慣性回應（毫秒） | number | 180 | 80–400; step 1 |

**designIntent**：安全素材縮圖慣性跟隨指標，焦點與觸控使用固定縮圖。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控cursor-image-follower Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：只接受受控內建素材或本機PNG參照；不攔截點擊；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 黏性圓球融合 / Gooey Blob Merge

- Preset: `gooey-blob-merge` / version 1
- 狀態：DONE
- 說明：局部SVG圓球透過有界黏性濾鏡融合後分離。
- 適用：card、container、section
- targetType：card、container、section
- interactionType：click、keyboard、idle-loop、hover
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：gooey-blob-merge
- tags：互動、card、container、section
- rendererMapping：gooey-blob-merge
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| flow | 融合模式 | select | "press" | press / drift |
| balls | 圓球數量 | number | 3 | 2–5; step 1 |
| durationMs | 時長（毫秒） | number | 1200 | 500–2200; step 1 |
| radiusPx | 圓球半徑 | number | 15 | 10–24; step 1 |

**designIntent**：局部SVG圓球透過有界黏性濾鏡融合後分離。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控gooey-blob-merge Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：2至5球、200×140 SVG；漂流背景在離屏暫停，點擊模式維持有限次播放；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 方向感應滑入 / Directional Hover Wipe

- Preset: `directional-hover-wipe` / version 1
- 狀態：DONE
- 說明：依真實進出邊緣選擇四向遮罩，不固定同一方向。
- 適用：button、card
- targetType：button、card
- interactionType：pointer-enter、pointer-leave、focus
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：directional-hover-wipe
- tags：互動、button、card
- rendererMapping：directional-hover-wipe
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 時長（毫秒） | number | 260 | 120–600; step 1 |

**designIntent**：依真實進出邊緣選擇四向遮罩，不固定同一方向。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控directional-hover-wipe Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：依實際邊緣四向偵測，鍵盤固定左側，遮罩pointer-events:none；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 彈性拖曳吸附 / Spring Drag & Snap

- Preset: `spring-drag-snap` / version 1
- 狀態：DONE
- 說明：獨立拖曳把手限制範圍，放開回原位或吸附邊界。
- 適用：card
- targetType：card
- interactionType：drag、keyboard、touch
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：spring-drag-snap
- tags：互動、card
- rendererMapping：spring-drag-snap
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| rangePx | 拖曳範圍 | number | 32 | 12–64; step 1 |
| snap | 吸附位置 | select | "origin" | origin / edge |
| durationMs | 回彈時長（毫秒） | number | 550 | 250–1000; step 1 |

**designIntent**：獨立拖曳把手限制範圍，放開回原位或吸附邊界。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控spring-drag-snap Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：只在Runtime啟用獨立把手，最大64px；方向鍵移動、Home歸位；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 像素消散 / Pixel Dissolve

- Preset: `pixel-dissolve` / version 1
- 狀態：DONE
- 說明：最多49個受控圖片區塊依不同方向消散或重新組合。
- 適用：image
- targetType：image
- interactionType：on-enter、click
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：pixel-dissolve
- tags：進場、image
- rendererMapping：pixel-dissolve
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| tiles | 像素列數 | number | 5 | 3–7; step 1 |
| durationMs | 時長（毫秒） | number | 900 | 300–1600; step 1 |
| mode | 方向 | select | "reveal" | reveal / dissolve |

**designIntent**：最多49個受控圖片區塊依不同方向消散或重新組合。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控pixel-dissolve Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：單一Canvas最多49區塊，最大640×480；同一張圖片不切成網路請求；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 鏡頭快門 / Shutter Lens Transition

- Preset: `shutter-lens-transition` / version 1
- 狀態：DONE
- 說明：多片鏡頭葉片協同旋轉開合，完成移除遮擋。
- 適用：image
- targetType：image
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：shutter-lens-transition
- tags：進場、image
- rendererMapping：shutter-lens-transition
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| blades | 葉片數量 | number | 6 | 5–8; step 1 |
| durationMs | 時長（毫秒） | number | 900 | 400–1800; step 1 |

**designIntent**：多片鏡頭葉片協同旋轉開合，完成移除遮擋。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控shutter-lens-transition Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：5至8片受控SVG葉片，完成移除遮擋；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 切片故障顯影 / Glitch Slice Reveal

- Preset: `glitch-slice-reveal` / version 1
- 狀態：DONE
- 說明：有限水平切片短距離錯位後回復，不閃爍或持續故障。
- 適用：image
- targetType：image
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：glitch-slice-reveal
- tags：進場、image
- rendererMapping：glitch-slice-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| slices | 切片數量 | number | 5 | 3–8; step 1 |
| distancePx | 錯位幅度 | number | 8 | 3–16; step 1 |
| durationMs | 時長（毫秒） | number | 550 | 300–800; step 1 |

**designIntent**：有限水平切片短距離錯位後回復，不閃爍或持續故障。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控glitch-slice-reveal Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：3至8個切片，最多800ms，無高頻閃爍；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 液態扭曲顯影 / Liquid Distortion Reveal

- Preset: `liquid-distortion-reveal` / version 1
- 狀態：DONE
- 說明：局部SVG位移濾鏡扭曲逐步歸零，結束清除濾鏡。
- 適用：image、card、container
- targetType：image、card、container
- interactionType：scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：liquid-distortion-reveal
- tags：進場、image、card、container
- rendererMapping：liquid-distortion-reveal
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| intensity | 扭曲強度 | number | 18 | 6–30; step 1 |
| durationMs | 恢復時長（毫秒） | number | 1000 | 400–1800; step 1 |

**designIntent**：局部SVG位移濾鏡扭曲逐步歸零，結束清除濾鏡。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控liquid-distortion-reveal Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：來源表面最大720×500／360000px²，超量靜態降級；完成移除局部位移濾鏡；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 卡片堆疊洗牌 / Card Stack Shuffle

- Preset: `card-stack-shuffle` / version 1
- 狀態：DONE
- 說明：3至5張真實卡片從重疊堆疊展開、交換視覺層級並歸位，資料順序不變。
- 適用：card、container、section、stack、grid
- targetType：card、container、section、stack、grid
- interactionType：click、keyboard
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：card-stack-shuffle
- tags：互動、card、container、section、stack、grid
- rendererMapping：card-stack-shuffle
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 洗牌時長（毫秒） | number | 700 | 300–1300; step 1 |
| distancePx | 展開幅度 | number | 40 | 20–60; step 1 |

**designIntent**：3至5張真實卡片從重疊堆疊展開、交換視覺層級並歸位，資料順序不變。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控card-stack-shuffle Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：3至5張真實子卡，資料排序不變；隱藏卡片inert並可逐張操作；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 橫向捲動畫廊 / Horizontal Scroll Gallery

- Preset: `horizontal-scroll-gallery` / version 1
- 狀態：DONE
- 說明：有界區塊內的垂直捲動對應橫向畫廊；手機改原生橫滑。
- 適用：card、container、section、stack、grid
- targetType：card、container、section、stack、grid
- interactionType：scroll、touch
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：horizontal-scroll-gallery
- tags：資訊、card、container、section、stack、grid
- rendererMapping：horizontal-scroll-gallery
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| viewportHeightPx | 可視區高度 | number | 240 | 180–400; step 1 |
| travel | 捲動區間倍數 | number | 2 | 1–4; step 1 |

**designIntent**：有界區塊內的垂直捲動對應橫向畫廊；手機改原生橫滑。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控horizontal-scroll-gallery Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：有界區塊內原生垂直捲動映射橫移，不攔截全頁；手機原生橫滑；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 固定區塊形態切換 / Sticky Section Morph

- Preset: `sticky-section-morph` / version 1
- 狀態：DONE
- 說明：限定捲動區間內的固定面板縮成中央圓角卡片，不跳動其他區塊。
- 適用：card、container、section、stack、grid
- targetType：card、container、section、stack、grid
- interactionType：scroll
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：sticky-section-morph
- tags：資訊、card、container、section、stack、grid
- rendererMapping：sticky-section-morph
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| viewportHeightPx | 可視區高度 | number | 240 | 180–400; step 1 |
| minScale | 最小比例 | number | 0.76 | 0.65–0.9; step 0.01 |
| radiusPx | 最大圓角 | number | 28 | 8–40; step 1 |

**designIntent**：限定捲動區間內的固定面板縮成中央圓角卡片，不跳動其他區塊。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控sticky-section-morph Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：固定區段只在有界區塊內，保留文件流與語意內容；手機直排；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 逐格圖片序列 / Scroll-Driven Image Sequence

- Preset: `scroll-image-sequence` / version 1
- 狀態：DONE
- 說明：明確素材順序映射Frame Index，預載有限影格並保留失敗替代。
- 適用：image
- targetType：image
- interactionType：scroll、progress-control
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：scroll-image-sequence
- tags：資訊、image
- rendererMapping：scroll-image-sequence
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| frames | 序列影格 | assets | 使用者必填 | 2–12 |
| viewportHeightPx | 可視區高度 | number | 240 | 180–400; step 1 |

**designIntent**：明確素材順序映射Frame Index，預載有限影格並保留失敗替代。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控scroll-image-sequence Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：明確2至12個影格，預載當前與下一張；失敗回原圖並提示；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 分鏡敘事面板 / Pinned Story Panels

- Preset: `pinned-story-panels` / version 1
- 狀態：DONE
- 說明：2至5個真實分鏡在有界捲動視窗依進度切換，手機直排。
- 適用：card、container、section、stack、grid
- targetType：card、container、section、stack、grid
- interactionType：scroll、progress-control
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：pinned-story-panels
- tags：資訊、card、container、section、stack、grid
- rendererMapping：pinned-story-panels
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| viewportHeightPx | 可視區高度 | number | 260 | 180–400; step 1 |
| transitionMs | 轉場時長（毫秒） | number | 220 | 100–500; step 1 |

**designIntent**：2至5個真實分鏡在有界捲動視窗依進度切換，手機直排。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控pinned-story-panels Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：2至5個真實子卡分鏡，有界區塊內固定；隱藏前移出焦點，手機／Reduced Motion直排；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 粒子星座連線 / Particle Constellation

- Preset: `particle-constellation` / version 1
- 狀態：DONE
- 說明：單一Canvas中有限小點慢速移動並依距離連線，離屏／背景暫停。
- 適用：card、container、section
- targetType：card、container、section
- interactionType：autoplay、pointer-move
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：particle-constellation
- tags：互動、card、container、section
- rendererMapping：particle-constellation
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| particles | 粒子數量 | number | 16 | 8–24; step 1 |
| linkDistancePx | 連線距離 | number | 65 | 30–100; step 1 |
| speed | 移動速度 | number | 0.35 | 0.1–0.8; step 0.05 |

**designIntent**：單一Canvas中有限小點慢速移動並依距離連線，離屏／背景暫停。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控particle-constellation Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：最多24點／276候選連線，Canvas最大720×480、DPR最多2，離屏／背景暫停；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作

## 彈性圖形變形 / Elastic SVG Morph

- Preset: `elastic-svg-morph` / version 1
- 狀態：DONE
- 說明：相容的八段曲線座標真正變形，具有有限彈性回彈。
- 適用：card、container、section
- targetType：card、container、section
- interactionType：click、keyboard
- techBase：Web Animations / CSS / Pointer Events
- previewMapping：elastic-svg-morph
- tags：內容、card、container、section
- rendererMapping：elastic-svg-morph
- exportMapping：shared PageRuntime + MotionRuntime + ExtendedMotion + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| durationMs | 變形時長（毫秒） | number | 900 | 400–1800; step 1 |
| shape | 目標形狀 | select | "star" | star / rounded-square / organic |

**designIntent**：相容的八段曲線座標真正變形，具有有限彈性回彈。生成只規劃來源布局，不能替換動畫或編造內容。

**implementationBrief**：映射受控elastic-svg-morph Runtime，完整保留來源Preset、素材順序及驗證過的controls；不輸出動畫程式碼或額外可見內容。

**compatibilityRules**：使用相容目標、strict controls及受控素材，不接受HTML／JS／SVG字串

**constraints**：8段相容二次曲線座標插值，不接受外部Path，彈性進度受限；保留來源與操作語意；有界資源、離屏／背景停止不必要繪製、卸載完整清理

**reducedMotionFallback**：靜態保留完整原文、原圖及卡片；互動仍可操作
