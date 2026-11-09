# Sketch2Site
視覺化網站草稿工作台。此版本包含 Phase 0、最小 Phase 1 與 Phase 2 受控頁面預覽；沒有 AI 呼叫或匯出。

## 開始
需要 Node.js 24 LTS、npm 11 及 Chromium（端對端測試）。
```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```
啟動後直接拖入元件或點擊新增；選取後切換「編輯元素」。儲存草稿寫入此瀏覽器 IndexedDB，重新整理可恢復最後儲存版本，未儲存修改不會自動寫入。清除瀏覽器資料會刪除草稿。

## 驗證
```sh
npm run typecheck
npm test
npm run test:e2e
VITE_TEST_SECRET=SKETCH2SITE_TEST_SECRET_83f21c npm run build
npm run check:secrets
npm audit --cache /workspace/.npm-cache
```
Playwright 使用 /usr/bin/chromium；其他路徑設定 CHROMIUM_PATH。截圖位於 test-results/，不提交 Git。測試有自己的 Vite 服務，先停止占用 5173 的開發服務再跑測試。

相關設計／工程規範見 AGENTS.md；驗證結果與限制見 STATUS.md。正式部署安全標頭另見 SECURITY.md，本輪沒有部署。


## 頁面預覽
按「預覽」開啟固定範例，可切換桌面／手機尺寸、重播動畫，或透過「載入頁面」讀取本機 PageSpec v2 JSON（200 KB 上限）。範例定義在 src/pageFixtures.ts，完整合約見 src/pageSpec.ts 與 ARCHITECTURE.md。
預覽不是草稿生成結果，不會回寫 CanvasSpec；載入的 PageSpec 只留在記憶體，重新整理回到範例。圖片僅支援內建示意資產，連結／效果／樣式皆受白名單限制。
