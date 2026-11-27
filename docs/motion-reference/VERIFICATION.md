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
