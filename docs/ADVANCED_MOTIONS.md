# 進階動畫：20 → 40

原有20種全部保留：fade-in、slide-up、scale-in、hover-lift、hover-glow、stagger-reveal、breathing-glow、curved-path-text、count-up、flip-card、physics-tag-field、fold-reveal、letter-assembly、accent-stroke、image-reveal、magnetic-control、press-feedback、focus-transfer、scroll-progress、disclosure-panel。原觸發、元件及參數見 ANIMATION_SPECS.md 的版本化 Registry 清單。

## 重複提案替換

- Magnetic Attraction 與 magnetic-control 相同 → cursor-spotlight：按鈕完全不位移，局部光點追蹤游標。
- Corner Fold Reveal 與 fold-reveal 相同 → card-deck-fan：實際子卡片扇形展開，無新增背面內容。
- Staggered Grid Entrance 與 stagger-reveal 過度重疊 → grid-diagonal-turn：按實測行列、不同排序，3D對角翻入，不僅改舊stagger參數。
- Number Count-Up 與 count-up 相同 → numeric-gauge-sweep：原百分比數字始終不變，以SVG半圓儀表描線掃描。
- Scroll Progress Ribbon 與 scroll-progress 相同 → scroll-milestones：指定區塊的離散閱讀節點，沒有第二條連續進度線。
- Hand-Drawn Highlight 保留：多行文字後方的不規則底色，有別於 accent-stroke 的底線。Split Line Assembly 按實際換行整行遮罩，有別於 letter-assembly 逐字。

## 新增清單

|ID|名稱|相容元素|觸發|
|---|---|---|---|
|`character-decode`|字元解碼 / Character Decode|text, heading, paragraph|scroll-enter|
|`split-line-assembly`|文字分行組合 / Split Line Assembly|text, heading, paragraph|scroll-enter|
|`rolling-characters`|滾輪文字 / Rolling Characters|text, heading, paragraph|scroll-enter, text-change|
|`hand-drawn-highlight`|手繪螢光標記 / Hand-Drawn Highlight|text, heading, paragraph|scroll-enter|
|`kinetic-text-wave`|動態文字波浪 / Kinetic Text Wave|text, heading, paragraph|scroll-enter, hover, focus|
|`cursor-spotlight`|游標聚光 / Cursor Spotlight|button|pointer-move, focus|
|`liquid-button-fill`|液態填充 / Liquid Button Fill|button|hover, focus|
|`radial-ink-ripple`|墨水漣漪 / Radial Ink Ripple|button|click, keyboard|
|`orbiting-icon`|環繞圖示 / Orbiting Icon|button|hover, focus|
|`border-light-trace`|邊框光線流動 / Border Light Trace|button, card|hover, focus|
|`perspective-tilt`|透視傾斜 / Perspective Tilt|card, image|pointer-move|
|`venetian-reveal`|百葉窗揭露 / Venetian Reveal|image|scroll-enter|
|`circular-mask-expansion`|圓形遮罩擴展 / Circular Mask Expansion|image|scroll-enter|
|`cinematic-image-pan`|電影式鏡頭移動 / Cinematic Image Pan|image|scroll-enter|
|`card-deck-fan`|卡片扇形展開 / Card Deck Fan|card, container, section, stack, grid|hover, focus-within|
|`layered-parallax`|分層視差 / Layered Parallax|card, container, section, stack, grid|scroll|
|`grid-diagonal-turn`|網格對角翻入 / Grid Diagonal Turn|card, container, section, stack, grid|scroll-enter|
|`svg-path-drawing`|路徑描繪 / SVG Path Drawing|card, container, section, stack, grid|scroll-enter|
|`numeric-gauge-sweep`|數值儀表掃描 / Numeric Gauge Sweep|text, heading, paragraph|scroll-enter|
|`scroll-milestones`|區塊閱讀里程碑 / Scroll Milestones|card, container, section, stack, grid|scroll|

## 整合與資源限制

- MotionSchema、CanvasSchema、PageSchema 與 Patch 共用同一組 Preset ID／strict controls；不增加另一套資料系統。新效果不影響原20個ID、預設值及合法舊組合。
- Canvas只顯示標記；PageRuntime、Live Preview與React匯出共用AdvancedMotion。多子項草稿卡片按原文換行轉為真實子節點，來源、位置、尺寸及文字不改寫。
- 文字呈現層最多100字素／12行，長文靜態保留；解碼最長3500ms，尺寸變動取消過期的行量測。Reduced Motion保留真實文字與操作。圖片不複製，不額外切成網路請求。
- 新效果每頁最多24個，視差最多3層／20px、扇形最多12子項、網格最多24子項、漣漪最多3圈、鏡頭最多3次循環；未知參數／不安全字串／互相覆寫的動態拒絕。原有合法舊組合不改。
- 進場及鏡頭動畫離屏／背景暫停；暫時漣漪離屏取消並移除，重播／中斷文字動畫也取消舊WAAPI。卸載清理RAF、Observer、監聽及新增DOM。

## 正式AI與驗收邊界

本輪付費呼叫0，不讀取或修改API Key，不修改帳務、Runtime Secrets、D1額度、AI旗標或私人站存取設定。每種新動畫的單獨完整Provider請求可離線建立，固定Luna／Standard／4096輸出上限／無工具；沒有發送Provider請求。

包含所有20種新效果的PageSpec可由Mock生成、驗證、確認並保存；但這份較大草稿的正式Provider請求會超過原有16384-byte完整輸入限制而被拒絕（來源input本身15580 bytes，尚未計入系統指令、Schema及動畫指引）。這是保留的成本安全限制，不宣稱這份全效果壓力草稿已通過付費生成；實際草稿仍受8192 input tokens與原有預算／身分／單次額度控制。沒有為了展示放寬限制。

實際UI驗收使用本機Chromium／Playwright；Safari、Firefox、實體手機與不同硬體的60FPS表現未驗證。60FPS為設計目標，不是量測保證。正式私人Sites未部署或代登驗證，線上仍為先前版本。

## 交付驗收（2026-11-18）

- PASS：`npm test`，26個測試檔、385項單元／整合測試。包含原ID保留、恰好+20、未知／惡意／超界參數拒絕、相容性、Patch／Undo／Redo、來源與位置保留、每種新效果的離線完整Provider請求。
- PASS：93項主瀏覽器回歸（Advanced、Extended、原動畫、快捷鍵、Mock生成、獨立匯出），另1項新增的文字波浪focus／click重播與中斷清理。使用真實本機Chromium，非靜態截圖驗收。
- PASS：20個新效果逐一觀察實際動作、Reduced Motion、Apply／參數／Remove／Undo／Redo／IndexedDB重載；1440／768／375素材庫Live Preview與重播無頁面水平溢出；實測多行文字、真實多欄排序、暫時DOM取消與單次大量按壓上限。
- PASS：Mock草稿20個新標記 → materialize／PageSpec → 候選預覽 → 明確採用 → 本機保存 → 重載；不修改來源位置尺寸或文案。
- PASS：下載的React ZIP經獨立`npm ci`及`npm run build`，另啟預覽服務，驗證原有及新增Runtime／互動、375px響應式、無編輯器／後端依賴與非本站網路請求。最終ZIP重新驗證1次，包含最新共用Runtime與CSS。
- PASS：`npm run build:sites`、`npm run check:secrets`、`npm run check:motion-boundary`及`git diff --check`。40個內部motion briefs不在前端產物；無source map或可辨識API Key。
- 目前未通過測試：無。未驗證：真實付費模型品質、正式私人站、Safari／Firefox及實體裝置幀率。大型草稿的既有Provider輸入限制見上文，未繞過。

## 主要檔案

- `src/motionCatalog.ts`、`src/motion.ts`：40個公開規格、strict參數、安全／相容性與資源限制。
- `src/AdvancedMotion.tsx`、`src/PageRuntime.tsx`、`src/pageRuntime.css`：20個新實際效果與共用Renderer。
- `src/AnimationLibrary.tsx`、`src/MotionControls.tsx`、`src/neo-manga.css`：四組素材、真正Live Preview／套用／重播及參數。
- `src/generation.ts`、`server/motionBriefs.ts`：真實子項materialize及內部受控AI映射；不修改Provider或帳務／密鑰／D1政策。
- `src/exportProject.ts`：將同一AdvancedMotion隨獨立React專案輸出。
- `src/advancedMotion.test.ts`、`tests/advanced-motions.spec.ts`、`tests/fixtures/advancedMotions.ts`及既有回歸：測試與可重現資料。
- `ANIMATION_SPECS.md`：由Registry產生的全部40種完整規格、控制參數、適用元素、觸發與降級方式。
