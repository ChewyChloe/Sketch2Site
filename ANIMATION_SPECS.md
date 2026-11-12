# Animation Specs / Motion Spec Library

本檔由 `npm run motion:docs` 依 TypeScript Registry 產生，不手動維護第二份參數清單。
來源：src/motionCatalog.ts（公開規格及參數Schema）、server/motionBriefs.ts（後端原創生成指引）。未參考／匯入第三方動畫網站的Prompt、預覽或程式。

PageSpec與CanvasSpec的舊效果需經版本化相容層；新效果僅在Renderer、編輯及匯出均驗證後標記DONE。

| Preset | 中文名稱 | 狀態 | 類別 | 複雜度 |
| --- | --- | --- | --- | --- |
| fade-in | 淡入 | PARTIAL | 進場 | low |
| slide-up | 向上滑入 | PARTIAL | 進場 | low |
| scale-in | 縮放進入 | PARTIAL | 進場 | low |
| hover-lift | 懸停浮起 | PARTIAL | 互動 | low |
| hover-glow | 懸停光暈 | PARTIAL | 互動 | low |
| stagger-reveal | 依序顯示 | PARTIAL | 進場 | medium |
| breathing-glow | 呼吸光按鈕 | NOT STARTED | 互動 | medium |
| curved-path-text | 曲線文字 | NOT STARTED | 內容 | medium |
| count-up | 數字遞增 | NOT STARTED | 內容 | medium |
| flip-card | 雙面卡片 | NOT STARTED | 內容 | medium |
| physics-tag-field | 物理標籤場 | NOT STARTED | 互動 | high |
| fold-reveal | 折頁揭露 | NOT STARTED | 內容 | high |

## 淡入 / Fade In

- Preset: `fade-in` / version 1
- 狀態：PARTIAL
- 說明：內容從透明自然顯現。
- 適用：標題、段落與圖片
- targetType：text、heading、paragraph、image、card、container、button、section、stack、grid
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：fade-in
- tags：進場、標題、段落與圖片
- rendererMapping：fade-in
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：PARTIAL
- 說明：輕微上移，同時淡入。
- 適用：介紹、圖片與卡片
- targetType：text、heading、paragraph、image、card、container、button、section、stack、grid
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：slide-up
- tags：進場、介紹、圖片與卡片
- rendererMapping：slide-up
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：PARTIAL
- 說明：從略小尺寸平滑顯現。
- 適用：圖片與重點區塊
- targetType：image、card、container、section、stack、grid
- interactionType：on-enter
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：scale-in
- tags：進場、圖片與重點區塊
- rendererMapping：scale-in
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：PARTIAL
- 說明：移入或聚焦時輕微浮起。
- 適用：卡片、圖片與按鈕
- targetType：card、button、image、container、section、stack、grid
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：hover-lift
- tags：互動、卡片、圖片與按鈕
- rendererMapping：hover-lift
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：PARTIAL
- 說明：以主題色柔和強調邊緣。
- 適用：按鈕與互動卡片
- targetType：button、card
- interactionType：hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：hover-glow
- tags：互動、按鈕與互動卡片
- rendererMapping：hover-glow
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：PARTIAL
- 說明：讓群組內容依序顯現。
- 適用：列表與作品群組
- targetType：card、container、section、stack、grid
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：stagger-reveal
- tags：進場、列表與作品群組
- rendererMapping：stagger-reveal
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：NOT STARTED
- 說明：以平緩亮度節奏標示主要行動。
- 適用：主要行動按鈕
- targetType：button
- interactionType：idle-loop、hover、focus
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：breathing-glow
- tags：互動、主要行動按鈕
- rendererMapping：breathing-glow
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：NOT STARTED
- 說明：讓短文字沿自製弧線呈現。
- 適用：品牌標語與短標題
- targetType：text、heading、paragraph
- interactionType：on-enter、scroll-enter
- techBase：SVG textPath / Web Animations
- previewComponent：curved-path-text
- tags：內容、品牌標語與短標題
- rendererMapping：curved-path-text
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
| curvature | 曲度 | select | "gentle" | gentle / medium / strong |
| direction | 弧線方向 | select | "upward" | upward / downward |
| revealDurationMs | 揭露時長（毫秒） | number | 900 | 300–1800; step 1 |
| textAlign | 文字對齊 | select | "center" | start / center / end |

**designIntent**：曲線服務短文字的辨識，不犧牲繁中可讀性。

**implementationBrief**：由可信元件計算SVG path及textPath；保留讀屏原文，長文退回水平文字，不接受SVG字串。

**compatibilityRules**：只套用文字；不可與count-up合用

**constraints**：保留原文供讀屏；超過80字改水平文字；只產生可信SVG path

**reducedMotionFallback**：靜態曲線或水平文字

## 數字遞增 / Count Up

- Preset: `count-up` / version 1
- 狀態：NOT STARTED
- 說明：從起始值變化至使用者的真實數值。
- 適用：已有的統計數字
- targetType：text、heading、paragraph
- interactionType：on-enter、scroll-enter
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：count-up
- tags：內容、已有的統計數字
- rendererMapping：count-up
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

| 參數 | UI | 型別 | 預設 | 合法範圍／選項 |
| --- | --- | --- | --- | --- |
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

**constraints**：終值必須來自原始文字；不編造統計；不循環；使用tabular numerals

**reducedMotionFallback**：直接顯示精確終值

## 雙面卡片 / Flip Card

- Preset: `flip-card` / version 1
- 狀態：NOT STARTED
- 說明：點擊翻面，閱讀使用者提供的另一面。
- 適用：作品與詳情卡片
- targetType：card
- interactionType：click、keyboard、hover
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：flip-card
- tags：內容、作品與詳情卡片
- rendererMapping：flip-card
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
- 狀態：NOT STARTED
- 說明：標籤落下、碰撞，並可拖曳拋動。
- 適用：技能與分類標籤
- targetType：card、container、section、stack、grid
- interactionType：autoplay、drag、throw
- techBase：Canvas 2D / fixed-step local solver
- previewComponent：physics-tag-field
- tags：互動、技能與分類標籤
- rendererMapping：physics-tag-field
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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

**compatibilityRules**：限容器；與stagger/flip/fold互斥；狹窄容器改靜態列表

**constraints**：最多24個標籤，每個最多24字；固定60Hz步長；重力以px/step²計；離屏暫停並清理RAF；高DPI與resize需保留標籤；觸控拖曳模式可退出

**reducedMotionFallback**：純文字靜態列表

## 折頁揭露 / Fold Reveal

- Preset: `fold-reveal` / version 1
- 狀態：NOT STARTED
- 說明：拖曳折角，揭露使用者提供的下層內容。
- 適用：前後對照與介紹卡片
- targetType：card、container、section
- interactionType：drag、click、keyboard
- techBase：Web Animations / CSS / Pointer Events
- previewComponent：fold-reveal
- tags：內容、前後對照與介紹卡片
- rendererMapping：fold-reveal
- exportMapping：shared PageRuntime + MotionRuntime + motion CSS

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
