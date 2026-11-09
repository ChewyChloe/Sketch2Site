# 任務
- P0 DONE：文件、工具鏈、版本 1 Schema、Token、安全設定及測試。驗收：build、型別、測試、秘密檢查後第一個 commit。
- P1 DONE（依賴 P0）：真正拖曳、移動／刪除、標記、歷史、本機保存。驗收：Playwright 操作與截圖檢查，再 commit。
- P2 DONE（依賴 P1）：PageSpec v2、九種受控元件、六種動畫、響應式範例／本機 JSON 預覽、穩定 DOM ID、未修改分支 memo、安全拒絕與錯誤恢復。驗收：33 項單元／整合與 9 項 Chromium E2E、typecheck、build、秘密掃描、依賴稽核與 1440／768／375px 截圖檢查。
- P3 NOT STARTED（依賴 P2）：最小依 ID 本機結構化 Patch 與限定範圍驗證。驗收：只允許指定 ID／屬性、重新驗證整個 PageSpec、不改動範圍外資料，建立相關歷史／差異測試；先不接 AI。
- 後續 NOT STARTED：AI、生成器、矩形選取、匯出與雲端服務，另行界定任務。
