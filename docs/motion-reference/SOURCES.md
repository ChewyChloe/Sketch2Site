# 參考來源與授權紀錄

## 來源

| 來源 | 連結 | 涵蓋編號 | 用途 |
|---|---|---|---|
| Hannah’s Motion Library | https://kittenjam-motion-library.vercel.app/ | 1–347 | 整理後的網頁動態效果目錄；盤點與機制參考 |
| @ai_yunon_ai（Threads） | https://www.threads.com/@ai_yunon_ai/post/DeeJRUjkXlM | 1–40 | 來源網站標示的原始創作者 |
| @ai_tjb（Threads） | https://www.threads.com/@ai_tjb/post/DeeHoA3ktZ5 | 41–75 | 來源網站標示的原始創作者 |
| Framer Marketplace | https://www.framer.com/marketplace/components/ | 328–335 | 來源網站標示的第三方元件；333 另指向 https://framer.com/m/Docket-bUiXTw.js@Ng9fXttlL2B8cqH3aiFf |

## 使用方式

- 2026-11-27 讀取來源的 `data.js`，確認共 347 筆。只在本機解析，沒有執行它的程式碼。
- 參考的只有效果機制與設計方向，例如「圖片在固定框內放大」。
- Sketch2Site 的動畫名稱、簡介、行為規格、程式、CSS 與預覽內容都是自己寫的，見 `src/referenceMotions.ts` 與 `src/ReferenceMotion.tsx`。
- 預覽使用的照片是專案內建的咖啡範例照片。

## 沒有做的事

- 不複製來源的資料庫、名稱、簡介、Prompt、程式、展示素材或介面設計。
- 不把來源的原始資料檔提交到這個專案，`build_inventory.py` 讀取的是本機解析檔。
- 不使用 Framer Marketplace 元件的程式；編號 333 標為「第三方付費元件，需授權」，不實作。
- 不加入付費動畫外掛，也沒有使用 GSAP；新動畫只用 CSS、Web Animations 與 SVG。
- 不呼叫任何付費 AI API。

## 授權狀態

來源網站沒有提供可重用的程式或素材授權，所以每一筆盤點都標為「僅參考效果機制；未取得程式、素材或文字授權，不複製」。如果之後要直接使用任何第三方內容，必須先取得授權，再在這裡另外記錄來源與授權條款。

## 更新盤點

1. 用 Python 把 `data.js` 解析成 `items.json`，不要執行它。
2. `python3 -I docs/motion-reference/build_inventory.py items.json docs/motion-reference/inventory.json`
3. `python3 -I docs/motion-reference/build_inventory_md.py docs/motion-reference/inventory.json docs/motion-reference/INVENTORY.md`

批次 2 新增 #50、#223 的原創實作。沿用上表來源歸屬，只使用機制靈感。文字帶使用使用者原文，兩項效果皆使用網站主題色。
批次 3 新增 #11、#30、#43。程式獨立實作，沿用網站原文字元與主題色。新增實作驗證見 [VERIFICATION.md](VERIFICATION.md)。
批次 4 擴充既有導覽元件以涵蓋 #339、#341，使用原創 SVG 路徑變形與 CSS 面板轉場，配色沿用網站主題及可讀性設定。這兩筆為同一元件的設定，不增加 Registry 計數。
批次 5 依 #8 的落點節奏擴充既有數字動畫。數字與文案仍來自頁面內容，落下和壓縮採自行撰寫的 Web Animations；模式不新增 Registry ID。
批次 6 依 #340 的分條揭露機制擴充既有導覽，遮罩、內容與轉場由共享 Runtime 實作，沿用使用者的導覽文字和網站色彩。
批次 7 依 #176 的漂流與接近融合機制擴充既有黏性圓球。沿用自有 SVG 濾鏡和主題色，新增漂移軌跡與游標靠攏行為。
批次 8 依 #210 擴充既有分鏡面板。固定影像與滑動文案由自有 React 與 CSS 實作，沿用作者上傳的圖文和替代文字。
批次 9 依 #208 的分類退場與補位擴充既有作品瀏覽。分類文字和圖像屬於作者；縮小退場與補位使用原創 Web Animations。
批次 10 依 #207 擴充底線分頁。使用作者子卡片的標題、圖文及網站主題色，底線移動和方向轉場由自有 CSS 與 Web Animations 實作。
批次 11 依 #209 擴充既有 Bento 格局，格子使用作者原有內容，實際補位使用 CSS Grid 與原創過渡。
