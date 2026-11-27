## 動畫素材庫重新規劃（2026-11-27 使用者需求；排在目前功能清單之後）
參考圖只參考「多維度篩選」的操作概念，不照搬分類、名稱、順序、配色或版面。
- NOT STARTED A1 盤點：列出現有 68 種動畫的 registry、schema、runtime、編輯器與匯出流程，記錄每個動畫目前的分類與參數（docs/MOTION_INVENTORY.md）
- NOT STARTED A2 metadata：每個動畫補齊穩定 ID、中英文名稱、描述、相容元件、套用對象、動態表現、觸發方式、設計目的、動態程度、可調參數、無障礙資訊；篩選、搜尋、推薦共用同一份資料；依實際素材調整維度，不硬套
- NOT STARTED A3 相容性：既有專案與已套用動畫不受影響（舊 ID、參數、儲存與匯出全部照常）；加上 metadata 一致性測試
- NOT STARTED A4 篩選：跨維度組合（同維度 OR、不同維度 AND）、即時顯示數量、一鍵清除、空結果提示與重設
- NOT STARTED A5 搜尋與排序：中英文名稱、描述、標籤搜尋；收藏、最近使用（只記在這台瀏覽器）；排序（不捏造熱門度或使用次數）
- NOT STARTED A6 預覽：自訂預覽文字、重新播放、速度／延遲／播放次數與該動畫實際支援的參數；畫面外與減少動態時不播放，不讓所有卡片同時播放
- NOT STARTED A7 依選取元件推薦：自動列出相容動畫，不相容的寫出原因且不能套用；套用前可在實際網站元件上預覽
- NOT STARTED A8 AI 動畫推薦：用自然語言描述想要的效果，AI 只能從現有動畫 ID 中挑並說明原因；伺服器檢查 ID 存在且相容，不覆蓋已確認或鎖定的動畫設定
- NOT STARTED A9 版面：常用篩選直接顯示、進階條件收合，不讓篩選擠壓預覽；桌面與手機都可操作；沿用 S2 設計語言
- NOT STARTED A10 驗收：所有既有動畫可預覽、套用、儲存、還原、匯出；單元測試、端對端測試、實際瀏覽器操作

## 使用者新功能清單（2026-11-27）
- DONE：圖表、表格元件；頁尾資訊區塊；首頁頂部列合併；註解輸入框新樣式
- DONE：鎖定已完成內容（文字／素材／版面，資料層驗證）
- DONE：按住 Alt 顯示物件距離
- DONE：菜單品項卡片（英文副標、價格、標籤、備註）
- NOT STARTED：畫筆框選範圍交給 AI；上線前自動檢查；不明確的修改由 AI 反問；參考圖最多 5 張；AI 修改前後比較滑桿；網站版本時間軸；更多動畫與生成風格；跨區塊套用樣式
- BLOCKED：個人作品集首圖、社區讀書日首圖（需要使用者重新以檔案附上圖片）

## AI 註解改寫整個區塊、預設首頁（2026-11-27）
- DONE：AI 註解讀整個網站並改寫被註解的區塊（replace-section，含檢查與真實 AI 驗證）
- DONE：網站預設開首頁
- DONE：登入卡片間距、「目前開啟」置中、首頁風格文案
- NOT STARTED：第二版示範影片（依使用者改過的字幕，從首頁「新增專案」開始錄）

## 全面優化（2026-11-25）
- [x] 字型造成的文字溢出、工具列兩排遮住頁籤、虛線提示列黏邊（DONE）
- [x] Canva 式群組點選、中文動畫標籤、頂部列 v3、手機縮放（DONE）
- [x] 動畫素材庫改版＋8 種新動畫（DONE）
- [x] Google／GitHub 登入（DONE，實際登入 BLOCKED：缺 Client ID／Secret）
- [x] 移除開發者提示文字（DONE）
- [x] 匯出附字型（DONE）
- [ ] AI 功能優化（NOT STARTED，待討論）

## 內文字型：jf open 粉圓（2026-11-25）
- [x] 自帶 Huninn 字型檔＋備援字疊（DONE）
- [x] 標題保留原字型（DONE）
- [ ] 匯出專案附上字型檔（NOT STARTED）

## 手機頂部列瘦身（2026-11-25）
- [x] 次要按鈕收成可滑動一排；生成網站留在第一排（DONE）
- [x] 網站工作區頂部列兩排（DONE）
- [ ] 手機畫布預設縮放（NOT STARTED）

## 20種進階動畫擴充（2026-11-18）
- DONE：保留原20個Preset，淨新增20個不同機制，共40種。重複的磁吸／折角／交錯／數值遞增／閱讀進度提案改為聚光、扇形、對角翻入、儀表及里程碑；完整清單與原因見docs/ADVANCED_MOTIONS.md。
- DONE：沿用MotionSchema／Canvas／PageSpec／Patch，整合四組Live Preview、參數、Apply／Remove、Undo／Redo、IndexedDB、Mock生成與共享React匯出。舊合法組合不放寬／不破壞；無新依賴。
- PASS：385項單元整合；93項主Chromium回歸＋1項新波浪重播清理，20新效果逐項實際動作／參數／保存驗收，1440／768／375檢查。獨立匯出npm ci／build／離線互動通過；build:sites、secret及40項motion-boundary通過。
- LIMIT：正式Provider的16384-byte完整輸入及8192 tokens限制保留。單獨20種請求均可離線建立；含全部20種的新壓力草稿可Mock生成，但正式完整request超限而拒絕，不繞過成本保護。
- NOT TESTED：本輪付費模型品質、正式Sites與Safari／Firefox／實體裝置FPS。付費呼叫0，未動Key／帳務／D1／Runtime旗標、未推送或部署；線上仍為先前版本。

## Stitch Neo Manga 介面改版（2026-11-18）
- DONE：依上傳設計套用黑色導覽／左右面板、螢光綠主操作、米白點陣畫布、三階段導覽、完整動畫庫及浮動工具列；窄螢幕屬性面板可操作。未執行參考HTML或新增外部CDN。
- DONE：保留原畫布資料／位置、20種動畫、IndexedDB、局部修改、AI生成、React匯出與Ctrl/Cmd快捷鍵。外框改outline避免拖放偏移；元件庫與檢查器分離且重用原功能。
- PASS：299項單元整合；18項畫布／動畫拖放／快捷鍵／Mock生成瀏覽器測試；35項動畫與1440／768／375工作台驗收。build:sites、secret scan、motion boundary通過。
- 本輪付費呼叫0，AI runtime／D1額度／私人存取不更動。正式擁有者瀏覽器未自動代登；UI驗收為本機Chromium與Mock API。

## 額外三次測試授權（2026-11-18）
- DONE：新增固定owner-draft-three-20261118-v1 grant及3個永久D1 slot，runtime maxCalls=3；舊單次／動畫／review紀錄不刪不改。
- PASS：30後端＋6前端相關Mock測試，涵蓋正好3次、第四次拒絕、重放拒絕、併發只接受1次且不消耗下一slot。單一INSERT SELECT以原子方式同時檢查重放、目前RESERVED及slot衝突；無migration或重設。
- DONE：status提供remainingCalls／busy，前端用完顯示LIMIT，生成中顯示BUSY。每次budget.01、Luna default、zero retry及正式owner／CSRF／draft ticket／exact count保留。本輪付費呼叫0。

## 六次真實生成與工作台修正（2026-11-18）
- PASS：6次Luna Standard真實Provider請求，20/20個preset均至少1次，PageSpec／文字素材效果保留均通過，無retry；費用依usage合計US$0.00295255。每案有inputs／outputs／ledger／desktop與mobile截圖，docs/PAID_SIX_RUN_AUDIT.json記錄。
- DONE：預設保留草稿布局；新增受控draftLayout數字frame，桌面保持x/y/width／source尺寸與閱讀順序，手機單欄。AI自由重排需明確選取。保留模式不提升正文為標題、不將每個標題放大hero；修復tone-accent按鈕對比。
- DONE：草稿Ctrl/Cmd C/V/A/X/G，Shift G解組、Shift點選多選、整組拖曳／方向鍵、Undo/Redo。groupId可選欄位保存；剪貼簿ID／內部anchor／effects targets與groupId皆重建，刪除清除dangling anchors；輸入框維持native文字操作。提供編輯選單。
- DONE：工作台色彩／層級／畫布點陣／工具列／側欄重新整理，不刪既有素材、IndexedDB、patch、export功能。
- PASS：297項單元整合、32項全部動畫browser互動、6份真實response browser重播＋keyboard／export回歸；新spatial output可獨立npm ci／build。正式Sites owner瀏覽器未自動代登，模型測試與本機UI明確分開。
- Runtime：新增僅一次studio review固定slot，不重設兩筆歷史PASS，不允許任意slot。仍owner-only、Luna default、max1／budget.01／zero retry；新ticket與exact count限制不變。

## 真正目前草稿核准修復（2026-11-18）
- ROOT CAUSE：舊portfolio-motion-v1仍將非動畫欄位鎖死；使用者截圖有新增卡片／變更座標，必然hash不符，並非使用者操作錯誤。
- DONE：owner-draft-v1經正式owner＋同源＋CSRF＋完整CanvasSchema／prepareIntent＋免費精確成本檢查後，為目前完整draft hash簽發owner／origin／10分鐘HMAC ticket。生成必須同hash、同owner、有效ticket與D1 READY proof；不再鎖示範，不接受前端自報權限。
- DONE：保留同一sites-ai-motion-test-v1額度，不開新slot、不刪舊PASS。budget.01、default Luna、zero retry不變；前端自動完成目前草稿免費核准再生成。
- PASS：290項全量單元整合＋1新增client forwarding測試、11瀏覽器Mock回歸＋真實結果Chromium重播1項、build／secret／motion boundary。
- PASS：另一次已授權不同自訂草稿Provider付費自測（非失敗重試），input2876／output515（reasoning124）、cost約US$0.000616925，PageSpec／motion保留／React預覽保存通過。兩個獨立CLI自測合計US$0.00116835，journal均保留。正式Sites owner瀏覽器未自動驗證，不冒充身分。

## 真實動畫Provider付費自測（2026-11-18）
- PASS：使用既有後端Provider與Cloud HTTP Secret獨立呼叫Luna Standard一次，input2600／output453（reasoning104）、cache0，依usage計算US$0.000551425，reserveUS$0.002373；無額外tools、retry0。CLI exclusive journal保留，不得重跑。
- PASS：真實結果PageSpec／動畫完整保留驗證，錄製結果送入Chromium React預覽／保存重播通過；不是在Sites冒充owner。12項browser測試通過，287項單元整合＋1新增版本測試通過。
- DONE：新增前後端protocol檢查與可見動畫測試版標記、首頁no-store，避免舊頁混用新後端；不推斷舊cache是唯一根因。
- 限制：正式Sites owner瀏覽器未自動驗證，工具requirements錯誤且service-read probe網路不可用；service token沒有user identity，不繞過。舊D1 PASS保留，動畫slot未使用。
- 安全metadata見docs/PAID_MOTION_SELFTEST_RESULT.json；真實render截圖outputs/motion-live-selftest/real-luna-render.png。付費呼叫總共1次，後續測試只重播結果。

## 動畫草稿獨立核准（2026-11-18）
- DONE：定位DRAFT_HASH_MISMATCH為舊無動畫整份白名單。新增server/sitesDraftPolicy.ts；server-only portfolio-motion-v1核准只容許合法動畫層變更，其他文字／布局／素材仍對照原SHA；CanvasSchema／prepareIntent保留。
- DONE：固定動畫獨立D1 slot sites-ai-motion-test-v1，原sites-ai-single-test-v1成功紀錄不重設；一次、零重試、budget<=.01、default Luna不變。新動畫精確free count與D1 READY proof須在同份request匹配，才可預留付費額度。
- PASS：287單元整合測試、11瀏覽器Mock端到端（含六種效果生成／驗證／預覽／保存）、build、秘密及motion boundary掃描。預設六動畫request9967bytes，max8192 input／4096 output，最壞模型token reserve US$0.003072；未實測exact tokens。
- BLOCKED：真實付費自測無正式owner瀏覽器連線，Browser Use could not read requirements。Sites服務token不含visitor身分（官方identity-and-secrets）；不冒充、不繞過、不直接用Cloud Key替代Worker驗收。本輪paid calls0，AI開關false。
- 本輪只推Sites source並私人部署，不改GitHub。不得把Mock截圖當真實AI成功；test-results/portfolio-six-animations-mock.png為Mock。

## 免費成功與舊錯誤並存修復（2026-11-17）
- DONE：確認App免費核對與核准載入成功未清除generationError，已清除，避免成功狀態並列歷史hash錯誤。這是可確認的UI缺陷，不宣稱歷史每個POST根因。
- DONE：requestGeneration先固定快照，免費check同份快照通過後才查status與POST generation；check失敗不會送生成請求。後端白名單與額度不變。
- PASS：285項測試（包含等待期間編輯仍兩份payload一致、free mismatch無generation POST）、build與secret scan。正式本人UI仍待驗證；AI關閉，D1未使用。

## 固定草稿載入保障（2026-11-17）
- DONE：新增owner-only後端核准範例載入，先對照原runtime hash，再由免費check核對後寫入畫布；不接受新草稿白名單、不改hash／D1。
- DONE：送出生成前同步建立CanvasSchema快照，避免status等待期間畫布變更；此為預防性修正，不宣稱歷史根因。
- PASS：283項完整測試及新增快照測試、build與秘密掃描；UI本人操作待驗證。歷史差異欄位仍未知。AI維持false，無付費呼叫。

## 403免費診斷修復（2026-11-17）
- DONE：owner／origin／CSRF／draft hash分支回傳固定安全代碼；不記錄token、Key、完整草稿。
- DONE：CanvasSchema v1正規化後雜湊；核准fixture SHA256仍a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283。新增owner-only免費核對選單／端點，無Provider或額度寫入。
- PASS：280項完整測試＋2項新增frontend測試、build、secret／motion boundary。歷史403根因仍無法從舊紀錄區分；目前瀏覽器草稿待本人免費核對，UI自動化NOT TESTED。
- AI旗標false、billing gate false、expiry移除；保留D1永久額度與原模型／預算／零重試。無付費呼叫、無GitHub修改。

## 首次真實生成執行前中止（2026-11-17）
- BLOCKED：已收到一次付費授權；私人權限、Secret、D1未使用額度與既有1791-token免費證明已核對。
- 測試瀏覽器無法載入私人站（Browser Use could not read requirements），未建立本次owner登入／E2E前置條件，因此依使用者要求停止。
- 付費Responses呼叫0、費用US$0、D1額度未消耗；runtime revision4未改，兩個開關仍false。PageSpec／Renderer／截圖NOT TESTED。恢復驗收方式見docs/FIRST_LIVE_ATTEMPT_20261117.json。


## 線上修復結果（2026-11-17）
- DONE：既有Sites私人第3版部署成功，env revision4；D1已綁定正式owner，實際Sites Key免費model／count為READY（1791 tokens、最高預留US$0.002272），paid slot0筆。
- 待手動：Platform帳務／餘額、Project支出控制及Responses權限；之後另行明確付費批准。ENABLED、TEST_APPROVED、BILLING_CONFIRMED全false，本輪生成0。部署證據見docs/LUNA_DEPLOYMENT_RESULT.json。


## 首次Luna測試BLOCKED修復（2026-11-17）
- DONE：Luna／Standard硬鎖、完整request16KB及免費精確input計數8192上限、最壞30m cache-write預留、無tools／4096 output／零retry、可信dispatch owner永久D1綁定。保留舊paid slot，新增owner／free-preflight兩表。
- PASS：278單元／整合、11項Chromium Mock／匯出、Typecheck／Build／秘密與內部指引掃描。免費模型可見與counter確認固定request1791 input／6913 bytes，最多預留US$0.002272；可接受請求硬上限US$0.003072。未呼叫生成。
- 手動待確認：Platform帳務／Project支出與Responses模型權限；owner需正式登入本站以完成實際Sites Key免費檢查。ENABLED／TEST_APPROVED／BILLING_CONFIRMED全false。
- 本輪只同步與私人部署既有Sites，不改GitHub；正式部署／D1核對依工具結果，詳細見docs/LUNA_TEST_REPAIRS.md。


## 第一次付費生成前最後驗收（2026-11-17）
- BLOCKED：已核實官方Standard input .10／cached .01／write30m .125／write12h .25／output .50 USD每百萬tokens；目前reserve／usage公式漏write計費且service_tier未固定default。Luna目前為有效預設但非硬鎖；runtime owner／費率／草稿核准配置仍缺。
- 實測固定草稿developer＋user＋schema 6097 bytes；14288為heuristic預留，非精確tokens或API硬input上限；output4096含reasoning。Standard全input按30m write的保守估算US$0.003834，尚不能認證無條件最高帳單。
- PASS：92項相關單元／Mock、10項Chromium生成回歸；新增磁碟DB重開、多連線／Worker重放、429／500／503零重試測試；Schema／Renderer及秘密／archive檢查。
- 線上仍Secret revision3、owner-private、雙開關false、max1／budget.01、D1 slot表0筆。本輪只驗收，未改production程式／runtime、未部署、付費呼叫0。完整九項結果與風險見docs/FIRST_PAID_TEST_FINAL_ACCEPTANCE.md；停止等待後續指示與未來明確付費批准。


## Sites Runtime Secret已套用（2026-11-17）
- DONE：原生平台確認OPENAI_API_KEY is_secret=true且遮罩；既有第2版重新私人部署成功，env_set_revision=3。沒有建立新站或修改產品程式。
- PASS：28項相關Mock／後端測試；部署後owner-private、外部訪客0、ENABLED與TEST_APPROVED=false、MAX_CALLS=1、BUDGET_USD=0.01；D1單次slot表0筆。SDK零重試與安全讀取路徑保留。
- READY僅指Secret配置／私人部署；真實Worker到OpenAI請求未測，模型／費率／Project帳務與支出控制、站內owner ID及具體付費同意仍待確認。生成維持停用，本輪付費呼叫0。
- 證據與驗證界線見docs/SITES_SECRET_DEPLOYMENT_20261117.md。只記錄安全metadata，不輸出Key、不依賴.env。


## Cloud HTTP Secret與Sites配置釐清（2026-11-16）
- PASS：平台狀態current、網路policy enforced、OPENAI_API_KEY HTTP Secret ready且限定api.openai.com；透過既有HTTPS proxy／CA以GET /v1/models回傳HTTP200，maxRetries=0，未生成。
- 更正：Cloud HTTP Secret不依賴本機.env；先前以.env缺失推論Cloud Key不可用不正確，不再要求本機路徑或重建Key。
- BLOCKED Sites：獨立runtime Secret清單仍無OPENAI_API_KEY；兩個AI開關false、單次／US$0.01設定及owner-private不變。Cloud Secret不會自動繼承給Worker。
- 已記錄經核實的Sites原生設定入口、Secret欄位與私人版本重新部署步驟；無法檢視帳號管理UI，不臆造選單路徑。見docs/CLOUD_HTTP_SECRET_VS_SITES.md。本輪未改產品或部署、未新增Key、付費生成0。


## Sites Runtime Secret免費核對（2026-11-16）
- PASS：原生Sites權限與runtime設定核對，owner-private、外部訪客0、ENABLED／TEST_APPROVED=false、MAX_CALLS=1、BUDGET_USD=0.01；D1單次slot表0筆。
- PASS：Typecheck、28項相關Mock／Provider測試、Bundle／封包秘密掃描及source map排除、內部指引掃描。新增2項runtime Key讀取與response／log隔離測試，未改產品程式。
- BLOCKED：使用者已在Platform建立Key，但本站Runtime Secret清單沒有OPENAI_API_KEY，指定.env亦無Key；等待安全儲存路徑。官方helper仍缺失，不另建Key、不自行替代核准流程。線上HTTP回應驗收未完成，未以Mock冒充。
- 未呼叫付費生成；未重建站、未重部署、未修改GitHub。詳細六項結果與官方流程恢復方式見docs/SITES_RUNTIME_SECRET_AUDIT.md。


## Sites私人AI測試準備（2026-11-16）
- DONE程式：Sites Worker API接回原Provider／驗證／候選，D1原子永久單次slot、owner ID／同源／CSRF／固定草稿／時限與預算檢查；保留原UI及資料流程，只同步Sites來源。
- PASS：258單元／整合、18項相關Chromium、Typecheck、Worker／前端Build、靜態資產回應、前端秘密及內部指引掃描、npm audit 0漏洞。
- BLOCKED啟用：等待OpenAI Developers安全Key目標選擇／必要技能可用、模型／費率核實、Project支出限制與具體單次付費確認。Runtime ENABLED與TEST_APPROVED保持false；真實付費呼叫0。
- 私人部署狀態以Sites工具結果為準；提案、恢復及驗證見docs/SITES_AI_SETUP.md。



## Sites私人測試副本（2026-11-16）
- DONE：從GitHub work f02329ecf2fe2eb59595f95607a09ed12c53fcb3建立獨立副本，保留既有功能及UI，加入靜態hosting manifest、production AI停用保護與安全標頭。只同步Sites來源，不回寫原GitHub。
- PASS：Typecheck、248單元／整合、123 Chromium回歸、Build、秘密／內部指引邊界及正式JS端點檢查。真實付費AI呼叫0。
- BLOCKED：Sites內部preview relay逾時；線上私人網址人工驗收待使用者檢查。Node本機API不相容，沒有部署AI端點。
- 部署僅限owner-private；工具回傳決定實際發布狀態。細節與後續公開固定網址步驟見docs/SITES_TEST_ENVIRONMENT.md。
# 任務

## GitHub同步（2026-11-16）

使用者本輪明確授權將所有已提交工作推送至ChewyChloe/Sketch2Site的work分支。功能與部署準備提交67f5ab7fa65ecf3924988d4495a3c0364d375866已正常Push，git ls-remote核對遠端SHA一致；本紀錄另行提交同步。追蹤檔案秘密特徵、前端秘密與生成指引邊界掃描PASS。沒有Force Push、Merge、部署或付費API。以下較早的禁止Push／未同步紀錄為歷史狀態。


## Sites固定網址測試版準備（2026-11-16）

- 使用者要求改用Sites直接部署測試，覆蓋先前本輪禁止部署的範圍；仍未授權付費API、購買服務或Git Push。
- READY：cd4f5ed的前端已以相對資產路徑Build，秘密／後端生成指引邊界掃描PASS。靜態產物：/workspace/backups/Sketch2Site-static-site-cd4f5ed.zip。未包含後端、秘密或瀏覽器IndexedDB草稿。
- BLOCKED：使用者已標記Sites，但本對話工具清單沒有該連接器的上傳／發布／託管能力；已檢索工具，尚不能確認Sites是否支援多檔React靜態網站，也無法建立真實部署網址。沒有假稱已發布。
- 部署範圍：先提供前端拖曳／動畫／圖片／本機草稿預覽；正式AI需另行安全託管後端與秘密且仍需付費授權。來源從localhost改到網站時，舊草稿不會自動跨來源搬移。

以下為先前交付紀錄。

## 曲線文字顯示修正（2026-11-16）

- DONE：移除一般中文超過估算寬度就靜默退回直線的行為；以實際字寬及字素分行，每行用原生字級SVG曲線，曲度與文字跨度對應。最多240字／8行，極窄或超長內容仍靜態保留原文。
- DONE：修復Reduced Motion在元件掛載與訂閱之間切換時可能漏接的狀態；減少動態時保留靜態曲線，不留半透明動畫。縮放使用未變形的layout寬度，75%／50%不會再次重排文字。
- PASS：248單元／整合、15項曲線／既有動畫／獨立匯出Chromium、Typecheck／Build、秘密與生成指引邊界掃描。1002／375px真實字元位置測量、原文保留、曲線起伏、字元高低差、縮放與Reduced Motion皆通過。
- API說明：npm run dev只啟動前端；下載的專案不包含Cloud Codex秘密。AI生成需要本機後端與後端秘密、模型權限、支出上限及明確付費授權。未設定與服務不可達都可阻擋生成，草稿驗證也可能先阻擋。這輪沒有啟用或呼叫付費API。
- 原始證據：/workspace/backups/curve-fix-20261116/。沒有Push／Merge或部署。

以下為先前交付紀錄。

## 五項實測問題修復（2026-11-16）

- DONE：選取框改為同層邊框並合成節點／標籤，60%與75%縮放各連續32次移動後，以真實截圖像素檢查舊位置綠色殘影為0；不改Canvas座標或穩定ID。
- DONE：PNG／JPEG支援結構驗證後的缺省／舊MIME；失敗訊息就近顯示；新匯入圖片選擇未重疊位置並捲入視野，依Canvas version防止過時結果，提交成功後才報成功。
- DONE：連結支援合法公開HTTPS，維持拒絕JS、控制字元、憑證、異常埠、本機／IP目標；未通過驗證的輸入保留並說明尚未套用，不再失焦後清空。沒有新增URL抓取、圖片外連或Proxy。
- DONE：有內容的草稿按預覽會經既有本機Layout／PageSpec／驗證／CandidatePreview即時呈現，清楚標示非AI，確認後才儲存網站。既有網站從草稿選單的「開啟網站工作區」進入；所有Session／Revision／CAS防護保留。
- DONE：草稿保存會顯示儲存中，實際寫入完成且無未保存變更時按鈕顯示已儲存；保留快捷鍵與上一輪串行保存修正。
- PASS：245單元／整合、121完整Chromium E2E、Typecheck／Build、check:secrets／check:motion-boundary、git diff --check。網站編輯測試改由具名入口進入，新測試在1440／768／375px直接驗證草稿預覽；沒有刪除原有安全或資料保存斷言。
- 證據：/workspace/backups/workbench-repairs-20261116/；原始截圖未美化，全部為本機／Mock測試資料。沒有付費API、Push／Merge或部署。實體裝置GPU、使用者實際圖片檔與主觀美感不能以Headless測試宣稱全部證實。

以下為先前交付紀錄。

## 草稿動畫拖放修正（2026-11-16）

- DONE：修復hover-lift拖放被寫成lift而未被辨識；讀取端保留舊別名相容。草稿拖放新增相容元件綠色虛框、不相容目標紅框與原因提示；動畫不會新增示意內容。
- PASS：184單元／整合、13項相關Chromium、Typecheck／Build／秘密掃描／指引邊界掃描。實際驗證懸停浮起拖放、Undo／Redo、保存重載、拒絕縮放套到按鈕、改拖卡片及空白處選擇附加對象。
- 後續：使用者追加拖移殘影、圖片匯入、網址欄位、草稿預覽與保存回饋五項問題，正在另輪定位。沒有付費API、Push或部署。

## 目前工作：動畫擴充至二十種（2026-11-16）

- DONE工程：原有12種實際路徑核對，新增8種（逐字聚合、重點描線、影像展幕、磁吸按鈕、按壓回饋、群組焦點轉移、區塊閱讀進度、詳情收合），合計20。正式規格與分類見ANIMATION_SPECS.md；前端metadata與後端生成指引分層。
- DONE：原生示意、搜尋／情境篩選、相容拖放、必要參數、草稿標記、同Renderer、Patch／Undo／Redo／保存重載、獨立React匯出、Reduced Motion。沒有新增Renderer／Patch／資料庫格式或產品依賴。
- PASS：184單元／整合、Typecheck／Build、check:secrets／check:motion-boundary、雙npm audit均0漏洞。新增八種各自真實拖放／修改／Undo／Redo／重載與獨立匯出Build已驗證；32項針對性Chromium回歸PASS。最終完整Chromium 103/103 PASS（2026-11-16），包含保存隊列回歸。
- DONE：兩輪1440／768／375px Chromium互動與畫面審查，修正名稱低對比、英文搜尋／空結果、局部進度線、長文降級與鍵盤按壓復原。細節及可觀察限制見docs/MOTION_EXPANSION_REVIEW.md。工程通過不等於個人美感已認可。
- 效能：逐字100字素／每頁12項，閱讀進度每頁8項；既有物理／呼吸預算保留。24標籤360幀平均16.69ms、最長33.4ms，離屏僅餘2回呼，量測保存在motion-performance.json；不宣稱實體手機或長時間記憶體已測。
- DONE：修復草稿保存中忽略後續保存要求及成功狀態過早問題；單一串行隊列只合併明確保存，沒有新增自動保存。快捷鍵重跑6次及延遲完成通知的IndexedDB回歸PASS。
- 安全／限制：付費API呼叫0，真實AI權限／生成品質與實際費用仍NOT TESTED；不複製第三方素材／Prompt／動畫程式碼。使用者雲端直連入口仍BLOCKED（平台無預覽轉送工具），沒有以公開隧道或部署繞過。
- 證據：/workspace/backups/motion20-20261116/含兩輪三尺寸原圖／完整log／量測；恢復bundle位於/workspace/backups/Sketch2Site-motion20.bundle。未發現仍未修復的本輪P0／P1；實機手感與個人美感仍待人工評估。
- 交付：只建立本地Commit與恢復備份，沒有Push／Merge／公開部署；遠端尚未同步本輪變更。完成本附件20種最低目標後停止，不擴充未驗證的展示卡片湊24種。

以下保留先前交付紀錄。

## 目前工作：動畫素材展示修正

- 使用者否決9ec45e4的整體美感：上一輪可讀性改善不能當作視覺驗收。產品美感仍PARTIAL，不宣稱完美。
- DONE：桌面動畫頁籤560px雙欄、實際效果舞台、分層中英文名稱與相容性文案；移除重複識別圖及表單框式示意。原Renderer／Registry／Patch及草稿標記流程維持。
- DONE：屬性頁籤恢復原寬，窄螢幕單欄／可關閉面板；1440px畫布容器在瀏覽素材時1152→880px，這是明確取捨。手機需捲動素材，不能假稱所有效果同時可見。
- 驗證：155單元／整合PASS，Typecheck／Build／秘密掃描PASS，兩份npm audit均0漏洞。最終完整Chromium 82/82 PASS；首輪81PASS／1FAIL源於舊測試在手機拖曳畫面外素材，改為先捲至可視位置後，保留原生滑鼠與目標回饋驗證，針對性7項PASS。
- 證據：docs/GALLERY_VISUAL_REVIEW.md與/workspace/backups/gallery-redesign/。截圖為真正Chromium畫面，未修改圖片；展示資料非真實AI生成。
- 安全與交付：付費API呼叫0，沒有新依賴、Push、Merge或部署。只建立本地Commit；遠端尚未包含本輪變更，仍有未同步風險。

以下為先前交付紀錄。

## 目前結論（2026-11-14）

- DONE：錄影參考後的三項UI缺陷修整：原生字級與44px目標、每效果可辨識示意、直接操作不需展開。
- DONE：只重播指定Preset；懸停效果可鍵盤試玩；物理示意180px真實場景／上方入口；保留主畫布、原Renderer／Patch／Session／Revision／CAS與React匯出。
- PASS：155單元／整合、82全套Chromium E2E、Typecheck／Build／秘密掃描／雙依賴audit／三尺寸兩輪具體UI審查。證據見STATUS.md最新交付與docs/LIBRARY_UX_REVIEW_20261114.md。
- DONE收尾：本地Commit及恢復bundle，沒有付費API、Push／Merge或部署。實機手感仍無自動化保證，不把PASS當成「完美」宣稱；本輪可驗證缺陷已修正。

以下保留歷史紀錄。

## 目前結論（2026-11-13）

- DONE：12種動畫的統一規格、Schema、實際示意／正式Renderer、相容拖放、參數編輯、Patch／Undo/Redo、保存、Mock生成保留與同runtime React匯出。
- DONE：舊六種資料安全遷移；未知／錯誤版本、目標與參數拒絕；未完成Preset不可被當作可用效果。必填內容來自使用者，數字終值不能編造。
- PASS：155單元／整合、78完整Chromium E2E、三尺寸兩輪審查、獨立npm ci/build/離線執行、Typecheck／Build／秘密掃描／兩份依賴audit。最終補測與效能數據見STATUS.md及docs/MOTION_LIBRARY_REVIEW.md。
- PARTIAL人工驗收：素材操作密度、原創物理／折頁的主觀手感、美感；NOT TESTED：實體裝置、螢幕閱讀器、10分鐘瀏覽器記憶體耐久、付費AI。
- DONE收尾：只建立本地Commit及恢復bundle；本輪不Push／Merge／部署／付費呼叫。沒有已知待修P0/P1；免費MVP必要工程功能已完成，下一步是針對上述P2人工驗收，不擅自增加產品範圍。

以下保留歷史階段紀錄。

## 目前結論（2026-11-12）
- DONE：免費MVP React獨立匯出、本機圖片、四展示草稿、非AI完整流程、編輯／動畫／註記／保存、兩輪UI審查與高字級修正。
- PASS：130單元／整合、66 Chromium E2E、Typecheck／Build／秘密掃描／兩套依賴audit／歷史與Git完整性。詳細證據見STATUS.md及docs/FREE_MVP_REVIEW.md。
- PARTIAL：使用者最終視覺與操作手感驗收；NOT TESTED：真實付費AI、未安裝瀏覽器／實機。
- DONE交付：本機Commit與Git bundle；依使用者追加授權正常Push至origin/work，遠端功能SHA=7c77b46dc180816583fbaecba7f03de7c54f234f核對一致。沒有Force Push／Merge／部署；收尾文件一併推送，最終SHA以git log確認。
- 下一個最小任務：人工驗收桌面手感、示範入口及動畫辨識；免費工程工作已達停止條件。

## 歷史階段紀錄
- P0 DONE：文件、工具鏈、版本 1 Schema、Token、安全設定及測試。驗收：build、型別、測試、秘密檢查後第一個 commit。
- P1 DONE（依賴 P0）：真正拖曳、移動／刪除、標記、歷史、本機保存。驗收：Playwright 操作與截圖檢查，再 commit。
- P2 DONE（依賴 P1）：PageSpec v2、九種受控元件、六種動畫、響應式範例／本機 JSON 預覽、穩定 DOM ID、未修改分支 memo、安全拒絕與錯誤恢復。驗收：33 項單元／整合與 9 項 Chromium E2E、typecheck、build、秘密掃描、依賴稽核與 1440／768／375px 截圖檢查。
- P3 DONE（依賴 P2）：六種 ID Patch、可信 scope、原子批次、完整 Schema／Diff 驗證、不可變更新、Session／revision、頁面 Undo/Redo、最小標題／淡入編輯 UI。驗收：65 項單元／整合、12 項 E2E（含舊回歸）、typecheck、build、秘密掃描、audit 與 1440／768／375px 操作／截圖。
- P4 DONE（依賴 P3）：PageSpec 自動保存、交易 CAS、序列化／合併、重新開啟繼承 revision／新 Session、失敗重試、損毀保留及確認備份重開。驗收：88 項單元／整合、19 項 Chromium E2E（含程序重新啟動、雙分頁、失敗注入與舊回歸）、build／安全檢查。
- P5 PARTIAL：生成引擎、官方 Provider Adapter、後端限制、候選確認／CAS、五種 Mock 草稿端到端 DONE；112 項單元／整合與 29 項 E2E 通過。真實模型可用性、當日價格及五草稿 AI 品質 NOT TESTED，等待安全設定與明確付費測試授權，不把 Mock 當真實品質完成。
- P5.1 BLOCKED（免費準備 DONE）：Luna 候選／model review gate、預設一次與明確預算、cached／reasoning 用量、五份固定指紋與正式驗收報告；115 項單元／整合、29 項 E2E、Build／秘密掃描／audit PASS。真實呼叫 0；官方文件網路、Key、付費授權與 Project 限制確認待處理。
- 下一個最小任務：先解除官方文件存取，核實 Luna 的 ID／Responses／strict Schema／reasoning 與價格；安全配置 Key、確認 Project 支出限制並提出一次 portfolio 的具體成本供明確授權，再呼叫。
- 後續 NOT STARTED：AI 局部修改、矩形選取、匯出與雲端服務；不在本輪擴張。


## Phase 5.2（2026-11-10，Asia/Taipei；Recovery 後更新）

**READY：免費準備完成；正式生成等待帳務／支出限制確認與另行明確付費授權。**
- Recovery bundle 完整性驗證通過，恢復至 f5d73504e1489bd43f2f53f662f7de0193d356b7；包含使用者指定的 98af8a8a317e2e516f869d149718725f8627f224。保留 bundle 已有 low 設定，未重做先前變更。
- OPENAI_API_KEY 已由後端秘密環境配置（僅確認存在性，未列印／寫入金鑰）。本對話已執行一次無生成的 GET https://api.openai.com/v1/models，HTTP 200，列表包含 gpt-6-luna；本次恢復不重複查詢。這確認列表可見性，尚不證明 Responses 生成或 Project 帳務狀態。
- 採用使用者於 2026-11-09 核對的官方模型、Responses／Structured Outputs 與費率規格；本環境沒有重新查閱文件。來源：https://developers.openai.com/api/docs/models/gpt-6-luna 、https://developers.openai.com/api/docs/pricing 、https://developers.openai.com/api/docs/guides/structured-outputs 、https://developers.openai.com/api/docs/guides/rate-limits 。
- 安裝 lockfile 中 OpenAI SDK 7.53.0；型別辨識 gpt-6-luna、ResponsesModel、reasoning low。既有 fake transport 測試驗證 Responses、strict JSON Schema、low、store:false、4096 output 上限及無工具；Provider 明確 maxRetries:0、timeout:30000。SDK／Mock 相容性不等於真實回應成功。
- 正式路徑仍為 CanvasSpec → Layout JSON → materialize → 完整 PageSpec v2 Schema／來源內容／動畫驗證 → 前端再次驗證 → CandidatePreview；確認才經既有 CAS 保存。金鑰僅 server/config.ts 從後端環境讀取，未寫入前端或 fixture。
- 五份既有 Fixtures 可用，原位置、內容與動畫未修改。首份 portfolio：6 元素、0 動畫標記（不能宣稱已實測動畫播放），SHA-256 a1384324ce1429b60e980cb47b822fc88f15059c878cfc366f7929ba67947283。animated 的六標記保留供 Mock 回歸，不額外生成。
- 一次正式提案：gpt-6-luna、Responses、reasoning low、併發1、重試0、最多1次、無額外工具。依實際 Fixture／Schema／Prompt UTF-8 bytes + 8192 margin，input 預留14286（非實際 tokens）；output上限4096（含 reasoning）。input $0.10、cached input $0.01、output $0.50／1M tokens；不假設 cache 命中，保守預留 (14286×0.10 + 4096×0.50)/1e6 = **US$0.0034766**；提案單輪預算 **US$0.01**。
- 授權後才設定 SKETCH_AI_ENABLED=true、MODEL_REVIEWED／PRICING_REVIEWED=true、三費率、SKETCH_AI_MAX_CALLS=1、SKETCH_AI_BUDGET_USD=0.01；既有後端 limiter／呼叫計數／保守預留／去重／逾時限制皆保留。目前未啟用正式 Provider，未建立含秘密的 .env。
- 本輪實際生成0次，生成費用US$0；input／cached／output／reasoning tokens、生成延遲、真實截圖均 NOT AVAILABLE。未生成，故 UI/UX 前三問題 NOT TESTED，不能拿 Mock 結果代替。
- 未更動產品程式、UI／Renderer／Schema／Fixtures，未購買額度、變更帳務、Push、Merge 或部署。下一個最小任務：使用者確認 Project 帳務與支出限制，並另行授權上述最多一次 portfolio 付費生成；失敗即停，不第二次呼叫。

本次 Recovery 驗證：typecheck PASS；Vitest 10檔115/115 PASS；Chromium Mock／回歸29/29 PASS；build PASS（既有 Zod PURE 註解警告）；check:secrets PASS；generation:preflight 五份指紋 PASS；git diff --check PASS。僅更新這三份文件；本地提交 SHA 以 git log -1 查詢。真實生成及其桌面／手機 UI 品質仍 NOT TESTED。

## Phase 6（2026-11-10，Asia/Taipei）
- DONE：沿用原Renderer／Patch／保存流程，實作單擊與完全包含矩形框選、多選摘要、穩定UUID、空白／Esc取消、三模式與固定布局縮放。
- DONE：獨立SVG畫筆、Annotation v1結構、清除／撤銷、80筆／2000點限制、版本／尺寸綁定與過期提示，不寫入正式資料或外傳。
- DONE：精簡文字／標題層級／對齊編輯、六Preset拖放與可放置回饋、相容性／重複拒絕、參數時長、更換／移除、原子Patch及Undo/Redo／既有CAS保存。
- 驗證結果與截圖見STATUS.md。本輪未執行真實AI生成；Phase5付費品質仍NOT TESTED。
- 下一個最小任務：由使用者驗收Phase6操作與截圖；停止，不自行開始AI自然語言編輯或其他階段。

## Phase 6.1（2026-11-10，Asia/Taipei）
- DONE：應用列＋48px情境列、單一保存狀態、次要選單、共用元件／動畫／屬性面板，移除預覽重複狀態與模式說明。
- DONE：六Preset素材格、實際Renderer小型預覽、拖曳／相容性回饋；屬性單一套用、移除重複淡入控制、修改紀錄收合、暫存輸入不因素材切換丟失。
- DONE：1440／768／375px新流程及面積量測；窄視窗預覽及草稿工具預設收合、可明確退出；修正拖曳殘留造成的960px水平溢出。
- PARTIAL：UI/UX產品級人工驗收，等待使用者檢視新截圖及實際操作；不能以工程測試通過代替。
- 驗證、原始截圖及前後比較見STATUS.md與docs/PHASE61_UI_REVIEW.md。Phase5真實付費生成仍NOT TESTED，本輪不執行。
- 停止點：本地提交後停止Phase6.1，不進入Phase7，不Push／Merge／部署。

## 自主免費 MVP（2026-11-12，Asia/Taipei）
本次使用者授權覆蓋先前逐Phase停止規則；持續完成免費MVP，不呼叫付費API、不Push／部署。
1. DONE：安全的獨立React+TypeScript ZIP匯出；只帶正式Renderer、驗證、樣式與引用素材，下載後獨立建置與瀏覽器驗收。
2. DONE：安全本機圖片（實際格式驗證／重編碼／容量限制／IndexedDB／釋放URL），串接草稿、頁面及匯出，不外傳原圖。
3. DONE：可重複載入的作品集／活動／凌亂／動畫展示、明確標示Mock的免費完整流程、未啟用AI的清楚狀態。
4. DONE：操作／鍵盤／焦點／文字放大及兩輪重新操作的UI審查；全套回歸、安全檢查與最新備份。
基準4cc1ab1015ee7852b0aacd0b58b167af6f509972，Git fsck通過、工作區原先乾淨。Apple Design技能讀取成功（MIT），採用直接操作、即時回饋與克制原則，不新增動態套件或Apple外觀。
- 更新：A獨立React匯出DONE（121單元、38舊E2E及獨立匯出E2E通過），下一項立即進入B本機圖片與匯出資產串接。

- [x] 自主循環B：本機PNG/JPEG安全匯入、替換、持久保存、既有Patch及React匯出；單元與真實Chromium整合驗證。

## 持續品質與美感（2026-11-12）
- DONE：未套用輸入／失敗保留／手機下方工具區／草稿保存快捷鍵，130單元與63E2E、Build／秘密掃描PASS。
- DONE工程／PARTIAL人工美感驗收：Notion克制美感與Hallmark app-scope restyle，保留功能；新三尺寸原生操作、前後原圖與Hallmark render檢查，詳見docs/WORKBENCH_DESIGN_REVIEW.md。

- PASS收尾：130單元／整合、66全套E2E、Typecheck／Build／秘密掃描；原圖／比較頁與Hallmark render JSON保留。工程完成後GitHub正常Push與bundle核對，不宣稱人工美感已驗收。

## 自有Motion Spec Library（新附件，2026-11-12）
- 歷史規劃（本輪已完成）：先完成12個原創結構化規格，整併6個舊效果並保留舊資料安全相容，再依序完成展示／高複雜度效果；僅有通過Renderer、Patch、預覽、匯出與測試者標記DONE。
- 本輪附件明確禁止Push，覆蓋先前Push授權；不Merge／部署／付費模型。

## 第三批動畫擴充（2026-11-18）
- DONE：原40種向下相容＋20種不同Runtime，總60種；真實文字／圖片／Card群組及有界互動。
- DONE：素材參數排序、IndexedDB、Mock生成／Patch保留、Renderer與60種獨立React匯出。
- PASS：472單元、分批Chromium回歸及修正重跑、三尺寸Replay、離線匯出、Build／秘密及私人brief邊界。詳細證據見docs/THIRD_BATCH_MOTIONS.md。
- NOT TESTED：實機／Safari／Firefox、付費模型品質、此批線上版本。依本次範圍只本地提交，不Push／Merge／部署，停止於交付。

## 智慧排版與主題（2026-11-23）
- [x] DONE：PageSpec theme／chrome／section role與Renderer主題CSS（含匯出）。
- [x] DONE：Layout v2、本機智慧排版引擎、AI未設定時明確標示的本機替代。
- [x] DONE：AI prompt與v2 JSON Schema（未實際呼叫模型）。
- [x] DONE：候選／已保存頁主題切換、區塊範本、畫布符合寬度縮放。
- [ ] NOT STARTED：使用者提供Key後以真實模型驗收v2輸出品質。
- [x] DONE：畫布自動延長至4800px。
- [x] DONE：價目表與常見問題區塊；介面減量。
- [x] DONE：聯絡表單（第三方https接收網址，編輯器預覽不送出）。

- [x] DONE：品牌標誌與首頁（我的工作區、範例、介紹）。
- [ ] NOT STARTED：多草稿／多專案管理（目前單一工作區）。

- [x] DONE：格式刷／拖曳調整尺寸／範例照片／多分頁網站（本機排版）。
- [ ] NOT STARTED：多頁網站的 AI 逐頁生成。

## 2026-11-24 有個性的主題、動畫庫範本、註解
- DONE：主題個性層、動畫庫配方（範本／新區塊／自動加上動態）、註解泡泡本機解讀。
- NOT STARTED：一鍵整體檢查、註解AI後備（需付費測試授權）、參考圖轉草稿、一鍵發佈。

## 2026-11-26 圖層、網站浮動工具列、配色庫
- [x] DONE：網站預覽「圖層」清單（易讀名稱、隱藏版面結構、滑過框出、點選捲動）。
- [x] DONE：網站上元件正上方的浮動工具列（文字樣式、圖片相框／濾鏡、註解）。
- [x] DONE：品牌模板設定「配色庫」16 組原創配色＋從自己的圖片取色（瀏覽器內，不上傳）。
- [x] DONE：批次註解與 AI 排序規則的真實付費驗證（3 次，US$0.0003486）。
- [x] DONE：導覽列名稱過長時自動縮短；社團招生頁與課程專題展示範本放範例圖片。

## 2026-11-26 生成網站審美與 3D
- [x] DONE：審美標準文件與 AI 提示；7 個主題改成不同方向；裝飾與粗框移除；版型依內容變化；動畫收斂。
- [x] DONE：用註解／工具列加 3D（浮動立體卡、旋轉展示台、立體字），three.js 延遲載入，匯出可建置。
- [ ] PARTIAL：使用者主觀審美驗收（等使用者看截圖與實際操作）。
- [x] DONE：參考圖片（本機讀風格＋AI 只回固定風格選項，排版看不到圖片）。
- [x] DONE：參考圖片的真實 AI 看圖驗證（PASS，docs/PAID_AI_CONCEPT_REFERENCE_20261126.json）。

## 2026-11-26 設計概念
- [x] DONE：參考網站研讀（docs/REFERENCE_STUDY.md）。
- [x] DONE：設計概念層＋「展覽空間」＋自帶開源英文字型。
- [x] DONE：研究檔案、作品牆、單色海報、暗場、生成網格；AI 依內容選概念（真實 AI PASS）。
- [x] DONE：側邊點點導覽、CSS 捲動視差、互動價目表、作品瀏覽切換、數字證明、合作夥伴標誌牆、照片自動壓縮。
- [ ] PARTIAL：使用者主觀審美驗收（等使用者看）。

## 2026-11-26 AI 看草稿縮圖
- [x] DONE：生成時附上草稿小縮圖（low detail），只給宣告支援的後端；面板告知。
- [x] DONE：真實 AI 對照驗證（4 次，docs/PAID_AI_DRAFT_SNAPSHOT_20261126.json）。
- [ ] NOT STARTED：Cloudflare 後端（sitesWorker）收縮圖；等部署決定後再做。

## 2026-11-26 構圖（打破制式骨架）
- [ ] PARTIAL：構圖樣品「編排」（預覽可切換，預設整齊）；等使用者看截圖決定是否全面改。
- [ ] NOT STARTED：每段多種構圖由 AI 挑、保留草稿構圖、與概念並用。

## 2026-11-26 新流程（docs/WORKFLOW_STUDY.md）
- [x] DONE：先問清楚（參考、感覺、首屏、一定不要）。
- [x] DONE：三個方向並排（AI 同一次呼叫回傳；無 AI 時本機挑）＋同方向三種變化。
- [x] DONE：拿掉 AI 味（晨光配色、Instrument Serif）。
- [ ] NOT STARTED：標題三選一（成果導向）。
- [x] DONE：我的風格（存成可重複套用、不強制的習慣）。

## Demo Day 簡報（2026/12/4）
- [ ] PARTIAL：第一版簡報（10 頁 .pptx＋逐字稿）與第一版 85 秒操作影片（字幕版）已完成，見 docs/demo-day/。待使用者審稿、配音、實際 PowerPoint 彩排。參考：docs/DECK_REFERENCE.md。

## 動畫庫擴充：參考來源盤點（2026-11-27）
- [x] DONE：347 筆全量盤點（docs/motion-reference/INVENTORY.md、inventory.json）與來源授權紀錄（SOURCES.md）。
- [x] DONE：原創 metadata（src/referenceMotions.ts）。
- [x] DONE：第一批 7 個動畫（dolly-frame、color-wake、scroll-ink-words、hollow-fill-sweep、letter-windows、bold-relay、chart-build）。
- [ ] NOT STARTED：第二批：stacked-chapters（章節疊卡）、compare-slider（前後對照）、photo-spotlight（放大細看）、grow-to-stage（放大成舞台）。
- [ ] NOT STARTED：第三批：door-split、rush-skew、loupe-pan、second-look、accordion-gallery、row-paint。
- [ ] NOT STARTED：第四批：flap-board、echo-layers、neon-ignite。
- [ ] NOT STARTED：盤點中標為「既有功能可擴充」的 110 筆，依優先序 P2 → P3 逐項評估。

## 延續開發 P0–P4
- P0 DONE：tests/motion-filters.spec.ts 瀏覽器驗證搜尋、收藏、最近使用、排序、跨欄 AND／同欄 OR 和結果數量，1 PASS。下一步 P1。
- P1 PARTIAL：AnimationLibrary、App、Preview 共用參數；加入重設、真實元件試看與取消。Typecheck 和試看／取消／套用／Undo／Redo E2E PASS；待確認儲存重載、匯出與草稿元件試看。下一步 P2。
- P2 PARTIAL：pageSpec、pageRuntime.css 新增 10 個可選設計概念，沿用內容／動態與匯出。siteNav 測試 PASS；每款動畫搭配、鎖定元件的視覺驗證尚待補齊。下一步 P3。
- P3 DONE：motionFacets、AnimationLibrary 加入中英本機規則推薦、相容性、動態條件與理由，沿用原試看及套用。5 單元 PASS。下一步 P4。
- P4：App、layoutTools 沿用 Alt 量距，新增游標指定目標、雙軸間距及容器內距。8 單元與既有 Alt E2E PASS；待補精確 hover／縮放驗證。下一步完整回歸。
- 交接：P1 補草稿本機試看及重播；P2 補布局鎖定防護及減少動態適配；P3 推薦理由與 P4 游標量距的瀏覽器測試通過。5 項目標 E2E PASS（含獨立 React 安裝、建置及離線預覽），Typecheck PASS。完整 E2E 313 項尚未驗收，已有 annotation、character-decode、assets 流程失敗，需以單 worker 確認根因。P1 需驗證草稿試看與自訂參數重載／匯出；P2 需逐款確認鎖定元素及動畫；P4 需補非預設縮放／平移。付費呼叫 0。

## 驗收與修復（起點 b7c7d2e）
- 已知 E2E：單 worker 重現測試 3/3 PASS。逐字解碼原本可能在讀取前就卸載暫態層，改用瀏覽器內記錄多個真實影格，保留原文與清理斷言，修正後 1/1 PASS。註解與圖片匯出並行失敗、單 worker 通過，未證實產品故障或唯一環境根因。
- P1：草稿選取內容試看／重播／取消，網站自訂 700 ms 儲存／重載與匯出 ZIP 參數一致，3/3 目標 E2E PASS。獨立 React 建置列入最後回歸。
- P2：同份咖啡網站 Mock 驗證 10 個風格的計算樣式各異、桌面／手機不溢出、內容／素材／既有動畫不變。修復鎖定區塊的子網格仍被概念改寫，並排除鎖定範圍的相關樣式；同一案例重測 PASS。
- P4：新增實瀏覽器縮放至 75%、畫布捲動平移、卡片內元素的水平／垂直內距與放開 Alt 清除，1/1 PASS。草稿以平面座標表示容器內部。
- P0／P3：重跑同一瀏覽器回歸 PASS（搜尋、收藏、最近、篩選、排序與推薦理由）。獨立 React ZIP 安裝、建置及離線瀏覽器 PASS。單元 703/703 PASS。完整 E2E 以單 worker 執行，避免上一輪並行逾時。
- 完整回歸另發現草稿拖放案例的儲存斷言同時命中動畫結果數與儲存狀態，改定位頁尾狀態，保留原斷言與重載驗證，針對重測 PASS。
- 完整回歸另確認雙面卡應用按鈕在窄側欄被其他 flex 操作擠成零寬。僅加可換行與套用最小寬度；原雙面卡 E2E 和 P0／P3 回歸重測皆 PASS。
- 最終驗收：單元 703/703；完整 E2E 309 PASS／7 FAIL／0 未執行。7 項失敗全部定向重測 PASS：兩個共用 status 定位、窄側欄套用按鈕，以及四個 Mock 後端在 32 Session 上限後無法取得新會話的案例（新程序通過）。未修改後端上限；後續全套可依序使用 Playwright --shard 搭配各自新 Mock 程序。375px 動畫庫、獨立 React 建置與離線預覽 PASS。付費 API 0。

## 功能凍結前驗收（基準 e5da8d8）
- DONE：`npm run test:e2e` 以單 worker 順序分 16 批，每批重啟 Mock，且 readiness 不建立 Session。沿用正式的 32 Session 上限及 API 安全／額度規則。指定測試檔可用 `npm run test:e2e -- tests/concept-acceptance.spec.ts` 單獨執行。
- PASS：十種風格共用咖啡頁 Mock。逐一確認桌面／手機的內容與既有動畫、鎖定版面，驗證標題合法動畫組合、錯誤元件與互斥進場動畫，並檢查 React 匯出的頁面資料、概念 CSS、字型與 Runtime 入口。
- 完整 E2E 316 項，最終 308 PASS／0 FAIL／8 SKIP。按批次（通過／失敗／跳過）：1–5 各 20/0/0；6 首輪 19/1/0，修正測試資料後單補 1 PASS；7–10 各 20/0/0；11 為 19/0/1；12 為 14/0/6；13–14 各 19/0/0；15 為 18/0/1；16 為 19/0/0。沒有重跑未受影響的通過案例，未重現 Mock Session 上限錯誤。8 項缺少既有付費結果檔，付費 API 呼叫 0。

## 三軸設計控制與區塊布局
- DONE：分離候選構圖、風格及捲動視差。設計方向保留明選設定；區塊編輯可選卡片式、Bento、分屏、多欄網格、垂直排列或瀑布流，滿版可獨立組合。沿用現有 Patch、歷史、儲存及共用 Runtime。
- DONE：明選布局依草稿來源 ID 帶入生成計畫，套用時驗證資料、區塊容量及動畫相容性。原位置模式沿用座標 Runtime，區塊選擇器限智慧排版。舊式版面鎖定且沒有明選布局時，保留全頁的既有構圖，可逐區調整未鎖定區塊。Style／Motion 維持既有選擇與元件動畫機制，未新增兩者的逐區鎖定欄位。
- PASS：全套單元／整合 705 項，最後相關回歸 168 項；11 項相關 Chromium E2E 包含獨立 React ZIP 安裝、建置、桌面及手機渲染。型別、建置、秘密掃描通過。付費呼叫 0。

## 生成前規劃
- P0 DONE：描述面板新增確認摘要，沿用實際 Brief、Canvas、outline 與目前頁面順序；可返回修改，確認後才發送，工具列快速生成照常。型別檢查與描述、方向、參考圖 E2E 9 項 PASS，付費呼叫 0。
- P0 DONE：規劃檢視逐頁顯示區塊用途、既有內容、布局縮圖、動畫及指定狀態；智慧排版可修改布局、滿版及順序，直接寫回草稿，以來源 ID 送入本機與 AI 計畫；既有版面鎖定阻擋區塊調整。型別、117 項相關單元、2 項 E2E PASS，已驗證改動實際呈現在生成候選。
- P1 DONE：參考圖用途逐張複選，預設整體風格。按用途分組分析，既有模型請求明確標註每張圖的用途，生成計畫只讀取允許的維度；手動主題、品牌字體與鎖定布局優先。型別、130 項相關單元、5 項參考圖 E2E PASS，付費呼叫 0。
- P1 DONE：規劃檢視整合本機動畫配方、動態庫相容性與自然語言規則；依網站調性、區塊角色與選取元件提供理由，可試看、取消及確認套用。既有動畫及受保護元件保留，確認後寫回草稿，驗證候選保有同一目標 ID 與動畫。
- 驗收：142 項相關單元／整合、11 項相關 Chromium E2E、型別、建置與秘密掃描 PASS。保留位置模式仍以原座標為準；草稿內容未完整時可檢視摘要，但部分布局或動畫須補完草稿才能試看。付費呼叫 0，未合併或部署。

## 素材修正、動畫擴充與私人部署
- Phase 1 PARTIAL：修正動畫推薦對比、側欄捲軸、設計工具底板、概念選項換行、生成網格數字裝飾、座標模式的前後移、手機檢視選單疊層，以及「漂浮」與生成失敗提示。型別與相關單元 PASS，概念／畫布／移動瀏覽器擇測 14 項 PASS。
- Phase 1 BLOCKED：對話內可見夜間庭院與黑白作品集兩張圖，重傳後仍只有 data.js 可在執行環境取用。相片替換待原始圖檔可讀。
- Phase 2 持續中：以 347 筆來源核對盤點，基準 Registry 75。批次 2 完成 #50 交風字帶、#223 遠方經緯，新增 2 種正式動畫（共 77）；區塊動畫鎖獨立於其他軸。型別、165 單元，8 項針對性 Chromium（含 Mock、獨立 React 匯出、手機與 Reduced Motion）通過。
- Phase 3 批次 3 DONE：新增 #11 字雨垂幕、#30 翻頁字磚、#43 印記拍點，Registry 共 80。144 相關單元與 8 項相關 E2E PASS；10 項補驗證覆蓋兩批草稿試看、重播、套用、移除、參數、歷史與重載。正式建置、秘密與生成簡報邊界掃描 PASS。完整回歸待所有批次完成。
- Phase 3 批次 4 DONE：擴充既有導航（#339 四種選單圖示變形，#341 浮窗展開與背景調暗），沿用共用 Runtime。型別與 8 項相關 Chromium 通過，包含 Reduced Motion、鍵盤與獨立 React 匯出。Registry 仍為 80；新增獨立動效 5、擴充複合元件 1。
- 續作 checkpoint：來源 347 筆。60 筆歸入同等效果；74 筆排除原因逐列記在盤點；待實作 195 筆（107 擴充、77 獨立、11 複合）。已驗證標記請見 `docs/motion-reference/inventory.json`。下一批可先處理 #340 分條遮罩選單、#8 數字落下倒數、#210 捲動切換固定影像；各批延續相同盤點、Runtime 與測試矩陣。既有提交依序為 46f8e41、fe6ed38、7591b05，接續本批提交。兩張範例照片、完整回歸與私人部署仍待完成。付費呼叫 0。
- Phase 3 批次 5：#8 已擴充 `count-up` 的「落點倒數」模式。Registry 仍為 80；待實作 194 筆（106 擴充、77 獨立、11 複合）。相關單元 36 項、Chromium 2 項通過（數字逐幀、375px、Reduced Motion、獨立離線匯出）。未另跑此模式的 Mock 與素材庫生命週期。下一批沿用批次 4 的導覽設定實作 #340。
- Phase 3 批次 6 DONE：#340 在既有導覽元件加入「分幕選單」，支援順序揭露及反向關閉。Chromium 2 項通過（手機、鍵盤、Reduced Motion、獨立離線匯出）。核對 #176、#210 的實際機制後移回擴充清單；現有版本分別是點擊聚合及整張卡切換。現況 347 筆、58 筆同等、74 筆排除、195 筆待實作。Registry 80。
- Phase 3 批次 7：#176 在既有圓球動畫新增「漂流融合」，主題色背景可自主漂移，游標懸停時拉近，Reduced Motion 靜態呈現。Chromium 4 項通過（既有模式回歸、新模式實際播放及獨立離線匯出）；新模式的獨立 Mock／素材庫生命週期未重跑。
- 最新續作 checkpoint：76a651f 起始；46f8e41 修工作台；fe6ed38、7591b05 新增 5 個 Registry ID；ffab09c、539a8e5 擴充同一導覽元件；0184467 擴充落點倒數；批次 7 新增漂流融合參數模式。總計 347 筆來源，58 筆已有同等、74 筆排除、21 筆對應已交付工作、194 筆待實作（106 擴充、77 獨立、11 複合），Registry 75 → 80。下一批 #210：由既有 StoryGroup 的整卡切換擴充為影像固定、文案自然捲動；需 PageSpec 核對每一分鏡有圖文，保留手機／Reduced Motion 直排。接續 #208 相簿分類切換與 #207 分頁群組。完整回歸、兩張圖片替換、推送及私人部署仍待達成前置條件。付費 API 0。
- Phase 3 批次 8：#210 已擴充 `pinned-story-panels`。固定影像與捲動文案模式沿用分鏡卡片、進度控制與共享 Runtime；需每張卡有一張直屬圖片及文字，手機與 Reduced Motion 使用完整直排卡。相關單元 25 項、Chromium 5 項通過（原模式回歸、圖文滾動與獨立離線匯出）。Registry 80，193 筆待實作（105 擴充、77 獨立、11 複合）。接續 #208 相簿分類篩選與 #207 分頁群組。付費 API 0。
- Phase 3 批次 9：#208 擴充相簿，作者可設定圖片／卡片分類，訪客切換時動態縮小退場並補位。沿用相簿選擇器與共用 Runtime。型別與 3 項 Chromium 通過（播放、手機和 Reduced Motion、修改與重載、獨立匯出）。Registry 80，192 筆待實作。下一批 #207 可沿用既有詳情收合的卡片資料，擴充分頁互動。
