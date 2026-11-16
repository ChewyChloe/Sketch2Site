> 更新：以下為最初純前端版本紀錄。新的私人AI測試Worker串接與停用狀態見[SITES_AI_SETUP.md](SITES_AI_SETUP.md)；沒有啟用付費AI。

# Sites 私人前端測試副本

來源：ChewyChloe/Sketch2Site，work，f02329ecf2fe2eb59595f95607a09ed12c53fcb3。
原 GitHub Repository 及 /workspace/Sketch2Site 均不修改、不 Push。

## 相容性與範圍

React 19 / TypeScript / Vite 的 dist 可靜態託管。完整保留既有畫布、20種動畫素材、圖片匯入、IndexedDB v3、選取／框選／畫筆、局部 Patch、Undo/Redo、非AI本機預覽及獨立 React ZIP 匯出；不更換 Renderer、資料格式或 UI/UX。

Sites 的動態程式為 Cloudflare Worker fetch handler；目前 Node API 使用 node:http、server.listen、127.0.0.1／socket.remoteAddress／本機 Host Origin 檢查及程序內配額，不能原樣部署。Vite dev proxy 亦不隨 dist 部署。本版本不部署 server/，不配置任何 AI Key，也不公開生成端點。

測試副本唯一功能限制：production build 明確啟用 VITE_SITES_FRONTEND_ONLY，requestGeneration 在任何 fetch 前回報原有 NOT_CONFIGURED。development 下既有 Mock 回歸維持可測；Mock 不會部署。此公開布林值不是金鑰。public/_headers 提供靜態安全標頭；正式產物不包含 API 端點／Key 變數／內部生成指引／source maps。部署封裝僅含 dist 與 hosting manifest。

## 使用方式與限制

1. 用擁有此 Site 的帳號開啟私人測試網址。
2. 從空白畫布或草稿選單載入示範；編輯、拖放動畫、匯入 PNG/JPEG，保存並重新整理。
3. 按預覽使用明確標示非AI的本機排版，確認後編輯局部內容／動畫；頁面選單可匯出 React 專案。
4. AI生成按鈕會沿用原本「未設定」錯誤，不會發出生成請求。AI自然語言修改原本尚未實作。

IndexedDB 只在目前瀏覽器及網站來源保存；localhost／舊網址的資料不會自動搬移，無雲端同步。清除網站資料會刪除本機內容。圖片限制沿用原專案。Safari、Firefox與實機觸控未驗證。

## 版本／發布

此副本使用獨立 Sites source repository，不回寫 GitHub。保留 .openai/hosting.json 的 project_id。私人部署同樣有固定網址，但只有擁有者可存取；沒有開放公開訪客。若日後使用者授權公開，先完成測試與資料檢查，再於 Sites 分享設定改為公開，沿用固定網址；自訂網域可另設定DNS。AI端點需另案改造認證、持久限額／費用控制及秘密管理，不因前端公開而啟用。

## 驗證

PASS：npm ci、typecheck、248單元／整合、production build、check:secrets、check:motion-boundary；正式JS不存在 /api/generation、api.openai.com、OPENAI_API_KEY、SKETCH_AI_API_KEY，已配置後端Key精確比對亦未出現在dist。
PASS：Chromium完整回歸123/123（5.4分鐘），含實際ZIP下載、獨立安裝／Build、圖片、20種動畫、Patch／Undo／Redo、CAS與重新載入。測試均移除兩個後端Key並停用付費AI；只啟動既有Mock測試服務。
Sites內部預覽：BLOCKED，sites-preview relay port 4173 readiness timeout；沒有繞過轉送或另開公開隧道。既有專案Headless測試與Sites實際線上人工驗收分開記錄。
