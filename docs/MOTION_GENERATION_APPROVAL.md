## 動畫草稿獨立核准（2026-11-18）
- DONE：定位DRAFT_HASH_MISMATCH為舊無動畫整份白名單。新增server/sitesDraftPolicy.ts；server-only portfolio-motion-v1核准只容許合法動畫層變更，其他文字／布局／素材仍對照原SHA；CanvasSchema／prepareIntent保留。
- DONE：固定動畫獨立D1 slot sites-ai-motion-test-v1，原sites-ai-single-test-v1成功紀錄不重設；一次、零重試、budget<=.01、default Luna不變。新動畫精確free count與D1 READY proof須在同份request匹配，才可預留付費額度。
- PASS：287單元整合測試、11瀏覽器Mock端到端（含六種效果生成／驗證／預覽／保存）、build、秘密及motion boundary掃描。預設六動畫request9967bytes，max8192 input／4096 output，最壞模型token reserve US$0.003072；未實測exact tokens。
- BLOCKED：真實付費自測無正式owner瀏覽器連線，Browser Use could not read requirements。Sites服務token不含visitor身分（官方identity-and-secrets）；不冒充、不繞過、不直接用Cloud Key替代Worker驗收。本輪paid calls0，AI開關false。
- 本輪只推Sites source並私人部署，不改GitHub。不得把Mock截圖當真實AI成功；test-results/portfolio-six-animations-mock.png為Mock。


新runtime SKETCH_AI_DRAFT_POLICY=portfolio-motion-v1；只有已授權的下一次動畫測試使用這個固定case，禁止自動換slot補回。ENABLED／TEST_APPROVED／BILLING_CONFIRMED均false，expiry移除。成功前不請使用者反覆付費試錯。
