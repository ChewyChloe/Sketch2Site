# 狀態
2026-11-09（UTC）

## 功能
- Phase 0–4 DONE；沿用 CanvasSpec、PageSpec v2、Renderer、Patch、History、IndexedDB 與 Session／Revision CAS。
- Phase 5 PARTIAL：生成管線與 Mock 驗收 DONE；真實 Provider 相容性、當日價格與生成品質 NOT TESTED。
- DONE：Canvas 輸入驗證、空間關係提示、OpenAI Adapter、嚴格結構化布局、受控 PageSpec 轉換、逐一保留來源 ID／文字／圖片／連結／動畫、候選預覽與明確確認保存。
- DONE：生成中可繼續編輯；草稿版本或頁面 Session 改變時拒絕過期結果。確認前不保存，交易失敗保留候選與舊正式頁面；成功後沿用 Undo／Redo。
- DONE：缺少設定安全失敗；草稿、本機預覽不依賴 API。正式服務沒有 Mock 切換開關，只有測試程序注入 Mock。
- BLOCKED：實際環境沒有 API Key，亦沒有付費測試授權。官方價格／模型文件當次網路 CONNECT 403；不得宣稱目前價格與線上模型已驗證。
- NOT STARTED：AI 自然語言局部修改、匯出、帳號、雲端同步、公開部署。到此停止，不啟動下一階段。

## 資料流程與核心檔案
CanvasSpec → prepareIntent → Provider → LayoutSchema → materialize → PageSpec v2／來源保留檢查 → 候選 PageRenderer → 使用者確認 → 原有 Session／Revision／IndexedDB 保存。
- src/generation.ts：輸入、結構化輸出、受控轉換及保留檢查。模型只選布局與來源 ID，不提供文案、URL、資產或程式碼。
- server/provider.ts：官方 openai SDK 7.53.0；Responses API，嚴格 JSON Schema，無工具、store:false、零自動重試。預設後端模型 gpt-4.1-mini-2025-04-14；真實可用性 NOT TESTED。
- server/api.ts、server/config.ts、server/index.ts：本機端點、環境設定與伺服器限制。
- src/generationClient.ts、src/CandidatePreview.tsx、src/App.tsx：生成、候選、桌面／手機與確認操作。
- src/usePagePersistence.ts、src/pageSaver.ts、src/Preview.tsx：沿用交易 CAS，拒絕過期結果與保留保存失敗候選。
- src/spec.ts：Canvas v1 相容擴充標題、內建圖片、按鈕連結及既有動畫；PageSpec v2 安全限制未放寬。
- src/generation.test.ts、server/api.test.ts、tests/generation.spec.ts、tests/fixtures/generation.ts：五種草稿、Mock HTTP／SDK 與瀏覽器驗收。

## 測試
| 驗證 | 結果 |
| --- | --- |
| npm run typecheck | PASS |
| npm test | PASS：10 檔，112/112 |
| npm run test:e2e（Chromium） | PASS：29/29，含原有 19 項 |
| npm run build（後端與 VITE 測試 canary） | PASS |
| npm run check:secrets | PASS：Bundle 無測試秘密、系統 Prompt 或 source maps |
| npm audit --cache /workspace/.npm-cache | PASS：0 vulnerabilities |
| git diff --check | PASS |
| 實際 dev:api 無金鑰 loopback 啟動／status | PASS：configured=false，未呼叫模型 |
| 真實模型、五份草稿生成品質與實際計費 | NOT TESTED |

Mock 驗證涵蓋不合法輸入／輸出、缺失／重複 ID、文字與動畫遺失、虛構內容、未知元件、惡意 URL、Prompt Injection 字串、拒答／不完整輸出、CSRF／Origin／Content-Type／Body 限制、重複請求、併發、逾時、費用預留、呼叫上限、安全錯誤、草稿變動、舊 Session、確認後保存、保存失敗保留候選、Undo／Redo。SDK 測試使用注入的假 fetch，沒有外部請求。
最終 FAIL：0。Build 仍有既有 Zod PURE 註解警告，未抑制，建置成功。
NOT TESTED：Firefox／Safari／實機、完整無障礙與大規模效能稽核、正式公開環境認證與分散式成本控制。

## UI／截圖
沿用中性色、單一綠色強調色與畫布優先工作台。新增精簡生成狀態、候選確認、圖片與按鈕連結編輯；明示資料生成時傳送 OpenAI。Mock 預覽標示「測試生成（非 AI）」，不冒充真實生成。
Chromium 實際操作五種草稿的生成／預覽／返回／確認，於 1440、768、375px 檢查無整頁及預覽水平溢出。截圖審查曾修正獨立圖片過寬；現有動畫測試保留播放與 reduced motion 驗證。這些結果不代表真實模型或正式商業設計品質合格。

| 草稿 | Mock 流程／保留檢查 | 真實 AI 品質 | 截圖前綴 |
| --- | --- | --- | --- |
| 個人作品集 | PASS | NOT TESTED | test-results/generation-mock-0 |
| 活動介紹 | PASS | NOT TESTED | test-results/generation-mock-1 |
| 產品介紹 | PASS | NOT TESTED | test-results/generation-mock-2 |
| 不規則草稿 | PASS | NOT TESTED | test-results/generation-mock-3 |
| 多動畫草稿 | PASS | NOT TESTED | test-results/generation-mock-4 |

每列有 .png（1440px）、-768.png、-375.png，共 15 張；均為忽略檔，可透過 E2E 重建。測試截圖使用 reduced motion 以便讀取完整內容，產品動畫未關閉。

## 資安、成本與限制
- 金鑰只讀後端環境，不傳給模型或前端；.env.example 無秘密。啟用需 Key、SKETCH_AI_ENABLED=true、已審閱的非零價格與 SKETCH_AI_PRICING_REVIEWED=true。
- API 預設只綁 127.0.0.1:8787。檢查 loopback／Host／Origin／Fetch Metadata、HttpOnly SameSite Cookie 與 CSRF nonce；只允許 JSON。這不是公開服務身分認證，不得直接公開。
- 上限：32KB Body、40 元素、12000 字元、4096 輸出 Tokens、30 秒、併發 1、每分鐘 3 次、每程序 5 次；無自動重試。每次保守預留估算費用最多 $0.10，每程序 $0.25；逾時仍保留併發槽直到 Provider 結束，模糊失敗不退預留。
- 費用是依設定價格與保守 token 假設的程序內估算，不是供應商帳單保證；重啟重設，非跨程序配額。公開部署另需認證、持久配額與實際帳務控制。
- 模型只能輸出布局選擇；私人文字當資料處理，無 Shell／檔案／秘密／搜尋工具。轉換後重新驗證完整 PageSpec，沒有任意 HTML／CSS／JS。
- 現階段圖片只支援既有內建 SVG；按鈕必須有合法且明確的連結。只支援已定義 typography／layout 約束；不支援動畫或群組意圖明確拒絕，不偷偷替換。
- 真實 API 請求 0；Tokens／延遲／實際費用 NOT TESTED。沒有購買額度、建立付費帳號或啟用訂閱。Mock 用量與測試價格僅作測試運算。
- 原有本機資料限制仍適用：瀏覽器清理會刪除草稿與頁面，沒有雲端備援；強制離開可能遺失未提交候選，離開提示不等於保存。

## Git 與恢復
分支 work，起點 ce0d50f8e290d75c9ae8134682300cbabbdffba2。本輪 SHA 為此文件所屬提交，可用 git log -1 查詢。
僅修改 Sketch2Site；未 push、merge、release 或部署。依 README 安裝套件並分別啟動 dev:api 與 dev；沒有設定時仍可用草稿及本機預覽。E2E 自行啟動隔離 Mock API 與 Vite，不需要 Key。

## 下一個最小任務
安全設定可用 Key、確認當日官方模型／價格與網路後，取得明確小額付費測試授權，再對上述五份草稿各執行一次受控真實生成，記錄內容／布局／動畫／手機品質、完整截圖與實際用量。不自動進入下一階段。
