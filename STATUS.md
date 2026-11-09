# 狀態
2026-11-09（Asia/Taipei）
## 功能
- Phase 0 DONE：8 份規範文件、README、React/TS/Vite、版本 1 CanvasSpec/PageSpec、設計 Token、測試與環境範例。
- Phase 1 DONE（本輪最小範圍）：文字／按鈕／卡片拖入、選取、移動、刪除、複製、內容／尺寸／座標編輯、動畫標記附加／移除、空白處選對象、Undo/Redo（80 次）、IndexedDB 儲存與恢復、縮放、鍵盤快捷鍵、搜尋、側欄收合與調寬。
- 後續 MVP NOT STARTED：真正 AI 生成、PageSpec Renderer、矩形區域選取、局部 Patch、版本比較與匯出；沒有假按鈕。
## 測試證據
- PASS：npm ci --cache /workspace/.npm-cache --no-fund --no-audit，可從鎖檔重裝。
- PASS：npm run typecheck。
- PASS：npm test，2 檔案、7/7（6 Schema／歷史測試、1 React 操作測試）。
- PASS：npm run test:e2e，Chromium 3/3。真正滑鼠拖入文字、移動、座標、動畫附加、Undo/Redo、刪除、重新整理恢復穩定 ID、惡意 HTML 顯示為文字、空白效果選對象、40% 縮放、960px 窗口、損毀草稿拒絕與停用儲存。
- PASS：VITE_TEST_SECRET=SKETCH2SITE_TEST_SECRET_83f21c npm run build；npm run check:secrets，測試 canary 不在產物，無 source maps 或可辨識 API key。
- PASS：npm audit --cache /workspace/.npm-cache，所有依賴 0 vulnerabilities（當次結果，不是永久保證）。
- PASS：git diff --check。
- PASS：實際檢視 1440×1000 空白／內容／屬性截圖、960×768 工作台截圖。修正空白提示過小、置中與搜尋寬度；面板內捲動，工作區無整頁水平溢出。自由草稿允許使用者元素互相重疊。
- NOT TESTED：行動完整編輯器（不在範圍）、其他瀏覽器、儲存額度耗盡、多分頁衝突、正式部署標頭、未實作的 AI/API 防護。
- 最終 FAIL：0。曾發現 Testing Library 的 exact 選項型別不適用、KeyboardEvent target 非 Element 時 closest 失敗、開發 CSP 阻擋 Vite React preamble；已修正後重跑通過。
- build 有 Zod 套件 PURE 註解位置警告；Rollup 移除註解，build 成功。
## Git 與環境
分支 work。Phase 0 commit：61febf7。Phase 1 commit 為本文件所屬提交，使用 git log -1 查詢，避免自引用 SHA。
未 push、merge 或部署。只修改 Sketch2Site。截圖在 test-results/（忽略檔）。
雲端設定 install_script / start_skill 已儲存草稿，包含安裝、啟動與驗證。未發布，未驗證新任務還原；遠端仍是空儲存庫，本機提交不可視為已遠端備份，平台對 local-only commit 還原仍有限制。
## 限制與恢復
單一本機草稿、手動保存；未儲存離開會提醒。IndexedDB 載入錯誤時不覆寫既有資料。清除網站資料會刪除草稿；儲存不包含 Undo/Redo 歷史。拖曳只有桌面瀏覽器支援範圍，沒有手機參考框。
目前不需要任何秘密、後端或付費服務。開發 CSP nonce 僅供 Vite 使用，正式部署必須自行配置安全標頭，詳見 SECURITY.md。
恢復：閱讀 AGENTS.md，檢查 git status，npm ci --cache /workspace/.npm-cache，npm run dev。端對端測試前停止自己啟動的 5173 服務；npm run test:e2e 自行啟停 Vite。
## 下一個任務
P2：建立經 PageSpec 驗證的受控 React Renderer 及不合法輸出安全失敗測試；先不接 AI。
