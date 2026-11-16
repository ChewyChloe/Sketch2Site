# Sites Secret套用與既有私人版重新部署

2026-11-17（Asia/Taipei）。設定與部署：READY。正式付費生成：仍停用，未取得本輪付費授權。

## 原生平台核對

- 既有Site：appgprj_6afafb77233081918b3029cd9bbbd706。
- OPENAI_API_KEY已存在Sites原生runtime環境設定，is_secret=true，回傳value=null（遮罩）。沒有讀取、複製、輸出或寫入Key明文。
- 環境版次3：SKETCH_AI_ENABLED=false、SKETCH_AI_TEST_APPROVED=false、SKETCH_AI_MAX_CALLS=1、SKETCH_AI_BUDGET_USD=0.01。
- 權限仍owner-private：allowlist1位owner、groups0、external visitors0。

## 已重新部署既有版本

原有第2版，來源commit 1ddbf96caf15083cbe7adba7f002d1c74ac8ff05。
version_id：appgprj_6afafb77233081918b3029cd9bbbd706~appgver_545eb15d4208819185574280ee5a9aa3。
deployment_id：appgdep_6afb2c647bd08191bbeba3f2a36cc220。
原生結果status=succeeded，env_set_revision=3，網址維持：https://sketch2site-work-test-20261116.chewychloe.chatgpt.site。

沒有新增Site／saved version、沒有重建前端、沒有改造AI後端、沒有更改分享權限。不是依賴Cloud HTTP Secret或本機.env；Sites runtime Secret已隨新部署環境版次套用。

## Worker讀取證據與驗證界線

既有fetch(request,env)將runtime env傳給configFromEnv，後者從env.OPENAI_API_KEY取值；不讀取工作區.env。SDK maxRetries=0、timeout=30000、logLevel=off。固定草稿、owner、同源／CSRF、期限、審閱開關與D1永久單次slot均保留。
本輪重跑兩份相關測試28/28 PASS，包含runtime env Key傳至Mock Provider、成功／失敗response body／headers及console不含Mock Key；兩個開關關閉時即使有Key也不建Provider；永久單次slot、並行、預算不足、失敗／逾時不可重開等既有測試。

實際Secret綁定與環境revision由Sites平台原生metadata／部署結果確認；程式讀取與隔離行為由Mock確認。未新增會揭露Key或返回Key的probe，也未執行真實Worker→OpenAI請求，所以不把此結果當成模型權限、Responses生成或帳務驗證。

部署後原生metadata再次確認Secret遮罩、revision3、兩個false開關、max1及0.01；D1 sketch_ai_single_test唯讀核對仍0筆，額度未消耗。

## 下一步

維持AI停用，待站內owner ID、模型／當日費率、OpenAI Project帳務與支出限制確認，再針對固定草稿的一次測試取得明確付費同意。US$0.01為應用程式端保守預留限制，不是供應商硬支出上限。本輪不呼叫付費生成、不重建API Key、不要求.env或金鑰明文。
