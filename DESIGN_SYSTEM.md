# 設計系統
編輯器工作台：暖灰底、白色面板、深色文字、綠色單一強調色。畫布為主、元件庫在右、工具列在頂。無行銷首頁、假統計或裝飾漸層。
CSS :root 集中 Color、Typography、Spacing、Radius、Shadow、Border、Motion、Z-index tokens；8px 間距並允許 4px。系統字體支援繁中英文；正文 14px，畫布內容 16px。
按鈕狀態：hover、focus-visible、disabled；選取以綠框與文字標示。空白畫布提示拖曳或點擊新增，錯誤含重試方法，儲存結果用 live region。
面板可收合與調寬；窄視窗允許工作區捲動，維持工具列可操作。效果僅顯示標記，不在草稿播放；支援 reduced motion。
鍵盤：Delete / Backspace 刪除，Ctrl/Cmd+Z 復原、Shift+Z 或 Y 重做、S 儲存、D 複製、方向鍵微調（Shift 10px）。輸入欄位保留原生編輯。

## Phase 2 預覽
保持工具列、中性色與綠色強調；預覽模式隱藏草稿編輯工具與側欄，為內容保留空間。窄視窗工具列自然換行，工作區高度依實際工具列調整，不用固定高度扣除值。
預覽共用既有 Color／Font／Border／Radius Token；新增 page-space（8/24/48px）、content（1120px）、narrow（720px）、heading（32–56px / 24–36px / 22px）及 body（16px、1.8 行高）。Heading 平衡換行，長內容可斷行，圖片維持比例。
styles、gap、padding、align、width 只能選 Token；800px 以下預覽容器 Grid 單欄，手機框最大 375px。這是預覽容器斷點，不是只支援特定裝置。
動畫短促、受控、不彈跳；所有六種效果遵守 reduced-motion。固定範例標示「範例預覽」，載入檔案標示「本機檔案預覽」，均明示未使用 AI。錯誤顯示具體原因與重新載入方式；圖片載入失敗提供重試。


## Phase 3 局部編輯
點選標題或使用標題選單選取；選中元素以既有綠色輪廓標示，不更改頁面內容。未選取時不常駐空白屬性面板，選取後沿用側欄與 field／primary Token。1000px 以下以可捲動下方面板編輯，維持預覽可見。
文案使用「套用」「撤銷修改」「重做修改」「最近修改」。Diff 僅呈現實際前後值；不宣稱其他元素位置完全不變。現階段 UI 僅支援標題文字與淡入動畫，完整安全操作在 Engine 提供給後續功能，不展示未實作的 AI 控制。
