# 第三批動畫：40 → 60

## 既有實作核對

基準提交 `42902c8`。開始時工作區乾淨，原40種都有Registry、Runtime、預覽及匯出實作；本輪不改名或刪除任何舊ID。

原40種：`fade-in`, `slide-up`, `scale-in`, `hover-lift`, `hover-glow`, `stagger-reveal`, `breathing-glow`, `curved-path-text`, `count-up`, `flip-card`, `physics-tag-field`, `fold-reveal`, `letter-assembly`, `accent-stroke`, `image-reveal`, `magnetic-control`, `press-feedback`, `focus-transfer`, `scroll-progress`, `disclosure-panel`, `character-decode`, `split-line-assembly`, `rolling-characters`, `hand-drawn-highlight`, `kinetic-text-wave`, `cursor-spotlight`, `liquid-button-fill`, `radial-ink-ripple`, `orbiting-icon`, `border-light-trace`, `perspective-tilt`, `venetian-reveal`, `circular-mask-expansion`, `cinematic-image-pan`, `card-deck-fan`, `layered-parallax`, `grid-diagonal-turn`, `svg-path-drawing`, `numeric-gauge-sweep`, `scroll-milestones`。

## 新增20種

| 名稱 | Preset ID | Trigger | 支援元素 |
|---|---|---|---|
|文字形態轉換 / Text Morph Transition|`text-morph-transition`|click, keyboard, on-enter|文字、標題、段落|
|彈性片語跳動 / Elastic Word Bounce|`elastic-word-bounce`|scroll-enter|文字、標題、段落|
|聚光文字顯影 / Text Spotlight Reveal|`text-spotlight-reveal`|hover, focus, on-enter|文字、標題、段落|
|字體延展回彈 / Typographic Stretch|`typographic-stretch`|pointer-move, focus|文字、標題、段落|
|游標粒子軌跡 / Cursor Trail Particles|`cursor-trail-particles`|pointer-move|卡片容器、容器、區塊|
|游標圖片跟隨 / Cursor Image Follower|`cursor-image-follower`|pointer-move, focus, touch|文字、標題、段落、按鈕|
|黏性圓球融合 / Gooey Blob Merge|`gooey-blob-merge`|click, keyboard|卡片容器、容器、區塊|
|方向感應滑入 / Directional Hover Wipe|`directional-hover-wipe`|pointer-enter, pointer-leave, focus|按鈕、卡片容器|
|彈性拖曳吸附 / Spring Drag & Snap|`spring-drag-snap`|drag, keyboard, touch|卡片容器|
|像素消散 / Pixel Dissolve|`pixel-dissolve`|on-enter, click|圖片|
|鏡頭快門 / Shutter Lens Transition|`shutter-lens-transition`|scroll-enter|圖片|
|切片故障顯影 / Glitch Slice Reveal|`glitch-slice-reveal`|scroll-enter|圖片|
|液態扭曲顯影 / Liquid Distortion Reveal|`liquid-distortion-reveal`|scroll-enter|圖片、卡片容器、容器|
|卡片堆疊洗牌 / Card Stack Shuffle|`card-stack-shuffle`|click, keyboard|卡片容器、容器、區塊、堆疊、網格|
|橫向捲動畫廊 / Horizontal Scroll Gallery|`horizontal-scroll-gallery`|scroll, touch|卡片容器、容器、區塊、堆疊、網格|
|固定區塊形態切換 / Sticky Section Morph|`sticky-section-morph`|scroll|卡片容器、容器、區塊、堆疊、網格|
|逐格圖片序列 / Scroll-Driven Image Sequence|`scroll-image-sequence`|scroll, progress-control|圖片|
|分鏡敘事面板 / Pinned Story Panels|`pinned-story-panels`|scroll, progress-control|卡片容器、容器、區塊、堆疊、網格|
|粒子星座連線 / Particle Constellation|`particle-constellation`|autoplay, pointer-move|卡片容器、容器、區塊|
|彈性圖形變形 / Elastic SVG Morph|`elastic-svg-morph`|click, keyboard|卡片容器、容器、區塊|

## 機制與既有效果的差異

- Text Morph以相同字素優先配對，座標連續轉換兩份明確文字；與隨機字元解碼不同。Elastic Word Bounce按詞片段起跳、拉伸、落地壓縮；不同於逐字平移。Spotlight是真正文字遮罩，不是按鈕背景聚光。Stretch依游標距離局部改scaleX，保持原文字布局。
- 卡片洗牌以重疊真實卡片展開並交換視覺層級，最後回到堆疊；與既有hover扇形展開不同，從不修改資料排序。
- 快門有5–8片協同旋轉的葉片；不是圓形遮罩。像素與故障切片共用原圖在單一Canvas繪製不同區塊；不是淡入，也不切成多個網路請求。液態扭曲使用局部受控SVG位移濾鏡。
- 圖形變形插值相容的八段Q曲線座標，是真正幾何變形；粒子星座在單一Canvas中計算有界距離連線。

## 資料與整合

- 保留CanvasSpec v1、PageSpec v2與既有MotionInstance版本。新ID及typed asset controls是向下相容擴充，不需資料遷移。
- 洗牌、畫廊及分鏡只接受真實Card群組（2–5張，洗牌3–5張）。畫布上的Card仍是容器：每行非空原文建立一張受控子卡，materialize產生Card→Card→Paragraph，verifyPreservation逐項核對來源文字、結構及effects。不能套在普通文字／按鈕上。
- 既有PageSpec子卡可含標題、說明、圖片或合法操作。未新增任意層級的畫布群組設計器；畫布採分行文字建立最小受控群組。
- Text Morph的第一段沿用原元素內容，第二段必須由使用者填入；沒有編造文字。圖片跟隨需選素材；序列需明確2–12個有序素材，沒有影格時顯示設定表單，不假裝影片。
- 新增asset／assets型別共用imageSource白名單：既有內建圖、本輪自製三張序列SVG及驗證後的本機PNG。上傳仍限既有PNG/JPEG流程，不能匯入任意SVG。影格可排序、移除；Runtime／Export同時收集effects內的資產參照。
- 三張內建影格是本輪自製的曲線小球位置示意，名稱與Frame Index明確顯示；可替換為使用者實際素材。預載當前及下一張，失敗使用原圖並提示；更換素材清除舊失敗狀態。
- Patch transport僅新增typed imageSource陣列分支，Preset仍再次strict驗證；沒有放寬文字標籤、URL、程式或scope。普通文字／樣式Patch保持Motion ID、controls及影格順序。
- PageRenderer收集effects資產；PageRuntime、CinematicText、CinematicMotion、StoryMotion與相同CSS全部隨React匯出，無私人Worker依賴。

## 捲動、無障礙與資源界線

- 敘事使用有界區塊內的原生捲動視窗與Sticky區間，不攔截全頁wheel或touch，不建立無限固定區段。到末端由瀏覽器正常scroll chaining。手機畫廊改原生橫滑，分鏡／固定形態及Reduced Motion改正常直排；素材卡內有小型捲動區或進度控制。
- 手機模式依實際Renderer容器寬度判斷，所以桌面375px手機預覽與匯出後的手機一致；素材庫小型示意使用明確preview mode，不把桌面素材卡誤判為手機。
- 分鏡切換前把隱藏面板內的焦點移到可見視窗；隱藏項inert。所有Click效果用真實按鈕支援Enter／Space。拖曳只用獨立把手，支援方向鍵及Home，不在Canvas編輯器啟用Runtime。
- 動畫庫鍵盤事件不會移動選取的草稿。回歸另修復Ctrl+A快速接在貼上後可能讀取舊渲染清單的競態，改讀最新草稿ref；其他編輯流程保留。
- 新場景每頁最多20（其中逐字文字最多8、粒子場最多3、濾鏡場最多4）；粒子最多24、局部Canvas最多720×480且DPR≤2、像素最多49塊、故障切片最多8、快門最多8葉片。
- 液態位移表面最大720×500／360000px²，超量靜態降級；濾鏡局部有界且動畫結束移除。Gooey固定200×140局部SVG。文字逐字層最多80個目標字素／120個來源字素，超量或缺少Intl.Segmenter時保留真實文字。
- 自訂RAF、WAAPI、Observer、圖片載入事件及DOM層均在卸載時清理；粒子離屏／背景暫停，短轉場離屏結束。所有特效保留原文字／替代文字，裝飾層不攔截點擊。
- 60FPS為設計目標，沒有宣稱實體裝置幀率保證。

## 安全與部署範圍

本輪只有本機、Mock與離線Provider payload檢查，付費OpenAI呼叫0。不讀取／修改API Key、帳務、成本保護、Runtime旗標、D1、owner／CSRF／hash驗證，不推送、不合併、不部署。每種新Preset的單獨完整payload仍使用固定Luna／Standard／4096輸出／無工具與原16384-byte上限；大型多效果草稿仍可能被原有輸入／預算限制拒絕，未放寬。


## 驗收結果（2026-11-18）

- PASS：472個單元／整合測試（27檔）、TypeScript、Sites Worker建置、秘密掃描、60份私人motion brief與前端產物分離檢查、git diff --check。
- Chromium分批驗證147個不同案例；最初失敗已修復並重跑對應案例，不宣稱單次147項全綠。快速貼上後Ctrl+A、素材庫方向鍵隔離、分鏡套用／重載，各重複5次共15次PASS。
- 最後針對素材更新／Replay修正的5項PASS：1440／768／375px素材庫、文字與分鏡Replay、獨立React匯出；三尺寸均驗證SVG實際由圓形變成星形。
- 20種各有實際Runtime行為斷言、套用／參數／移除／Undo／Redo／IndexedDB測試。全部20種經Mock生成候選、接受及重載；不是只檢查名稱或動畫class。
- React ZIP包含全部60種，隔離npm ci及build後離線開啟，驗證素材僅被effect引用時仍打包、影格載入、互動及375px。匯出沒有Worker／Provider／私人brief或編輯歷史。
- PNG截圖位於test-results/third-gallery-{1440,768,375}.png、third-scenes-{768,375}.png、third-mock-generation.png；實際匯出為test-results/validated-react-project.zip。

### 驗證中發現及修正

影格陣列原先被舊短標籤長度限制拒絕，新增typed imageSource陣列transport且保留外部URL／超量拒絕測試。素材表單群組與選單重名已區分。快速貼上後Ctrl+A讀取舊render狀態已改用最新ref。素材庫Replay太早查找控制項，以及等價空素材物件導致SVG重建／重播狀態消失，已改可見且掛載完成後啟動及穩定的素材signature。分鏡重載測試曾遇座標選取逾時，改用現有Element Browser明確選取父容器，保留原全部斷言並重跑5次；沒有足夠證據將該逾時歸為正式資料損壞。

### 主要程式位置與尚未驗證

Registry／限制：src/motionCatalog.ts、src/motion.ts、src/assetRef.ts、src/patch.ts。Runtime：src/CinematicText.tsx、src/CinematicMotion.tsx、src/StoryMotion.tsx、src/PageRuntime.tsx、src/pageRuntime.css。素材庫／參數：src/AnimationLibrary.tsx、src/MotionControls.tsx、src/cinematicSamples.ts。管線／匯出：src/generation.ts、src/PageRenderer.tsx、src/exportProject.ts；生成指引僅server/motionBriefs.ts。

未測實體手機、Safari／Firefox、真實付費生成品質或本批線上部署。多效果大型請求仍受既有完整payload／token預算上限限制。新群組採受控卡片結構，沒有新增任意階層畫布群組編輯器。
