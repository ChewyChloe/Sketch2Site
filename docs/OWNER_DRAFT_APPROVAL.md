## 真正目前草稿核准修復（2026-11-18）
- ROOT CAUSE：舊portfolio-motion-v1仍將非動畫欄位鎖死；使用者截圖有新增卡片／變更座標，必然hash不符，並非使用者操作錯誤。
- DONE：owner-draft-v1經正式owner＋同源＋CSRF＋完整CanvasSchema／prepareIntent＋免費精確成本檢查後，為目前完整draft hash簽發owner／origin／10分鐘HMAC ticket。生成必須同hash、同owner、有效ticket與D1 READY proof；不再鎖示範，不接受前端自報權限。
- DONE：保留同一sites-ai-motion-test-v1額度，不開新slot、不刪舊PASS。budget.01、default Luna、zero retry不變；前端自動完成目前草稿免費核准再生成。
- PASS：290項全量單元整合＋1新增client forwarding測試、11瀏覽器Mock回歸＋真實結果Chromium重播1項、build／secret／motion boundary。
- PASS：另一次已授權不同自訂草稿Provider付費自測（非失敗重試），input2876／output515（reasoning124）、cost約US$0.000616925，PageSpec／motion保留／React預覽保存通過。兩個獨立CLI自測合計US$0.00116835，journal均保留。正式Sites owner瀏覽器未自動驗證，不冒充身分。


不需載入核准範例，使用自己的合法草稿直接按生成；owner免費核准和簽章在前端函式內自動完成。後續修改需重新免費核准，token不寫storage、不console、不將草稿存D1。
