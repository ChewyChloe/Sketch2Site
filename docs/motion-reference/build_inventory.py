# Builds docs/motion-reference/inventory.json from the reference's factual fields
# (id, component, trigger, technique) plus Sketch2Site's own classification.
# No source names, descriptions or prompts are written out.
import json, sys
items = json.load(open(sys.argv[1]))
EXIT = "沒有離場生命週期：網站元件不會被移除"
APP = "App 介面控制，不是網站內容動畫"
CUR = "取代系統游標，影響可用性與無障礙"
# code: S 已有同等功能 / X 既有功能可擴充 / N 需要新增動畫 / C 需要新增複合互動元件 / U 不適合目前架構或需要額外授權
M = {
1:("N","","P4","文字重落進場"),2:("U","","—",EXIT),3:("N","","P4","硬幣式翻轉循環"),4:("U","","—",EXIT),5:("U","","—",EXIT),
6:("X","breathing-glow","P4","加上文字縮放與波紋"),7:("N","","P4","萬花筒旋轉"),8:("X","count-up","P4","倒數模式"),9:("S","kinetic-text-wave",""," "),10:("N","","P4","定格晃動"),
11:("N","","P4","文字落雨背景"),12:("N","","P4","文字放大鏡"),13:("S","character-decode","",""),14:("U","","—",EXIT),15:("S","gradient-text-flow","",""),
16:("X","curved-path-text","P3","整圈旋轉"),17:("N","","P4","水面倒影"),18:("S","kinetic-text-wave","",""),19:("X","kinetic-text-wave","P4","旗面起伏"),20:("N","","P4","反重力彈跳"),
21:("X","letter-assembly","P4","磁吸聚合"),22:("N","","P4","格狀文字背景"),23:("N","bold-relay","P1","批次一完成"),24:("N","","P4","扇形展開"),25:("N","","P3","逐字點亮與跳點"),
26:("N","","P4","鐘擺搖晃"),27:("X","pixel-dissolve","P4","文字版本"),28:("X","text-morph-transition","P3","環形換字"),29:("X","blur-in","P3","殘影進場"),30:("N","","P4","棋盤翻轉背景"),
31:("N","","P4","∞ 軌道"),32:("X","rolling-characters","P4","換位排序"),33:("N","","P4","漩渦"),34:("N","","P4","顫抖後穩定"),35:("X","typographic-stretch","P3","縱向波浪"),
36:("N","","P3","墨水暈開"),37:("S","letter-assembly","",""),38:("N","","P4","多字型輪替（需字型授權確認）"),39:("U","","—",EXIT),40:("S","float-idle","",""),
41:("S","elastic-word-bounce","",""),42:("X","elastic-word-bounce","P3","重落節奏"),43:("N","","P3","蓋章進場"),44:("N","","P4","縱深飛出"),45:("N","","P3","詞語堆疊"),
46:("X","text-morph-transition","P3","穿越換詞"),47:("X","text-morph-transition","P3","擠壓換詞"),48:("X","marquee-text","P3","雙速巨字"),49:("X","marquee-text","P4","直排"),50:("N","crosswind-ribbons","P2","雙向裝飾字帶，保留中央原文"),
51:("X","curved-path-text","P3","沿波浪線流動"),52:("X","marquee-text","P3","多層帶狀"),53:("X","marquee-text","P4","直排多欄"),54:("X","marquee-text","P3","交叉膠帶"),55:("U","","—","需要 3D 場景，效能與可讀性不符網站文字"),
56:("U","","—","需要 3D 場景，效能與可讀性不符網站文字"),57:("N","","P4","CSS 3D 圓柱"),58:("U","","—","需要 3D 場景，效能與可讀性不符網站文字"),59:("N","","P4","帶景深環繞"),60:("N","","P3","四面方塊換字"),
61:("X","Depth3D","P4","既有 3D 效果加文字厚度"),62:("N","flap-board","P4","規劃於批次四"),63:("X","flip-card","P3","翻卡換字"),64:("X","typewriter","P2","多句輪替"),65:("X","rolling-characters","P3","滾輪停定"),
66:("S","rolling-characters","",""),67:("X","text-morph-transition","P3","標題輪替"),68:("N","","P4","點陣字（Canvas）"),69:("N","hollow-fill-sweep","P1","批次一完成（逐行版本另列）"),70:("X","glitch-slice-reveal","P3","文字版本"),
71:("X","letter-windows","P3","條紋圖樣選項"),72:("N","","P4","長陰影"),73:("N","","P3","液面填字"),74:("S","hand-drawn-highlight","",""),75:("N","","P4","斜線互換"),
76:("S","split-line-assembly","",""),77:("S","character-decode","",""),78:("X","typewriter","P2","打字刪除輪替"),79:("S","elastic-word-bounce","",""),80:("N","","P3","逐字 3D 翻轉"),
81:("X","letter-assembly","P3","四散飛入"),82:("X","grid-diagonal-turn","P3","由中心擴散"),83:("X","text-morph-transition","P2","固定前綴換詞"),84:("X","numeric-gauge-sweep","P3","數字與進度條同步"),85:("N","","P3","文字被游標推開"),
86:("S","split-line-assembly","",""),87:("S","elastic-word-bounce","",""),88:("X","hand-drawn-highlight","P2","圈選樣式"),89:("S","elastic-svg-morph","",""),90:("N","","P4","沿曲線飛行"),
91:("S","相簿版型切換（gallery view switcher）","",""),92:("S","scroll-progress","",""),93:("S","horizontal-scroll-gallery","",""),94:("S","layered-parallax","",""),95:("S","magnetic-control","",""),
96:("S","cursor-trail-particles","",""),97:("X","spring-drag-snap","P3","慣性甩出"),98:("S","card-deck-fan","",""),99:("S","confetti-burst","",""),100:("X","marquee-text","P3","依捲動速度加速"),
101:("S","側邊圓點導覽（side-dots nav）","",""),102:("X","rolling-characters","P2","按鈕滑過翻字"),103:("S","directional-hover-wipe","",""),104:("S","stagger-reveal","",""),105:("S","perspective-tilt","",""),
106:("N","","P3","區塊背景光暈"),107:("X","cursor-spotlight","P3","格線背景"),108:("S","particle-constellation","",""),109:("S","shine-sweep","",""),110:("S","border-light-trace","",""),
111:("X","confetti-burst","P3","愛心噴點"),112:("S","hover-lift","",""),113:("S","cursor-spotlight","",""),114:("U","","—","靜態網站沒有載入中狀態"),115:("S","image-reveal","",""),
116:("C","compare-slider","P2","規劃於批次二"),117:("X","導覽列樣式","P3","捲動縮小"),118:("U","","—",APP),119:("U","","—",CUR),120:("S","cursor-image-follower","",""),
121:("S","cursor-trail-particles","",""),122:("S","radial-ink-ripple","",""),123:("U","","—",CUR),124:("S","text-spotlight-reveal","",""),125:("S","stagger-reveal","",""),
126:("X","split-line-assembly","P3","逐行模糊轉清楚"),127:("S","scroll-milestones","",""),128:("X","stagger-reveal","P3","Z 字順序"),129:("X","scroll-milestones","P3","連線後出現"),130:("S","breathing-glow","",""),
131:("X","image-reveal","P2","柔邊揭露"),132:("X","stagger-reveal","P3","左右交錯"),133:("U","","—","需要接受外部 SVG，違反素材安全規則"),134:("X","svg-path-drawing","P3","簽名路徑"),135:("S","svg-path-drawing","",""),
136:("X","svg-path-drawing","P3","滑過重描"),137:("N","","P4","流動連接線"),138:("N","","P3","區塊波浪分隔"),139:("S","numeric-gauge-sweep","",""),140:("X","表單元件","P3","送出成功動畫"),
141:("U","","—",APP),142:("U","","—",APP),143:("U","","—",APP),144:("U","","—",APP),145:("U","","—",APP),
146:("X","表單元件","P3","送出中狀態"),147:("U","","—",APP),148:("X","表單元件","P3","浮動標籤"),149:("U","","—",APP),150:("U","","—","啟動畫面不屬於網站內容"),
151:("X","表單元件","P3","錯誤提示震動"),152:("N","scroll-ink-words","P1","批次一完成"),153:("N","grow-to-stage","P2","規劃於批次二"),154:("C","stacked-chapters","P2","規劃於批次二"),155:("S","count-up","",""),
156:("X","導覽列樣式","P3","捲動隱藏"),157:("X","svg-path-drawing","P3","捲動驅動"),158:("S","CSS 捲動視差（既有）","",""),159:("X","marquee-text","P3","捲動驅動"),160:("N","","P3","依章節切換頁面配色"),
161:("X","circular-mask-expansion","P3","捲動驅動"),162:("N","","P2","連結底線滑入"),163:("N","hollow-fill-sweep","P1","批次一完成"),164:("S","flip-card","",""),165:("N","","P3","圓形縮圖展開"),
166:("N","","P4","圖示列放大"),167:("X","導覽列樣式","P3","滑動底色"),168:("C","accordion-gallery","P3","規劃於批次三"),169:("N","","P4","網站內容提示框"),170:("X","elastic-word-bounce","P3","滑過觸發"),
171:("X","border-light-trace","P2","滑過描邊"),172:("N","","P4","Canvas 星際背景"),173:("N","","P4","Canvas 流場"),174:("N","","P4","花瓣飄落"),175:("N","","P4","字元雨"),
176:("S","gooey-blob-merge","",""),177:("X","particle-constellation","P4","粒子組字"),178:("N","","P4","圓點網格背景"),179:("X","liquid-distortion-reveal","P4","滑過漣漪"),180:("C","","P3","刮開揭露（Canvas）"),
181:("X","confetti-burst","P4","煙火"),182:("X","float-idle","P3","縮放呼吸模式"),183:("S","float-idle","",""),184:("S","cinematic-image-pan","",""),185:("X","letter-assembly","P3","翻滾進場"),
186:("N","neon-ignite","P4","規劃於批次四"),187:("X","stagger-reveal","P3","歪斜貼上"),188:("N","","P4","上下半合成"),189:("X","blur-in","P3","字距收合"),190:("N","","P4","斜滑煞車"),
191:("S","cinematic-image-pan","",""),192:("X","svg-path-drawing","P4","標誌組合"),193:("N","","P4","音訊波形"),194:("X","border-light-trace","P3","漸層描邊"),195:("N","","P4","圖示液面"),
196:("N","","P4","雷達掃描"),197:("N","chart-build","P1","批次一完成（折線）"),198:("N","chart-build","P1","批次一完成（長條）"),199:("N","chart-build","P1","批次一完成（圓餅）"),200:("U","","—","載入動畫不屬於靜態網站內容"),
201:("X","liquid-distortion-reveal","P4","持續波動"),202:("U","","—","頁面轉場需路由層，目前多頁網站不做轉場"),203:("X","導覽列樣式","P3","選單展開"),204:("U","","—",APP),205:("U","","—","網站內容沒有對話框；大圖檢視另列 photo-spotlight"),
206:("S","disclosure-panel","",""),207:("C","","P3","分頁內容切換"),208:("X","相簿版型切換","P3","分類篩選"),209:("C","","P3","便當格展開"),210:("S","pinned-story-panels","",""),
211:("X","scroll-progress","P3","回到頂部按鈕"),212:("X","輪播元件","P2","中央放大樣式"),213:("X","card-stack-shuffle","P3","拖曳甩出"),214:("S","card-deck-fan","",""),215:("S","互動價目表（既有）","",""),
216:("C","","P3","卡片展開詳情"),217:("X","標誌牆（既有）","P3","卡片雙向輪播"),218:("X","輪播元件","P3","推薦語輪播"),219:("X","stagger-reveal","P3","瀑布流落下"),220:("S","focus-transfer","",""),
221:("U","","—","需要購物車與電商後端"),222:("N","","P3","顆粒漸層背景"),223:("N","vanishing-lattice","P2","主題色透視格線推進"),224:("N","","P4","柔焦光點"),225:("N","","P3","脈衝圓環"),
226:("N","","P4","放射光芒"),227:("N","","P4","星空"),228:("X","layered-parallax","P3","游標視差"),229:("N","","P4","細線起伏"),230:("N","","P3","幾何漂浮背景"),
231:("X","press-feedback","P2","立體按壓"),232:("S","jelly-press","",""),233:("S","radial-ink-ripple","",""),234:("U","","—",APP),235:("U","","—",APP),
236:("N","","P2","箭頭替換按鈕"),237:("X","breathing-glow","P3","霓虹樣式"),238:("U","","—",APP),239:("N","","P3","圖示展開成文字"),240:("X","表單元件","P4","送出飛走"),
241:("U","","—",APP),242:("U","","—",APP),243:("U","","—",APP),244:("U","","—",APP),245:("U","","—",APP),
246:("U","","—","網站沒有站內搜尋"),247:("U","","—",APP),248:("U","","—",APP),249:("U","","—",APP),250:("U","","—","網站表單不收檔案"),
251:("U","","—",CUR),252:("U","","—",CUR),253:("U","","—",CUR),254:("U","","—",CUR),255:("U","","—",CUR),
256:("N","","P4","跟隨游標的眼睛裝飾"),257:("X","loupe-pan","P3","放大鏡樣式（批次三）"),258:("X","cursor-trail-particles","P4","黏液拖尾"),259:("X","confetti-burst","P4","圖案噴發"),260:("N","dolly-frame","P1","批次一完成"),
261:("N","loupe-pan","P3","規劃於批次三"),262:("N","color-wake","P1","批次一完成"),263:("N","second-look","P3","規劃於批次三"),264:("X","影片元件","P2","滑過播放"),265:("C","photo-spotlight","P2","規劃於批次二"),
266:("X","輪播元件","P2","縮圖導覽"),267:("X","venetian-reveal","P3","輪播切換"),268:("S","card-stack-shuffle","",""),269:("X","glitch-slice-reveal","P3","滑過觸發"),270:("X","flip-card","P3","捲動觸發"),
271:("X","Depth3D","P4","捲動旋轉方塊"),272:("N","","P4","穿越大字"),273:("N","rush-skew","P3","規劃於批次三"),274:("X","letter-assembly","P3","捲動驅動"),275:("X","elastic-svg-morph","P4","捲動驅動"),
276:("X","card-deck-fan","P3","捲動驅動"),277:("X","blur-in","P3","雙向捲動"),278:("X","curved-path-text","P3","捲動驅動"),279:("N","door-split","P3","規劃於批次三"),280:("N","","P3","上下錯開"),
281:("X","typographic-stretch","P2","滑過拉開字距"),282:("N","row-paint","P3","規劃於批次三"),283:("U","","—","需要圖示庫，網站內容目前沒有圖示元件"),284:("X","dolly-frame","P2","資訊面板樣式"),285:("U","","—","需要社群圖示素材授權"),
286:("X","hand-drawn-highlight","P2","滑過觸發"),287:("X","perspective-tilt","P4","炫彩箔光"),288:("U","","—","需要抓取外部網頁"),289:("X","表格元件","P2","十字高亮"),290:("U","","—","需要字形筆畫資料，涉及字型授權"),
291:("N","bold-relay","P1","批次一完成"),292:("N","","P4","光源長陰影"),293:("N","letter-windows","P1","批次一完成"),294:("X","blur-in","P3","逐字版本"),295:("N","","P3","劃掉重寫"),
296:("C","","P4","對話訊息"),297:("N","echo-layers","P4","規劃於批次四"),298:("X","text-morph-transition","P3","多語輪替"),299:("U","","—",APP),300:("U","","—",APP),
301:("X","cursor-spotlight","P3","卡片群邊框"),302:("S","3D 物件元件（既有）","",""),303:("U","","—","遊戲互動，不是網站內容動畫"),304:("C","","P3","數據卡：count-up + chart-build"),305:("S","翻頁書元件（既有）","",""),
306:("X","相簿版型切換","P3","疊放與網格"),307:("X","fold-reveal","P3","封面開啟"),308:("U","","—","靜態網站沒有換頁載入"),309:("U","","—",APP),310:("U","","—","大型選單屬於導覽架構，暫不納入"),
311:("U","","—",APP),312:("U","","—","網站沒有搜尋結果狀態"),313:("U","","—","同意橫幅屬法務介面"),314:("U","","—",APP),315:("U","","—","靜態網站沒有分頁載入"),
316:("U","","—",APP),317:("U","","—",APP),318:("U","","—","需要地圖圖資與授權"),319:("N","","P4","指針時鐘"),320:("U","","—","需要天氣圖示素材"),
321:("U","","—","編輯器介面，不是網站內容"),322:("X","gooey-blob-merge","P3","單顆變形"),323:("N","","P4","徽章解鎖"),324:("N","","P4","心電圖"),325:("N","","P4","植物生長"),
326:("N","","P4","齒輪"),327:("U","","—","驗證介面，不是網站內容"),328:("S","physics-tag-field","",""),329:("N","","P4","吊繩識別證（物理）"),330:("X","fold-reveal","P4","撕貼紙角"),
331:("U","","—","需要 3D 紙張模擬"),332:("X","flip-card","P3","依方向翻面"),333:("U","","—","第三方付費元件，需授權"),334:("C","","P4","推薦語便當牆"),335:("N","","P4","按鈕內眼睛"),
336:("U","","—",APP),337:("U","","—",APP),338:("N","","P4","唱盤播放"),339:("X","導覽列樣式","P3","漢堡變形"),340:("X","導覽列樣式","P4","百葉選單"),
341:("X","導覽列樣式","P3","膠囊展開"),342:("U","","—",APP),343:("U","","—",APP),344:("X","photo-spotlight","P3","下滑關閉"),345:("U","","—",APP),
346:("U","","—",APP),347:("U","","—",APP),
}
assert sorted(M) == list(range(1, 348)), "every source item needs one row"
names = {"S": "已有同等功能", "X": "既有功能可擴充", "N": "需要新增動畫", "C": "需要新增複合互動元件", "U": "不適合目前架構或需要額外授權"}
HANNAH = {"name": "Hannah’s Motion Library", "url": "https://kittenjam-motion-library.vercel.app/"}
shipped = {50: 2, 223: 2}
rows = []
for it in items:
    i = it["id"]; code, target, prio, note = M[i]
    credit = [HANNAH]
    if 1 <= i <= 40: credit.append({"name": "@ai_yunon_ai（Threads）", "url": "https://www.threads.com/@ai_yunon_ai/post/DeeJRUjkXlM"})
    if 41 <= i <= 75: credit.append({"name": "@ai_tjb（Threads）", "url": "https://www.threads.com/@ai_tjb/post/DeeHoA3ktZ5"})
    if it.get("src"): credit.append({"name": it["src"]["name"], "url": it["src"]["url"]})
    rows.append({
        "sourceId": i, "component": it["comp"], "trigger": it["when"], "technique": it["tech"],
        "category": names[code], "sketch2site": target or None, "priority": prio or None,
        "note": note.strip() or None, "credit": credit,
        **({"verifiedBatch": shipped[i]} if i in shipped else {}),
        "license": "僅參考效果機制；未取得程式、素材或文字授權，不複製" + ("；第三方付費元件" if it.get("src") else ""),
    })
from collections import Counter
summary = Counter(r["category"] for r in rows)
out = {"source": HANNAH | {"dataFile": "https://kittenjam-motion-library.vercel.app/data.js", "readOn": "2026-11-27", "items": len(rows)},
       "categories": dict(summary), "rows": rows}
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(dict(summary), len(rows))
