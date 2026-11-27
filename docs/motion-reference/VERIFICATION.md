# 新增動畫驗證矩陣

「通過」由 Chromium 實際渲染／操作、Mock 或獨立匯出腳本核對。實際模型生成未執行。

| 來源／Registry ID | 素材庫、播放 | 草稿試看、重播 | 套用、移除、參數、歷史、重載 | Mock 保留 | 獨立 React 離線匯出 | 手機／Reduced Motion |
|---|---|---|---|---|---|---|
| 50 / `crosswind-ribbons` | 通過 | 通過 | 通過 | 通過 | 通過 | 通過 |
| 223 / `vanishing-lattice` | 通過 | 通過 | 通過 | 通過 | 通過 | 通過 |
| 43 / `imprint-beats` | 通過 | 通過 | 通過 | 通過 | 已建置且離線載入，動態由網站預覽測試驗證 | 375px 未獨立執行；Reduced Motion 下套用與重載通過 |
| 11 / `drift-letterfall` | 通過 | 通過 | 通過 | 通過 | 通過 | 通過 |
| 30 / `turning-letter-mosaic` | 通過 | 通過 | 通過 | 通過 | 通過 | 通過 |

對應測試在 `tests/reference-motions.spec.ts`、`tests/motion-filters.spec.ts`、`tests/generation.spec.ts` 與 `tests/export.spec.ts`。區塊動畫鎖由 `src/sectionRewrite.test.ts` 驗證。

## 批次 4｜導覽列

- #339：Chromium 在 390px 驗證線條交會、折線返回、滑移換形、細線合攏。各模式皆從草稿選定並進入網站，鍵盤可進入清單，Escape 關閉後焦點返回選單按鈕。Reduced Motion 移除插值。
- #341：Chromium 驗證面板展開、連結依序出現與內文調暗。React ZIP 獨立安裝、建置、375px 離線開啟，Reduced Motion 保留可操作的靜態選單。
- 本批共 8 項相關 Chromium 通過（既有 2 項、新設定 5 項、獨立匯出 1 項）。導覽列設定採既有 Canvas／PageSpec／Runtime，和素材庫的單一節點動畫分開計數。

## 批次 5｜落點倒數

- #8：在既有 `count-up` 下新增「落點倒數」。Chromium 記錄 10、9、8、7 的實際連續更新與落點動畫，驗證背景更新不改讀屏原文，以及 375px 與減少動態下直接顯示終值。單元涵蓋本機中文指令保留數字原文及後綴。既有未指定此模式的專案沿用平滑計數。
- React ZIP 獨立建置與離線 Chromium 在 Reduced Motion 下顯示正確終值。素材庫可透過原有參數編輯器試看；此模式的獨立 Mock／素材庫生命週期未另跑。

## 批次 6｜分幕選單

- #340：Chromium 驗證五條遮罩依序下展、連結可鍵盤操作、Escape 觸發反向收幕並還原焦點，390px 不溢出；Reduced Motion 下無轉場。獨立 React ZIP 安裝、建置及 375px 離線驗證通過。

## 批次 7｜漂流融合

- #176：Chromium 驗證三顆圓球自主漂移、游標靠攏、主題色、375px 與 Reduced Motion。既有點擊模式的回歸含套用、移除、參數、歷史及重載。新模式未另跑 Mock 或完整素材庫生命週期。
- React ZIP 獨立安裝、建置與離線載入保有漂流融合模式，Reduced Motion 顯示未套黏性濾鏡的靜態圓球。

## 批次 8｜固定影像與捲動文案

- #210：Chromium 驗證左側影像位置固定、右欄文案獨立捲動且圖文相符，375px 與 Reduced Motion 保留直排原卡，獨立 React ZIP 安裝、建置及離線圖文切換通過。另驗證原模式的播放、套用、移除、歷史、儲存重載及鍵盤焦點。新模式未另跑 Mock 或完整素材庫生命週期。

## 批次 9｜作品分類

- #208：使用現有相簿大圖／網格／清單元件。Chromium 檢查不符的作品縮小退出、保留作品移至新位置、375px 與 Reduced Motion 即時完成切換，以及獨立 React ZIP 的離線篩選。
- 網站編輯器修改分類後會即時顯示新篩選，重新開啟網站工作區驗證 IndexedDB 還原。

## 批次 10｜底線分頁

- #207：動畫庫調參後可試看、重播，Chromium 驗證底線、方向滑動、左右鍵及 End、選取語意、375px 及 Reduced Motion。獨立 React ZIP 通過安裝、建置、離線鍵盤切換。沿用既有參數及 Patch，分頁模式未另跑 Mock。

## 批次 11｜互動 Bento

- #209：桌面滑過寬度增加且相鄰格寬度縮小，游標離開恢復，鍵盤聚焦可觸發，375px 與 Reduced Motion 維持靜態布局。獨立 React ZIP 在離線版保有焦點觸發和重新排版。

## 批次 12｜文字位置動態

| 來源／Registry ID | Chromium 觀察 | 共用檢查 |
|---|---|---|
| 1 / `storm-landing` | 下落、觸地壓縮，單次亮痕卸載 | 草稿試看、重播、網站套用、移除、參數、歷史及重載 |
| 10 / `cutout-ticks` | 離散位移迴圈 | 同上 |
| 20 / `inverse-spring` | 兩次不同高度的上彈 | 同上 |
| 26 / `sign-pivot` | 以文字上方為支點回擺 | 同上 |
| 34 / `quiet-landing` | 一次震幅逐漸衰減的進場 | 同上 |

五項都驗證 375px、Reduced Motion 與 Mock 保留。獨立 React ZIP 安裝、建置、離線載入通過，各自關鍵影格於網站預覽驗證。
