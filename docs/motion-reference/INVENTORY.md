# 動畫參考盤點

來源：[Hannah’s Motion Library](https://kittenjam-motion-library.vercel.app/)（資料檔 `data.js`，2026-11-27 讀取）。共 **347** 筆，編號 1–347，每筆一列，完整資料見 [`inventory.json`](inventory.json)。

這份盤點只記錄來源編號、元件類型、觸發方式與技術類別這幾項事實，以及 Sketch2Site 自己的分類與計畫。不收錄來源的名稱、簡介、Prompt、程式或素材。要查原始效果，請用編號到來源網站對照。

## 統計

| 分類 | 筆數 |
|---|---|
| 已有同等功能 | 58 |
| 既有功能可擴充 | 111 |
| 需要新增動畫 | 93 |
| 需要新增複合互動元件 | 11 |
| 不適合目前架構或需要額外授權 | 74 |
| 合計 | 347 |

優先序用於排程。P1 與明列已驗證批次的資料有正式 Runtime；其他預計新增項目仍待實作。

## 已完成的來源對應（12 個新動畫，對應 16 筆來源）

| Sketch2Site ID | 對應來源編號 |
|---|---|
| `drift-letterfall` | 11 |
| `bold-relay` | 23, 291 |
| `turning-letter-mosaic` | 30 |
| `imprint-beats` | 43 |
| `crosswind-ribbons` | 50 |
| `hollow-fill-sweep` | 69, 163 |
| `scroll-ink-words` | 152 |
| `chart-build` | 197, 198, 199 |
| `vanishing-lattice` | 223 |
| `dolly-frame` | 260 |
| `color-wake` | 262 |
| `letter-windows` | 293 |

## 已驗證的複合元件擴充

| 元件 | 來源編號 | 批次 |
|---|---|---|
| 導覽列樣式 | 339 | 4 |
| 導覽列樣式 | 340 | 6 |
| 導覽列樣式 | 341 | 4 |

## 已驗證的既有動畫擴充

| Registry ID | 來源編號 | 批次 |
|---|---|---|
| `count-up` | 8 | 5 |
| `gooey-blob-merge` | 176 | 7 |
| `pinned-story-panels` | 210 | 8 |

## 已有同等功能

| # | 元件 | 觸發 | 技術 | Sketch2Site | 優先 | 說明 |
|---|---|---|---|---|---|---|
| 9 | text | ['loop'] | CSS | kinetic-text-wave | — |  |
| 13 | text | ['enter'] | CSS | character-decode | — |  |
| 15 | text | ['loop'] | CSS | gradient-text-flow | — |  |
| 18 | text | ['loop'] | CSS | kinetic-text-wave | — |  |
| 37 | text | ['enter'] | CSS | letter-assembly | — |  |
| 40 | text | ['loop'] | CSS | float-idle | — |  |
| 41 | text | ['enter'] | CSS | elastic-word-bounce | — |  |
| 66 | text | ['switch'] | CSS | rolling-characters | — |  |
| 74 | text | ['enter'] | CSS | hand-drawn-highlight | — |  |
| 76 | text | ['enter', 'exit'] | GSAP | split-line-assembly | — |  |
| 77 | text | ['enter'] | GSAP | character-decode | — |  |
| 79 | text | ['enter'] | GSAP | elastic-word-bounce | — |  |
| 86 | text | ['enter'] | GSAP | split-line-assembly | — |  |
| 87 | text | ['enter'] | GSAP | elastic-word-bounce | — |  |
| 89 | shape | ['switch'] | GSAP | elastic-svg-morph | — |  |
| 91 | card | ['switch'] | GSAP | 相簿版型切換（gallery view switcher） | — |  |
| 92 | layout | ['scroll'] | GSAP | scroll-progress | — |  |
| 93 | layout | ['scroll'] | GSAP | horizontal-scroll-gallery | — |  |
| 94 | layout | ['scroll'] | GSAP | layered-parallax | — |  |
| 95 | button | ['hover'] | GSAP | magnetic-control | — |  |
| 96 | cursor | ['hover'] | GSAP | cursor-trail-particles | — |  |
| 98 | card | ['enter', 'exit'] | GSAP | card-deck-fan | — |  |
| 99 | bg | ['enter'] | GSAP | confetti-burst | — |  |
| 101 | layout | ['scroll', 'hover'] | GSAP | 側邊圓點導覽（side-dots nav） | — |  |
| 103 | button | ['hover'] | CSS | directional-hover-wipe | — |  |
| 104 | card | ['enter', 'exit'] | GSAP | stagger-reveal | — |  |
| 105 | media | ['hover'] | GSAP | perspective-tilt | — |  |
| 108 | bg | ['loop', 'hover'] | Canvas | particle-constellation | — |  |
| 109 | button | ['hover', 'loop'] | CSS | shine-sweep | — |  |
| 110 | button | ['loop', 'hover'] | CSS | border-light-trace | — |  |
| 112 | card | ['hover'] | CSS | hover-lift | — |  |
| 113 | card | ['hover'] | CSS | cursor-spotlight | — |  |
| 115 | media | ['enter', 'exit'] | CSS | image-reveal | — |  |
| 120 | cursor | ['hover'] | CSS | cursor-image-follower | — |  |
| 121 | cursor | ['hover', 'loop'] | Canvas | cursor-trail-particles | — |  |
| 122 | cursor | ['hover'] | CSS | radial-ink-ripple | — |  |
| 124 | cursor | ['hover'] | CSS | text-spotlight-reveal | — |  |
| 125 | layout | ['enter'] | GSAP | stagger-reveal | — |  |
| 127 | layout | ['enter', 'scroll'] | GSAP | scroll-milestones | — |  |
| 130 | button | ['enter'] | GSAP | breathing-glow | — |  |
| 135 | shape | ['enter'] | GSAP | svg-path-drawing | — |  |
| 139 | shape | ['enter'] | GSAP | numeric-gauge-sweep | — |  |
| 155 | card | ['scroll', 'enter'] | GSAP | count-up | — |  |
| 158 | media | ['scroll'] | GSAP | CSS 捲動視差（既有） | — |  |
| 164 | card | ['hover'] | CSS | flip-card | — |  |
| 183 | text | ['enter', 'exit'] | CSS | float-idle | — |  |
| 184 | media | ['enter', 'exit'] | CSS | cinematic-image-pan | — |  |
| 191 | media | ['loop'] | CSS | cinematic-image-pan | — |  |
| 206 | layout | ['hover', 'switch'] | CSS | disclosure-panel | — |  |
| 214 | card | ['hover'] | CSS | card-deck-fan | — |  |
| 215 | card | ['switch'] | GSAP | 互動價目表（既有） | — |  |
| 220 | card | ['hover'] | CSS | focus-transfer | — |  |
| 232 | button | ['hover'] | CSS | jelly-press | — |  |
| 233 | button | ['hover'] | CSS | radial-ink-ripple | — |  |
| 268 | media | ['switch'] | GSAP | card-stack-shuffle | — |  |
| 302 | card | ['loop', 'drag'] | GSAP | 3D 物件元件（既有） | — |  |
| 305 | card | ['switch'] | GSAP | 翻頁書元件（既有） | — |  |
| 328 | text | ['enter', 'drag'] | Canvas | physics-tag-field | — |  |

## 既有功能可擴充

| # | 元件 | 觸發 | 技術 | Sketch2Site | 優先 | 說明 |
|---|---|---|---|---|---|---|
| 6 | text | ['loop'] | CSS | breathing-glow | P4 | 加上文字縮放與波紋 |
| 8 | text | ['enter'] | CSS | count-up | P4 | 原創落點倒數模式 |
| 16 | text | ['loop'] | CSS | curved-path-text | P3 | 整圈旋轉 |
| 19 | text | ['loop'] | CSS | kinetic-text-wave | P4 | 旗面起伏 |
| 21 | text | ['enter'] | CSS | letter-assembly | P4 | 磁吸聚合 |
| 27 | text | ['exit'] | CSS | pixel-dissolve | P4 | 文字版本 |
| 28 | text | ['switch'] | CSS | text-morph-transition | P3 | 環形換字 |
| 29 | text | ['enter'] | CSS | blur-in | P3 | 殘影進場 |
| 32 | text | ['loop'] | CSS | rolling-characters | P4 | 換位排序 |
| 35 | text | ['loop'] | CSS | typographic-stretch | P3 | 縱向波浪 |
| 42 | text | ['enter'] | CSS | elastic-word-bounce | P3 | 重落節奏 |
| 46 | text | ['switch'] | CSS | text-morph-transition | P3 | 穿越換詞 |
| 47 | text | ['switch'] | CSS | text-morph-transition | P3 | 擠壓換詞 |
| 48 | bg | ['loop'] | CSS | marquee-text | P3 | 雙速巨字 |
| 49 | bg | ['loop'] | CSS | marquee-text | P4 | 直排 |
| 51 | bg | ['loop'] | CSS | curved-path-text | P3 | 沿波浪線流動 |
| 52 | bg | ['loop'] | CSS | marquee-text | P3 | 多層帶狀 |
| 53 | bg | ['loop'] | CSS | marquee-text | P4 | 直排多欄 |
| 54 | bg | ['loop'] | CSS | marquee-text | P3 | 交叉膠帶 |
| 61 | text | ['loop'] | CSS | Depth3D | P4 | 既有 3D 效果加文字厚度 |
| 63 | text | ['switch'] | CSS | flip-card | P3 | 翻卡換字 |
| 64 | text | ['switch'] | CSS | typewriter | P2 | 多句輪替 |
| 65 | text | ['switch'] | CSS | rolling-characters | P3 | 滾輪停定 |
| 67 | text | ['switch'] | CSS | text-morph-transition | P3 | 標題輪替 |
| 70 | text | ['exit'] | CSS | glitch-slice-reveal | P3 | 文字版本 |
| 71 | text | ['loop'] | CSS | letter-windows | P3 | 條紋圖樣選項 |
| 78 | text | ['switch'] | GSAP | typewriter | P2 | 打字刪除輪替 |
| 81 | text | ['enter', 'exit'] | GSAP | letter-assembly | P3 | 四散飛入 |
| 82 | bg | ['loop'] | GSAP | grid-diagonal-turn | P3 | 由中心擴散 |
| 83 | text | ['switch'] | GSAP | text-morph-transition | P2 | 固定前綴換詞 |
| 84 | text | ['enter'] | GSAP | numeric-gauge-sweep | P3 | 數字與進度條同步 |
| 88 | shape | ['enter'] | GSAP | hand-drawn-highlight | P2 | 圈選樣式 |
| 97 | card | ['drag'] | GSAP | spring-drag-snap | P3 | 慣性甩出 |
| 100 | bg | ['scroll', 'drag'] | GSAP | marquee-text | P3 | 依捲動速度加速 |
| 102 | button | ['hover'] | CSS | rolling-characters | P2 | 按鈕滑過翻字 |
| 107 | bg | ['hover'] | CSS | cursor-spotlight | P3 | 格線背景 |
| 111 | button | ['hover', 'enter'] | CSS | confetti-burst | P3 | 愛心噴點 |
| 117 | layout | ['scroll'] | CSS | 導覽列樣式 | P3 | 捲動縮小 |
| 126 | text | ['enter'] | GSAP | split-line-assembly | P3 | 逐行模糊轉清楚 |
| 128 | layout | ['enter'] | GSAP | stagger-reveal | P3 | Z 字順序 |
| 129 | card | ['enter'] | GSAP | scroll-milestones | P3 | 連線後出現 |
| 131 | media | ['enter'] | GSAP | image-reveal | P2 | 柔邊揭露 |
| 132 | card | ['enter', 'scroll'] | GSAP | stagger-reveal | P3 | 左右交錯 |
| 134 | shape | ['enter'] | GSAP | svg-path-drawing | P3 | 簽名路徑 |
| 136 | shape | ['hover'] | GSAP | svg-path-drawing | P3 | 滑過重描 |
| 140 | shape | ['enter'] | GSAP | 表單元件 | P3 | 送出成功動畫 |
| 146 | button | ['hover', 'switch'] | GSAP | 表單元件 | P3 | 送出中狀態 |
| 148 | control | ['hover', 'enter'] | CSS | 表單元件 | P3 | 浮動標籤 |
| 151 | control | ['hover'] | CSS | 表單元件 | P3 | 錯誤提示震動 |
| 156 | layout | ['scroll'] | GSAP | 導覽列樣式 | P3 | 捲動隱藏 |
| 157 | shape | ['scroll'] | GSAP | svg-path-drawing | P3 | 捲動驅動 |
| 159 | text | ['scroll'] | GSAP | marquee-text | P3 | 捲動驅動 |
| 161 | layout | ['scroll', 'switch'] | GSAP | circular-mask-expansion | P3 | 捲動驅動 |
| 167 | layout | ['hover'] | CSS | 導覽列樣式 | P3 | 滑動底色 |
| 170 | text | ['hover'] | CSS | elastic-word-bounce | P3 | 滑過觸發 |
| 171 | button | ['hover'] | CSS | border-light-trace | P2 | 滑過描邊 |
| 176 | bg | ['loop', 'hover'] | Canvas | gooey-blob-merge | P4 | 漂流融合模式，保留舊版點擊聚合 |
| 177 | text | ['hover', 'enter'] | Canvas | particle-constellation | P4 | 粒子組字 |
| 179 | bg | ['hover'] | Canvas | liquid-distortion-reveal | P4 | 滑過漣漪 |
| 181 | bg | ['hover', 'loop'] | Canvas | confetti-burst | P4 | 煙火 |
| 182 | text | ['loop'] | CSS | float-idle | P3 | 縮放呼吸模式 |
| 185 | text | ['enter'] | CSS | letter-assembly | P3 | 翻滾進場 |
| 187 | card | ['enter'] | CSS | stagger-reveal | P3 | 歪斜貼上 |
| 189 | text | ['enter'] | CSS | blur-in | P3 | 字距收合 |
| 192 | shape | ['enter'] | GSAP | svg-path-drawing | P4 | 標誌組合 |
| 194 | shape | ['loop'] | CSS | border-light-trace | P3 | 漸層描邊 |
| 201 | shape | ['loop'] | CSS | liquid-distortion-reveal | P4 | 持續波動 |
| 203 | layout | ['hover', 'switch'] | CSS | 導覽列樣式 | P3 | 選單展開 |
| 208 | layout | ['switch'] | GSAP | 相簿版型切換 | P3 | 分類篩選 |
| 210 | layout | ['scroll'] | GSAP | pinned-story-panels | P4 | 可切換為固定影像，旁側文案自然捲動 |
| 211 | layout | ['scroll', 'hover'] | GSAP | scroll-progress | P3 | 回到頂部按鈕 |
| 212 | card | ['switch', 'loop'] | CSS | 輪播元件 | P2 | 中央放大樣式 |
| 213 | card | ['drag', 'exit'] | GSAP | card-stack-shuffle | P3 | 拖曳甩出 |
| 217 | card | ['loop', 'hover'] | CSS | 標誌牆（既有） | P3 | 卡片雙向輪播 |
| 218 | card | ['switch', 'loop'] | GSAP | 輪播元件 | P3 | 推薦語輪播 |
| 219 | card | ['enter'] | GSAP | stagger-reveal | P3 | 瀑布流落下 |
| 228 | bg | ['hover'] | CSS | layered-parallax | P3 | 游標視差 |
| 231 | button | ['hover'] | CSS | press-feedback | P2 | 立體按壓 |
| 237 | button | ['loop', 'hover'] | CSS | breathing-glow | P3 | 霓虹樣式 |
| 240 | button | ['hover', 'switch'] | GSAP | 表單元件 | P4 | 送出飛走 |
| 257 | cursor | ['hover'] | CSS | loupe-pan | P3 | 放大鏡樣式（批次三） |
| 258 | cursor | ['hover'] | CSS | cursor-trail-particles | P4 | 黏液拖尾 |
| 259 | cursor | ['hover'] | GSAP | confetti-burst | P4 | 圖案噴發 |
| 264 | media | ['hover'] | CSS | 影片元件 | P2 | 滑過播放 |
| 266 | media | ['switch', 'loop'] | GSAP | 輪播元件 | P2 | 縮圖導覽 |
| 267 | media | ['switch', 'loop'] | GSAP | venetian-reveal | P3 | 輪播切換 |
| 269 | media | ['hover'] | CSS | glitch-slice-reveal | P3 | 滑過觸發 |
| 270 | card | ['scroll'] | GSAP | flip-card | P3 | 捲動觸發 |
| 271 | shape | ['scroll'] | GSAP | Depth3D | P4 | 捲動旋轉方塊 |
| 274 | text | ['scroll'] | GSAP | letter-assembly | P3 | 捲動驅動 |
| 275 | shape | ['scroll'] | GSAP | elastic-svg-morph | P4 | 捲動驅動 |
| 276 | card | ['scroll'] | GSAP | card-deck-fan | P3 | 捲動驅動 |
| 277 | text | ['scroll'] | GSAP | blur-in | P3 | 雙向捲動 |
| 278 | text | ['scroll'] | GSAP | curved-path-text | P3 | 捲動驅動 |
| 281 | text | ['hover'] | CSS | typographic-stretch | P2 | 滑過拉開字距 |
| 284 | card | ['hover'] | CSS | dolly-frame | P2 | 資訊面板樣式 |
| 286 | text | ['hover'] | CSS | hand-drawn-highlight | P2 | 滑過觸發 |
| 287 | card | ['hover'] | CSS | perspective-tilt | P4 | 炫彩箔光 |
| 289 | control | ['hover'] | CSS | 表格元件 | P2 | 十字高亮 |
| 294 | text | ['enter'] | GSAP | blur-in | P3 | 逐字版本 |
| 298 | text | ['switch', 'loop'] | GSAP | text-morph-transition | P3 | 多語輪替 |
| 301 | card | ['hover'] | CSS | cursor-spotlight | P3 | 卡片群邊框 |
| 306 | card | ['switch'] | GSAP | 相簿版型切換 | P3 | 疊放與網格 |
| 307 | card | ['switch'] | GSAP | fold-reveal | P3 | 封面開啟 |
| 322 | shape | ['loop'] | CSS | gooey-blob-merge | P3 | 單顆變形 |
| 330 | card | ['hover', 'loop'] | GSAP | fold-reveal | P4 | 撕貼紙角 |
| 332 | card | ['hover', 'switch'] | GSAP | flip-card | P3 | 依方向翻面 |
| 339 | button | ['switch', 'hover'] | CSS | 導覽列樣式 | P3 | 漢堡變形 |
| 340 | layout | ['switch'] | GSAP | 導覽列樣式 | P4 | 分幕選單，支援反向收幕 |
| 341 | layout | ['switch'] | GSAP | 導覽列樣式 | P3 | 膠囊展開 |
| 344 | media | ['drag', 'switch'] | GSAP | photo-spotlight | P3 | 下滑關閉 |

## 需要新增動畫

| # | 元件 | 觸發 | 技術 | Sketch2Site | 優先 | 說明 |
|---|---|---|---|---|---|---|
| 1 | text | ['enter'] | CSS | — | P4 | 文字重落進場 |
| 3 | text | ['loop'] | CSS | — | P4 | 硬幣式翻轉循環 |
| 7 | text | ['loop'] | CSS | — | P4 | 萬花筒旋轉 |
| 10 | text | ['loop'] | CSS | — | P4 | 定格晃動 |
| 11 | bg | ['loop'] | CSS | drift-letterfall | P3 | 八條以內的分軌落字 |
| 12 | text | ['loop'] | CSS | — | P4 | 文字放大鏡 |
| 17 | text | ['loop'] | CSS | — | P4 | 水面倒影 |
| 20 | text | ['loop'] | CSS | — | P4 | 反重力彈跳 |
| 22 | bg | ['loop'] | CSS | — | P4 | 格狀文字背景 |
| 23 | text | ['loop'] | CSS | bold-relay | P1 | 批次一完成 |
| 24 | text | ['enter'] | CSS | — | P4 | 扇形展開 |
| 25 | text | ['loop'] | CSS | — | P3 | 逐字點亮與跳點 |
| 26 | text | ['loop'] | CSS | — | P4 | 鐘擺搖晃 |
| 30 | bg | ['loop'] | CSS | turning-letter-mosaic | P3 | 對角字磚依序翻轉 |
| 31 | text | ['loop'] | CSS | — | P4 | ∞ 軌道 |
| 33 | text | ['loop'] | CSS | — | P4 | 漩渦 |
| 34 | text | ['loop'] | CSS | — | P4 | 顫抖後穩定 |
| 36 | text | ['enter'] | CSS | — | P3 | 墨水暈開 |
| 38 | text | ['loop'] | CSS | — | P4 | 多字型輪替（需字型授權確認） |
| 43 | text | ['enter'] | CSS | imprint-beats | P3 | 原文後方依序落下印記 |
| 44 | text | ['enter'] | CSS | — | P4 | 縱深飛出 |
| 45 | text | ['enter'] | CSS | — | P3 | 詞語堆疊 |
| 50 | bg | ['loop'] | CSS | crosswind-ribbons | P2 | 雙向裝飾字帶，保留中央原文 |
| 57 | text | ['loop'] | CSS | — | P4 | CSS 3D 圓柱 |
| 59 | text | ['loop'] | CSS | — | P4 | 帶景深環繞 |
| 60 | text | ['switch'] | CSS | — | P3 | 四面方塊換字 |
| 62 | text | ['switch'] | CSS | flap-board | P4 | 規劃於批次四 |
| 68 | text | ['loop'] | CSS | — | P4 | 點陣字（Canvas） |
| 69 | bg | ['loop'] | CSS | hollow-fill-sweep | P1 | 批次一完成（逐行版本另列） |
| 72 | text | ['loop'] | CSS | — | P4 | 長陰影 |
| 73 | text | ['loop'] | CSS | — | P3 | 液面填字 |
| 75 | text | ['switch'] | CSS | — | P4 | 斜線互換 |
| 80 | text | ['enter'] | GSAP | — | P3 | 逐字 3D 翻轉 |
| 85 | text | ['hover'] | GSAP | — | P3 | 文字被游標推開 |
| 90 | shape | ['loop'] | GSAP | — | P4 | 沿曲線飛行 |
| 106 | bg | ['loop'] | CSS | — | P3 | 區塊背景光暈 |
| 137 | shape | ['loop'] | CSS | — | P4 | 流動連接線 |
| 138 | shape | ['loop'] | CSS | — | P3 | 區塊波浪分隔 |
| 152 | text | ['scroll'] | GSAP | scroll-ink-words | P1 | 批次一完成 |
| 153 | media | ['scroll'] | GSAP | grow-to-stage | P2 | 規劃於批次二 |
| 160 | bg | ['scroll', 'switch'] | GSAP | — | P3 | 依章節切換頁面配色 |
| 162 | text | ['hover'] | CSS | — | P2 | 連結底線滑入 |
| 163 | text | ['hover'] | CSS | hollow-fill-sweep | P1 | 批次一完成 |
| 165 | media | ['hover'] | CSS | — | P3 | 圓形縮圖展開 |
| 166 | button | ['hover'] | CSS | — | P4 | 圖示列放大 |
| 169 | control | ['hover'] | CSS | — | P4 | 網站內容提示框 |
| 172 | bg | ['loop', 'hover'] | Canvas | — | P4 | Canvas 星際背景 |
| 173 | bg | ['loop', 'hover'] | Canvas | — | P4 | Canvas 流場 |
| 174 | bg | ['loop', 'hover'] | Canvas | — | P4 | 花瓣飄落 |
| 175 | bg | ['loop'] | Canvas | — | P4 | 字元雨 |
| 178 | bg | ['hover'] | Canvas | — | P4 | 圓點網格背景 |
| 186 | text | ['loop', 'enter'] | CSS | neon-ignite | P4 | 規劃於批次四 |
| 188 | text | ['enter'] | CSS | — | P4 | 上下半合成 |
| 190 | text | ['enter', 'exit'] | CSS | — | P4 | 斜滑煞車 |
| 193 | shape | ['loop'] | GSAP | — | P4 | 音訊波形 |
| 195 | shape | ['loop'] | GSAP | — | P4 | 圖示液面 |
| 196 | shape | ['loop'] | CSS | — | P4 | 雷達掃描 |
| 197 | shape | ['enter', 'scroll'] | GSAP | chart-build | P1 | 批次一完成（折線） |
| 198 | shape | ['enter', 'scroll'] | GSAP | chart-build | P1 | 批次一完成（長條） |
| 199 | shape | ['enter', 'scroll'] | GSAP | chart-build | P1 | 批次一完成（圓餅） |
| 222 | bg | ['loop'] | CSS | — | P3 | 顆粒漸層背景 |
| 223 | bg | ['loop'] | CSS | vanishing-lattice | P2 | 主題色透視格線推進 |
| 224 | bg | ['loop'] | CSS | — | P4 | 柔焦光點 |
| 225 | bg | ['loop'] | CSS | — | P3 | 脈衝圓環 |
| 226 | bg | ['loop'] | CSS | — | P4 | 放射光芒 |
| 227 | bg | ['loop', 'hover'] | Canvas | — | P4 | 星空 |
| 229 | bg | ['loop', 'hover'] | Canvas | — | P4 | 細線起伏 |
| 230 | bg | ['loop', 'enter'] | GSAP | — | P3 | 幾何漂浮背景 |
| 236 | button | ['hover'] | CSS | — | P2 | 箭頭替換按鈕 |
| 239 | button | ['hover'] | CSS | — | P3 | 圖示展開成文字 |
| 256 | cursor | ['hover', 'loop'] | CSS | — | P4 | 跟隨游標的眼睛裝飾 |
| 260 | media | ['hover'] | CSS | dolly-frame | P1 | 批次一完成 |
| 261 | media | ['hover'] | CSS | loupe-pan | P3 | 規劃於批次三 |
| 262 | media | ['hover'] | CSS | color-wake | P1 | 批次一完成 |
| 263 | media | ['hover', 'switch'] | CSS | second-look | P3 | 規劃於批次三 |
| 272 | text | ['scroll'] | GSAP | — | P4 | 穿越大字 |
| 273 | media | ['scroll'] | GSAP | rush-skew | P3 | 規劃於批次三 |
| 279 | layout | ['scroll'] | GSAP | door-split | P3 | 規劃於批次三 |
| 280 | text | ['hover'] | CSS | — | P3 | 上下錯開 |
| 282 | layout | ['hover'] | CSS | row-paint | P3 | 規劃於批次三 |
| 291 | text | ['loop'] | CSS | bold-relay | P1 | 批次一完成 |
| 292 | text | ['hover'] | CSS | — | P4 | 光源長陰影 |
| 293 | text | ['loop'] | CSS | letter-windows | P1 | 批次一完成 |
| 295 | text | ['switch'] | GSAP | — | P3 | 劃掉重寫 |
| 297 | text | ['loop'] | CSS | echo-layers | P4 | 規劃於批次四 |
| 319 | shape | ['loop'] | CSS | — | P4 | 指針時鐘 |
| 323 | shape | ['enter'] | GSAP | — | P4 | 徽章解鎖 |
| 324 | shape | ['loop'] | GSAP | — | P4 | 心電圖 |
| 325 | shape | ['enter'] | GSAP | — | P4 | 植物生長 |
| 326 | shape | ['loop'] | GSAP | — | P4 | 齒輪 |
| 329 | card | ['enter', 'drag'] | Canvas | — | P4 | 吊繩識別證（物理） |
| 335 | button | ['hover', 'loop'] | GSAP | — | P4 | 按鈕內眼睛 |
| 338 | media | ['switch', 'loop'] | GSAP | — | P4 | 唱盤播放 |

## 需要新增複合互動元件

| # | 元件 | 觸發 | 技術 | Sketch2Site | 優先 | 說明 |
|---|---|---|---|---|---|---|
| 116 | media | ['drag', 'hover'] | CSS | compare-slider | P2 | 規劃於批次二 |
| 154 | card | ['scroll'] | GSAP | stacked-chapters | P2 | 規劃於批次二 |
| 168 | media | ['hover'] | CSS | accordion-gallery | P3 | 規劃於批次三 |
| 180 | card | ['drag'] | Canvas | — | P3 | 刮開揭露（Canvas） |
| 207 | layout | ['switch'] | GSAP | — | P3 | 分頁內容切換 |
| 209 | layout | ['hover'] | CSS | — | P3 | 便當格展開 |
| 216 | card | ['switch'] | GSAP | — | P3 | 卡片展開詳情 |
| 265 | media | ['switch'] | GSAP | photo-spotlight | P2 | 規劃於批次二 |
| 296 | text | ['enter', 'loop'] | GSAP | — | P4 | 對話訊息 |
| 304 | card | ['enter'] | GSAP | — | P3 | 數據卡：count-up + chart-build |
| 334 | card | ['switch', 'loop', 'hover'] | GSAP | — | P4 | 推薦語便當牆 |

## 不適合目前架構或需要額外授權

| # | 元件 | 觸發 | 技術 | Sketch2Site | 優先 | 說明 |
|---|---|---|---|---|---|---|
| 2 | text | ['exit'] | CSS | — | — | 沒有離場生命週期：網站元件不會被移除 |
| 4 | text | ['exit'] | CSS | — | — | 沒有離場生命週期：網站元件不會被移除 |
| 5 | text | ['exit'] | CSS | — | — | 沒有離場生命週期：網站元件不會被移除 |
| 14 | text | ['exit'] | CSS | — | — | 沒有離場生命週期：網站元件不會被移除 |
| 39 | text | ['exit'] | CSS | — | — | 沒有離場生命週期：網站元件不會被移除 |
| 55 | text | ['loop'] | CSS | — | — | 需要 3D 場景，效能與可讀性不符網站文字 |
| 56 | bg | ['loop'] | CSS | — | — | 需要 3D 場景，效能與可讀性不符網站文字 |
| 58 | text | ['loop'] | CSS | — | — | 需要 3D 場景，效能與可讀性不符網站文字 |
| 114 | card | ['loop', 'enter'] | CSS | — | — | 靜態網站沒有載入中狀態 |
| 118 | card | ['enter', 'exit'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 119 | cursor | ['hover'] | CSS | — | — | 取代系統游標，影響可用性與無障礙 |
| 123 | cursor | ['hover', 'loop'] | CSS | — | — | 取代系統游標，影響可用性與無障礙 |
| 133 | shape | ['enter'] | GSAP | — | — | 需要接受外部 SVG，違反素材安全規則 |
| 141 | control | ['hover', 'switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 142 | layout | ['drag'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 143 | layout | ['enter', 'exit'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 144 | layout | ['switch', 'hover'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 145 | card | ['drag', 'exit'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 147 | control | ['hover', 'switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 149 | control | ['hover'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 150 | layout | ['enter'] | GSAP | — | — | 啟動畫面不屬於網站內容 |
| 200 | shape | ['loop'] | CSS | — | — | 載入動畫不屬於靜態網站內容 |
| 202 | layout | ['switch'] | GSAP | — | — | 頁面轉場需路由層，目前多頁網站不做轉場 |
| 204 | layout | ['hover', 'switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 205 | layout | ['enter', 'exit'] | CSS | — | — | 網站內容沒有對話框；大圖檢視另列 photo-spotlight |
| 221 | card | ['hover'] | GSAP | — | — | 需要購物車與電商後端 |
| 234 | button | ['drag'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 235 | button | ['hover'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 238 | button | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 241 | control | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 242 | control | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 243 | control | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 244 | control | ['drag'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 245 | control | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 246 | control | ['switch'] | CSS | — | — | 網站沒有站內搜尋 |
| 247 | control | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 248 | control | ['enter', 'exit'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 249 | control | ['switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 250 | control | ['drag', 'switch'] | GSAP | — | — | 網站表單不收檔案 |
| 251 | cursor | ['hover'] | CSS | — | — | 取代系統游標，影響可用性與無障礙 |
| 252 | cursor | ['hover'] | GSAP | — | — | 取代系統游標，影響可用性與無障礙 |
| 253 | cursor | ['hover'] | CSS | — | — | 取代系統游標，影響可用性與無障礙 |
| 254 | cursor | ['hover'] | CSS | — | — | 取代系統游標，影響可用性與無障礙 |
| 255 | cursor | ['hover'] | CSS | — | — | 取代系統游標，影響可用性與無障礙 |
| 283 | shape | ['hover'] | CSS | — | — | 需要圖示庫，網站內容目前沒有圖示元件 |
| 285 | button | ['hover'] | CSS | — | — | 需要社群圖示素材授權 |
| 288 | text | ['hover'] | CSS | — | — | 需要抓取外部網頁 |
| 290 | text | ['enter', 'loop'] | GSAP | — | — | 需要字形筆畫資料，涉及字型授權 |
| 299 | card | ['drag'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 300 | card | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 303 | card | ['switch'] | CSS | — | — | 遊戲互動，不是網站內容動畫 |
| 308 | layout | ['enter', 'switch'] | GSAP | — | — | 靜態網站沒有換頁載入 |
| 309 | layout | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 310 | layout | ['hover'] | CSS | — | — | 大型選單屬於導覽架構，暫不納入 |
| 311 | layout | ['switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 312 | layout | ['enter'] | GSAP | — | — | 網站沒有搜尋結果狀態 |
| 313 | layout | ['enter', 'exit'] | GSAP | — | — | 同意橫幅屬法務介面 |
| 314 | layout | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 315 | layout | ['scroll'] | GSAP | — | — | 靜態網站沒有分頁載入 |
| 316 | layout | ['switch'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 317 | layout | ['switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 318 | shape | ['enter', 'loop'] | GSAP | — | — | 需要地圖圖資與授權 |
| 320 | shape | ['loop'] | CSS | — | — | 需要天氣圖示素材 |
| 321 | shape | ['loop'] | CSS | — | — | 編輯器介面，不是網站內容 |
| 327 | shape | ['enter', 'switch'] | GSAP | — | — | 驗證介面，不是網站內容 |
| 331 | media | ['enter', 'loop'] | Canvas | — | — | 需要 3D 紙張模擬 |
| 333 | card | ['enter', 'switch', 'hover', 'drag'] | GSAP | — | — | 第三方付費元件，需授權 |
| 336 | control | ['drag', 'hover'] | CSS | — | — | App 介面控制，不是網站內容動畫 |
| 337 | button | ['hover', 'switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 342 | button | ['switch', 'hover'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 343 | card | ['hover', 'switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 345 | control | ['drag', 'switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 346 | button | ['drag', 'hover'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
| 347 | layout | ['drag', 'hover', 'switch'] | GSAP | — | — | App 介面控制，不是網站內容動畫 |
