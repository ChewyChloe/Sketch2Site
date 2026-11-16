# Codex Cloud HTTP Secret 與 Sites Runtime Secret

2026-11-16（Asia/Taipei）。沿用既有Sketch2Site Site及Worker。沒有新增Key、沒有要求.env、沒有重新部署、沒有付費生成。

## 結論

Cloud HTTP Secret：READY。Sites Runtime Secret：BLOCKED（尚未設定）。正式生成測試：仍不具備全部條件。

先前使用.env是否存在來判斷Cloud HTTP Secret可用性不正確；先前對繼承環境變數的精確bytes掃描也只能代表executor可見值，不能宣稱已讀取或比對proxy管理的真實Key。此文件取代較早報告中對Cloud Key不可用、需本機env或helper才能驗證Cloud的推論。

## 平台與免費實測證據

- environment_status對應本任務環境；observations_current=true、network_policy.state=enforced。
- OPENAI_API_KEY：state=ready，target environment_variable=OPENAI_API_KEY，allowed_domains僅api.openai.com。
- 沿用HTTPS proxy及CA，以既有OpenAI SDK、maxRetries=0、logLevel=off對GET https://api.openai.com/v1/models做一次免費查詢：HTTP200，回傳合法model list；候選gpt-6-luna有列於列表。只輸出安全metadata，未列印Key、Authorization、模型列表全文或上游錯誤。
- GET成功驗證此Cloud環境的proxy／認證路徑，不代表Responses生成、Project帳務、結構化輸出或Sites Worker的runtime認證已驗證。
- 生成POST次數0；未呼叫responses.create、chat completions或其他生成端點。

## 兩種配置的差別

| 項目 | Codex Cloud HTTP Secret | Sites Runtime Secret |
| --- | --- | --- |
| 生效環境 | 本次Cloud執行環境的允許HTTPS代理路徑 | 特定Sites部署的Worker |
| 本次已核實狀態 | ready，GET /v1/models HTTP200 | Secret清單revision1，沒有OPENAI_API_KEY |
| 讀取方式 | SDK使用平台供應的env binding，由代理在匹配目的地替換；不需.env | fetch(request,env)中的env.OPENAI_API_KEY |
| 自動繼承 | 不會自動同步至Sites | 必須另行設定、再部署套用env revision |
| 本機明文Key | 不應假設可讀取；不得用echo／print探索 | 不需把Key放進repo／browser bundle／hosting.json |

Cloud proxy只允許指定目的地注入憑證。不得將其executor佔位值當成真正Key傳給Sites，不得利用其他端點試圖匯出真實Key。已有Key，不需要再次建立Key；Cloud驗證亦不需要本機加解密helper。

## Sites目前實際狀態

Site：Sketch2Site 前端測試；project_id=appgprj_6afafb77233081918b3029cd9bbbd706。
網址：https://sketch2site-work-test-20261116.chewychloe.chatgpt.site。
原生get_site確認owner-private：allowlist僅owner、groups空、external visitors=0。
原生get_environment_variables回傳revision1：SKETCH_AI_ENABLED=false、SKETCH_AI_TEST_APPROVED=false、SKETCH_AI_MAX_CALLS=1、SKETCH_AI_BUDGET_USD=0.01；沒有OPENAI_API_KEY。
所以尚不能確認Worker已取得真實後端Secret。既有Worker保留同源／owner／CSRF／固定草稿／限時核准／D1永久單次slot；SDK零重試，US$0.01為應用端保守預留估算，不是供應商硬支出上限。

## 已核實的確切設定入口與步驟

可操作的官方入口是Sites原生runtime環境變數管理：get_environment_variables／update_environment_variables；目前連接器沒有提供可交給使用者填值的Secret專用表單，也沒有把Cloud HTTP Secret直接綁至Sites的功能。沒有已登入的Sites管理UI可核對，因此此處不捏造手動頁面URL或Settings選單點擊路徑。

1. 在Sites管理層選取既有專案Sketch2Site 前端測試（上述project_id），不得建立新站。
2. 經Sites的安全Secret輸入管道提交既有Key；原生update_environment_variables中set_values的key精確為OPENAI_API_KEY、is_secret=true、type=envvar。值只進入安全Secret欄位，不貼聊天、不使用Cloud代理佔位值、不放入hosting.json或VITE_*。
3. 同時保留SKETCH_AI_ENABLED=false、SKETCH_AI_TEST_APPROVED=false；MAX_CALLS=1、BUDGET_USD=0.01。不要把model／pricing review或帳務確認自行設為已完成。
4. 以deploy_private_site_version重新部署既有saved version，套用新的env_set_revision；保留原private權限，不修改前端或重做後端。僅儲存Secret尚不代表目前Worker已套用。
5. 原生metadata核對OPENAI_API_KEY的is_secret=true且值遮罩，部署回傳env revision符合；再做不輸出Key的runtime可用性／停用檢查。此流程沒有付費生成。
6. Project帳務／支出限制、站內owner ID、模型／費率核實與具體單次付費同意完成前，維持關閉。

如果要手動點擊操作，仍須能檢視使用者的Sites管理介面，才能提供已核實的精確點擊入口；目前可核實的是上述原生管理工具及其參數。這是配置與安全交付問題，不是Key建立問題。

如果另有官方本機encrypted-key寫入流程尚待恢復，才需官方openai-platform-api-key.mjs及原配對private key；不能以新私鑰解舊密文，也不自製helper替代。它不會把已可用的Cloud HTTP Secret變成Sites Runtime Secret。
