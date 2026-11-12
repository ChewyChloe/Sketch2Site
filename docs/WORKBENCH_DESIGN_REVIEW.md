# 工作台美感與直覺操作審查

2026-11-12。使用者指出實際UI醜、缺乏直覺，指定參考Notion的美感及nutlope/hallmark；沒有要求複製Notion布局。工程測試通過不代表美感通過。

## 參考與保留

Hallmark v2.0.0的README、MIT授權、SKILL、redesign、App screens／Harnesses、craft與gates已讀，固定參考Commit `04977e15f3dfd6ee4b74c887dac3eb52665d6c92`。來源：https://github.com/nutlope/hallmark 。Apple Design參考仍用於跟手、空間一致、即時與可中斷操作。

Scope為既有app screen的brand restyle；人群為不熟網頁技術的使用者，主要任務是安排草稿、生成明確非AI的示範並編輯／保存／匯出。真實材料是現有App與固定Fixture，不新增照片、行銷文案或虛構統計。不執行任何付費模型。

保留PRODUCT／DESIGN_SYSTEM的中性與綠色、草稿／預覽／右側工具架構、所有受控元件與六Preset。App.tsx保留每個操作handler／輸入aria-label／test hook；Preview保留Patch、Session、Revision、選取與註記；PageRuntime、Schema、Provider與匯出模板完全不動。新增樣式只作用工作台Chrome，網站輸出不換色或字型。

修改檔案：App.tsx、Preview.tsx、WorkbenchIcon.tsx、workbench.css；新增三尺寸實際操作與截圖流程design-polish.spec.ts。不刪除route、功能、元件樹或測試；UI移除的UUID字串是使用者先前明確禁止的一般介面技術資訊，資料ID未變。

## 基準審查與實際修正

- 元件庫五項各佔一張75px左右的邊框按鈕，視覺重量超過畫布。改為約58px清單，正式SVG、內容左對齊、Hover時出現把手；實際原生拖放新增及Undo驗證。
- 應用／情境列每個操作都有邊框和綠色狀態，優先級不清楚。現在次要動作用中性Hover、唯一生成／套用主要動作用綠色；草稿／預覽明確分段，既有保存、選單都可找到。
- Source Properties缺少分組，且顯示UUID與常駐寬度滑桿。現在有選取類型、內容、位置與尺寸、動畫，低頻寬度收合；文字與數值均經原驗證。
- 預覽選取2px輪廓過於搶眼，縮成1px；實際ID、元件bounds、縮放與全包含框選規則不改。
- 初版匯入圖片圖示因共用拖曳把手CSS被推到右側，實際截圖發現後修正獨立按鈕類別。沒有把「測試可點」當成對齊合格。
- Hallmark第一次實際render查到欄位邊界對比不足；以單一較清楚下緣修正，不把全工作台重新套滿深色框。手機表單改16px，保持可讀。

## 瀏覽器與工具結果

Playwright每個1440／768／375px流程從空白開始，查看元件庫、載入同一作品集、選取／修改屬性、儲存、示範候選確認、動畫附加及取消選取。1440px另做實際Native DnD新增與Undo；三尺寸確認文件無水平溢出。所有HTTPs請求被測試攔截，沒有AI生成。

前後原始截圖：`/workspace/backups/design-before-098a92f/design-before-*.png`、`test-results/design-after-*.png`；沒有後製。每組包括empty、draft、draft-properties、properties、animations，均同一Fixture、Viewport與縮放條件。另看既有review2、未套用保護、200%文字與100元素拖曳，驗證不是只做好一張靜態圖。

Hallmark scripts只放/tmp，沒有全域安裝技能或加入App依賴。Puppeteer Core 24.37.2（Apache-2.0）也僅為/tmp驗證工具。第一次render因Cloud Chromium sandbox／crashpad路徑啟動失敗；改用與既有Playwright相同的本機Chromium no-sandbox方式及獨立可寫config/cache，工具render成功。

Hallmark最終檢查涵蓋8種寬度並擷取5張圖：Floor 0 FAIL、Reflex 0未處理、WARN 0、render=ran。**有38個24b spacing檢查例外，不是全部規則天然通過**：保留32px控制／48px情境列與1px邊框所需的2px、7px optical inset及既有設計密度；同一條明確例外套用38個靜態位置。F7已回答：真正表單刻意維持同一輸入樣式，元件庫已是無卡片清單。詳細JSON另隨本機截圖備份，不把工具數字稱為產品級美感證明。

## 尚需人工驗收

Notion感的克制、首次操作對元件拖曳的發現性、中文字體的主觀舒適度，仍需使用者看最新畫面。375px完整滑鼠編輯不是主要情境；601–1000px工具開啟仍為右側覆蓋，關閉可還原畫布。真實Safari／Firefox／觸控／原生字體縮放與付費AI品質仍NOT TESTED。
