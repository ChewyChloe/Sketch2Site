## 403免費診斷修復（2026-11-17）
- DONE：owner／origin／CSRF／draft hash分支回傳固定安全代碼；不記錄token、Key、完整草稿。
- DONE：CanvasSchema v1正規化後雜湊；核准fixture SHA256仍a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283。新增owner-only免費核對選單／端點，無Provider或額度寫入。
- PASS：280項完整測試＋2項新增frontend測試、build、secret／motion boundary。歷史403根因仍無法從舊紀錄區分；目前瀏覽器草稿待本人免費核對，UI自動化NOT TESTED。
- AI旗標false、billing gate false、expiry移除；保留D1永久額度與原模型／預算／零重試。無付費呼叫、無GitHub修改。


操作：重新整理私人站 → 草稿選單 → 載入個人作品集（先儲存原稿），不修改 → 核對付費測試草稿（免費）。通過會顯示「核准草稿與安全驗證通過，未呼叫 AI」。錯誤時停止並回報固定代碼。勿按生成；開關仍false。
CSRF取得後只存函式記憶體，X-Sketch-CSRF不區分大小寫；HMAC綁定owner／origin／UTC日，接受當天及前一天。前後端皆CanvasSchema.parse；不排序nodes／放寬內容。
歷史403只知平台身分、同源及64字元header存在，無法證明其值有效，也無完整草稿，不能猜測根因。
