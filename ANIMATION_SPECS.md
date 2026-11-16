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
