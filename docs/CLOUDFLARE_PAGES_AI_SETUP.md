# Cloudflare Pages 正式 AI 開通

本流程適用於既有 `sketch2site` Pages 專案的 **Production**。準備期間維持 `SKETCH_AI_ENABLED=false`、`SKETCH_AI_TEST_APPROVED=false`、`SKETCH_AI_BILLING_CONFIRMED=false`，也先不填入審批期限。請只在 Dashboard 或登入供應商後台輸入秘密。

## 1. 設定登入與授權名單

1. 在 Google Cloud Console 的 Google Auth Platform 建立 Web application OAuth Client。在 **Authorized JavaScript origins** 加入 `https://sketch2site.pages.dev`。若應用程式處於 Testing 狀態，在 **Audience → Test users** 加入擁有者與受委託帳號。
2. 在 Cloudflare Dashboard 開啟 **Workers & Pages → sketch2site → Settings → Variables and Secrets**，切換到 **Production**。新增一般變數 `GOOGLE_CLIENT_ID`，填入 Web Client ID。若改用 GitHub，建立 OAuth App，Callback URL 填 `https://sketch2site.pages.dev/api/auth/github/callback`，並設定一般變數 `GITHUB_CLIENT_ID` 與 Secret `GITHUB_CLIENT_SECRET`。GitHub 登入者需要已驗證的主要信箱。
3. 同一頁新增 Secret `SESSION_SECRET`，使用安全亂數產生至少 32 字元，例如在自己的電腦執行 `openssl rand -hex 32`。其值用於簽署 HttpOnly 登入 Cookie。
4. 新增 `SKETCH_AI_OWNER_EMAIL`，填入擁有者的登入信箱。只有確定授權的使用者才加入 `SKETCH_AI_AUTHORIZED_EMAILS`，以逗號分隔。空白代表只允許擁有者。移除信箱後，重新部署套用環境變數，該使用者即使保有舊 Cookie 也會收到 `OWNER_REQUIRED`。
5. `SKETCH_SITE_ORIGIN` 必須是完整正式來源，包含 `https://`，結尾不加斜線。沿用 `https://sketch2site.pages.dev` 時已設定。若要加上 Cloudflare Zero Trust Access，先在 Pages **Custom domains** 綁定 Cloudflare 受管自訂網域，再往 **Zero Trust → Access → Applications → Add an application → Self-hosted**，設定該網域的 `/api/generation*`，新增只允許指定信箱的 Allow policy。接著將 `SKETCH_SITE_ORIGIN`、登入供應商來源與回呼一併切換到自訂網域。預覽部署的 Access 開關只適用於預覽。Pages Functions 仍會驗證本站登入與名單，並拒絕其他 hostname 的 AI 請求。

## 2. 綁定 D1

1. 在 **Storage & databases → D1** 找出既有正式額度資料庫。優先沿用同一個資料庫。若既有資料庫由其他平台管理，先停用舊生成入口，再依該平台的匯出流程將既有額度與審批紀錄搬到 Cloudflare D1 並核對筆數、主鍵和狀態。只有確認正式額度從未建立時，才建立空資料庫。
2. 在 D1 的 Console 檢查 `sketch_ai_single_test`、`sketch_ai_owner` 和 `sketch_ai_preflight`。全新的資料庫才依序執行 Git 中 `drizzle/0000_many_supernaut.sql` 和 `drizzle/0001_sour_boom_boom.sql`。對已有資料庫只套用缺少的遷移。保留所有額度紀錄，包括 `RESERVED`、成功、失敗與逾時。
3. 在 **Workers & Pages → sketch2site → Settings → Bindings → Add → D1 database** 選 **Production**，Variable name 填 **`DB`**，Database 選前一步核對過的資料庫。擁有者在正式站登入後，開啟 `/api/generation/ready`，完成 `pages-owner` 綁定。既有 Sites 的 `owner` 紀錄也保留。授權名單上的其他使用者必須等擁有者完成綁定才可呼叫。
4. 所有人共用固定的 `sites-ai-single-test-v1` slot。若該 slot 已用完，保留紀錄並停止本輪生成。新部署、其他帳號或其他請求 ID 都不會補發額度。

## 3. 設定 AI Secret 與後續審批

在同一個 **Production → Variables and Secrets** 設定下表。新增後需重新部署才會由新版本讀取。

| 名稱 | 類型與用法 |
| --- | --- |
| `OPENAI_API_KEY` | Secret。使用有明確支出限制的 OpenAI Project 金鑰。 |
| `SKETCH_AI_ENABLED`、`SKETCH_AI_TEST_APPROVED`、`SKETCH_AI_BILLING_CONFIRMED` | 目前保留 `false`。等登入、D1、模型費率、Project 帳務與實際測試授權都核對後，才在另行核准的窗口設為 `true`。 |
| `SKETCH_AI_MAX_CALLS`、`SKETCH_AI_BUDGET_USD` | 保留 `1`、`0.01`。 |
| `SKETCH_AI_MODEL` | 固定 `gpt-6-luna`，可沿用程式預設。 |
| `SKETCH_AI_MODEL_REVIEWED`、`SKETCH_AI_PRICING_REVIEWED` | 待核實所用 Project 的模型權限與費率後才填 `true`。 |
| `SKETCH_AI_INPUT_USD_PER_MILLION`、`SKETCH_AI_OUTPUT_USD_PER_MILLION`、`SKETCH_AI_CACHED_INPUT_USD_PER_MILLION`、`SKETCH_AI_CACHE_WRITE_USD_PER_MILLION` | 目前程式固定要求依序為 `0.1`、`0.5`、`0.01`、`0.125`。若當前核准費率不符，維持關閉。 |
| `SKETCH_AI_TEST_CANVAS_SHA256` | 此版本的固定核准範例為 `a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283`。 |
| `SKETCH_AI_TEST_EXPIRES_AT` | 等本輪測試另行獲准後，填寫含時區的 ISO 8601 到期時間。距啟用時間最多一小時。 |
| `SKETCH_AI_DRAFT_POLICY` | 留空，Pages 只使用原固定草稿及原單次 slot。 |

先由 **Deployments** 重新部署此 commit，保持生成關閉。無痕請求 AI 路由應回傳 `403 OWNER_REQUIRED`，授權帳號登入後的 `GET /api/generation/ready` 應回傳 `{"configured":false}`。確認 D1 的付費 slot 筆數未增加，完成本輪驗收。真實生成留待另行授權。
