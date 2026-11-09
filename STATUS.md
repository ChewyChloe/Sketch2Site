# 狀態
2026-11-09（Asia/Taipei）

## 功能
- Phase 0／1／2／3 DONE，原有 Patch Engine／Renderer 合約未重寫，舊測試保留。
- Phase 4 DONE：PageSpec 本機自動保存、Schema 驗證、交易 CAS、序列化／最新快照合併、失敗保留記憶體內容與重試、衝突重新載入、新 Session 繼承 revision／清空歷史。
- DONE：損毀及不支援版本停止 Renderer／自動保存，原紀錄不被刪除或覆蓋；確認後在單一交易中原樣備份再以明示範例重新開始。
- DONE：保存狀態與 Canvas 草稿分開；未完成交易不顯示已儲存，離開未保存頁面會提示。有效頁面的範例／檔案替換需確認。
- NOT STARTED：AI API／Layout Generation、自然語言修改、雲端同步、會員、匯出、正式部署。本輪到此停止，下一正式階段優先開始 AI 生成主流程，不增加非必要底層功能。

## 測試
- PASS：npm run typecheck。
- PASS：npm test，8 檔、88/88（舊 65 項 + 新儲存／佇列 23 項）。
- PASS：npm run test:e2e，19/19（舊 12 項 + 本機保存 7 項）。
- PASS：有效 PageRecord 保存／載入、不存在紀錄不自動寫 Fixture、DB v1→v2 升級保留 Canvas、損毀／缺欄位／版本／負值或小數 revision／UUID／元件／動畫／URL 拒絕且原值保留。
- PASS：CAS 拒絕舊 revision／writer token，即使晚到快照宣稱較高 revision；同基準並行交易只允許一個成功。單筆進行中／合併最新快照，commit 前無 saved 狀態，舊 Session 關閉後不執行排隊寫入或更新 UI。
- PASS：新 Session 正常 Patch、舊 Session Patch 拒絕、revision 繼承、Undo／Redo 不跨載入；原有 scope、不可變更新、Diff、歷史與草稿隔離回歸仍通過。
- PASS：損毀資料確認前不覆寫，確認後原子備份／替換；備份 QuotaExceededError 時原資料不變。拒絕覆蓋已被其他分頁修復的有效紀錄。
- PASS：Chromium 實際修改標題／動畫、自動保存、刷新恢復、兩分頁過期寫入拒絕及重新載入後繼續編輯；原有 Canvas 保存 ID 與資料維持不變。
- PASS：以真實 IndexedDB 交易鎖延後提交，狀態維持「儲存中」，連續修改最後恢復最新值。QuotaExceededError／權限拒絕以原生 API 受控注入驗證，失敗時內容仍在畫面且重試可保存。
- PASS：真正關閉 Chromium 程序，再以同一隔離 persistent profile 重新啟動，頁面及動畫設定恢復，Undo／Redo 從空歷史開始。另測試同 context 關閉頁籤後重新開啟。
- PASS：VITE_TEST_SECRET=SKETCH2SITE_TEST_SECRET_83f21c npm run build；npm run check:secrets，無 canary、可辨識 API key 或 source maps。
- PASS：npm audit --cache /workspace/.npm-cache，當次所有依賴 0 vulnerabilities。僅新增 fake-indexeddb devDependency，沒有新增執行時套件。
- PASS：git diff --check。
- 最終 FAIL：0。初次新 mock 的函式簽章只宣告一參數，讀取預期 token 的測試型別失敗；已修正並重跑。
- build 仍有已定位的 Zod 4.6.7 PURE 說明註解警告，未抑制、未改第三方套件，建置成功。
- NOT TESTED：Firefox／Safari／實機、完整無障礙稽核、真實耗盡磁碟、瀏覽器儲存驅逐、強制崩潰當下未完成交易、最大頁面效能壓力、正式後端認證／授權／AI 成本保護。

## UI 與截圖
- 保留既有中性色、綠色強調色與預覽／側欄。新增細保存狀態列，固定狀態文字寬度減少跳動，錯誤時自然換行。
- 檢查真實 Chromium 的恢復、儲存失敗、衝突、損毀畫面，以及既有 1440／768／375px 操作；沒有整頁水平溢出，窄視窗保留工作區／面板內捲動。
- 截圖：test-results/page-restored.png、page-save-failure.png、page-conflict.png、page-corrupt.png；既有 patch-375.png 等亦由本輪重建。均為忽略檔，可透過 E2E 重建。
- 本輪儲存測試與截圖使用 reduced motion，避免進場動畫尚未完成造成偏淡畫面；既有 Phase 2 測試仍驗證實際動畫播放，未關閉產品動畫。

## 核心檔案
- src/storage.ts：共用 sketch2site DB v2 開啟與新增 Object Stores，保留 drafts/current。
- src/pageStorage.ts：PageRecordSchema、loadPage、savePage 交易 CAS、確認後 restartDamagedPage 原子備份。
- src/pageSaver.ts：單筆進行中／最新待存快照、提交狀態、錯誤暫停與重試、關閉舊佇列。
- src/usePagePersistence.ts：Preview 的單一 Session 狀態、重新載入／generation fence／保存整合。
- src/Preview.tsx、src/preview.css：最小狀態與復原操作；未修改 Patch Engine。
- src/pageStorage.test.ts、src/pageSaver.test.ts、tests/page-persistence.spec.ts；舊測試僅依 DB 版本、非同步載入與確認行為調整，未刪除驗收。

## Git 與恢復
分支 work。上次 commit 72c35840882ad0b420616e81f04b5a0db6d1f763；本輪 commit 為此文件所屬提交，git log -1 可查。
僅修改 Sketch2Site，未 push、merge、部署或啟用付費服務。提交僅在本機，未宣稱已有遠端備份、環境發布或新任務還原驗證。
恢復：讀 AGENTS.md、檢查 git status；npm ci --cache /workspace/.npm-cache；npm run dev。E2E 自啟停 Vite，需先停止自己占用 5173 的服務。

## 限制與資料語意
目前一份本機專案 projectId=local-project。儲存封套 schemaVersion=1，內部 PageSpec v2。資料皆可由使用者透過開發者工具檢視及修改；未加密，不代表身分認證或伺服器授權。
一般重新載入建立新 sessionId、保留 revision，歷史不跨 Session。損毀資料明確確認重新開始才建立新內容分支 UUID／revision 0，並保留原始備份。
沒有紀錄才顯示未儲存 Fixture；已保存頁面優先恢復，不以 Fixture 自動覆蓋。清除網站資料／瀏覽器清理會刪除頁面、草稿及備份；沒有雲端備援，恢復保證僅及最後成功提交版本。
衝突不自動同步或合併；使用者選擇重新載入時必須確認捨棄未保存修改。備份在 pageBackups，僅供開發者工具診斷／手動復原，本輪不新增管理 UI。
儲存失敗保留記憶體內容；強制關閉仍可能遺失尚未提交的修改。狀態與 CAS 不是跨使用者權限機制。
Diff 的局部保證針對資料，不保證其他元素像素位置不變；圖片／連結白名單與 Renderer 信任邊界維持不變。

## 下一個正式階段
P5 NOT STARTED：CanvasSpec → AI Layout Generation → PageSpec → Renderer。優先做後端生成路徑及必要安全／成本控制，不延伸其他底層功能；本輪不啟動。
