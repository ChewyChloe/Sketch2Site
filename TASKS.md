# 任務
- P0 DONE：文件、工具鏈、版本 1 Schema、Token、安全設定及測試。驗收：build、型別、測試、秘密檢查後第一個 commit。
- P1 DONE（依賴 P0）：真正拖曳、移動／刪除、標記、歷史、本機保存。驗收：Playwright 操作與截圖檢查，再 commit。
- P2 DONE（依賴 P1）：PageSpec v2、九種受控元件、六種動畫、響應式範例／本機 JSON 預覽、穩定 DOM ID、未修改分支 memo、安全拒絕與錯誤恢復。驗收：33 項單元／整合與 9 項 Chromium E2E、typecheck、build、秘密掃描、依賴稽核與 1440／768／375px 截圖檢查。
- P3 DONE（依賴 P2）：六種 ID Patch、可信 scope、原子批次、完整 Schema／Diff 驗證、不可變更新、Session／revision、頁面 Undo/Redo、最小標題／淡入編輯 UI。驗收：65 項單元／整合、12 項 E2E（含舊回歸）、typecheck、build、秘密掃描、audit 與 1440／768／375px 操作／截圖。
- P4 DONE（依賴 P3）：PageSpec 自動保存、交易 CAS、序列化／合併、重新開啟繼承 revision／新 Session、失敗重試、損毀保留及確認備份重開。驗收：88 項單元／整合、19 項 Chromium E2E（含程序重新啟動、雙分頁、失敗注入與舊回歸）、build／安全檢查。
- P5 PARTIAL：生成引擎、官方 Provider Adapter、後端限制、候選確認／CAS、五種 Mock 草稿端到端 DONE；112 項單元／整合與 29 項 E2E 通過。真實模型可用性、當日價格及五草稿 AI 品質 NOT TESTED，等待安全設定與明確付費測試授權，不把 Mock 當真實品質完成。
- P5.1 BLOCKED（免費準備 DONE）：Luna 候選／model review gate、預設一次與明確預算、cached／reasoning 用量、五份固定指紋與正式驗收報告；115 項單元／整合、29 項 E2E、Build／秘密掃描／audit PASS。真實呼叫 0；官方文件網路、Key、付費授權與 Project 限制確認待處理。
- 下一個最小任務：先解除官方文件存取，核實 Luna 的 ID／Responses／strict Schema／reasoning 與價格；安全配置 Key、確認 Project 支出限制並提出一次 portfolio 的具體成本供明確授權，再呼叫。
- 後續 NOT STARTED：AI 局部修改、矩形選取、匯出與雲端服務；不在本輪擴張。


## Phase 5.2（2026-11-10）
BLOCKED：本執行環境 OPENAI_API_KEY 未配置（只檢查存在性），未查詢模型權限。付費授權及 Project 帳務／支出限制確認仍缺少；真實生成 0 次，真實截圖、用量、延遲及視覺前三問題均 NOT TESTED。
採用使用者 2026-11-09 核對的官方規格：gpt-6-luna、Responses／Structured Outputs、reasoning.effort=low；費率 input $0.10、cached input $0.01、output $0.50／百萬 tokens，來源為使用者提供的官方 models／pricing／structured-outputs 文件，非本環境重新查核。SDK 型別及 fake transport 驗證 low，零重試與無工具保持不變。
首份 portfolio 指紋沿用 manifest，輸入預留 14286、輸出上限4096（含推理），單次保守預留 $0.0034766，可提案最多1次、預算 $0.01、併發1；尚未獲授權，不啟用生成。真實呼叫費用0，Project 帳單未知。下一步：在 Cloud 環境秘密新增 OPENAI_API_KEY 後套用／重啟環境，僅檢查存在性，再執行無生成的模型權限查詢；確認帳務限制並另行取得一次付費授權。不要把 Key 貼入聊天。
