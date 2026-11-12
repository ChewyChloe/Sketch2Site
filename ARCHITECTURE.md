# 架構
React 19 + TypeScript + Vite；Zod 4；IndexedDB；Vitest、Testing Library、Playwright。Node 24 LTS、npm lockfile，安裝使用 npm ci。原生 Pointer Events／HTML Drag and Drop，CSS Tokens 取代 Tailwind。Phase 2 以 Web Animations API + IntersectionObserver 與受控 CSS 實作動畫，不新增 Motion 或重複套件。

## 草稿與成品合約
src/spec.ts 保留 CanvasSpec v1、歷史與 LegacyPageSchema（原 PageSpec v1）。CanvasSpec 的儲存、ID、座標格式不變；src/storage.ts 共用 IndexedDB 開啟／草稿存取，Undo/Redo 上限 80 次，移動在放開時提交一次。

src/pageSpec.ts 提供新 PageSpec v2：metadata、sections 元件樹、typography、styles、responsive。節點有 UUID、type、受控 style、effects 與各類型特有欄位。
- Section、Container、Card、Stack：children。
- Grid：children、columns（1–3），受全頁 desktopColumns 上限限制；800px 以下預覽容器為單欄。
- Heading：content、level（1–3）；Paragraph：content。
- Button：content、href（本頁 UUID anchor 或指定 HTTPS 網域），渲染語意連結。
- Image：src（內建資產白名單）、必填 alt。
- style：gap / padding（none、small、medium、large）、align、tone、width，均為枚舉 Token，禁止 CSS 字串。
- effects：effectId、duration 120–1200ms、delay 0–1000ms、distance 0–32px、stagger 30–150ms；缺省採受控預設。distance 用於 Slide Up／Hover Lift，stagger 用於 Stagger Reveal；不適用欄位不產生額外行為。

v1 尚未曾儲存或生成成品，不默默推測樹型遷移；Renderer 明確拒絕 v1。原 v1 驗證測試保留，未來若有外部 v1 檔案，需另建顯式遷移。此版本決策見 DECISIONS.md。

## 渲染資料流
本機 JSON（200 KB 上限）或明確標示的 demoPage Fixture → PageSchema 前置容量／循環檢查 → strict Zod 遞迴驗證 → 全樹 ID／anchor 驗證 → reconcilePage → PageRenderer → componentRegistry → React DOM。
最多 200 節點、深度 10、30 個頂層 Section。未知類型、屬性、效果、錯誤網址、缺少資產一律拒絕整頁；錯誤訊息使用固定文案，不回傳解析例外細節。渲染例外由 Error Boundary 捕捉，新輸入可恢復。

src/PageRenderer.tsx 內 componentRegistry 僅映射受控語意標籤與 CSS 類別；沒有動態套件載入或資料指定的 React 元件。animationRegistry 定義六個 Preset，以驗證後數值建立內部 keyframes。進場效果合併 opacity／transform 避免互相覆寫；滑入、縮放、淡入進入視區時播放，hover 效果以 CSS 實作，Stagger Reveal 對直接子節點依序播放。reduced-motion 停用／取消動畫；不支援動畫 API 時仍顯示內容。

所有節點保留 data-page-id、data-page-type、DOM id=page-UUID；componentIdFromElement 將任意內部 DOM 對應最近的節點。reconcilePage 使用穩定 ID 與內容比較，共用未修改分支；遞迴 RenderNode 使用 React.memo，修改路徑的祖先會更新，未變動子元件跳過渲染（有 registry 存取計數測試）。Phase 3 已加入 Patch 引擎；矩形框選尚未實作。

## 工作台整合
App 保持 CanvasSpec、選取與歷史；Preview 持有獨立且驗證過的 PageSpec Session 與尺寸，不回寫草稿。切換保留預覽輸入；Phase 4 重新整理會恢復已保存的頁面，沒有紀錄時才顯示未儲存範例。預覽隱藏草稿編輯工具與側欄，並停用草稿鍵盤操作。
src/Preview.tsx 提供桌面／375px 手機框（窄視窗自動縮至可用寬度）、載入本機 JSON、還原範例與重播。頁面以 container queries 而非 host viewport 決定布局；內容採 Flex/Grid，沒有以 Canvas 座標排列成品。
src/pageFixtures.ts 是涵蓋九種元件與六種效果的固定測試範例，不是生成器。public/assets/workspace.svg 為內建示意資產。
Phase 5 新增本機生成後端與 OpenAI Adapter；仍無雲端儲存、匯出或正式部署。

## 開發
npm ci --cache /workspace/.npm-cache；npm run dev；npm run typecheck；npm test；npm run test:e2e；npm run build；npm run check:secrets。
Playwright 使用 /usr/bin/chromium（CHROMIUM_PATH 可覆寫），自啟停 Vite；測試前停止自己占用 5173 的開發服務。截圖在 test-results/。


## Phase 3：結構化 Patch
src/patch.ts 為不依賴 React 的 TypeScript Engine。批次格式為 schemaVersion:1、sessionId、baseRevision、patches（1–20 項）；每項具 operation、targetId、payload。這是 Patch 協定版本，PageSpec 仍為 v2。
六種 discriminated union 操作：set-text、set-property、set-style、attach-effect、update-effect、remove-effect。set-property 只接受 heading.level、button.href、image.src/alt、grid.columns；樣式只接受既有五個 Token；不支援 ID、type、children、任意 JSON Path 或樹編排。文字僅用於 heading／paragraph／button，拒絕標記與事件／javascript: 字串。
呼叫 applyPatchBatch(session, unknownBatch, allowedTargetIds) 必須獨立提供允許的 ID；不可把不可信批次宣稱的範圍當作授權。UI 僅傳入目前選取的 heading ID。未來 AI 使用同一路徑，呼叫端／服務端仍須自行確認使用者授權範圍。

流程：Payload 容量／深度／特殊鍵檢查 → strict Patch Schema → Session／revision 一致性 → 全頁 Schema／唯一 ID → target 與獨立 scope → 在暫存樹中套用各項 → 每步及完成後全頁驗證 → reconcilePage 共用未變更分支 → diffPages 與 validateScope 檢查 → 單次提交歷史 → Renderer 再驗證並顯示。
失敗回傳 ok:false、固定 code／error 與原 Session，沒有部分提交。成功回傳 before／after、changes（targetId/property/before/after）、changedIds、affectsOtherComponents:false（指範圍外的資料），及新 Session。沒有實質 Diff 時沿用原 Session，不增加 revision 或清除 redo。
Diff 比較元件自己的欄位、各 style Token、每個 effect 與參數；另檢查頁面設定、節點類型、ID／children 順序、效果順序。樹或頁面設定變更不在本輪授權範圍，直接拒絕。結構共用保留未改節點、metadata 與 responsive 的引用。

## 歷史與選取
src/history.ts 提供共用 generic History<T>、commitHistory、undoHistory、redoHistory（80 次），供 CanvasSpec 與 PageSpec 各自使用；兩者沒有共用狀態。src/spec.ts 保留原 Canvas API 與驗證。
PageSession 包含獨立 UUID、單調遞增 revision、history、最近 Diff。一次批次只產生一個版本；Undo／Redo 也增加 revision，避免退回舊畫面時誤接受舊 Patch。載入另一頁／還原範例建立新 Session UUID；重播動畫不重設 Session。
Renderer 根節點以 event delegation 取得 data-page-id，Preview 僅允許選取 heading。標記選取狀態不寫入 PageSpec，也不為每個子元件增加選取 context。原有按鈕／連結互動維持有效；鍵盤可用標題選單選取。
選取後才顯示屬性面板，UI 僅編輯標題文字與 Fade In 時長／附加／移除。所有變更透過同一 Engine；Diff、撤銷／重做依真實 Session 產生，未加入 AI 或假歷史。

## 父層與視覺影響原則
目前 scope 保證資料範圍，不保證其他元素的像素位置不變；文字高度、字級與 gap 可導致正常流式 reflow。UI 因此稱「其他元素資料未變更」。
未來若修改要變更父層或其他元件資料，必須事先列出額外 ID／欄位與原因，取得該次操作的明確授權，擴大可信 scope，再以整批驗證／單次歷史套用；不可由 AI 或 Engine 自行推測擴張。不在本輪實作跨元件重排、AI Orchestrator、矩形選取；本機頁面儲存另見 Phase 4。


## Phase 4：本機頁面保存
共用 sketch2site IndexedDB，由版本 1 升級到 2，只新增 pages、pageBackups Object Stores，保留 drafts/current 不變。現有工作台只有一份本機專案，PageSpec 使用固定 projectId=local-project；未新增多專案管理。
pages 的 key 為 projectId，紀錄欄位為 projectId、schemaVersion:1（儲存封套版本）、pageSpec（PageSpec v2）、revision（非負安全整數）、writerSessionId（UUID）、updatedAt（ISO UTC）。不儲存 Undo/Redo、Diff、檔名、Prompt、憑證或其他秘密。
src/pageStorage.ts 在保存與讀取時驗證 strict PageRecordSchema，包含完整 PageSchema。不存在的 key 回傳 null，null／缺欄位／不支援版本／非法頁面回傳固定錯誤；沒有猜測性欄位遷移。

### 保存流程與一致性
src/usePagePersistence.ts 接管 Preview 原有單一 Session state，沒有增加第二套頁面狀態管理。載入完成前不顯示 Fixture／Renderer，也不接受修改；沒有紀錄時只顯示未儲存範例，不自動寫入。
成功的 Patch、Undo/Redo、明確載入／替換頁面會排入 src/pageSaver.ts：每個工作階段最多一筆進行中的寫入與一筆最新待存快照，連續修改合併，較舊 revision 不再入列。無長時間 debounce，也不逐鍵寫入。
savePage(snapshot, expectedToken) 在同一個 readwrite transaction 中讀取現有紀錄、驗證、比對 expectedToken 的 revision 與 writerSessionId，再寫入更高 revision。沒有紀錄必須搭配 null token。transaction.oncomplete 才確認成功及推進 token，request.onsuccess 不是保存成功。
同基準的兩個分頁只會有一個寫入成功；另一個停止保存、保留記憶體修改並提示重新載入，不自動合併或改用最後寫入者勝出。成功快照若仍有新版排隊，不顯示舊版的「已儲存」。失敗保留最新待存內容，使用者可重試；衝突不提供盲目覆寫重試。

### Session／revision
每次載入已保存頁面都產生新 sessionId，revision 繼承保存值，歷史從當前快照開始，Undo/Redo 不跨開啟工作階段。下一次修改繼續 revision+1，仍通過 Phase 3 的 session／revision Patch 檢查。
writerSessionId 是前一次寫入者的相容性 token，不是獨占鎖或使用者認證。新分頁只是讀取不會搶占其他分頁。舊 Session 的晚到寫入仍必須比對舊 token，不能覆蓋已由新 Session 提交的資料，即使它自己宣稱更高 revision。
載入／重新開始／卸載會關閉舊佇列，generation fence 丟棄過期的載入與回呼；已進行的原生交易不假裝可以跨分頁取消，而由 CAS 保護。外部檔案讀取也核對 load sequence、Session 與 revision，避免讀檔期間的舊結果取代新編輯。

### 損毀資料及失敗
損毀／不支援版本不進入 Renderer、不自動覆蓋／刪除，禁用修改。可重試載入；確認「以範例重新開始」後，在 pages + pageBackups 的單一交易中保存完整原始值與 archivedAt，再建立明確標示的範例紀錄。備份或替換任一步失敗整筆回滾；若其他分頁已修復為有效紀錄，重新開始操作拒絕覆寫。
pageBackups 可由瀏覽器開發者工具診斷與手動復原，不直接渲染備份內容。本輪沒有備份管理 UI 或自動遷移。
重新開始是明確的新內容分支，使用新 UUID／revision 0，舊 token 因 writer 不符而失效；一般重新載入不重置 revision。有效頁面若被範例或檔案取代，需確認，並繼續更高 revision。
儲存失敗不移除記憶體中的頁面；狀態列顯示儲存中／已儲存／尚未儲存／失敗／衝突與必要操作。尚未提交時離開會提示；不承諾瀏覽器強制結束能保留未完成寫入。


## Phase 5 生成引擎
src/generation.ts 提供 prepareIntent、受控 LayoutSchema、materialize、verifyPreservation 與回應 DTO；沿用 CanvasSchema／PageSchema v2、Component／Animation Registry，沒有第二個 Renderer。
CanvasSpec v1 的相容擴充：heading、image、受控內建資產路徑、button.href（可缺少或 null）及六種動畫。legacy lift 明確映射 hover-lift，不偷偷替換未知動畫；canonical 重複效果拒絕。圖片仍只支援既有內建示意 SVG，沒有私人圖片上傳／遠端資產抓取。生成前按鈕必須有明確合法連結，Stagger Reveal 目前只允許 Card（具有子元素）。
生成輸入上限 40 元素、合計 12000 字元、HTTP body 32768 bytes；較大的草稿仍可編輯／保存，但生成需縮小。支援 constraints: typography:sans/serif、layout:stack/grid，其餘限制或矛盾組合明確拒絕，不假稱理解任意自然語言限制。
prepareIntent 保留原 ID、內容、座標尺寸、層級、資產、連結、動畫及畫布資訊；計算正規化座標、最近三個元素的距離／同列線索，100px 水平帶作候選分組，不直接決定成品布局。傳模型時省略重複的完整 Canvas 副本。
模型只決定 sections 的 Stack／Grid、columns、gap、來源 ID、heading/paragraph 呈現及少數 Token；不能回傳文案、URL、圖片、事件、HTML、CSS 或程式。Converter 從原始來源逐字恢復內容、功能、素材與指定動畫，建立 wrapper UUID，保留來源 ID；Card 內容放在其唯一受控 Paragraph 子節點。未知／遺漏／重複來源、錯誤類型／限制／額外內容／動畫／資產皆拒絕。
LayoutSchema 是 Provider 中間協定，不取代正式 PageSpec。輸出先驗證中間協定，再驗證完整 PageSpec、來源／內容／動畫保留；前端收到回應也驗證 PageSpec 與保留條件。不把模型輸出直接當 React props 或程式碼。

## Provider 與本機 API
server/provider.ts 使用官方 OpenAI Node SDK 7.53.0、Responses API、strict JSON Schema、store:false、max_output_tokens:4096、maxRetries:0、30 秒 timeout，無 tools。Phase 5.1 將預設改為 gpt-6-luna 待核實候選，另允許另行授權的 gpt-6.1-sol；停用舊 gpt-4.1-mini 家族。SDK enum 與 fake transport 合約已確認；真實模型可用性／strict Schema 支援／推理預設／輸出品質 NOT TESTED。
官方 SDK 來源：https://github.com/openai/openai-node （含 src/resources/shared.ts、Responses JSON Schema 型別）。官方模型／價格頁 https://developers.openai.com/api/docs/models/gpt-4.1-mini 、https://openai.com/api/pricing/ 在本環境遭 HTTP CONNECT 403，沒有宣稱已核對當日價格。
必須在後端配置金鑰、SKETCH_AI_ENABLED=true、SKETCH_AI_MODEL_REVIEWED=true、SKETCH_AI_PRICING_REVIEWED=true、經核對一般／cached input／output 費率及明確的單輪預算才能啟用；缺少任一設定回傳 NOT_CONFIGURED。詳見 .env.example。費率不硬寫為當日官價，不使用昂貴模型 fallback。測試中的 0.4／1.6 是測試運算資料，不是當日價格承諾。
server/api.ts 使用 Node 原生 HTTP，server/index.ts 僅監聽 127.0.0.1:8787。GET /api/generation/status 提供啟用狀態與 CSRF nonce、設定 HttpOnly SameSite=Strict 本機 session cookie；POST /api/generation 驗證 Host、loopback peer、固定前端 Origin、Fetch Metadata、cookie + CSRF、application/json、請求與內容限制。
所有成本控制在後端：併發 1、3 次／分鐘、5 次／程序、4096 output tokens、30 秒逾時、相同 requestId 去重；預估保守預留上限 $0.10／請求、$0.25／程序。依 UTF-8 byte 上界 + schema／protocol margin 估計 input tokens，失敗也不退還不確定的預留額度。逾時先 abort，若 Provider 尚未真正 settle，維持 busy，不開放下一個並行呼叫。
成功記錄 requestId、延遲、Provider 回報 Tokens 與設定費率的 estimatedCostUsd；失敗只記錄固定 outcome、延遲與預留估計。不是帳單或供應商硬額度；重新啟動程序會重設本機限制，公開服務前仍需真正身分驗證、持久預算及平台費用上限。
Vite 前端及 API 預設均 loopback，以 /api/generation proxy 同來源連線；不提供公開部署。npm run dev 啟動前端，另一終端 npm run dev:api 啟動後端。NODE_USE_ENV_PROXY=1 保留雲端代理／CA 行為，不關閉 TLS 驗證。

## 候選及提交
App 維護遞增 Canvas 版本（即使 Undo 回到同內容也視為新版本），生成開始保存 Canvas version + 目前 PageSession/revision。生成中可繼續編輯；結果完成時重新比對，過期即拒絕，不混充最新草稿。
src/CandidatePreview.tsx 只以既有 PageRenderer 顯示經驗證候選，可切桌面／手機或返回草稿；未確認不寫入正式頁面或 IndexedDB。Mock 顯示「測試生成（非 AI）」，正式呼叫才顯示生成候選。無假百分比或思考過程。
確認時 usePagePersistence.acceptGeneration 再比對 target；停止舊 saver，使用同一 savePage/CAS/token 寫入 revision+1，新 Session 僅在交易成功後取代目前正式頁面；以既有 History 工具保留前一有效頁面與有界歷史，確認生成後仍可用原 Undo/Redo 還原／重做，重新載入才清空記憶體歷史。保存失敗保留候選與原正式 Session／資料；跨分頁 CAS 衝突要求重新載入，不能盲目覆寫。沒有建立新儲存系統或完整生成版本 UI。
tests/generation-server.ts 與 tests/fixtures/generation.ts 僅供 Playwright 注入 Mock Provider，production index.ts 沒有 Mock 選項。測試以 8788 測試服務搭配隔離瀏覽器資料，不使用真實金鑰；正式後端維持 8787。


## Phase 5.1：正式評估準備（BLOCKED）
configFromEnv 保持 fail-closed。SKETCH_AI_MODEL_REVIEWED 代表已核對官方 ID、Responses／strict JSON 子集、reasoning 預設與 Project 權限，不是僅確認 SDK 型別。當次四個官方文件頁 CONNECT 403，所以仍不啟用；沒有新增猜測的 reasoning.effort 或昂貴 fallback。SDK 7.53.0 已列兩候選，不需升級依賴。
SKETCH_AI_MAX_CALLS 預設 1，只允許 1–5；SKETCH_AI_BUDGET_USD 無預設，需正值且不超過 $0.25。server/index.ts 將兩值傳入既有後端 limiter，不另建付費端點或公開服務。既有單次 $0.10、輸出 4096、30 秒、併發 1、零重試不變。這些配置不構成付費授權；先驗收第一份，失敗停止，不能重啟繞過配額。
Provider 保留已取得的 input／cached input／output／reasoning tokens；拒答、不完整或轉換失敗也以固定錯誤碼記錄數字。未知值為 null。估計費用以 uncached input × 一般價 + cached input × cache 價 + output × 輸出價；reasoning 包含在 output，不重複計價。預留仍使用全額一般輸入價，不先假設 cache 命中。
五份測試保留原內容與位置，改為固定 UUID／anchor，SHA-256／元素／動畫數記於 docs/generation-fixtures.json。npm run generation:preflight 僅離線輸出 metadata／指紋／預留，不讀 .env、不呼叫模型。正式測試／評分計畫與阻礙見 docs/GENERATION_EVALUATION.md；本輪零真實呼叫。

## Phase 6：視覺編輯
Preview 延伸同一 usePagePersistence／PageSession、PageRenderer、Patch Engine；不讀取或寫入 CanvasSpec，不建立第二套 Renderer 或 Patch。候選仍需先經既有確認／CAS 保存，才進入正式預覽編輯。

選取狀態為記憶體中的穩定 UUID 陣列；單擊以 componentIdFromElement 找最近的元件，矩形從空白／Section、Container、Stack、Grid 的空間開始，採「完全包含」規則，只納入 Heading、Paragraph、Button、Image、Card。容器可單擊選取；框選可同時辨識 Card 與其完全包含的子元件。多選只顯示摘要，單選才可修改。空白點擊及 Esc 清除選取，Esc 另回瀏覽模式。Resize／scroll／縮放以 DOMRect 對應 local CSS pixels，選取外框沿用元件自身 outline，不依賴 DOM 順序。

VisualSurface 為可信編輯控制層，包住原 PageRenderer；原生 Pointer Events 處理框選／筆跡，SVG 僅畫編輯圖層。Preview 用固定布局寬度 + CSS transform 縮放，外層佔位同步比例，避免 CSS zoom 改變字型排版。工具為 browse／select／pen，選取與畫筆模式攔截內容連結；瀏覽恢復原互動。

Annotation v1：coordinateSpace=preview-css-pixels、id、sessionId、revision、geometry{width,height,scaleX,scaleY}、points[{x,y}]、bounds{x,y,width,height}。座標原點為預覽左上角，不保存螢幕位置、網址或其他瀏覽器資料。上限80筆、每筆2000點，與 PageSpec 完全分離；共用 generic history 實作註記撤銷／清除（清除可撤銷）。只保留本次記憶體，重新載入／更換 Session 清空。版本或排版尺寸不同時隱藏並提示，避免把舊筆跡錯貼到新布局；純縮放維持定位，未實作跨版面自動重新錨定或註記持久化。

屬性表單僅提供文字（標題／正文／按鈕）、標題level、對齊及動畫，沒有任意字級／字重／CSS 或自然語言送出。所有修改以目前 Session／Revision 與獨立可信單一 target scope 進入 applyPatchBatch；既有全頁驗證、Diff、Undo/Redo、saver／CAS 皆保留。

動畫效果庫從既有 animationRegistry 取六個 Preset，以專用 MIME 的 effectId 拖放；以穩定 ID 找目標，綠色虛線表示可放置，紅色表示不相容或重複。attach／update／remove 皆走同一 Engine；更換以 remove+attach 原子批次提交，一次 Undo 還原。effectCompatible 與 PageSchema 一致拒絕無子元件的 stagger-reveal，其他進場／hover組合沿用原 Registry 合成規則，拒絕重複效果。重播仍使用原 Renderer／Web Animations 與 reduced-motion。

## Phase 6.1：工作台呈現整理
保留既有Canvas、PageSpec、Renderer、Animation Registry、Patch、History與IndexedDB CAS。App與Preview只重排控制項：Preview透過React portal將頁面來源／保存狀態／次要選單放入App應用列，沒有新增後端、狀態儲存或付費呼叫。Preview仍持續掛載，模式切換不丟失Session／Revision。
WorkbenchMenu為原生details選單，處理外部點擊、Esc與操作後關閉。WorkbenchIcon只含程式碼內固定SVG路徑。AnimationLibrary由草稿與預覽共用，僅列既有六個Registry Preset；小型示意使用可信、記憶體內的PageSpec與原PageRenderer，懸停／聚焦才附加效果，不另建動畫系統，示意ID與正式頁面分離且不持久化。
共用工具區的呈現分頁不改動資料合約。預覽元件清單使用穩定ID；窄視窗預設關閉，開啟時明確提供關閉按鈕，原Canvas／PageSpec編輯器各自保持原資料狀態。拖放開始時收退窄側欄、drop／dragend／取消時清除視覺狀態，防止拖曳結束後側欄仍越界。
屬性輸入暫存保留於Preview；切換素材分頁或附加動畫不丟棄尚未套用的文字。來源欄位真的改變、Undo／Redo或更換選取時以有效資料同步；文字／對齊／標題層級與已附加效果的時長，由單一套用建立既有原子Patch批次。附加、替換、移除仍是各自明確操作，均沿原Session／Revision／trusted scope驗證；沒有擴大scope或直接寫入PageSpec。測試對應更新為新選單路徑與真實操作次數，未移除原回歸情境。
workbench.css僅為編輯器chrome配置，沿用既有Design Tokens，於Renderer樣式之後載入；成品PageSpec的樣式Token與Renderer合約未變。量測與驗收報告見docs/PHASE61_UI_REVIEW.md。

## 免費MVP：獨立React匯出
PageRuntime.tsx與pageRuntime.css是原Renderer抽出的純執行部分，工作台PageRenderer僅包覆選取控制，不建立第二個渲染／動畫系統。exportProject先驗證目前PageSpec，再以固定模板、受限路徑及ZIP STORE封裝runtime、Schema、純頁面Tokens、page.json、必要資產及鎖定依賴。文字不拼進HTML／JS；HTML入口固定，標題用DOM property，內容仍由React文字插值。匯出不含編輯器、後端、Prompt、Session／Revision、草稿或註記。
匯出項位於預覽「頁面」選單。使用Vite relative base與container root，支援獨立靜態呈現與手機欄位布局。首次npm ci需npm網路，網站執行不依賴Sketch2Site。ZIP路徑拒絕絕對／相對跳脫／重複路徑，檔案／總量受限。

### 本機素材
IndexedDB v3 新增 assets store，既有 draft/pages CAS不變。PNG/JPEG 經實際簽章、CRC、尺寸檢查及瀏覽器解碼，再縮至最長1600px、重編碼PNG；SHA-256固定路徑保存，不保存原檔名或原始metadata。Renderer以生命週期受控blob URL呈現，正式匯出包含驗證後PNG與相同Runtime；註記不匯出。
