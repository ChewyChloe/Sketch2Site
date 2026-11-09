# 設計系統
編輯器工作台：暖灰底、白色面板、深色文字、綠色單一強調色。畫布為主、元件庫在右、工具列在頂。無行銷首頁、假統計或裝飾漸層。
CSS :root 集中 Color、Typography、Spacing、Radius、Shadow、Border、Motion、Z-index tokens；8px 間距並允許 4px。系統字體支援繁中英文；正文 14px，畫布內容 16px。
按鈕狀態：hover、focus-visible、disabled；選取以綠框與文字標示。空白畫布提示拖曳或點擊新增，錯誤含重試方法，儲存結果用 live region。
面板可收合與調寬；窄視窗允許工作區捲動，維持工具列可操作。效果僅顯示標記，不在草稿播放；支援 reduced motion。
鍵盤：Delete / Backspace 刪除，Ctrl/Cmd+Z 復原、Shift+Z 或 Y 重做、S 儲存、D 複製、方向鍵微調（Shift 10px）。輸入欄位保留原生編輯。
