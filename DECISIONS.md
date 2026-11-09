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
