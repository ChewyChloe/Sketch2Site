# 狀態
2026-11-09（UTC）

## 功能
- Phase 0–4 DONE；保留 Canvas／PageSpec 保存、Patch、Undo／Redo、Session／Revision 與交易 CAS。
- Phase 5 PARTIAL：生成管線與 Mock 驗收 DONE；真實模型與生成品質 NOT TESTED。
- Phase 5.1 BLOCKED：免費準備 DONE；正式測試缺少官方證據／Key／明確付費授權／使用者 Project 支出限制確認。本輪真實呼叫 0。
- DONE：預設改為待核實 gpt-6-luna 候選，gpt-6.1-sol 僅另行授權；舊 gpt-4.1-mini 家族不再能啟用。沒有放寬 PageSpec 或更動工作台 UI。
- DONE：新增 model review gate、後端預設一次且上限五次、必填單輪預算；cached／reasoning tokens 與失敗用量觀測；五份穩定 UUID／SHA-256 manifest、離線 preflight 與正式評估報告。
- NOT STARTED：AI 局部修改、匯出、帳號、雲端同步、正式公開部署。本輪不進入下一階段。

## 模型證據與環境
官方 openai SDK 7.53.0 的 ChatModel 型別列有兩候選，ResponsesModel 包含 ChatModel；官方 GitHub shared.ts 當次 GET 200。官方四個 models／pricing／structured-outputs／deprecations 網頁均 CONNECT 403（HTTP 000）。SDK 可以編譯／送出指定格式，不代表兩模型當日公開 API ID、帳號權限、strict Schema 子集、reasoning 預設或價格已確認；上述均 NOT TESTED。
Cloud 狀態 observations_current=true、network policy enforced，僅有套件／GitHub目的地，沒有 API Key 或其他秘密設定；本機 .env 不存在，後端 Key／啟用旗標皆缺少（只檢查是否存在，不列印值）。未嘗試帶憑證探測 API、未呼叫付費模型、未改網路或帳務設定。

## 實際測試
| 驗證 | 結果 |
| --- | --- |
| npm run typecheck | PASS |
| npm test | PASS：10 檔，115/115 |
| npm run test:e2e（Chromium，Mock／舊回歸） | PASS：29/29 |
| npm run build（後端與 VITE 測試 canary） | PASS |
| npm run check:secrets | PASS：無測試秘密／可辨識 Key／source maps／系統 Prompt |
| npm audit --cache /workspace/.npm-cache | PASS：0 vulnerabilities |
| 離線 generation:preflight／固定 fixture 指紋 | PASS：五份 schema／內容／動畫與 SHA-256 |
| git diff --check | PASS |
| 真實 API／strict output 相容性 | NOT TESTED |
| 真實五草稿內容／布局／動畫／確認保存／品質評分 | NOT TESTED |

最終 FAIL：0。既有 Zod PURE 註解警告仍存在，未抑制，建置成功。沒有新增或升級依賴。
新增本機測試涵蓋舊／未知模型、未審閱設定、不合法呼叫／預算／cached 費率、預設一次、SDK 正確 Responses URL／strict Schema／無工具／無重試／無猜測 reasoning 設定、cached 與 reasoning 用量、拒答與驗證失敗仍記錄已知用量、未知用量為 null、異常用量拒絕。
保留舊測試：草稿保存、PageSpec 保存、過期結果與 Session 拒絕、Patch／Undo／Redo、候選確認前不保存、保存失敗保留候選、失敗不破壞草稿、併發與費用限制、惡意輸入、秘密隔離。
NOT TESTED：Firefox／Safari／實機、完整無障礙／壓力稽核、公開後端認證／持久配額。Mock 不算正式 AI 成果。

## UI 與品質
未更改 UI。Chromium 重跑五份 Mock 候選、確認與保存，在 1440／768／375px 重建 15 張截圖，溢出檢查通過。人工複查動畫草稿手機畫面，內容清楚，無新增重疊；不給真實模型品質評分。
Mock 截圖為 test-results/generation-mock-{0..4}.png、-768.png、-375.png，順序為 portfolio／event／product／irregular／animated；均忽略於 Git，可由 E2E 重建。正式生成截圖 NOT AVAILABLE，不能用 Mock 圖替代。
正式品質基準、各項 /5 評分理由要求、所有未測試欄位、失敗分類與後續具體提案見 docs/GENERATION_EVALUATION.md。已知轉換限制：所有圖片仍為同一內建 SVG，Card 僅一個 Paragraph，無法藉此展示多子項 Stagger；不能把限制歸因於尚未測試的模型。

## 成本、安全與啟用
- 本輪真實 API 請求 0；本輪生成費用 0。實際 tokens／延遲／Project 總帳單 NOT AVAILABLE。沒有購買額度、調帳務、自動儲值或付費測試。
- 當日價格未核實，預估真實費用 NOT AVAILABLE。第一份 input 預留 14286、output 上限 4096；前者是 bytes + margin 的啟發式，不是實測 token。完整公式與五份預留見評估報告，不用測試費率報價。
- API 仍只綁 127.0.0.1:8787；Origin／Host／CSRF、32KB／40元素／12000字元、併發1／30秒／零重試、安全錯誤與白名單皆保留。
- 後端 SKETCH_AI_MAX_CALLS 預設1、範圍1–5；SKETCH_AI_BUDGET_USD 必填且不超過核准額度及 $0.25，單次預留不超過 $0.10。費率上限保持原安全限制，未為 Sol 自動提高。
- 程序重啟重設限制，不能用來繞過授權；本機估算不是供應商硬限額或公開服務認證。使用者尚未確認 Project 支出限制。
- .env 只由後端 dev:api 載入；由使用者自行安全配置，不得貼聊天／Issue／報告或 VITE_*。MODEL_REVIEWED／PRICING_REVIEWED／ENABLED 及環境變數只是配置，不是付費授權。
- 無 Web Search、File Search、額外工具、多模型比較或自動重試。第一份失敗就停止正式呼叫，先在本機診斷。

## 核心變更
server/config.ts／index.ts（候選、gate、授權上限配置）；server/provider.ts／api.ts（共用預留估計、安全用量與失敗記錄）；src/generation.ts（相容擴充用量 DTO）；tests/fixtures/generation.ts（穩定 ID）；scripts/generation-preflight.ts／docs/generation-fixtures.json（離線指紋）；相關單元測試與 docs/GENERATION_EVALUATION.md。Renderer、正式 PageSpec Schema、Patch 引擎與保存機制未重寫。

## Git 與恢復
分支 work，起點 7b458e572182188bb96c86fedfa16770880b44b8。本輪 SHA 為此文件所屬提交，可用 git log -1 查詢。
僅修改 Sketch2Site；未 push、merge、release 或部署。依 README 啟動 dev／dev:api；未配置時只提供草稿與本機預覽。Mock 測試不用 Key，測試服務僅 loopback。

## 下一個最小任務
解除官方文件存取，核實 Luna 的 API ID／Responses／strict Schema／reasoning 與三種費率，再由使用者安全配置 Key、確認 Project 限制。以具體費用提案取得一次 portfolio 呼叫的明確授權後才執行；本輪停止等待，不自行付費。


## Phase 5.2（2026-11-10）
BLOCKED：本執行環境 OPENAI_API_KEY 未配置（只檢查存在性），未查詢模型權限。付費授權及 Project 帳務／支出限制確認仍缺少；真實生成 0 次，真實截圖、用量、延遲及視覺前三問題均 NOT TESTED。
採用使用者 2026-11-09 核對的官方規格：gpt-6-luna、Responses／Structured Outputs、reasoning.effort=low；費率 input $0.10、cached input $0.01、output $0.50／百萬 tokens，來源為使用者提供的官方 models／pricing／structured-outputs 文件，非本環境重新查核。SDK 型別及 fake transport 驗證 low，零重試與無工具保持不變。
首份 portfolio 指紋沿用 manifest，輸入預留 14286、輸出上限4096（含推理），單次保守預留 $0.0034766，可提案最多1次、預算 $0.01、併發1；尚未獲授權，不啟用生成。真實呼叫費用0，Project 帳單未知。下一步：在 Cloud 環境秘密新增 OPENAI_API_KEY 後套用／重啟環境，僅檢查存在性，再執行無生成的模型權限查詢；確認帳務限制並另行取得一次付費授權。不要把 Key 貼入聊天。
