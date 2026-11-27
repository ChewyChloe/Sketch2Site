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
