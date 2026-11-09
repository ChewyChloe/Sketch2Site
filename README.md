# Sketch2Site
視覺化網站草稿工作台。此版本完成 Phase 0 與最小 Phase 1；沒有 AI 呼叫、成品預覽或匯出。

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
