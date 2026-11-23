# 決策
2026-11-09：本輪只做 Phase 0／最小 Phase 1，不啟用 AI 或付費服務，不推送或部署。
使用原生拖曳與 Pointer Events、CSS Tokens，減少依賴；保持 React／TS／Vite／Zod／IndexedDB 主架構。
以手動保存與明確未儲存提示避免不透明自動寫入；載入失敗不得覆蓋既有資料。
PageSpec v1 是受控平面區塊合約，未來階層與資產擴充需版本遷移。草稿不是成品布局。

2026-11-09（Phase 2）：引入 PageSpec v2 遞迴型別，保留 LegacyPageSchema v1 驗證，但不隱式遷移；CanvasSpec v1 不變。原因：舊平面合約無法表達本輪布局／元件樹，且尚無已儲存的 PageSpec。
使用 Web Animations API／IntersectionObserver 及 CSS Token，替代新增 Motion 依賴；支援同一元素的進場組合、hover、stagger 與動態 reduced-motion 取消。無動畫能力時維持可讀靜態內容。
圖片初版限制內建資產，外部 HTTPS 連結限制兩個程式碼允許的主機。避免本輪引入資產上傳／遠端代理或額外資料外傳。
預覽採同來源受控 React，不新增任意執行沙箱；任意 HTML／JS 仍禁止。固定 Fixture 與本機 JSON 載入皆明確標示，不接 AI。
穩定 UUID + 結構共用 + 遞迴 memo 為後續依 ID Patch 留介面；本輪不建立 AI Orchestrator 或 Patch 引擎。


2026-11-09（Phase 3）：不更動 PageSpec v2／CanvasSpec v1 合約；Patch 使用獨立版本 1 協定。新增 Session UUID 與單調 revision，Undo／Redo 不倒退 revision，避免 ABA 型舊 Patch 覆蓋。
以 generic history 工具共用演算法、分離資料狀態，取代複製兩套 Undo／Redo。原子批次與全頁／範圍驗證是唯一提交路徑；可信 scope 為獨立參數，不由不可信 Patch 自行宣告。
UI 僅實作 heading 與 Fade In，保留既有預覽連結操作與 Renderer。Diff 保證資料範圍，正常排版 reflow 不假稱為完全沒有視覺影響。
Zod 4.6.7 的建置警告來自 v4/core/regexes.js:74 與 util.js:400 的說明註解內含 @__PURE__ 標記，被 Rollup 當成位置不合法的 annotation；真正呼叫上的 PURE 標記不同。未修改 node_modules、依賴版本或抑制警告，避免為非阻斷訊息引入轉譯補丁或套件風險。


2026-11-09（Phase 4）：沿用同一 IndexedDB，升級 DB v2 新增 pages／pageBackups，不改 CanvasSpec、PageSpec 或 Patch Engine 合約。只有一份現有本機專案，固定 projectId，不提前加入多專案／雲端同步。
使用單一進行中寫入 + 最新快照合併及 transaction CAS；不使用時間戳排序、不使用 last-write-wins，也不加入大型狀態管理套件。revision 繼承已保存值，新開啟工作階段使用新 UUID，Undo/Redo 不持久化。
不存在紀錄才顯示未儲存範例，損毀紀錄不做推測遷移。確認後原子保存原始資料備份再重新開始；不增加備份管理或自動合併 UI。備份保留在本機，清除網站資料仍會遺失。
新增 fake-indexeddb 僅作儲存交易單元測試；Chromium E2E 另外驗證實際交易、雙分頁及真正關閉／重新啟動瀏覽器程序。下一正式階段直接進入 CanvasSpec → AI Layout Generation → PageSpec → Renderer，本輪不啟用模型。


2026-11-09（Phase 5）：選單一 OpenAI Responses Adapter，官方 SDK 7.53.0，預定 gpt-4.1-mini-2025-04-14。SDK 型別／fake transport 已確認，但當日官方價格／模型頁 CONNECT 403，未宣稱 live 相容／品質已驗證；無金鑰、啟用旗標、核對費率就停用，不自動切昂貴模型。
模型只輸出簡化布局協定，原文、素材、連結與動畫由程式依 source ID 還原。以拒絕遺漏／重複／不相符資料取代自動修復／額外模型評分，控制成本並避免編造內容。
CanvasSpec v1 採相容擴充明確 heading／image／選填 href 與效果列表，舊紀錄維持可讀；PageSpec v2／Renderer／Patch Engine 不重建或放寬。資產沿用既有白名單，不為此新建圖片服務。
候選確認採原 savePage 交易 CAS，成功才替換正式 Session。透過原 saver 的唯讀 token 介面取得基準，不使用另一套存檔機制；失敗與過期保留有效版本。
伺服器僅 loopback，採本機 session cookie + CSRF 與全程序限制，尚非公開服務認證。用量／成本只輸出最小數字，測試費率為合成測試資料，真實費用評估保留 NOT TESTED。沒有購買額度、開帳戶或真實付費呼叫。


2026-11-09（Phase 5.1）：以 gpt-6-luna 作待核實候選，gpt-6.1-sol 只保留為另行授權選項，移除舊 gpt-4.1-mini 白名單。官方 SDK 型別列有名稱，但四個官方頁 CONNECT 403，不能把型別當作即時 API／Schema／推理／定價保證。因此新增 model review gate，未核對前停用，不猜測 reasoning.effort，不為更名升級已相容 SDK。
授權預設一次：既有 limiter 改接後端可設定 1–5 次與必填且至多 $0.25 的預算，保留單次 $0.10／4096 output／30 秒／併發 1／零重試。旗標不是付費授權，先驗收第一份，失敗停止；不改帳務或付費試錯。
保留原五份內容與凌亂幾何，只固定 UUID／anchor 並建立 SHA-256 manifest，避免正式評估輸入漂移。補記 cached／reasoning 與失敗用量，未知為 null；reasoning 不重複計費。正式品質分數不以 Mock 或假數字填滿；本輪真實呼叫 0、Phase 5.1 BLOCKED。


2026-11-23（智慧排版）：使用者要求大幅改善輸出與編輯體驗並允許擴充架構。PageSpec以選填欄位擴充theme／chrome／role，不升版本，舊資料照常驗證；主題是程式內固定Token，不接受模型或使用者自訂CSS。導覽與頁尾文字只取頁面標題與既有標題，不編造內容。
Layout v2與v1並存；模型只看v2 Schema。AI未設定時改用明確標示的本機排版，取代先前的死路錯誤；真正的AI失敗仍不替代。主題變更新增set-theme Patch並錨定第一區塊，以沿用既有scope驗證、Undo與CAS保存。畫布維持1440×1200，避免破壞fixture指紋與核准草稿hash。
