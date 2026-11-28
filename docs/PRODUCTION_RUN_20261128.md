# 正式部署與真實 AI 生成測試（2026-11-28）

這一輪的程式已推到 `claude/gallant-cerf-2vjpdm`。開發環境碰不到 Production，有三個原因：

- 雲端容器的網路政策擋掉 `sketch2site.pages.dev`
- 容器裡沒有 Cloudflare 或 OpenAI 金鑰
- AI 路由只接受擁有者登入後的請求，結果會回 `OWNER_REQUIRED`

所以部署和真實生成必須由你操作。下面每一步都不需要改程式。

## 1. 部署這個 commit 到既有 Production

1. 打開 Cloudflare Dashboard，進入 **Workers & Pages → sketch2site → Deployments**。
2. 看 Production 的來源分支。如果是 `claude/gallant-cerf-2vjpdm`，推送後會自動部署；確認最新一筆 Production 是本輪最後的 commit（見 STATUS.md 最上面）。
3. 如果 Production 指向別的分支，或沒有自動部署：
   - 在 **Deployments** 找到這個分支的最新預覽部署，按 **⋯ → Promote to production**。
   - 或者在自己的電腦執行下面兩個指令：

```bash
npm ci && npm run build:sites
```

```bash
npx wrangler pages deploy dist --project-name sketch2site --branch main
```

   其中 `main` 換成 Production 使用的分支名稱。

4. 部署後用無痕視窗打開 `https://sketch2site.pages.dev/api/generation/status`，應該回 `403 OWNER_REQUIRED`。這代表 AI 仍受保護。

本輪沒有新增資料表或遷移，D1 不需要變更，既有的額度紀錄全部保留。

## 2. 打開這一次的真實測試窗口

在 **Settings → Variables and Secrets → Production** 設定以下項目。值的意義見 docs/CLOUDFLARE_PAGES_AI_SETUP.md。

| 名稱 | 這一輪建議值 |
|---|---|
| `SKETCH_AI_ENABLED` | `true` |
| `SKETCH_AI_TEST_APPROVED` | `true` |
| `SKETCH_AI_BILLING_CONFIRMED` | `true`，確認 OpenAI Project 的支出上限後才設 |
| `SKETCH_AI_MAX_CALLS` | 既有已用次數加 5（本輪最多 5 次付費呼叫） |
| `SKETCH_AI_BUDGET_USD` | 既有已預扣金額加本輪核准金額，例如加 `0.05` |
| `SKETCH_AI_TEST_EXPIRES_AT` | 現在起一小時內，含時區，例如 `2026-11-28T15:00:00+08:00` |

儲存後重新部署同一個 commit，新值才會生效。

## 3. 用擁有者帳號登入並確認

1. 用一般視窗打開 `https://sketch2site.pages.dev`，用 `SKETCH_AI_OWNER_EMAIL` 的帳號登入。
2. 打開 `https://sketch2site.pages.dev/api/generation/ready`，應該看到 `"configured":true`。
3. 如果仍是 `OWNER_REQUIRED`，代表登入的信箱不是擁有者，或 Cookie 是舊版本留下的。這時請登出，重新登入。

## 4. 跑一次真實生成（1 次 AI 呼叫，不要重試）

Pages 只接受一份事先核准的草稿：伺服器比對草稿的 SHA-256 和 `SKETCH_AI_TEST_CANVAS_SHA256`。草稿有任何改動，包括描述網站、靈感板、參考圖，都會被拒絕（`DRAFT_HASH_MISMATCH`）。這是既有的安全機制，本輪沒有放寬。

### 做法 A：用已核准的「個人作品集」草稿（最簡單）

1. 首頁 → 範例草稿「個人作品集」。它的雜湊就是設定表裡的 `a1384324…`。
2. 不要做任何修改，直接按「生成網站」。
3. 等候選出現：三個方向會顯示「構圖：主圖焦點／大字導讀／窄文接寬圖」，三張縮圖應該是明顯不同的排法。
4. 選一個方向 → 使用此版本。

如果出現雜湊不符，代表載入時被加上了排版模式。這時改用做法 B，把這份草稿的雜湊重新核准。

### 做法 B：測自己的草稿，例如社團招生頁加上描述和靈感板

1. 在草稿頁把想測的內容都做好：範本、描述網站、靈感板。之後不要再改。
   - 不要加參考圖：有參考圖時，生成前會另外呼叫一次 AI 分析，草稿內容也會改變，雜湊就對不上了。
2. 在瀏覽器開發者工具的 Console 貼上下面這段，會下載目前的草稿 `draft.json`：

```js
const r=indexedDB.open('sketch2site',3);r.onsuccess=()=>{const q=r.result.transaction('drafts').objectStore('drafts').get('current');q.onsuccess=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(q.result)]));a.download='draft.json';a.click();};};
```

3. 在專案資料夾算出雜湊（不連網、不花錢）：

```bash
npx tsx scripts/draft-hash.ts draft.json
```

4. 把輸出貼到 `SKETCH_AI_TEST_CANVAS_SHA256`，重新部署。
5. 回到草稿，不做任何修改，按「生成網站」。

### 之後（兩種做法都一樣）

1. 網站頁 → 頁面 → 上線前檢查，看「畫面建議」，可以按「一次修正」。
2. 截圖：
   - 桌面寬度截一張首屏和一張整頁
   - 按工具列的「手機」，再截首屏和整頁
3. 頁面 → 匯出 React 專案，另存 zip。

失敗時不要再按一次生成，把畫面上的錯誤訊息和時間告訴我。

## 5. 回報給開發

- 網站網址、四張截圖、匯出的 zip
- D1 表 `sketch_ai_single_test` 本輪新增的那一筆：requestId、狀態、預扣金額
- OpenAI 用量頁面該次的 input、output tokens 與費用

收到這些資料後，才能說「真實生成通過」。沒有這些資料之前，本輪的 AI 生成只用 Mock 驗證過。
