# 安全邊界
本輪沒有後端、付費 API 或憑證。資料留在瀏覽器 IndexedDB，僅手動儲存；清除網站資料會刪除草稿，同來源其他程式可讀取。無雲端備份、多分頁衝突合併或帳號隔離。
所有資料含本機讀取皆經 strict Zod Schema，限制節點／文字／數字／動畫／欄位，拒絕重複 ID、超界位置、不支援階層。React 文字插值，不使用 innerHTML、eval 或模型執行；URL 合約僅允許 HTTPS 或本頁 anchor。外部圖片與網路資產尚未開放；Phase 2 的連結限制見下方。
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
Preview 不取得環境變數、秘密、IndexedDB 操作或主工作台修改 callback；只渲染驗證的內容。以受控數值建立動畫與 CSS 變數，沒有 eval、Function、innerHTML 或任意 CSS 字串。
目前預覽與主網站同來源，並非程式執行沙箱；安全性依賴嚴格資料合約與可信 Renderer。未來若加入任意 HTML／JS、第三方嵌入、遠端資產或自訂事件，必須重新評估 XSS、SSRF、資料外傳與來源隔離，必要時採不同來源、限制權限的沙箱；不可直接放寬現有 Registry。
原始 JSON 僅在記憶體，錯誤只顯示固定原因，不顯示檔名、堆疊、內部路徑或任意輸入片段。開發者工具仍可檢查已傳送內容，不宣稱預覽能藏住前端資料。


## Phase 3 Patch 信任邊界
Patch 一律視為不可信。外層／payload／參數均 strict；最多 20 操作、2000 個走訪項目、8 層、16000 字元。拒絕循環／重複物件參照及 __proto__、constructor、prototype 鍵；不使用任意路徑 setter、eval、Function、HTML 注入或動態元件。
變更屬性用明確 switch，僅允許類型對應欄位與既有 Token／Preset。URL 與資產沿用 PageSpec 白名單。文字 Patch 對網頁標記、事件賦值與 javascript: 字串安全拒絕；這是輸入限制，不是 HTML sanitizer；Renderer 仍將內容當純文字。
授權 ID 由可信呼叫參數 allowedTargetIds 提供，不由 Patch Payload 指定。預覽 UI 僅授權選取的標題；原始頁面與每步暫存結果均驗證完整 Schema，拒絕重複／有歧義 ID。最終 Diff 再確認沒有未請求的欄位、元件或全頁／樹變化。
整批只在全部成功後發布一個新狀態。失敗保持原參照、revision、歷史與預覽；沒有秘密、環境變數、系統設定或 Registry 可寫入欄位。
sessionId + 單調 revision 防止過期操作，包括 Undo／Redo 後重用舊版本及跨載入 Session 重播。這是本機一致性控制，不是身分認證；未來後端必須另驗證使用者資源權限與可信 scope，AI 不得繞過此流程。
PageSpec 仍為記憶體資料；CanvasSpec 的 IndexedDB 與撤銷狀態完全獨立。Diff 的範圍保證針對資料，非像素：合法文字或 gap 修改仍可能造成流式排版位移。
錯誤回傳固定分類／文案，不把內部堆疊、原始 Payload、路徑或任意例外訊息放進 UI。未建立雲端 API，跨使用者授權、認證與付費成本保護仍 NOT TESTED。
