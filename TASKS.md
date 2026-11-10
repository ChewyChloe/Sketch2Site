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


## Phase 5.2（2026-11-10，Asia/Taipei；Recovery 後更新）

**READY：免費準備完成；正式生成等待帳務／支出限制確認與另行明確付費授權。**
- Recovery bundle 完整性驗證通過，恢復至 f5d73504e1489bd43f2f53f662f7de0193d356b7；包含使用者指定的 98af8a8a317e2e516f869d149718725f8627f224。保留 bundle 已有 low 設定，未重做先前變更。
- OPENAI_API_KEY 已由後端秘密環境配置（僅確認存在性，未列印／寫入金鑰）。本對話已執行一次無生成的 GET https://api.openai.com/v1/models，HTTP 200，列表包含 gpt-6-luna；本次恢復不重複查詢。這確認列表可見性，尚不證明 Responses 生成或 Project 帳務狀態。
- 採用使用者於 2026-11-09 核對的官方模型、Responses／Structured Outputs 與費率規格；本環境沒有重新查閱文件。來源：https://developers.openai.com/api/docs/models/gpt-6-luna 、https://developers.openai.com/api/docs/pricing 、https://developers.openai.com/api/docs/guides/structured-outputs 、https://developers.openai.com/api/docs/guides/rate-limits 。
- 安裝 lockfile 中 OpenAI SDK 7.53.0；型別辨識 gpt-6-luna、ResponsesModel、reasoning low。既有 fake transport 測試驗證 Responses、strict JSON Schema、low、store:false、4096 output 上限及無工具；Provider 明確 maxRetries:0、timeout:30000。SDK／Mock 相容性不等於真實回應成功。
- 正式路徑仍為 CanvasSpec → Layout JSON → materialize → 完整 PageSpec v2 Schema／來源內容／動畫驗證 → 前端再次驗證 → CandidatePreview；確認才經既有 CAS 保存。金鑰僅 server/config.ts 從後端環境讀取，未寫入前端或 fixture。
- 五份既有 Fixtures 可用，原位置、內容與動畫未修改。首份 portfolio：6 元素、0 動畫標記（不能宣稱已實測動畫播放），SHA-256 a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283。animated 的六標記保留供 Mock 回歸，不額外生成。
- 一次正式提案：gpt-6-luna、Responses、reasoning low、併發1、重試0、最多1次、無額外工具。依實際 Fixture／Schema／Prompt UTF-8 bytes + 8192 margin，input 預留14286（非實際 tokens）；output上限4096（含 reasoning）。input $0.10、cached input $0.01、output $0.50／1M tokens；不假設 cache 命中，保守預留 (14286×0.10 + 4096×0.50)/1e6 = **US$0.0034766**；提案單輪預算 **US$0.01**。
- 授權後才設定 SKETCH_AI_ENABLED=true、MODEL_REVIEWED／PRICING_REVIEWED=true、三費率、SKETCH_AI_MAX_CALLS=1、SKETCH_AI_BUDGET_USD=0.01；既有後端 limiter／呼叫計數／保守預留／去重／逾時限制皆保留。目前未啟用正式 Provider，未建立含秘密的 .env。
- 本輪實際生成0次，生成費用US$0；input／cached／output／reasoning tokens、生成延遲、真實截圖均 NOT AVAILABLE。未生成，故 UI/UX 前三問題 NOT TESTED，不能拿 Mock 結果代替。
- 未更動產品程式、UI／Renderer／Schema／Fixtures，未購買額度、變更帳務、Push、Merge 或部署。下一個最小任務：使用者確認 Project 帳務與支出限制，並另行授權上述最多一次 portfolio 付費生成；失敗即停，不第二次呼叫。

本次 Recovery 驗證：typecheck PASS；Vitest 10檔115/115 PASS；Chromium Mock／回歸29/29 PASS；build PASS（既有 Zod PURE 註解警告）；check:secrets PASS；generation:preflight 五份指紋 PASS；git diff --check PASS。僅更新這三份文件；本地提交 SHA 以 git log -1 查詢。真實生成及其桌面／手機 UI 品質仍 NOT TESTED。
