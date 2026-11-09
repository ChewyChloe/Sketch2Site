# 工作規範
每次開始先讀 PRODUCT.md、ARCHITECTURE.md、TASKS.md、STATUS.md 與相關設計／安全文件，檢查 git status，界定驗收條件，只修改必要範圍。
完成後執行對應測試、必要 build、UI 操作與資安檢查，更新 TASKS.md、STATUS.md。測試通過才建立本地 commit；回報 SHA、測試與剩餘問題。
不得擅改架構、擴張 MVP、跳過驗證、刪除失敗測試、建立假功能或重複元件、提交秘密、push、merge 或正式部署。不得修改其他專案，尤其 CareLink。
功能使用 DONE / PARTIAL / BLOCKED / NOT STARTED；測試使用 PASS / FAIL / NOT TESTED。中斷時記錄恢復方式。禁止以額度不足為由宣稱未完成工作成功。
每輪處理一個明確工作項目；先跑相關測試，階段完成再跑完整驗證。文案短、自然、具體；細節見 DESIGN_SYSTEM.md、SECURITY.md。
