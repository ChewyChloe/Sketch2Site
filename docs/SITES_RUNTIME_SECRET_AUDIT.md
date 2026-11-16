> 最新狀態（2026-11-17）：Sites OPENAI_API_KEY已標記為Secret，既有第2版已成功重新部署並套用環境revision3。AI仍停用。以[SITES_SECRET_DEPLOYMENT_20261117.md](SITES_SECRET_DEPLOYMENT_20261117.md)為最新結果；以下保留先前紀錄。

> 後續更正：已確認使用者配置的是平台管理的Cloud HTTP Secret，state=ready且免費GET /v1/models為HTTP200；不依賴.env或本機helper。本站Runtime Secret仍未設定。以[CLOUD_HTTP_SECRET_VS_SITES.md](CLOUD_HTTP_SECRET_VS_SITES.md)為最新結論，以下保留當時檢查紀錄。

# Sites Runtime Secret 核對

2026-11-16（Asia/Taipei）。整體BLOCKED；付費生成0。沿用既有Site appgprj_6afafb77233081918b3029cd9bbbd706、既有Worker，不重建站或改造已完成後端。本輪只有Mock測試與文件變更，未部署、未改runtime設定、未新增API Key。

## 六項結果

| 項目 | 結果 | 證據與限制 |
| --- | --- | --- |
| OPENAI_API_KEY為Sites Runtime Secret | BLOCKED | 原生get_environment_variables回傳revision 1，沒有OPENAI_API_KEY項目；指定.env及.env.local也未收到Key。使用者已確認在Platform建立Key，但目前執行環境無法安全取得該Key，不能把建立成功等同Secret綁定成功。 |
| Worker讀取Secret且不輸出／記錄／回傳 | Mock PASS；真實注入NOT TESTED | 新測試在runtime env提供非秘密canary，移除SKETCH_AI_API_KEY，確認Provider factory收到OPENAI_API_KEY；成功與失敗response body／headers及console均不含canary。無真實Secret可用，未宣稱已驗證正式注入。 |
| Bundle／Source Map／Network Response不含秘密 | 本機產物與Mock PASS；線上HTTP NOT TESTED | dist、Worker產物及原保存部署tar對已知繼承Key bytes與canary精確掃描通過；tar沒有.env、.git或.map。既有check:secrets及motion-boundary PASS。本次私人Site的唯讀HTTP檢查未完成，回應正文及憑證均未輸出；不能以Mock取代正式Network驗收。新Key不可取得，所以沒有對新Key做精確比對。 |
| 私人存取 | PASS | 原生get_site確認owner、自訂allowlist僅owner、groups空、external visitors=0；沒有變更分享權限。 |
| 單次／零重試／US$0.01應用程式預算 | PASS配置與Mock | Runtime MAX_CALLS=1、BUDGET_USD=0.01；SDK maxRetries=0、timeout=30000、logLevel=off。D1永久固定slot在Provider前原子保留，並行／跨instance／失敗／逾時不可重開；DB唯讀確認表存在、0筆紀錄。 |
| 帳務與Project限制未確認前停用 | PASS | Runtime SKETCH_AI_ENABLED=false、SKETCH_AI_TEST_APPROVED=false。Mock驗證即使env有canary Key也不建立Provider；未執行任何付費模型請求。 |

Typecheck PASS；兩個相關test files共28/28 PASS（12項Sites Worker、16項既有Provider／API測試）；git diff --check PASS。無產品UI或runtime程式變更，不需重建或重部署現有網站。

US$0.01是程式依審閱費率及保守input／output預留估算的上限，不是供應商硬性支出上限。仍須另確認OpenAI Project帳務／支出設定、模型／當日費率與站內owner ID；目前不具備正式生成測試的全部條件。

## 官方流程恢復方式

1. 保留既有Site、現有Key與兩個false開關，不自動再建Key。
2. 若官方流程已把該Key安全寫入其他環境檔，提供檔案路徑即可，不提供Key明文。目前已詢問儲存位置，等待資訊；不以來歷未確認的繼承環境Key替代。
3. 若仍需OpenAI Developers本機加解密寫入流程，需修復／重新同步官方外掛的執行資源，讓本環境實際具備`<plugin root>/scripts/openai-platform-api-key.mjs`。本輪再次搜尋預期外掛與工作區目錄仍未找到；可讀取SKILL.md不代表helper可執行。使用官方套件提供的腳本，不自製替代。
4. 已有encrypted_api_key.ciphertext時，必須配對原private_key_path並使用官方decrypt，寫入已核准.env、env name OPENAI_API_KEY、workspace為本repo；不能以新prepare產生的私鑰解舊密文。若原配對資源遺失，交由原官方設定流程／外掛支援恢復，不自動新建或輪替Key。
5. Key安全可用後，以Sites原生update_environment_variables將OPENAI_API_KEY設為is_secret=true，始終保持ENABLED／TEST_APPROVED=false。部署同一既有saved version套用新env revision，保留owner-private。這是Runtime Secret設定，與上傳.env或build-time define不同。
6. 重新核對Secret遮罩metadata、runtime可用性與停用回應，再確認Project支出控制、模型／費率和一次付費測試的具體同意；完成前不得呼叫付費生成。

安全規範：
- skill://plugin_connector_1p_32dba5a7095c8191adca04ee30276304/openai-platform-api-key/SKILL.md：「Use the helper by absolute path」，並要求已確認目的地及原配對private key。
- skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/references/identity-and-secrets.md：Secrets使用Sites原生runtime工具，不置於source、browser bundle或hosting.json。
