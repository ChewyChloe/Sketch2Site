# 安全邊界
Phase 5 新增本機生成後端與可選付費 Provider Adapter；金鑰可由後端秘密配置，真實 API 仍未啟用。資料留在瀏覽器 IndexedDB，CanvasSpec 手動儲存、PageSpec 自動保存；清除網站資料會刪除草稿，同來源其他程式可讀取。無雲端備份、多分頁衝突合併或帳號隔離。
所有資料含本機讀取皆經 strict Zod Schema，限制節點／文字／數字／動畫／欄位，拒絕重複 ID、超界位置、不支援階層。React 文字插值，不使用 innerHTML、eval 或模型執行；URL 合約僅允許 HTTPS 或本頁 anchor。只有使用者明確按「生成網站」且後端已啟用時，必要結構化草稿才傳至 OpenAI；不傳整個專案或其他本機紀錄。外部圖片與網路資產尚未開放；Phase 2 的連結限制見下方。
PageSpec v2 透過 strict 驗證及受控 Registry 渲染；不得執行任意 JS、Shell、安裝套件或讀取伺服器檔案。
秘密不得放入 VITE_* 或前端回應；.env 忽略、.env.example 無金鑰；production 不產生 source map。check:secrets 使用測試 canary 掃描 build，但不取代完整秘密稽核。
開發伺服器提供 CSP、nosniff、Referrer-Policy；正式部署須自行在主機設定相同 CSP（移除開發 ws）及 HSTS、frame-ancestors，未設定不得聲稱正式部署完成。inline style 為畫布位置所需，開發用 Vite React preamble 使用固定的 dev-only nonce（不可作為 production 安全機制）；正式主機必須使用 script-src self、移除固定 nonce。
## 後續必須完成
公開付費 AI API 前需真正服務端認證、授權、輸入上限、速率／並行／成本限制、逾時與有限重試；CORS 不是認證。API 不返回堆疊或秘密。外部資產須處理 SSRF、惡意 URL 與使用者同意；自訂程式需另來源沙箱。
## 驗證
Schema 測試拒絕未知程式欄位、惡意 URL、不合法效果、重複 ID、超界。瀏覽器測試確認 HTML 字串只顯示為文字。安全結果與依賴稽核見 STATUS.md。未實作 API 的防護測試 NOT TESTED。

## Phase 2 Renderer 信任邊界
PageSpec、檔名與本機內容都不可信。UI 限制 200 KB；PageSchema 在遞迴驗證前限制物件深度、項目及字元總量，拒絕循環參照，再驗證整頁 200 節點／10 層、UUID 唯一性與 anchor 目標。
僅九種型別、特有欄位與六種動畫，所有物件 strict；拒絕任意 style、html、onclick、script、iframe、未知屬性與不合法效果參數。HTML／事件字串出現在 content 時，React 將其顯示為純文字，不嘗試過濾成可執行 HTML。
圖片只允許 /assets/workspace.svg，其他來源、data:、相對任意路徑、缺少資產均拒絕。資產檔由應用開發者維護；不接收使用者 SVG 或遠端圖片，不產生伺服器端 URL 抓取。
連結只允許有效元件 UUID anchor，或 HTTPS 的 learn.microsoft.com / example.com，禁止 userinfo、非預設埠、其他主機與協定。擴充網域需程式碼檢閱。外部連結使用新分頁、noopener noreferrer；本頁連結只在預覽根節點尋找 UUID 目標，不操作主工作台。E2E 將外部目標攔截為本地測試回應，不依賴網站可用性。
Renderer 不取得環境變數、秘密、IndexedDB 操作或主工作台修改 callback；只渲染驗證的內容。可信 Preview 控制層可透過保存模組讀寫本機頁面。以受控數值建立動畫與 CSS 變數，沒有 eval、Function、innerHTML 或任意 CSS 字串。
目前預覽與主網站同來源，並非程式執行沙箱；安全性依賴嚴格資料合約與可信 Renderer。未來若加入任意 HTML／JS、第三方嵌入、遠端資產或自訂事件，必須重新評估 XSS、SSRF、資料外傳與來源隔離，必要時採不同來源、限制權限的沙箱；不可直接放寬現有 Registry。
原始匯入 JSON 不額外保存，Phase 4 僅將驗證後 PageSpec 納入本機紀錄；錯誤只顯示固定原因，不顯示檔名、堆疊、內部路徑或任意輸入片段。開發者工具仍可檢查已傳送內容，不宣稱預覽能藏住前端資料。


## Phase 3 Patch 信任邊界
Patch 一律視為不可信。外層／payload／參數均 strict；最多 20 操作、2000 個走訪項目、8 層、16000 字元。拒絕循環／重複物件參照及 __proto__、constructor、prototype 鍵；不使用任意路徑 setter、eval、Function、HTML 注入或動態元件。
變更屬性用明確 switch，僅允許類型對應欄位與既有 Token／Preset。URL 與資產沿用 PageSpec 白名單。文字 Patch 對網頁標記、事件賦值與 javascript: 字串安全拒絕；這是輸入限制，不是 HTML sanitizer；Renderer 仍將內容當純文字。
授權 ID 由可信呼叫參數 allowedTargetIds 提供，不由 Patch Payload 指定。預覽 UI 僅授權選取的標題；原始頁面與每步暫存結果均驗證完整 Schema，拒絕重複／有歧義 ID。最終 Diff 再確認沒有未請求的欄位、元件或全頁／樹變化。
整批只在全部成功後發布一個新狀態。失敗保持原參照、revision、歷史與預覽；沒有秘密、環境變數、系統設定或 Registry 可寫入欄位。
sessionId + 單調 revision 防止過期操作，包括 Undo／Redo 後重用舊版本及跨載入 Session 重播。這是本機一致性控制，不是身分認證；未來後端必須另驗證使用者資源權限與可信 scope，AI 不得繞過此流程。
Phase 3 的記憶體 PageSpec 在 Phase 4 增加本機持久化；CanvasSpec 的 IndexedDB store 與撤銷狀態仍完全獨立。Diff 的範圍保證針對資料，非像素：合法文字或 gap 修改仍可能造成流式排版位移。
錯誤回傳固定分類／文案，不把內部堆疊、原始 Payload、路徑或任意例外訊息放進 UI。未建立雲端 API；Phase 5 本機安全限制見下方，跨使用者授權與正式公開部署仍 NOT TESTED。


## Phase 4 IndexedDB 信任邊界
IndexedDB 是使用者瀏覽器內、同來源的儲存空間，使用者可透過開發者工具查看及修改。此處資料沒有宣稱已加密，不能替代伺服器端認證或授權；清除網站資料／瀏覽器清理會刪除頁面、草稿與損毀備份。未來雲端專案必須另行設計後端存取控制。
所有 pages 讀取與寫入都驗證封套及完整 PageSpec，不以「已在本機」為信任理由。Renderer 仍使用白名單驗證，Patch 修改仍走唯一 Engine；保存不提供寫入事件、程式、任意設定或秘密的旁路。
sessionId 是本機編輯生命週期識別；revision 是遞增的資料版本；writerSessionId + revision 是原子交易的樂觀鎖 token。它們不是登入憑證、不能證明使用者權限，也不防止本機擁有者自行竄改合法紀錄。
保存前在同一筆交易驗證現有資料及預期 token，拒絕舊版本與其他分頁的 stale writes。交易完成前不得顯示「已儲存」；舊佇列／載入回呼經 generation fence 與 CAS 保護，關閉 Session 不代表已取消所有原生交易。
損毀／舊版本紀錄停用 Renderer 與自動寫入，不自動清除。確認重新開始才原子備份原始值並替換，備份仍是不可信資料，禁止直接執行／渲染。配額或中斷時回滾，無法備份就不替換原始資料。
本機保存模組不將內容上傳、置入 URL、列印完整 Console 或嵌入憑證。Phase 5 的明確生成操作僅傳必要草稿資料，其他紀錄不傳。錯誤使用固定分類與文案，不回傳原始資料或內部路徑。
本輪測試使用 fake-indexeddb（僅 devDependency）及隔離的 Chromium contexts／臨時 persistent profile；QuotaExceededError、AbortError、權限拒絕使用受控注入，不刻意耗盡真實磁碟或變更使用者瀏覽器設定。


## Phase 5 Provider／生成 API 邊界
SKETCH_AI_API_KEY（可沿用後端 OPENAI_API_KEY）僅後端環境使用，.env 忽略，禁止 VITE_*。SDK 固定 https://api.openai.com/v1，logLevel:off、不載入其他服務金鑰；金鑰不放入 Prompt、PageSpec、HTTP 回應、IndexedDB 或前端建置。check:secrets 亦檢查內部系統 Prompt 標記未進入瀏覽器產物。
API 只回傳 requestId、驗證後 PageSpec、最小 usage、live/mock 模式；錯誤只傳固定 code。拒絕／逾時／不完整／不合法輸出都保留原資料，不回傳上游 error stack、原始輸出或私密設定。伺服器只記錄用量數字與 UUID，不記錄草稿／Prompt／金鑰。
Canvas 文字是 user JSON 資料，與 developer 系統規則分開；模型沒有檔案、Shell、工具、資料庫或 URL 抓取能力。真正防護是模型從未獲取秘密、只接受受控布局協定，以及獨立 PageSpec／來源／內容／效果檢查，不能只靠 Prompt 裡的禁止文字。
模型不能自行新增內容或事實：中間協定沒有文案／URL／asset 欄位，來源逐字由程式還原。未知 ID、額外合成內容／元素／動畫、錯誤來源類型、非法資產／URL 都拒絕；不得刪除使用者節點以通過驗證。不聲稱能判斷使用者自己提供的事實真偽。

### 本機防濫用與成本
API 與 Vite 預設 loopback；Host／peer／Origin／Fetch Metadata 驗證防跨站與 DNS rebinding；POST 另需同一個 HttpOnly SameSite=Strict cookie 與 CSRF nonce。這是本機 browser capability，一般本機程序／主機擁有者仍可呼叫，不是會員身分認證；CORS 不是認證。
請求 32768 bytes、元素 40、總內容 12000 字元、Canvas 平面深度、各欄位長度與完整 Schema 都在後端限制。固定輸出 4096 tokens、30 秒 timeout、0 retries、1 併發、3/min、5/process，requestId 去重。逾時未 settle 的 Provider 不釋放併發鎖。
成本是依經營者核對費率的保守預留估算：每請求至多 $0.10、每程序 $0.25，失敗不退還不確定預留額度。不是供應商帳單保證，程序重啟會重設；正式公開前必須另設真正認證、授權、持久預算與供應商費用上限。本輪沒有公開部署。
價格頁 CONNECT 403、金鑰缺失且沒有真實付費測試授權，因此預設保持停用；不繞過網路政策。未來真實使用需允許 api.openai.com，以及可讀官方模型／價格文件的目的地主機；在環境設定安全提供金鑰，不能在聊天中貼值。

### 候選隔離
候選只在記憶體，經使用者確認才走原 IndexedDB CAS 提交；先檢查 Canvas version 與 PageSession/revision，交易成功前不替換正式 Session。失敗仍留候選與原資料；原生交易與其他分頁競爭由同一 CAS 保護。候選離頁會提示，但不保證強制關閉能保留未保存候選。
Mock 只由測試程式注入，正式 API 不提供選 Mock 的請求欄位或環境捷徑。所有 SDK tests 使用 fake fetch，所有 Browser tests 使用 Mock Provider；不可將其結果稱為真實 AI 設計品質。


## Phase 5.1 付費驗收規則
本輪指令明確不授權付費呼叫；環境中有 Key 或旗標為 true 也不構成授權。正式測試前須核對官方模型／結構化輸出／reasoning 設定／當日價格，列明請求次數、token 預留與金額，並確認使用者已檢查 API Project 支出限制，再取得明確授權。不得購買額度、修改帳務或開自動儲值。
新增 model review gate；預設 Luna 僅為候選，Sol 不自動使用，舊模型不再允許啟用。SKETCH_AI_MAX_CALLS 預設 1，上限 5；SKETCH_AI_BUDGET_USD 必填且不超過 $0.25，不能超過核准金額。失敗也消耗呼叫與保守預留，不重試、不重啟繞過限制；第一份失敗停止正式測試。
.env 只由後端 npm run dev:api 的 --env-file-if-exists 載入；由使用者自行安全編輯或環境秘密設定供應，不能貼入聊天、Issue、報告或 VITE_*。Project 支出控制未由使用者確認，本輪沒有讀取帳務或測試金鑰。
新增 cached／reasoning 用量欄位與模型名稱僅作安全觀測，失敗時已知用量仍保留；未知 token／費用為 null，不記錄完整上游錯誤、原始輸出或草稿。離線 preflight 只處理專案公開 fixtures，不讀秘密、不連網。未改 Renderer／PageSpec 安全白名單或本機存取限制。

## Phase 6：選取／註記／拖放邊界
選取 UUID、工具模式與 Annotation 都只在可信預覽控制層記憶體中；不加入 PageSpec、CanvasSpec、IndexedDB紀錄、正式 Renderer 或任何匯出內容，不發網路請求。註記最多80筆／每筆2000點，只包含局部座標、尺寸、比例與Session／Revision，不包含金鑰、URL、使用者資訊、螢幕絕對座標或原始DOM。沒有註記匯入／外傳／AI解析；SVG points 只來自受控指標座標，不接受SVG／HTML／CSS字串。
外部拖曳資料視為不可信，只讀專用MIME內的六個Preset ID，重新確認目標存在、動畫相容性與重複狀態，最後仍經既有 strict Patch／全頁Schema驗證。drop目標授權由可信事件與目前元件索引提供，不從Payload推定scope。更換動畫是單一原子批次，失敗不改頁面／歷史；stagger-reveal在無子元件上由Schema拒絕，無動態程式／事件注入。
本輪所有測試僅使用本機Fixtures及Mock Provider；測試程序移除OPENAI_API_KEY／SKETCH_AI_API_KEY並停用正式AI旗標，新E2E攔截外部HTTPS並斷言沒有生成POST。未啟動正式server/index.ts，沒有付費模型、外部AI／圖像生成呼叫或帳務變更。秘密環境已存在不代表啟用或授權。既有Session／Revision／CAS／reduced-motion均保留。
