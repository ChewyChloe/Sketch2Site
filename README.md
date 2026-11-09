# Sketch2Site
視覺化網站草稿工作台。此版本包含 Phase 0、最小 Phase 1 、Phase 2 受控頁面預覽、Phase 3 局部 Patch 與 Phase 4 本機保存；已提供可選的本機 OpenAI 生成 Adapter；未配置時不呼叫 AI，尚無匯出。

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
固定範例不是草稿生成結果，不會回寫 CanvasSpec；已套用的修改自動儲存到本機，重新整理／正常關閉再開啟可恢復最後成功提交的版本；Undo/Redo 不跨重新開啟保留。圖片僅支援內建示意資產，連結／效果／樣式皆受白名單限制。


## 頁面保存
「已儲存」狀態出現後才代表 IndexedDB 交易完成；保存失敗仍保留本頁修改，可重試。兩個分頁從同一版本修改時會拒絕過期寫入，請重新載入，不會自動合併。
損毀資料會停用預覽並保留原紀錄；確認「以範例重新開始」後才原子備份原始值並替換。備份在 sketch2site/pageBackups，可用瀏覽器開發者工具診斷，不能當可信頁面直接執行。
IndexedDB 可由本機使用者檢視／修改，未宣稱加密。清除網站資料會刪除草稿、頁面及備份；不提供雲端備份。


## 生成服務（Phase 5）
兩個終端分別執行：
```sh
npm run dev
npm run dev:api
```
預設僅 loopback，前端 5173 代理到後端 8787。金鑰／核對費率／啟用旗標未設定時會顯示「AI 尚未設定」，不產生付費請求；原草稿與預覽照常使用。
從 .env.example 建立不提交的 .env，只在後端安全填入金鑰；先核對官方當日模型與價格，再設定費率及 SKETCH_AI_PRICING_REVIEWED／SKETCH_AI_ENABLED。模型僅後端設定。官方價格文件目前在此環境 CONNECT 403；沒有寫入未核實的當日價格。不要將金鑰貼到聊天或 VITE_*。
按鈕先設定合法連結，圖片目前只用內建示意素材。生成結果為候選，按「使用此版本」後才保存；返回草稿不會覆蓋已有頁面。輸入上限、用量及安全限制見 ARCHITECTURE.md／SECURITY.md。
npm run test:e2e 會另外啟動 8788 的隔離 Mock API；不需真實金鑰、不會呼叫真實模型，畫面明示非 AI。真實 API 驗收必須另有明確付費測試授權，不包含在一般測試指令。
