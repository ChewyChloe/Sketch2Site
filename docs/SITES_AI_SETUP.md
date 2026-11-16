> 最新狀態（2026-11-17）：Sites OPENAI_API_KEY已標記為Secret，既有第2版已成功重新部署並套用環境revision3。AI仍停用。以[SITES_SECRET_DEPLOYMENT_20261117.md](SITES_SECRET_DEPLOYMENT_20261117.md)為最新結果；以下保留先前紀錄。

> 最新配置核對：Cloud HTTP Secret已ready並通過免費認證；Sites Runtime Secret獨立且尚未設定，AI保持停用。參見[CLOUD_HTTP_SECRET_VS_SITES.md](CLOUD_HTTP_SECRET_VS_SITES.md)。

# 私人 Sites AI 串接與單次測試準備

來源仍為 GitHub work f02329e；只修改獨立 Sites 副本，不回寫 GitHub。私人固定網址不變。

- Worker重用既有Provider、驗證、候選確認／CAS；UI、畫布、動畫素材、IndexedDB及React ZIP匯出不重做。
- D1永久單次slot：並行／重整／重新部署最多一筆；失敗不退額度。資料庫遷移由db:generate產生，禁止刪slot來重試。
- Runtime現為SKETCH_AI_ENABLED=false、SKETCH_AI_TEST_APPROVED=false。瀏覽器可以查詢status，但不會向付費Provider發請求。
- OpenAI Developers已安裝，picker選擇與本機目的地授權已收到；技能現已可讀取，但官方helper仍缺失。使用者已在Platform建立Key，目前Sites Runtime Secret清單與指定.env均未收到該Key；正在確認安全儲存位置，不另建Key。本輪核對與官方流程恢復方式見SITES_RUNTIME_SECRET_AUDIT.md。
- 官方模型頁在本環境CONNECT403，現有候選gpt-6-luna與紀錄中的三種價格都不能視為本次已核實。不得自動設review flags或改用另一模型。

## 具體待核准提案

固定portfolio草稿6元素，SHA256 a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283；input保守預留14288，output最多4096；maxCalls=1、timeout30s、retry0、總預留預算最多US$0.01。依舊紀錄input0.1／cached0.01／output0.5 USD per million暫估US$0.0034768；這不是已核實官價或實際帳單。
正式操作前需：安全Key配置、站內owner ID、核實模型／結構化輸出／費率、使用者確認Project帳務與支出限制，再取得上述明確成本提案的同意。啟用窗口不超過一小時，只允許此草稿；不得自動改草稿或重試。提案JSON：SITES_AI_TEST_PROPOSAL.json；離線重建：npx tsx scripts/sites-test-preflight.ts。

## 驗證

PASS：Typecheck、258單元／整合（10項新Worker安全測試使用真SQLite與Mock）、Worker建置、HTML與所有JS資產由built Worker回應、未配置status停用、前端秘密與20種內部指引掃描、npm audit 0漏洞。Drizzle dev工具的舊esbuild以明確override修補並驗證schema generation不變。
PASS：18項相關Chromium回歸（1.2分鐘），涵蓋Mock生成、候選／保存失敗保留、圖片、Patch與實際下載／獨立安裝建置React匯出。既有123項完整前端回歸見上一版本。本輪真實AI呼叫0；線上生成與模型品質NOT TESTED。
