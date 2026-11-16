
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
