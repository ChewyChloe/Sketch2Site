# 狀態
2026-11-09（Asia/Taipei）

## 功能
- Phase 0／1／2 DONE；本輪完整重跑舊有測試。
- Phase 3 DONE：純 TypeScript Patch Engine、6 種操作、獨立可信 ID scope、嚴格驗證、原子批次、完整 PageSpec 再驗證、資料範圍 Diff、結構共用與 Session／revision。
- DONE：共用 generic History<T>，PageSpec／CanvasSpec 分離實例；頁面修改 Undo／Redo、分支重做清除、失敗／無實質變更不建立版本。
- DONE：點選或鍵盤選單選取標題、修改文字、附加／移除淡入與設定時長、「套用」、最近差異、撤銷／重做。屬性面板只在選取後出現，未重做既有視覺方向。
- NOT STARTED：AI API／聊天／自然語言修改、任意樹編排、PageSpec 長期保存、矩形框選、匯出、會員、正式部署。固定範例仍清楚標示，沒有宣稱 AI 已完成局部修改。

## 測試與安全證據
- PASS：npm run typecheck。
- PASS：npm test，6 檔、65/65（舊 33 項 + Patch Engine 31 項 + Preview 整合 1 項）。
- PASS：npm run test:e2e，12/12（新 Patch 3 項 + 舊預覽 6 項 + 草稿 3 項）。
- PASS：指定文字／合法 Token／類型對應屬性／動畫附加更新移除、原始資料不變、未修改分支及 metadata／responsive 保留參照。
- PASS：非法 Schema／操作／屬性／URL／資產／效果／數值／文字標記拒絕；不存在／重複 ID、超量／深層／循環 Payload、prototype-pollution 鍵與過期版本安全拒絕。
- PASS：獨立可信 scope 拒絕混入其他合法 target；驗證 Diff 拒絕未指定的兄弟／父層、全頁與樹／效果順序變化。
- PASS：多項批次單一歷史提交，任一步失敗無部分結果；Undo／Redo 使用單調 revision，舊 Patch 不因回到舊畫面而有效；新分支清除 redo，無實質修改保留 Session。
- PASS：Chromium 以 ID 選取、標題／淡入套用、顯示前後值、其他段落不變、Undo／Redo、非法動畫參數與網頁標記安全失敗、空操作、新分支、返回草稿後原 ID／文字／Undo 狀態不變。
- PASS：1440×1000、768×1000、375×1000 實際操作與截圖檢查；無整頁水平溢出。窄視窗改下方面板、調整文字欄位高度，保留預覽及面板內捲動。
- PASS：VITE_TEST_SECRET=SKETCH2SITE_TEST_SECRET_83f21c npm run build；npm run check:secrets。無 canary、可辨識 API key 或 source maps。
- PASS：npm audit --cache /workspace/.npm-cache，當次所有依賴 0 vulnerabilities；沒有新增或更新依賴。
- 最終 FAIL：0；測試曾使用 Testing Library 不支援的 exact role 選項，修正後 typecheck／測試通過，未刪除測試。
- Zod 警告已確認：4.6.7 的 v4/core/regexes.js:74、util.js:400 說明註解中的 @__PURE__ 字串觸發 Rollup annotation 警告。真正函式呼叫上的標記仍存在，Rollup 移除不合法註解後 build 成功。未修改第三方套件或抑制警告，詳見 DECISIONS.md。
- NOT TESTED：Firefox／Safari、實機、完整無障礙稽核、最大批次效能壓力、正式部署標頭、後端認證／跨使用者授權／AI 成本保護（後端未實作）。

## 核心檔案與截圖
- src/patch.ts：Schema、批次套用、Diff、scope、Session 與歷史包裝。
- src/history.ts：共用不可變歷史；src/spec.ts 保留原 Canvas API。
- src/Preview.tsx、src/PageRenderer.tsx、src/preview.css：最小選取／修改／差異 UI，Renderer 保留完整驗證。
- src/pageSpec.ts：沿用 v2，結構共用另保留 metadata／responsive 引用；未變更 Schema 合約。
- 測試：src/patch.test.ts、src/Preview.test.tsx、tests/patch.spec.ts；既有測試均保留。
- test-results/patch-desktop.png、patch-768.png、patch-375.png。截圖為本輪 E2E 產出（忽略檔，可重建），以 reduced motion 保持可見；舊動畫測試仍驗證實際播放。

## Git 與恢復
分支 work。上次 commit e08cea15d04f348db2d3f34eb63de3a781d50b30；本輪 commit 為此文件所屬提交，可用 git log -1 查詢。
僅修改 Sketch2Site；未 push、merge、部署或啟用付費服務。提交僅在本機，未宣稱已有遠端備份、發布環境或新任務還原驗證。
恢復：讀 AGENTS.md、檢查 git status；npm ci --cache /workspace/.npm-cache；npm run dev。E2E 自啟停 Vite，需先停止自己占用 5173 的服務。

## 已知限制
UI 僅編輯 heading 文字與 Fade In；Engine 的其他安全操作已測試，但未新增各類型完整屬性 UI。頁面歷史只留記憶體；重整回到範例。
Diff／affectsOtherComponents 保證資料範圍，不保證其他元素的像素位置完全不變；正常文字高度或 gap 變更會 reflow。跨元件資料修改必須先明示額外 ID／欄位與可信授權範圍，本輪不自動重排。
Patch 的純文字限制不取代 Renderer 的輸出安全；載入 PageSpec 中的 HTML 字串仍為純文字。圖片及連結白名單、同來源受控渲染的限制維持 Phase 2 規範。

## 下一個最小任務
P4：PageSpec 與必要版本資訊的本機保存／重新載入，驗證損毀資料及舊 Session Patch 拒絕；不接 AI。
