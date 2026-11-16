# 第一次付費生成前最後驗收

2026-11-17（Asia/Taipei）。結論：**BLOCKED**。本輪沒有啟用AI、沒有修改線上環境或部署、沒有執行生成API。只做官方文件查閱、離線量測、Mock／測試與平台唯讀核對。

驗收對象：既有Sites第2版，runtime source commit `1ddbf96caf15083cbe7adba7f002d1c74ac8ff05`，Secret環境revision3，最近私人部署 `appgdep_6afb2c647bd08191bbeba3f2a36cc220`。本機後續提交僅有測試／文件／離線驗收工具，runtime檔與既有版一致。

## 模型、輸入與費用

指定模型：`gpt-6-luna`；目前runtime未設SKETCH_AI_MODEL，因此採此伺服器預設，沒有自動模型fallback。但設定仍允許gpt-6.1-sol，尚不能稱為Luna-only硬鎖。需要明確設定／鎖定本次模型。官方確認Responses、Structured Outputs與reasoning low支援；未呼叫模型驗證實際Project權限。

核對[官方模型頁](https://developers.openai.com/api/docs/models/gpt-6-luna)、[官方價格表](https://developers.openai.com/api/docs/pricing)：Standard每百萬tokens為input US$0.10、cached read US$0.01、30m cache write US$0.125、12h write US$0.25、output US$0.50。cache write是該部分input的總費率，不應再加普通input費。

固定portfolio草稿6元素、0個動畫標記，SHA256 `a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283`。離線重測：

| 內容 | UTF-8 bytes | Unicode字元數 |
| --- | ---: | ---: |
| 原Canvas JSON（不是實際模型user payload） | 1309 | 1219 |
| 實際developer內容 | 902 | 902 |
| 實際user意圖JSON | 3697 | 3607 |
| strict Layout JSON Schema | 1498 | 1498 |
| developer＋user＋Schema | 6097 | 6007 |

上述不是HTTP envelope或隱藏協定token的完整大小。程式目前使用byte-based heuristic＋8192 margin，得到input reservation **14288**；它不是模型tokenizer精確計數，也不是送出前由API強制的input token上限。未呼叫POST /responses/input_tokens，因本輪未取得該endpoint免費計費性的明確證據；沒有用實際生成來計數。

Output固定 **4096 tokens**，reasoning effort=low。[官方reasoning指引](https://developers.openai.com/api/docs/guides/reasoning)說明reasoning與不可見格式token亦占output限制，不另把reasoning重複加價。

以14288保守預留量作估算：

- 無cache writes：`(14288 × 0.10 + 4096 × 0.50) / 1e6 = US$0.0034768`。
- Standard、預設30m cache寫入、把全部input按較高write費率估算：`(14288 × 0.125 + 4096 × 0.50) / 1e6 = US$0.003834`。
- 若日後改成12h writes，估算為US$0.005620；目前請求未要求12h，此值只作替代設定敏感度，不當成當前配置。

[官方快取文件](https://developers.openai.com/api/docs/guides/prompt-caching)說明新模型的implicit／explicit與預設30m write費用；[Responses參考](https://developers.openai.com/api/reference/resources/responses/methods/create)說明未設service_tier時為auto，繼承Project設定。**現有請求未明確設service_tier=default，也未控制cache mode；後端預留與usage cost公式未處理cache_write_tokens。因此目前不能認證US$0.003834為無條件最高帳單，也不能宣稱所有費用均已納入US$0.01強制預算。**

目前沒有tools、Web Search、File Search、Code Interpreter、MCP、圖像生成、音訊、影片或其他額外付費工具；來源圖片只還原既有asset reference，不向模型送raster/image input。該請求的工具費為0。Failed／refused／incomplete／timeout前已使用的tokens仍可能計費，不自動補打一輪。稅金、匯率與Sites／D1託管方案費用未納入模型估算；Project帳務條件尚未確認。

## 九項驗收

| 要求 | 結果 | 證據／限制 |
| --- | --- | --- |
| 1 Luna固定 | PARTIAL | 有效預設為gpt-6-luna，無fallback；明確runtime pin缺少，設定白名單仍有Sol。 |
| 2 最新Standard費率 | 官方文件核實PASS；後端未完成 | 最新費率如上，runtime尚未填入三費率與review gates；cache-write計費欄位缺失。 |
| 3 長度／output／工具／所有費用 | PARTIAL | 實際6097 bytes、input預留14288但未精確tokenize、output4096；無工具；tier／cache費缺口阻止嚴格最高價驗收。 |
| 4 單次、零重試、US$0.01 | 單次與retry PASS；完整費用上限PARTIAL | SDK maxRetries=0、30秒。Worker只允許maxCalls=1、budget<=.01，送Provider前以ceil(inputBound×inputRate+4096×outputRate)微美元預留並拒絕超額；此估算漏掉cache write及非Standard tier。 |
| 5 跨部署／Worker持久 | 設計與本機真SQLite PASS；真實分散式壓測NOT TESTED | D1固定主鍵slot、INSERT ON CONFLICT DO NOTHING，不能用重新部署清空；新增磁碟DB關閉重開、不同連線與不同handler測試；線上DB表存在且0筆。不是記憶體計數器。 |
| 6 僅owner、雙擊與重複 | 私人權限與Mock PASS；正式owner綁定BLOCKED | Sites僅owner、無群組／外部訪客。Worker要求站內SKETCH_AI_OWNER_ID，但runtime尚未配置，會拒絕生成；不可用account_user_id冒充站內ID。前端abortRef阻止快速連點；後端D1固定slot讓相同或不同requestId、多Worker最多一筆取得額度。 |
| 7 Schema／安全／Renderer | Mock／靜態與瀏覽器PASS | strict Layout schema→materialize→PageSchema→verifyPreservation；前端GenerationResponseSchema／來源保留再驗證→原PageRenderer／PageRuntime。非法URL、HTML／未知元素、漏掉來源等拒絕；候選確認前不覆蓋有效頁面。真實輸出品質NOT TESTED。 |
| 8 不重試／不無限迴圈 | PASS | 新增429／500／503 fake transport確認各只有一次；失敗及timeout不退D1 slot。App生成無自動retry loop；保存候選失敗時的IndexedDB重試不是重新生成。 |
| 9 Key隔離 | 架構、artifact與Mock PASS；真實字節／正式回應NOT TESTED | Secret由部署後runtime注入，原生metadata為secret且遮罩。Key不入Prompt／body／PageSpec；SDK logLevel=off，Worker固定錯誤、不輸出upstream details。成功／錯誤body、headers與console canary檢查PASS；browser／Worker／原保存封包無可辨識sk-proj型Key或.map，封包無.env。未讀取真實Key，不宣稱對其做了明文字節比對或正式Network回應完整稽核。 |

## 測試與線上停用證據

- PASS：Typecheck；6份相關測試92/92，含兩個新的持久／獨立連線測試、3個SDK失敗不重試測試。
- PASS：10項Chromium Mock生成、候選／Renderer、保存與失敗回復流程（27.2秒）。所有測試移除兩個API Key變數，使用Fake Fetch／Mock Provider，正式Provider請求0。
- PASS：check:secrets、check:motion-boundary、擴充的sk-proj型Key與Source Map／archive檢查、git diff --check。
- 平台唯讀核對：Secret機密遮罩、env revision3、ENABLED=false、TEST_APPROVED=false、MAX_CALLS=1、BUDGET_USD=.01；D1 slot表0筆；owner allowlist僅1人、groups0、external visitors0。

## 阻擋項與停止點

1. 固定Luna與Standard tier，明確處理／停用cache writes，補齊對應reserve／usage cost與測試；當前程式不符合完整費用強制控制驗收。
2. 填入經核對的runtime模型／費率、站內owner ID與固定草稿SHA256；核准時才建立短效測試窗口。現在兩個啟用開關必須維持false。
3. 精確token count／可證明的input上限及Project帳務／支出控制仍待確認。實際Sites Key的模型權限、Provider回應及真實生成品質仍未測。

依本輪只驗收且結束後停止的要求，沒有修改production runtime程式、沒有調整線上旗標、沒有部署或呼叫付費API。不可把前一輪「Secret設定READY」當成此次「付費生成全部條件READY」。上述項目完成後才可重新提出具體一次付費測試核准。
