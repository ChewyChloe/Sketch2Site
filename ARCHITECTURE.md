# 架構
React 19 + TypeScript + Vite；Zod 4；IndexedDB；Vitest、Testing Library、Playwright。Node 24 LTS、npm lockfile，安裝使用 npm ci。原生 Pointer Events／HTML Drag and Drop，CSS Tokens 取代 Tailwind。Phase 2 以 Web Animations API + IntersectionObserver 與受控 CSS 實作動畫，不新增 Motion 或重複套件。

## 草稿與成品合約
src/spec.ts 保留 CanvasSpec v1、歷史與 LegacyPageSchema（原 PageSpec v1）。CanvasSpec 的儲存、ID、座標格式不變；src/storage.ts 僅處理 IndexedDB，Undo/Redo 上限 80 次，移動在放開時提交一次。

src/pageSpec.ts 提供新 PageSpec v2：metadata、sections 元件樹、typography、styles、responsive。節點有 UUID、type、受控 style、effects 與各類型特有欄位。
- Section、Container、Card、Stack：children。
- Grid：children、columns（1–3），受全頁 desktopColumns 上限限制；800px 以下預覽容器為單欄。
- Heading：content、level（1–3）；Paragraph：content。
- Button：content、href（本頁 UUID anchor 或指定 HTTPS 網域），渲染語意連結。
- Image：src（內建資產白名單）、必填 alt。
- style：gap / padding（none、small、medium、large）、align、tone、width，均為枚舉 Token，禁止 CSS 字串。
- effects：effectId、duration 120–1200ms、delay 0–1000ms、distance 0–32px、stagger 30–150ms；缺省採受控預設。distance 用於 Slide Up／Hover Lift，stagger 用於 Stagger Reveal；不適用欄位不產生額外行為。

v1 尚未曾儲存或生成成品，不默默推測樹型遷移；Renderer 明確拒絕 v1。原 v1 驗證測試保留，未來若有外部 v1 檔案，需另建顯式遷移。此版本決策見 DECISIONS.md。

## 渲染資料流
本機 JSON（200 KB 上限）或明確標示的 demoPage Fixture → PageSchema 前置容量／循環檢查 → strict Zod 遞迴驗證 → 全樹 ID／anchor 驗證 → reconcilePage → PageRenderer → componentRegistry → React DOM。
最多 200 節點、深度 10、30 個頂層 Section。未知類型、屬性、效果、錯誤網址、缺少資產一律拒絕整頁；錯誤訊息使用固定文案，不回傳解析例外細節。渲染例外由 Error Boundary 捕捉，新輸入可恢復。

src/PageRenderer.tsx 內 componentRegistry 僅映射受控語意標籤與 CSS 類別；沒有動態套件載入或資料指定的 React 元件。animationRegistry 定義六個 Preset，以驗證後數值建立內部 keyframes。進場效果合併 opacity／transform 避免互相覆寫；滑入、縮放、淡入進入視區時播放，hover 效果以 CSS 實作，Stagger Reveal 對直接子節點依序播放。reduced-motion 停用／取消動畫；不支援動畫 API 時仍顯示內容。

所有節點保留 data-page-id、data-page-type、DOM id=page-UUID；componentIdFromElement 將任意內部 DOM 對應最近的節點。reconcilePage 使用穩定 ID 與內容比較，共用未修改分支；遞迴 RenderNode 使用 React.memo，修改路徑的祖先會更新，未變動子元件跳過渲染（有 registry 存取計數測試）。尚無 Patch 引擎或矩形框選。

## 工作台整合
App 保持 CanvasSpec、選取與歷史；Preview 持有獨立的 PageSpec unknown 輸入與尺寸，不回寫草稿。切換保留預覽輸入，重新整理則回到固定範例；PageSpec 本輪不持久化。預覽隱藏草稿編輯工具與側欄，並停用草稿鍵盤操作。
src/Preview.tsx 提供桌面／375px 手機框（窄視窗自動縮至可用寬度）、載入本機 JSON、還原範例與重播。頁面以 container queries 而非 host viewport 決定布局；內容採 Flex/Grid，沒有以 Canvas 座標排列成品。
src/pageFixtures.ts 是涵蓋九種元件與六種效果的固定測試範例，不是生成器。public/assets/workspace.svg 為內建示意資產。
無 AI、後端、雲端儲存、憑證、匯出或正式部署。

## 開發
npm ci --cache /workspace/.npm-cache；npm run dev；npm run typecheck；npm test；npm run test:e2e；npm run build；npm run check:secrets。
Playwright 使用 /usr/bin/chromium（CHROMIUM_PATH 可覆寫），自啟停 Vite；測試前停止自己占用 5173 的開發服務。截圖在 test-results/。
