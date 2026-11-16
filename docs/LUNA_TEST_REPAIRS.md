# 單次Luna測試阻擋項修復

2026-11-17（Asia/Taipei）。只準備、不生成。原Site／畫布／Renderer／IndexedDB／局部修改／React匯出保留，GitHub不修改。

## 已修復的後端合約

- model固定gpt-6-luna；其他model的Provider建構直接拒絕，config白名單只剩Luna；POST嚴格Schema拒絕model／tier／tools／ownerId／tokens等額外欄位。
- 唯一完整請求由buildLunaRequest建立，service_tier=default、max_output_tokens=4096、reasoning=low、tools=[]、tool_choice=none、parallel_tool_calls=false、cache mode=implicit／ttl=30m。沒有重試、fallback模型或工具呼叫。
- 完整HTTP JSON含指令、Schema、所有草稿意圖資料及設定，最多16384 UTF-8 bytes；生成前用官方免費input-token counter計數同一model/input/text schema/reasoning/tools。缺少counter、錯誤／逾時、非整數／未知計數、超過8192 tokens一律拒絕，不使用舊byte heuristic。
- 價格固定Standard input .10、cached read .01、cache-write30m .125、output .50 USD per million。送Provider前把所有input按最壞30m write費率預留，不假設cache hit；cache read／write／普通input不重複計價，缺少write usage則保守按write計。禁止12h writes與非Standard回應。
- 原D1永久單次slot與固定主鍵不變；精確計數、實際Sites Key的免費preflight證明、費用及所有開關確認後才原子保留。失敗／timeout／重啟／重新部署都不退款或重開slot。

## 正式owner與免費檢查

Sites原生get_site確認唯一owner，該policy的email透過原生runtime設定（Secret）供後端首次核對。只有Sites dispatch正式注入的已登入subject/email可登記D1 sketch_ai_owner，競爭以固定主鍵原子決定；登記後用永久Site subject而非email作授權。瀏覽器body或query自報owner ID不採信，account_user_id也不冒充Site subject。依賴Sites dispatch重寫identity headers，Worker不得另掛未經dispatch的公開入口。

正式owner開啟私人網站時，後端background只做GET /models/gpt-6-luna及免費POST /responses/input_tokens，把不含秘密的結果寫入sketch_ai_preflight。每個完整請求hash只檢查一次，沒有自動retry；此流程不調用generate、不消耗付費slot，也不改兩個開關。若尚未正式登入，就保留未綁定並拒絕生成。

即使未來獲准生成，Worker仍會再次免費精確計數，並核對完整請求hash／tokens／reserved cost與D1 preflight證明一致；無法確定完整上限時拒絕。

## 費用證據與手動確認

官方[說明](https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens)確認input-token counting API免費、不消耗正常inference quota。模型／Standard及cache-write費率依[模型頁](https://developers.openai.com/api/docs/models/gpt-6-luna)與[快取指引](https://developers.openai.com/api/docs/guides/prompt-caching)核對；max_output_tokens包含reasoning及不可見輸出，不能再另加一份reasoning費。

用Cloud HTTP Secret對同一固定請求做免費檢查：model visible=true、完整request6913 bytes、精確input1791 tokens。最壞cache miss／write加4096 output：ceil(1791×.125+4096×.50)=2272微美元，**US$0.002272**。所有可接受請求的硬上限為ceil(8192×.125+4096×.50)=3072微美元，**US$0.003072**，均小於US$0.01。無額外付費工具。稅金／外匯與其他平台方案成本不在這個模型token預留內。

Cloud免費檢查不能冒充Sites另一把Key的檢查；Sites正式Key另由上述正式owner頁面載入完成免費驗證並保留D1結果。模型可見性與counter成功不代替Responses生成寫入權限、帳務可用性或Project支出設定；這些若無法直接讀取，必須由使用者在Platform確認，不能用付費生成偷測。

Runtime保持SKETCH_AI_ENABLED=false、SKETCH_AI_TEST_APPROVED=false，並新增SKETCH_AI_BILLING_CONFIRMED=false。固定模型、官方費率、核准草稿hash與可信owner bootstrap已預先設定；明確付費批准後才可考慮啟用不超過一小時的窗口。

## 驗證與部署

Typecheck及278項單元／整合PASS；其中新測試涵蓋硬鎖完整請求、免費計數與生成輸入一致、16KB／8192拒絕、owner正式身分綁定、免費檢查不產生生成、成本分類、原有D1跨連線／冷啟動／重放及429／500／503零重試。11項Chromium Mock生成／匯出回歸PASS（55.5秒）。Build／前端秘密與內部指引掃描PASS；test／build只用合成canary或移除Key，不把runtime Secret寫入檔案。

增量schema migration只新增owner／preflight表，沒有改動或清除永久付費slot。私人部署及線上preflight結果以本次原生Sites工具回傳／D1唯讀核對為準；不假稱未登入的owner已完成綁定。付費生成0次。

## 實際線上結果
既有Site私人第3版已部署成功（source 0105560、env revision4）。原生D1唯讀核對確認正式owner subject已綁定；完整請求hash 9fbf4c198117fb265721d61355987233a6406cfe5cb79a020a95c55534741ccb 的實際Sites Key免費preflight為READY，input1791、reserved2272微美元。paid slot仍0筆，證明免費檢查沒有消耗生成。Secret遮罩、owner-private與三個false閘門保持，沒有GitHub修改。原生開啟頁面工具回報無handler，但後續D1已由正式登入的頁面載入完成，故不再要求使用者重做登入綁定。剩餘手動項目只有Platform帳務／支出控制／Responses權限及日後具體付費批准；見LUNA_DEPLOYMENT_RESULT.json。
