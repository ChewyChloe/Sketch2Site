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
無 AI、後端、雲端儲存、憑證、匯出或正式部署。

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
