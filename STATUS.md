# 狀態
2026-11-10（Asia/Taipei）

目前工作：Phase 6；最新完成項與驗收見文末 Phase 6 區段。Phase 5 真實付費生成仍 NOT TESTED，不視為本輪阻礙。

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

## Phase 6（2026-11-10，Asia/Taipei）

功能 DONE：單擊所有受控元件、完全包含矩形框選／多選摘要、穩定ID、空白／Esc取消、100／75／50%預覽縮放；獨立畫筆與結構化座標、撤銷／清除；局部文字／標題層級／對齊；六Preset動畫拖放、可放置回饋、拒絕重複／不相容、時長／更換／移除、原子Patch與Undo/Redo。保存沿用原Session／Revision／IndexedDB CAS，Canvas與註記歷史分離。未新增依賴或改UI風格。

### 驗證
- PASS：typecheck；npm test 與 npm run test（同一Vitest套件，11檔117/117）；build；check:secrets；npm audit（0 vulnerabilities）；git diff --check。
- PASS：Chromium完整回歸35/35（約1.1分鐘）。新增6項E2E，舊29項保留；包含固定Fixture與Mock生成／候選確認／持久化／CAS／失敗回復，不能當成真實AI結果。
- NOT TESTED：npm run check（package.json沒有check script，已實際執行並回報Missing script；typecheck／build／check:secrets各自驗證）。Firefox／Safari／實機觸控與完整無障礙稽核未測。
- 新增單元：縮放／偏移座標、雙向框選邊界、完全包含而非相交、stagger葉節點／非法效果／scope拒絕及原子歷史。
- 新E2E：單選UUID、框選／多選、空白／Esc、三種縮放、畫筆與清除可撤銷、捲動座標、註記與正式頁面／草稿隔離、重載恢復、合法拖放／重複與不相容拒絕、更換移除、Undo/Redo、真實Web Animations播放／reduced-motion取消，以及1440／768／375px無頁面水平溢出。
- build保留既有Zod PURE註解警告，不影響成功；沒有修改或升級套件。check:secrets沒有發現可辨識Key、系統Prompt或source maps。

### Chromium視覺檢查
截圖均為本機固定測試範例（非AI），未手動美化。路徑test-results/phase6-{1440,768,375}.png為選取／屬性操作；phase6-pen-{1440,768,375}.png為畫筆；另有phase6-marquee.png、phase6-multi-75.png與phase6-animations.png。此目錄忽略於Git，可重跑E2E重建。
已人工檢視桌面、窄視窗與手機截圖：綠色外框貼合實際元件盒模型；畫筆在獨立圖層，工具列不浮蓋內容；桌面側欄維持272px、未選取時讓出空間；768／375px側欄改為下方捲動，按鈕維持文流，未見新增水平溢出、文字截斷或元素重疊。早期CSS zoom造成文字度量變化，已改固定布局寬度+transform；早期窄窗浮動套用按鈕曾遮擋欄位，已移除浮動並以實際捲動驗收。

具體限制／後續可改善：
1. 375px工具列仍需換行，下方屬性區需捲動才能依次看文字、對齊及套用；這是桌面優先編輯器，沒有宣稱手機完整編輯已最佳化。
2. 框選只採完全包含；大卡片與其子項可能一起選入，多選僅識別，沒有批次屬性修改。規則已在桌面工具列及架構文件說明。
3. 註記綁定版面快照，文字修改、尺寸／版面變化會隱藏舊註記並提示；重載會清空。未做跨版面重新錨定或保存，不把舊筆跡錯貼到新位置。

### 安全、Git與停止點
本輪付費模型／外部AI／圖像生成呼叫完全為0，費用0；沒有再次查詢模型列表或使用正式Provider。測試程序移除兩個Key變數、停用AI旗標，新E2E拒絕外部HTTPS並斷言無生成POST；所有真實付費生成仍NOT TESTED。未開啟自然語言修改、匯出、登入、雲端服務或其他階段。
起點6262be372a7e3a609bdb21c14f5d6e8a41537958，工作分支work。GitHub備份未確認：本對話先前遠端heads查詢為空，目前無遠端追蹤分支，原始碼由recovery bundle恢復；本輪提交僅在本地，未Push，環境遺失可能遺失本輪變更。沒有Push／Merge／部署。測試通過後建立本地commit，SHA以git log -1取得。
下一個最小任務：使用者驗收Phase6的選取、筆跡與動畫操作；本輪完成後停止，等待後續指示。
