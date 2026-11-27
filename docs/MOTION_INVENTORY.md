# 動畫盤點（Motion Inventory）

本檔由 `npm run motion:inventory` 依程式產生，不要手動修改。

- 定義與參數：src/motionCatalog.ts（Zod 驗證，motionControlSchemas）
- 篩選、搜尋與推薦共用的分類：src/motionFacets.ts
- 套用：patch.ts 的 attach-effect / update-effect / remove-effect，相容性在 motion.ts 的 targetReason 與 combinationReason
- 編輯器：AnimationLibrary.tsx（素材庫）、MotionControls.tsx（參數）
- 匯出：exportProject.ts 把 runtime 原始碼一起放進 React 專案

共 85 種。

| ID | 名稱 | 用在 | 什麼時候動 | 樣子 | 想達成 | 程度 | 參數 | 鍵盤 | Runtime |
|---|---|---|---|---|---|---|---|---|---|
| `fade-in` | 淡入 / Fade In | 文字、圖片、卡片與區塊、按鈕 | 出現時 | 淡入顯現 | 引導閱讀 | 輕柔 | durationMs, delayMs, easing, trigger | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `slide-up` | 向上滑入 / Slide Up | 文字、圖片、卡片與區塊、按鈕 | 出現時 | 位移滑動 | 引導閱讀 | 輕柔 | distancePx, durationMs, delayMs, easing, trigger | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `scale-in` | 縮放進入 / Scale In | 圖片、卡片與區塊 | 出現時 | 放大縮小 | 吸引注意 | 輕柔 | initialScale, durationMs, delayMs | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `hover-lift` | 懸停浮起 / Hover Lift | 卡片與區塊、按鈕、圖片 | 滑過時 | 位移滑動 | 互動回饋 | 輕柔 | liftPx, durationMs, shadowIntensity | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `hover-glow` | 懸停光暈 / Hover Glow | 按鈕、卡片與區塊 | 滑過時 | 光影色彩 | 吸引注意 | 輕柔 | intensity, spreadPx, durationMs | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `stagger-reveal` | 依序顯示 / Stagger Reveal | 卡片與區塊 | 出現時 | 淡入顯現 | 引導閱讀、吸引注意 | 適中 | intervalMs, childDurationMs, direction, revealStyle | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `breathing-glow` | 呼吸光按鈕 / Breathing Glow Button | 按鈕、文字 | 一直動、滑過時 | 光影色彩 | 吸引注意 | 適中 | pulse, cycleMs, intensity, spreadPx, pauseOnHover | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `curved-path-text` | 曲線文字 / Curved Path Text | 文字 | 出現時 | 文字逐字 | 引導閱讀 | 適中 | curvature, direction, revealDurationMs, textAlign | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `count-up` | 數字遞增 / Count Up | 文字 | 出現時 | 數字資料 | 呈現資料、吸引注意、引導閱讀 | 適中 | cadence, startValue, endValue, durationMs, decimals, locale, prefix, suffix | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `flip-card` | 雙面卡片 / Flip Card | 卡片與區塊 | 點擊時、滑過時 | 立體 | 互動回饋 | 適中 | axis, durationMs, perspectivePx, trigger, backText | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `physics-tag-field` | 物理標籤場 / Physics Tag Field | 卡片與區塊 | 一直動、拖曳 | 彈性 | 互動回饋、營造氣氛 | 強烈 | labels, gravity, friction, restitution, spawnIntervalMs, maxTags, draggable, collisionEnabled | — | PhysicsTags.tsx |
| `fold-reveal` | 折頁揭露 / Fold Reveal | 卡片與區塊 | 拖曳、點擊時 | 立體 | 互動回饋 | 強烈 | foldCorner, revealThreshold, springResponse, foldShadow, clickToToggle, underText | 可 | FoldReveal.tsx |
| `letter-assembly` | 逐字聚合 / Letter Assembly | 文字 | 出現時 | 文字逐字 | 引導閱讀 | 適中 | arrival, durationMs, distancePx, intervalMs | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `accent-stroke` | 重點描線 / Accent Stroke | 文字 | 出現時 | 線條圖形 | 吸引注意、引導閱讀 | 輕柔 | durationMs, thicknessPx | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `image-reveal` | 影像展幕 / Image Reveal | 圖片 | 出現時 | 遮罩揭露 | 吸引注意 | 輕柔 | durationMs, direction | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `magnetic-control` | 磁吸按鈕 / Magnetic Control | 按鈕 | 滑過時 | 位移滑動 | 互動回饋 | 適中 | strengthPx, responseMs | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `press-feedback` | 按壓回饋 / Press Feedback | 按鈕、卡片與區塊 | 點擊時 | 彈性 | 互動回饋 | 輕柔 | scale, durationMs | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `focus-transfer` | 群組焦點轉移 / Focus Transfer | 卡片與區塊 | 滑過時 | 放大縮小 | 互動回饋 | 適中 | inactiveOpacity, durationMs | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `scroll-progress` | 區塊閱讀進度 / Scroll Progress | 卡片與區塊 | 捲動時 | 數字資料 | 呈現資料 | 適中 | thicknessPx | — | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `disclosure-panel` | 詳情收合 / Disclosure Panel | 卡片與區塊 | 點擊時 | 遮罩揭露 | 互動回饋 | 適中 | presentation, durationMs | 可 | MotionRuntime.tsx / ExtendedMotion.tsx / PageRuntime.tsx |
| `character-decode` | 字元解碼 / Character Decode | 文字 | 出現時 | 文字逐字 | 引導閱讀 | 適中 | decodeSpeedMs, characterDelayMs | — | AdvancedMotion.tsx |
| `split-line-assembly` | 文字分行組合 / Split Line Assembly | 文字 | 出現時 | 文字逐字 | 引導閱讀 | 適中 | durationMs, staggerMs, distancePx | — | AdvancedMotion.tsx |
| `rolling-characters` | 滾輪文字 / Rolling Characters | 文字 | 出現時、點擊時 | 文字逐字 | 互動回饋、引導閱讀 | 適中 | durationMs, staggerMs | — | AdvancedMotion.tsx |
| `hand-drawn-highlight` | 手繪螢光標記 / Hand-Drawn Highlight | 文字 | 出現時 | 線條圖形 | 吸引注意、引導閱讀 | 適中 | durationMs, thickness, color | — | AdvancedMotion.tsx |
| `kinetic-text-wave` | 動態文字波浪 / Kinetic Text Wave | 文字 | 出現時、滑過時 | 文字逐字 | 互動回饋、引導閱讀 | 適中 | form, durationMs, amplitudePx, trigger | 可 | AdvancedMotion.tsx |
| `cursor-spotlight` | 游標聚光 / Cursor Spotlight | 按鈕 | 滑過時 | 光影色彩 | 互動回饋 | 適中 | radiusPx, durationMs | 可 | AdvancedMotion.tsx |
| `liquid-button-fill` | 液態填充 / Liquid Button Fill | 按鈕 | 滑過時 | 光影色彩 | 互動回饋 | 適中 | durationMs, color | 可 | AdvancedMotion.tsx |
| `radial-ink-ripple` | 墨水漣漪 / Radial Ink Ripple | 按鈕 | 點擊時 | 線條圖形 | 互動回饋 | 適中 | durationMs | 可 | AdvancedMotion.tsx |
| `orbiting-icon` | 環繞圖示 / Orbiting Icon | 按鈕 | 滑過時 | 線條圖形 | 吸引注意 | 適中 | durationMs, direction | 可 | AdvancedMotion.tsx |
| `border-light-trace` | 邊框光線流動 / Border Light Trace | 按鈕、卡片與區塊 | 滑過時 | 光影色彩 | 吸引注意 | 適中 | durationMs, thicknessPx | 可 | AdvancedMotion.tsx |
| `perspective-tilt` | 透視傾斜 / Perspective Tilt | 卡片與區塊、圖片 | 滑過時 | 立體 | 互動回饋 | 適中 | maxAngle, responseMs | — | AdvancedMotion.tsx |
| `venetian-reveal` | 百葉窗揭露 / Venetian Reveal | 圖片 | 出現時 | 遮罩揭露 | 吸引注意 | 適中 | durationMs, strips, direction | — | AdvancedMotion.tsx |
| `circular-mask-expansion` | 圓形遮罩擴展 / Circular Mask Expansion | 圖片 | 出現時 | 遮罩揭露 | 吸引注意 | 適中 | durationMs, origin | — | AdvancedMotion.tsx |
| `cinematic-image-pan` | 電影式鏡頭移動 / Cinematic Image Pan | 圖片 | 出現時 | 位移滑動 | 吸引注意 | 適中 | durationMs, iterations, direction | — | AdvancedMotion.tsx |
| `card-deck-fan` | 卡片扇形展開 / Card Deck Fan | 卡片與區塊 | 滑過時 | 位移滑動 | 互動回饋 | 適中 | angle, distancePx, durationMs | 可 | AdvancedMotion.tsx |
| `layered-parallax` | 分層視差 / Layered Parallax | 卡片與區塊 | 捲動時 | 立體 | 吸引注意 | 適中 | distancePx | — | AdvancedMotion.tsx |
| `grid-diagonal-turn` | 網格對角翻入 / Grid Diagonal Turn | 卡片與區塊 | 出現時 | 立體 | 吸引注意 | 適中 | durationMs, staggerMs, order | — | AdvancedMotion.tsx |
| `svg-path-drawing` | 路徑描繪 / SVG Path Drawing | 卡片與區塊 | 出現時 | 線條圖形 | 吸引注意 | 適中 | durationMs, thicknessPx, color, shape | — | AdvancedMotion.tsx |
| `numeric-gauge-sweep` | 數值儀表掃描 / Numeric Gauge Sweep | 文字 | 出現時 | 數字資料 | 呈現資料、引導閱讀 | 適中 | durationMs | — | AdvancedMotion.tsx |
| `scroll-milestones` | 區塊閱讀里程碑 / Scroll Milestones | 卡片與區塊 | 捲動時 | 數字資料 | 呈現資料 | 適中 | steps, orientation | — | AdvancedMotion.tsx |
| `text-morph-transition` | 文字形態轉換 / Text Morph Transition | 文字 | 點擊時、出現時 | 文字逐字 | 互動回饋、引導閱讀 | 強烈 | toText, durationMs, trigger | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `elastic-word-bounce` | 彈性片語跳動 / Elastic Word Bounce | 文字 | 出現時 | 彈性 | 引導閱讀 | 強烈 | amplitudePx, elasticity, staggerMs, durationMs | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `text-spotlight-reveal` | 聚光文字顯影 / Text Spotlight Reveal | 文字 | 滑過時、出現時 | 光影色彩 | 互動回饋、引導閱讀 | 強烈 | radiusPx, durationMs, trigger | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `typographic-stretch` | 字體延展回彈 / Typographic Stretch | 文字 | 滑過時 | 文字逐字 | 互動回饋 | 強烈 | maxScale, durationMs | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `cursor-trail-particles` | 游標粒子軌跡 / Cursor Trail Particles | 卡片與區塊 | 滑過時 | 線條圖形 | 互動回饋 | 強烈 | maxParticles, lifetimeMs, sizePx | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `cursor-image-follower` | 游標圖片跟隨 / Cursor Image Follower | 文字、按鈕 | 滑過時、拖曳 | 位移滑動 | 互動回饋 | 強烈 | image, widthPx, responseMs | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `gooey-blob-merge` | 黏性圓球融合 / Gooey Blob Merge | 卡片與區塊 | 點擊時、一直動、滑過時 | 線條圖形 | 互動回饋、營造氣氛 | 強烈 | flow, balls, durationMs, radiusPx | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `directional-hover-wipe` | 方向感應滑入 / Directional Hover Wipe | 按鈕、卡片與區塊 | 滑過時 | 遮罩揭露 | 互動回饋 | 強烈 | durationMs | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `spring-drag-snap` | 彈性拖曳吸附 / Spring Drag & Snap | 卡片與區塊 | 拖曳、點擊時 | 彈性 | 互動回饋 | 強烈 | rangePx, snap, durationMs | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `pixel-dissolve` | 像素消散 / Pixel Dissolve | 圖片 | 出現時、點擊時 | 遮罩揭露 | 互動回饋、吸引注意 | 強烈 | tiles, durationMs, mode | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `shutter-lens-transition` | 鏡頭快門 / Shutter Lens Transition | 圖片 | 出現時 | 遮罩揭露 | 吸引注意 | 強烈 | blades, durationMs | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `glitch-slice-reveal` | 切片故障顯影 / Glitch Slice Reveal | 圖片 | 出現時 | 遮罩揭露 | 吸引注意 | 強烈 | slices, distancePx, durationMs | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `liquid-distortion-reveal` | 液態扭曲顯影 / Liquid Distortion Reveal | 圖片、卡片與區塊 | 出現時 | 遮罩揭露 | 吸引注意 | 強烈 | intensity, durationMs | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `card-stack-shuffle` | 卡片堆疊洗牌 / Card Stack Shuffle | 卡片與區塊 | 點擊時 | 位移滑動 | 互動回饋 | 強烈 | durationMs, distancePx | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `horizontal-scroll-gallery` | 橫向捲動畫廊 / Horizontal Scroll Gallery | 卡片與區塊 | 捲動時、拖曳 | 位移滑動 | 互動回饋、吸引注意 | 強烈 | viewportHeightPx, travel | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `sticky-section-morph` | 固定區塊形態切換 / Sticky Section Morph | 卡片與區塊 | 捲動時 | 放大縮小 | 吸引注意 | 強烈 | viewportHeightPx, minScale, radiusPx | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `scroll-image-sequence` | 逐格圖片序列 / Scroll-Driven Image Sequence | 圖片 | 捲動時 | 位移滑動 | 吸引注意 | 強烈 | frames, viewportHeightPx | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `pinned-story-panels` | 分鏡敘事面板 / Pinned Story Panels | 卡片與區塊 | 捲動時 | 淡入顯現 | 引導閱讀、吸引注意 | 強烈 | presentation, viewportHeightPx, transitionMs | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `particle-constellation` | 粒子星座連線 / Particle Constellation | 卡片與區塊 | 一直動、滑過時 | 線條圖形 | 互動回饋、營造氣氛 | 強烈 | particles, linkDistancePx, speed | — | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `elastic-svg-morph` | 彈性圖形變形 / Elastic SVG Morph | 卡片與區塊 | 點擊時 | 彈性 | 互動回饋 | 強烈 | durationMs, shape | 可 | CinematicMotion.tsx / CinematicText.tsx / StoryMotion.tsx |
| `typewriter` | 打字機 / Typewriter | 文字、按鈕 | 出現時 | 文字逐字 | 引導閱讀 | 輕柔 | charsPerSecond, caret | — | SignatureMotion.tsx |
| `marquee-text` | 跑馬燈 / Marquee Text | 文字 | 一直動 | 位移滑動 | 吸引注意 | 適中 | layout, speedPxPerSecond, direction | — | SignatureMotion.tsx |
| `gradient-text-flow` | 流光漸層字 / Gradient Text Flow | 文字 | 一直動 | 光影色彩 | 吸引注意 | 輕柔 | palette, cycleMs | — | SignatureMotion.tsx |
| `blur-in` | 模糊淡入 / Blur In | 文字、圖片、卡片與區塊、按鈕 | 出現時 | 淡入顯現 | 引導閱讀 | 輕柔 | entry, durationMs, blurPx | — | SignatureMotion.tsx |
| `float-idle` | 輕飄浮動 / Floating Idle | 圖片、卡片與區塊、按鈕 | 一直動 | 位移滑動 | 營造氣氛 | 輕柔 | distancePx, cycleMs | — | SignatureMotion.tsx |
| `confetti-burst` | 彩紙慶祝 / Confetti Burst | 按鈕、卡片與區塊 | 點擊時 | 線條圖形 | 吸引注意 | 強烈 | count | 可 | SignatureMotion.tsx |
| `jelly-press` | 果凍彈跳 / Jelly Press | 按鈕、卡片與區塊、圖片 | 滑過時、點擊時 | 彈性 | 互動回饋 | 輕柔 | intensity | 可 | SignatureMotion.tsx |
| `shine-sweep` | 光澤掃過 / Shine Sweep | 按鈕、卡片與區塊、圖片 | 滑過時、出現時 | 光影色彩 | 吸引注意 | 輕柔 | durationMs | 可 | SignatureMotion.tsx |
| `dolly-frame` | 鏡頭推近 / Dolly Frame | 圖片 | 滑過時、拖曳 | 放大縮小 | 互動回饋 | 輕柔 | zoom, durationMs, caption | 可 | ReferenceMotion.tsx |
| `color-wake` | 褪色回彩 / Color Wake | 圖片 | 滑過時、捲動時 | 光影色彩 | 互動回饋、吸引注意 | 輕柔 | muted, durationMs | 可 | ReferenceMotion.tsx |
| `scroll-ink-words` | 逐字上墨 / Ink as You Read | 文字 | 捲動時 | 文字逐字 | 引導閱讀 | 輕柔 | dim, range | — | ReferenceMotion.tsx |
| `hollow-fill-sweep` | 空心填色 / Hollow to Solid | 文字 | 滑過時、出現時 | 光影色彩 | 吸引注意、引導閱讀 | 輕柔 | trigger, strokePx, durationMs | 可 | ReferenceMotion.tsx |
| `letter-windows` | 字窗風景 / Letter Windows | 文字 | 一直動 | 光影色彩 | 吸引注意 | 適中 | image, cycleSeconds, outline | — | ReferenceMotion.tsx |
| `bold-relay` | 粗體接力 / Bold Relay | 文字 | 一直動 | 文字逐字 | 營造氣氛 | 適中 | peakWeight, cycleMs, stepMs | — | ReferenceMotion.tsx |
| `chart-build` | 圖表長出來 / Chart Build-Up | 圖表與媒體 | 出現時 | 數字資料 | 呈現資料 | 適中 | durationMs, stepMs | — | ReferenceMotion.tsx |
| `crosswind-ribbons` | 交風字帶 / Crosswind Ribbons | 文字 | 一直動 | 文字逐字 | 營造氣氛 | 適中 | cycleMs, angleDeg, wash | — | ReferenceMotion.tsx |
| `vanishing-lattice` | 遠方經緯 / Vanishing Lattice | 卡片與區塊 | 一直動 | 立體 | 營造氣氛 | 適中 | cycleMs, spacingPx, orb | — | ReferenceMotion.tsx |
| `imprint-beats` | 印記拍點 / Imprint Beats | 文字 | 出現時 | 文字逐字 | 引導閱讀 | 適中 | imprintMs, stepMs | — | ReferenceMotion.tsx |
| `drift-letterfall` | 字雨垂幕 / Drift Letterfall | 文字 | 一直動 | 位移滑動 | 營造氣氛 | 適中 | cycleMs, lanes | — | ReferenceMotion.tsx |
| `turning-letter-mosaic` | 翻頁字磚 / Turning Letter Mosaic | 文字 | 一直動 | 立體 | 營造氣氛 | 適中 | cycleMs, columns | — | ReferenceMotion.tsx |
| `cutout-ticks` | 剪紙頓拍 / Cutout Ticks | 文字 | 一直動 | 位移滑動 | 營造氣氛 | 輕柔 | travelPx, cycleMs | — | ReferenceMotion.tsx |
| `sign-pivot` | 懸牌擺弧 / Sign Pivot | 文字 | 一直動 | 位移滑動 | 營造氣氛 | 輕柔 | angleDeg, cycleMs | — | ReferenceMotion.tsx |
| `quiet-landing` | 顫波止步 / Quiet Landing | 文字 | 出現時 | 位移滑動 | 引導閱讀 | 輕柔 | travelPx, durationMs | — | ReferenceMotion.tsx |
| `storm-landing` | 雷痕落字 / Storm Landing | 文字 | 出現時 | 位移滑動 | 引導閱讀 | 輕柔 | travelPx, durationMs | — | ReferenceMotion.tsx |
| `inverse-spring` | 逆重力跳點 / Inverse Spring | 文字 | 出現時 | 位移滑動 | 引導閱讀 | 輕柔 | travelPx, durationMs | — | ReferenceMotion.tsx |
