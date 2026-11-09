# 安全邊界
本輪沒有後端、付費 API 或憑證。資料留在瀏覽器 IndexedDB，僅手動儲存；清除網站資料會刪除草稿，同來源其他程式可讀取。無雲端備份、多分頁衝突合併或帳號隔離。
所有資料含本機讀取皆經 strict Zod Schema，限制節點／文字／數字／動畫／欄位，拒絕重複 ID、超界位置、不支援階層。React 文字插值，不使用 innerHTML、eval 或模型執行；URL 合約僅允許 HTTPS 或本頁 anchor。外部圖片與網路資產尚未開放。
PageSpec 尚未渲染；未來必須經 Registry，模型錯誤安全失敗，不得執行任意 JS、Shell、安裝套件或讀取伺服器檔案。
秘密不得放入 VITE_* 或前端回應；.env 忽略、.env.example 無金鑰；production 不產生 source map。check:secrets 使用測試 canary 掃描 build，但不取代完整秘密稽核。
開發伺服器提供 CSP、nosniff、Referrer-Policy；正式部署須自行在主機設定相同 CSP（移除開發 ws）及 HSTS、frame-ancestors，未設定不得聲稱正式部署完成。inline style 為畫布位置所需，script 不允許 inline。
## 後續必須完成
公開付費 AI API 前需真正服務端認證、授權、輸入上限、速率／並行／成本限制、逾時與有限重試；CORS 不是認證。API 不返回堆疊或秘密。外部資產須處理 SSRF、惡意 URL 與使用者同意；自訂程式需另來源沙箱。
## 驗證
Schema 測試拒絕未知程式欄位、惡意 URL、不合法效果、重複 ID、超界。瀏覽器測試確認 HTML 字串只顯示為文字。安全結果與依賴稽核見 STATUS.md。未實作 API 的防護測試 NOT TESTED。
