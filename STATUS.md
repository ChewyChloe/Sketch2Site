# 狀態
2026-11-09（Asia/Taipei）

## 功能
- Phase 0 DONE；Phase 1 DONE（既定最小範圍），既有 3 項 E2E 本輪重跑通過。
- Phase 2 DONE：PageSpec v2 元件樹、九種 Component Registry、六種動畫與受控參數、Flex/Grid 響應式、預覽桌面／手機框、本機 JSON 載入、錯誤恢復、內建圖片重試、DOM UUID 對應、結構共用與 memo。
- 預覽保留獨立記憶體輸入，切換不改動草稿；重新整理回到範例。固定範例明示「範例預覽／未使用 AI」，不是草稿生成結果。
- P3 NOT STARTED：依 ID 結構化 Patch。AI API、正式生成器、匯出、會員、部署皆 NOT STARTED；沒有新增套件或付費服務。

## 測試
- PASS：npm run typecheck。
- PASS：npm test，4 檔、33/33（原有 7 項 + PageSpec／Renderer 26 項，包含表格化測試）。
- PASS：npm run test:e2e，9/9（預覽 6 項、草稿回歸 3 項）。
- PASS：真實 Chromium 動畫物件、Hover Glow／Lift、Stagger Reveal、reduced-motion 無動畫、內頁 anchor 與外部新分頁連結、noopener、穩定 DOM ID、圖片成功／載入失敗重試。
- PASS：未知元件、未知欄位、任意 CSS／事件欄位、非法 URL、未知／缺少資產、動畫參數、重複 ID、壞 anchor、舊版本、超量／深層／循環資料拒絕；HTML 內容僅作文字。不合法頁面不產生節點且能恢復。
- PASS：未修改的分支保持引用；registry 存取計數證明修改標題不重新渲染無關段落。
- PASS：在草稿的 X 位置輸入 2000 安全拒絕、顯示錯誤且維持原座標，修正延後 state updater 例外可能無法捕捉的舊問題。
- PASS：VITE_TEST_SECRET=SKETCH2SITE_TEST_SECRET_83f21c npm run build；npm run check:secrets，無 canary、可辨識 API key 或 source maps。
- PASS：npm audit --cache /workspace/.npm-cache，當次所有依賴 0 vulnerabilities。
- PASS：1440／768／375px 實際瀏覽器窗口、375px 手機框，根頁面及預覽無水平溢出；保留工作區內捲動。人工檢視截圖，修正按鈕內距、標題換行、預覽工具列占用空間。
- 最終 FAIL：0。曾抓到遞迴函式名稱使子節點繞過 memo、768px 單欄斷點與測試標題選擇器過廣；已修正並重跑。
- build 仍有 Zod PURE 註解警告，Rollup 移除註解後成功建置。
- NOT TESTED：Firefox／Safari、螢幕閱讀器完整稽核、正式環境安全標頭、200 節點效能壓力、行動裝置實機；無自動 AI／Patch／匯出測試，因功能尚未實作。

## 核心檔案與證據
src/pageSpec.ts、src/PageRenderer.tsx、src/Preview.tsx、src/pageFixtures.ts、src/preview.css、public/assets/workspace.svg；整合變更在 src/App.tsx、src/spec.ts、src/style.css。
測試在 src/pageSpec.test.ts、src/PageRenderer.test.tsx、tests/preview.spec.ts；既有草稿安全拒絕回歸在 src/App.test.tsx。
截圖在 test-results/preview-1440.png、preview-768.png、preview-375.png、preview-mobile-frame.png（忽略檔，可由 E2E 重建）。截圖時停用動畫以保留完整可見內容，動畫另用瀏覽器 API 和實際 hover 驗證。

## Git
分支 work；上一輪 f492cbd（Phase 1）、61febf7（Phase 0）。本輪 commit 是此文件所屬提交，可由 git log -1 查詢，避免自引用 SHA。
只有 Sketch2Site 有變更；未 push、merge 或部署。提交僅在本機，尚無遠端備份。未宣稱環境已發布或新任務還原已驗證。

## 限制／恢復
Renderer 只支援 PageSpec v2；LegacyPageSchema 保留 v1 驗證，不進行隱式遷移。CanvasSpec v1 與 IndexedDB 格式不變。
圖片僅限內建資產；外部連結僅限 learn.microsoft.com／example.com，詳見 SECURITY.md。外部連結 E2E 以攔截回應驗證，不宣稱真實遠端網站可用。
預覽是同來源受控 React，不是任意程式執行沙箱。沒有 PageSpec 持久化、真正局部修改或版本比較；這些並非本輪成果。
恢復：讀 AGENTS.md、檢查 git status；npm ci --cache /workspace/.npm-cache；npm run dev。E2E 自啟停 Vite，需先停止自己占用 5173 的服務。

## 下一個最小任務
P3：依元件 ID 的本機結構化 Patch 與範圍／差異測試；不接 AI。
