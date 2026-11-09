# 架構
React 19 + TypeScript + Vite；Zod 4；IndexedDB；Vitest、Testing Library、Playwright。Node 24 LTS、npm lockfile，安裝使用 npm ci。
以原生 Pointer Events 移動與 HTML Drag and Drop 新增，避免重複拖曳依賴。採 CSS Tokens 取代 Tailwind：單一工作台樣式更直接；Phase 1 不播放動畫，Motion 延至受控 Renderer 階段再引入。
## 模組與資料流
src/spec.ts 定義版本 1 CanvasSpec、PageSpec 與有界歷史；src/storage.ts 僅處理本機 IndexedDB；App 負責操作，CSS 負責設計語言。
CanvasSpec：metadata 尺寸／名稱、穩定 UUID nodes、類型、位置、尺寸、zIndex、content、assetId、parentId、effects、constraints。初版只允許平面文字／按鈕／卡片，assetId 與 parentId 必須 null，後續擴充須明確版本化。
PageSpec：metadata、sections、受控 component 列表、stack/grid、typography、style token、responsive 規則、link interaction 與 effect registry。這是第一版合約，尚無 Renderer 或生成器。
草稿座標不會直接作成品絕對定位。未來後端只回傳 Schema 資料，由 Registry 渲染 Grid/Flex，拒絕任意 JS／HTML／CSS。
歷史最多 80 次。拖動在 pointerup 記錄一次；草稿儲存需交易完成才顯示成功。啟動先載入，避免覆蓋尚未讀取資料；本輪為手動儲存並提示未儲存狀態。
## 開發
npm ci；npm run dev；npm run build；npm test；npm run test:e2e。Playwright 使用 /usr/bin/chromium（可透過 CHROMIUM_PATH 覆寫）。
無後端、雲端儲存或 AI 憑證；後續服務與授權設計屬另一階段。
