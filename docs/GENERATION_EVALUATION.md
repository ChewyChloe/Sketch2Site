# Phase 5.1 生成品質驗收

日期：2026-11-09 UTC。起點：7b458e572182188bb96c86fedfa16770880b44b8。

**BLOCKED：尚未執行真實 API 品質驗收。** 本輪實際模型呼叫 0 次。沒有 API Key、沒有付費授權、API Project 支出限制未由使用者確認；官方文件亦受網路政策阻擋。Mock 只驗證工程流程，不能替代 AI 成果。

## 模型與官方證據

| 檢查 | gpt-6-luna | gpt-6.1-sol |
| --- | --- | --- |
| 官方 SDK 7.53.0 辨識名稱 | PASS | PASS |
| 專案 Adapter／SDK 假 transport | PASS：Responses + strict JSON | 共用 Adapter；不自動比較或切換 |
| 當日公開 API 模型 ID／專案權限 | NOT TESTED | NOT TESTED |
| 模型支援 Responses、strict JSON Schema 子集 | NOT TESTED | NOT TESTED |
| 所需 reasoning 設定、成本、實際延遲 | NOT TESTED | NOT TESTED |

證據：本機 node_modules/openai/src/resources/shared.ts 的 ChatModel 列有兩名稱；ResponsesModel 包含 ChatModel。官方 SDK 原始碼 https://raw.githubusercontent.com/openai/openai-node/master/src/resources/shared.ts 當次 GET 200，列有相同名稱。Responses API 型別含 text.format/json_schema、max_output_tokens 與 cached/reasoning usage 欄位。**SDK 型別不是供應商即時功能或帳號授權的證明。** 不必為更改字串更新已相容的 SDK。

以下使用使用者指定官方 URL，當次全為 curl CONNECT 403（HTTP 000，連線在代理層被拒絕），未取得內容：
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/deprecations

不能據此確認舊模型的官方淘汰日期。依本輪要求停用 gpt-4.1-mini 家族，將 gpt-6-luna 改為**待核實的預設候選**；Sol 僅為另行授權的候選，不做自動 fallback。SKETCH_AI_MODEL_REVIEWED=false 時不啟用。尚未取得模型專屬文件，所以不猜測 reasoning.effort；Adapter 不送該參數，核對預設行為後才能啟用。4096 輸出上限包含 reasoning 的預算，不另加費用；實際模型計費規則仍待核對。

## 固定輸入

沿用原五份草稿的內容、幾何位置、尺寸、素材、連結意圖與動畫；只有原本每次隨機的 UUID 改為穩定 UUID，同步 anchor。未整齊化凌亂草稿，也沒有依生成結果修改輸入。完整內容在 tests/fixtures/generation.ts，輸入指紋在 [generation-fixtures.json](generation-fixtures.json)，由單元測試鎖定。

| Fixture ID | 元素 | 動畫標記 | 輸入預留 token 估算 | 正式結果／內容／動畫 | 真實截圖 |
| --- | ---: | ---: | ---: | --- | --- |
| portfolio | 6 | 0 | 14286 | NOT TESTED | NOT AVAILABLE |
| event | 4 | 0 | 13190 | NOT TESTED | NOT AVAILABLE |
| product | 6 | 0 | 14244 | NOT TESTED | NOT AVAILABLE |
| irregular | 5 | 0 | 13761 | NOT TESTED | NOT AVAILABLE |
| animated | 5 | 6 | 13802 | NOT TESTED | NOT AVAILABLE |

`npm run generation:preflight` 僅離線輸出 ID／SHA-256／數量／預留，不載入 .env、不呼叫 Provider。輸入數值為 UTF-8 bytes 加 Schema／protocol margin 的保守預留啟發式，**不是實際 input tokens 或模型 context 上限**；真實回應超出預留會拒絕且記錄用量。每次 max_output_tokens=4096，輸出包括 reasoning；每次只處理一份草稿。

## 付費前的具體測試提案

1. 安全配置後端 Key；網路允許 developers.openai.com 及 api.openai.com，若官方頁另有轉址需再核對。不要透過聊天提供 Key。
2. 核對上述四頁的有效 ID、Responses／strict Schema 與 reasoning 支援、當日 input／cached input／output 價格；若另有 cache write、推理分級或其他計費，先調整並測試估算再啟用，不假設三種費率已涵蓋未知的新模型費用。使用者確認 API Project 計費限制，區分供應商的通知／軟預算與實際硬限制；本專案不能自行讀取或更改帳務設定。
3. 先只申請 **1 次 portfolio**，併發 1、30 秒、零重試、無 Web Search／File Search／其他工具。設定 SKETCH_AI_MAX_CALLS=1 與明確核准的 SKETCH_AI_BUDGET_USD；環境旗標只是配置，並不代表授權。
4. 估計費用目前 **NOT AVAILABLE**，官方當日費率未核實。第一份保守預留公式為 `(14286 × I + 4096 × O) / 1000000` USD；I／O 為當日每百萬 token 費率，預留不假設 cache 折扣。不能用測試費率報價。
5. 全輪最多五次的提案，只有使用者明確授權剩餘次數及金額、第一份生成與 UI／保存驗收通過才繼續；總預留公式為 `(69283 × I + 20480 × O) / 1000000`。每請求仍受 $0.10、每程序 $0.25 硬上限約束；若超過核准額度就停止，不自行提高。1 次授權不涵蓋其餘 4 次。
6. 第一份失敗立即停止外部呼叫，保留失敗紀錄，先用本機／Mock 找原因；不得重啟程序繞過呼叫／預算上限。比較 Sol 需另行取得授權，使用相同輸入。

未完成前置條件，本輪到此停止，沒有啟動付費測試。

## 用量、失敗與費用紀錄

| Fixture ID | Model（候選） | API 狀態 | Input／cached／output tokens | 延遲 | 頁面／內容／動畫驗證 | 費用 |
| --- | --- | --- | --- | --- | --- | --- |
| portfolio | gpt-6-luna | NOT TESTED | NOT AVAILABLE | NOT AVAILABLE | NOT TESTED | NOT AVAILABLE |
| event | gpt-6-luna | NOT TESTED | NOT AVAILABLE | NOT AVAILABLE | NOT TESTED | NOT AVAILABLE |
| product | gpt-6-luna | NOT TESTED | NOT AVAILABLE | NOT AVAILABLE | NOT TESTED | NOT AVAILABLE |
| irregular | gpt-6-luna | NOT TESTED | NOT AVAILABLE | NOT AVAILABLE | NOT TESTED | NOT AVAILABLE |
| animated | gpt-6-luna | NOT TESTED | NOT AVAILABLE | NOT AVAILABLE | NOT TESTED | NOT AVAILABLE |

本輪零次模型呼叫，因而沒有本輪生成 API 費用；API Project 總帳務 NOT AVAILABLE。未購買額度、變更帳務限制或開啟自動儲值。

成功回應及已取得用量的拒答／不完整／驗證失敗，都記錄最小用量與耗時；上游傳輸錯誤或逾時取得不到 token 時為 null（報告填 NOT AVAILABLE），不當成零費用。未知 cache 數量時以一般輸入價保守估計，reasoning 已包含在 output，不重複加總。最終實際帳單仍需人工核對；預留額度不是帳單。

正式測試時，逐筆保存 Fixture ID／指紋、請求模型、請求狀態與固定錯誤碼、input／cached input／output／reasoning tokens、延遲、官方費率 URL／查核日期、驗證結果及費用計算。模型別名若有對應實際版本亦須核對。不得保存秘密或完整私人草稿至日誌。五份為專案公開測試資料，可保存原始布局及候選 PageSpec 供人工核對；不手動美化後冒稱原始輸出。

## 品質評分與截圖

五份目前每個評分項目與總分均為 **NOT TESTED**，不能給 0 分或以 Mock 分數代替。

| 面向（各 0–5） | 正式評估時的具體理由要求 |
| --- | --- |
| 內容忠實度 | 列出 ID／逐字內容／元件數與相鄰關係；遺漏內容即使漂亮亦不通過 |
| 視覺品質 | 明確描述字級、行長、留白、層級、比例、對齊及對比缺陷 |
| 響應式品質 | 檢查 1440／768／375px 的溢出、截斷、重疊、圖片與按鈕可操作性 |
| 動畫正確性 | 逐一比對六標記及目標；實際播放與 reduced motion，檢查閱讀及互動 |
| 草稿適應能力 | 比較五種結構與輸入關係，指出模板化或失去原意的具體區塊 |

每份總分 /25，由截圖與實際操作提出理由，供使用者覆核；不是模型自評或使用者研究。正式截圖預定另存 `test-results/generation-live-<fixtureId>-1440.png`、`-768.png`、`-375.png`，不得覆用 Mock 路徑。另需保留完整捲動內容，不能僅拍視窗頂部忽略下方元素。

本輪只有既有 Mock E2E 重建的 `test-results/generation-mock-{0..4}.png`、`-768.png`、`-375.png`，不列為 AI 成果。順序與上表相同。正常動畫播放另由既有 E2E 驗證，Mock 截圖用 reduced motion 保證可讀。

## 具體問題與優先序

- P0 BLOCKED／環境與官方證據：四頁 CONNECT 403；無 Key／付費授權／Project 限制確認。先處理，不用反覆付費探測。
- P0 DONE／配置問題：舊預設改為 Luna 候選；新增 model review 與明確預算 gate、預設一次呼叫；舊模型與未知模型不能啟用。沒有放寬 PageSpec。
- P1 DONE／觀測問題：補記 cached input／reasoning tokens；失敗後取得到的用量亦保留，未知值不偽造。
- P1 待實測／Schema 與模型：官方 strict JSON 子集與 reasoning 預設未核實；不能先把任何失敗歸因於模型能力。
- P2 已知限制／輸入與轉換：圖片只有同一內建示意 SVG；Card 只還原一個 Paragraph，因此 Stagger Reveal 無法展示多個子項依序出現。正式評估要揭露此限制，不修改輸入來掩蓋。
- P2 待實測／Prompt、Renderer、CSS：沒有真實輸出，無法判定是否模板化或留白品質不足；先記錄第一版，再按來源分類修正，不無限制調 Prompt。

自動化最終結果與 Git 恢復資訊見 STATUS.md；本報告不宣稱正式 AI 品質驗收通過。


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

## 2026-11-12 免費MVP補充
React獨立匯出、本機圖片與明確「示範排版（非 AI）」完整流程已驗證，見FREE_MVP_REVIEW.md。五份CanvasSpec Fixture移至共用src/demoFixtures.ts，測試重用原資料；沒有真實模型呼叫，不能用這些新截圖判定AI生成視覺品質。真實模型權限／輸出／付費token／延遲仍NOT TESTED，本輪付費API呼叫0、費用0。
