# 任務
- P0 DONE：文件、工具鏈、版本 1 Schema、Token、安全設定及測試。驗收：build、型別、測試、秘密檢查後第一個 commit。
- P1 DONE（依賴 P0）：真正拖曳、移動／刪除、標記、歷史、本機保存。驗收：Playwright 操作與截圖檢查，再 commit。
- P2 DONE（依賴 P1）：PageSpec v2、九種受控元件、六種動畫、響應式範例／本機 JSON 預覽、穩定 DOM ID、未修改分支 memo、安全拒絕與錯誤恢復。驗收：33 項單元／整合與 9 項 Chromium E2E、typecheck、build、秘密掃描、依賴稽核與 1440／768／375px 截圖檢查。
- P3 DONE（依賴 P2）：六種 ID Patch、可信 scope、原子批次、完整 Schema／Diff 驗證、不可變更新、Session／revision、頁面 Undo/Redo、最小標題／淡入編輯 UI。驗收：65 項單元／整合、12 項 E2E（含舊回歸）、typecheck、build、秘密掃描、audit 與 1440／768／375px 操作／截圖。
- P4 NOT STARTED（依賴 P3）：PageSpec 與必要版本資訊的本機保存／重新載入；驗收：版本化資料驗證、損毀資料安全失敗、重新載入後新 Session 拒絕舊 Patch，不影響 CanvasSpec。
- 後續 NOT STARTED：AI、生成器、矩形選取、匯出與雲端服務，另行界定任務。
