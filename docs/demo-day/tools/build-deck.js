// Sketch2Site Demo Day deck v1 (3-minute pitch). Speaker script lives in each slide's notes.
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/36746548-5168-4249-b392-4aa251c447a5_6ccabd34-ca77-47ae-a4ba-92f029bd1b15/pptx/scripts/apply_theme.js");
const D = __dirname + "/";

const THEME = {
  name: "Sketch2Site",
  headFontFace: "Microsoft JhengHei",
  bodyFontFace: "Microsoft JhengHei",
  colors: { dk1: "0D0E11", lt1: "FFFFFF", dk2: "2B302C", lt2: "F7F6F2", accent1: "10E560", accent2: "0F8A3E", accent3: "5A625C", accent4: "D9DDD6", accent5: "E9F9EF", accent6: "C2352B", hlink: "0F8A3E", folHlink: "5A625C" },
};
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Sketch2Site｜畫一張草稿，做出你的網站";
pres.author = "全隊 呂沛珍";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: "DARK", background: { color: "0D0E11" }, objects: [] });
pres.defineSlideMaster({
  title: "LIGHT",
  background: { color: "F7F6F2" },
  margin: [0.5, 0.6, 0.5, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 0.95, fontSize: 34, bold: true, color: C.text1, valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 6.95, w: 0.5, h: 0.3, fontSize: 10, color: C.accent3 },
});
pres.defineSlideMaster({ title: "PLAIN", background: { color: "FFFFFF" }, objects: [] });

const frame = (slide, path, x, y, w, h, name) =>
  slide.addImage({ path: D + path, x, y, w, h, rounding: false, objectName: name, altText: name });
const box = (slide, x, y, w, h, fill, name, line) =>
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: line ?? { color: fill }, objectName: name });

// 1. Cover
pres.addSection({ title: "開場" });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "開場" });
  s.addText("MICROSOFT × NCU AI INNOVATION DEMO DAY", { x: 0.7, y: 0.9, w: 7, h: 0.4, fontSize: 13, bold: true, color: C.accent1, charSpacing: 3, isTextBox: true, margin: 0 });
  s.addText("畫一張草稿，\n做出你的網站", { x: 0.7, y: 1.6, w: 6.6, h: 2.4, fontSize: 50, bold: true, color: C.background1, isTextBox: true, margin: 0, valign: "top" });
  s.addText("Sketch2Site", { x: 0.7, y: 4.15, w: 6, h: 0.6, fontSize: 28, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText("全隊｜呂沛珍｜資訊管理學系三年級", { x: 0.7, y: 6.3, w: 6.5, h: 0.4, fontSize: 16, color: C.accent4, isTextBox: true, margin: 0 });
  frame(s, "c-draft.png", 7.75, 1.0, 4.95, 4.0, "草稿畫布截圖");
  s.addText("真實畫面：在畫布上擺出標題、照片和按鈕", { x: 7.75, y: 5.15, w: 4.95, h: 0.35, fontSize: 11, color: C.accent4, isTextBox: true, margin: 0 });
  s.addNotes("【0:00–0:08】\n大家好，我是全隊的呂沛珍。我做的是 Sketch2Site：畫一張草稿，就能做出網站。\n（講完直接換頁。）");
}

// 2. The boring opening: three sites that look alike (wireframe illustration, no gradients or emoji)
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "開場" });
  s.addText("分得出哪個是誰的嗎？", { x: 0.7, y: 0.6, w: 12, h: 0.8, fontSize: 32, bold: true, color: C.background1, isTextBox: true, margin: 0 });
  ["網站 A", "網站 B", "網站 C"].forEach((label, i) => {
    const x = 0.7 + i * 4.1;
    box(s, x, 1.75, 3.8, 4.1, "1D2420", "示意網站" + (i + 1), { color: "5A625C", width: 1 });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.3, y: 2.05, w: 1.0, h: 0.12, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "導覽" + (i + 1) });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.3, y: 2.6, w: 3.0, h: 0.35, fill: { color: "D9DDD6" }, line: { color: "D9DDD6" }, objectName: "大標題" + (i + 1) });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.3, y: 3.05, w: 2.2, h: 0.35, fill: { color: "D9DDD6" }, line: { color: "D9DDD6" }, objectName: "大標題第二行" + (i + 1) });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.3, y: 3.6, w: 2.8, h: 0.1, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "內文" + (i + 1) });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.3, y: 3.8, w: 2.4, h: 0.1, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "內文二" + (i + 1) });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: 4.2, w: 1.3, h: 0.4, rectRadius: 0.2, fill: { color: "D9DDD6" }, line: { color: "D9DDD6" }, objectName: "按鈕" + (i + 1) });
    [0, 1, 2].forEach((k) => s.addShape(pres.shapes.RECTANGLE, { x: x + 0.3 + k * 1.05, y: 4.9, w: 0.9, h: 0.65, fill: { color: "2B302C" }, line: { color: "5A625C", width: 0.75 }, objectName: `卡片${i + 1}-${k + 1}` }));
    s.addText(label, { x, y: 5.95, w: 3.8, h: 0.35, fontSize: 14, color: C.accent4, align: "center", isTextBox: true, margin: 0 });
  });
  s.addText("示意：沒說清楚要什麼時，AI 給的網站常常長得差不多", { x: 0.7, y: 6.55, w: 12, h: 0.4, fontSize: 16, color: C.accent4, isTextBox: true, margin: 0 });
  s.addNotes("【0:08–0:25】\n先看三個網站。（停兩秒。）分得出哪個是誰的嗎？\n一樣的大標題、一樣的按鈕、一樣的三張卡片。這是我畫的示意，但你一定看過很多這樣的網站。\n沒說清楚要什麼，AI 就會給它的預設樣子，所以大家的網站都很像。\n（換頁。）");
}

// 3. Problem
pres.addSection({ title: "問題與需求" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "問題與需求" });
  s.addText("說不清楚要什麼，AI 就只能猜", { placeholder: "title" });
  s.addText("我自己用 AI 做網站時遇到的", { x: 0.6, y: 1.65, w: 6.6, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  const pains = [
    ["想要一個動畫", "要來回講很多次，它才做對"],
    ["想改一個小地方", "只能再描述一次，常常整頁都變了"],
  ];
  pains.forEach(([a, b], i) => {
    const y = 2.2 + i * 1.75;
    box(s, 0.6, y, 6.6, 1.5, "FFFFFF", "痛點卡片" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(String(i + 1), { x: 0.85, y: y + 0.35, w: 0.8, h: 0.8, fontSize: 36, bold: true, color: C.accent2, isTextBox: true, margin: 0, valign: "middle" });
    s.addText([{ text: a, options: { fontSize: 22, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 16, color: C.accent3 } }], { x: 1.75, y: y + 0.2, w: 5.25, h: 1.1, isTextBox: true, margin: 0, valign: "middle" });
  });
  box(s, 7.7, 1.65, 5.0, 4.05, "0D0E11", "需求對象底");
  s.addText("同樣卡住的人", { x: 8.05, y: 1.95, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText([
    { text: "要招新生的社團", options: { breakLine: true } },
    { text: "想被找到的巷口小店", options: { breakLine: true } },
    { text: "要展示成果的課程專題" },
  ], { x: 8.05, y: 2.5, w: 4.3, h: 1.9, fontSize: 22, bold: true, color: C.background1, paraSpaceAfter: 10, isTextBox: true, margin: 0, valign: "top" });
  s.addText("他們有內容、有照片，缺的是把想法說清楚的方法。", { x: 8.05, y: 4.5, w: 4.3, h: 0.95, fontSize: 15, color: C.accent4, isTextBox: true, margin: 0, valign: "top" });
  s.addText("來源：我自己實際使用 AI 工具做網站的經驗", { x: 0.6, y: 6.9, w: 8, h: 0.3, fontSize: 10, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【0:25–0:45】\n我自己用 AI 做網站，卡在兩件事。想要一個動畫，要來回講很多次；想改一個小地方，常常整頁都變了。\n（指右邊）社團、小店、課程專題也一樣：內容和照片都有，缺的是把想法說清楚的方法。\n（換頁。）");
}

// 4. How AI is used
pres.addSection({ title: "AI 應用" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "AI 應用" });
  s.addText("AI 負責判斷，你的內容由你決定", { placeholder: "title" });
  const ins = ["草稿縮圖", "你的回答\n給誰看・喜歡的網站・一定不要", "參考圖（選填）"];
  ins.forEach((t, i) => {
    const y = 1.75 + i * 1.2;
    box(s, 0.6, y, 3.7, 1.0, "FFFFFF", "輸入" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(t, { x: 0.8, y, w: 3.3, h: 1.0, fontSize: i === 1 ? 15 : 18, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 4.5, y: 2.85, w: 0.8, h: 0.5, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "箭頭1" });
  box(s, 5.5, 1.75, 2.4, 3.4, "0D0E11", "AI 方塊");
  s.addText([{ text: "AI", options: { fontSize: 40, bold: true, color: C.accent1, breakLine: true } }, { text: "只從設計選項裡挑", options: { fontSize: 14, color: C.background1 } }], { x: 5.65, y: 1.75, w: 2.1, h: 3.4, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 8.1, y: 2.85, w: 0.8, h: 0.5, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "箭頭2" });
  const outs = [["三個方向＋理由", "並排給你挑"], ["一句話的修改", "只改你點到的地方"]];
  outs.forEach(([a, b], i) => {
    const y = 1.75 + i * 1.8;
    box(s, 9.1, y, 3.6, 1.6, "E9F9EF", "輸出" + (i + 1), { color: "10E560", width: 1.5 });
    s.addText([{ text: a, options: { fontSize: 20, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 15, color: C.accent3 } }], { x: 9.3, y, w: 3.2, h: 1.6, isTextBox: true, margin: 0, valign: "middle" });
  });
  const rules = ["不改你寫的字和照片", "圖片看完不保存", "沒開 AI 也能用，改在你的電腦上挑方向"];
  rules.forEach((t, i) => {
    const x = 0.6 + i * 4.1;
    box(s, x, 5.55, 3.9, 0.9, "FFFFFF", "規則" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(t, { x: x + 0.2, y: 5.55, w: 3.5, h: 0.9, fontSize: 15, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addNotes("【0:45–1:12】\n所以我換個方式用 AI。不用寫長長的指令，先畫草稿，再回答幾個問題：給誰看、喜歡哪個網站、一定不要什麼。\n（指中間）AI 看草稿縮圖和你的回答，一次給三個方向，並說明理由。\n（指下面）它只能從準備好的設計選項裡挑，不改你的字和照片，圖片看完也不保存。\n（換頁。）");
}

// 5. Solution: the flow
pres.addSection({ title: "解決方案" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "解決方案" });
  s.addText("五步做出網站，第三步並排比較", { placeholder: "title" });
  const steps = ["畫草稿", "先問清楚", "三個方向", "點哪裡改哪裡", "匯出上線"];
  steps.forEach((t, i) => {
    const x = 0.6 + i * 2.46;
    const on = i === 2;
    box(s, x, 1.6, 2.3, 0.7, on ? "0D0E11" : "FFFFFF", "步驟" + (i + 1), { color: on ? "0D0E11" : "D9DDD6", width: 1 });
    s.addText(`${i + 1}　${t}`, { x: x + 0.15, y: 1.6, w: 2.0, h: 0.7, fontSize: 16, bold: true, color: on ? C.accent1 : C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  frame(s, "c-directions.png", 0.6, 2.6, 12.1, 3.78, "三個方向並排截圖");
  s.addText("真實畫面：AI 這次給的三個方向是「暗房展映」「影像檔案」「作品牆面」，點一下整頁就換", { x: 0.6, y: 6.5, w: 12.1, h: 0.35, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【1:12–1:40】\n操作是五步。（指截圖）這是真實畫面：攝影社的草稿，AI 給了暗房展映、影像檔案、作品牆面三個方向。\n三個並排放著，你用眼睛挑，不用想要怎麼形容。挑好還能換字體和顏色，喜歡就存成「我的風格」，下次一鍵套用。\n（換頁。）");
}

// 6. Point and say
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "解決方案" });
  s.addText("想改哪裡，點一下說一句", { placeholder: "title" });
  s.addText("你說", { x: 0.6, y: 1.7, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  box(s, 0.6, 2.2, 5.6, 1.2, "FFFFFF", "你說的話", { color: "D9DDD6", width: 1 });
  s.addText("「寫得更讓新生想加入，置中」", { x: 0.85, y: 2.2, w: 5.2, h: 1.2, fontSize: 22, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  s.addText("AI 回的修改（點「套用」才生效）", { x: 0.6, y: 3.7, w: 5.6, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  frame(s, "c-tray.png", 0.6, 4.2, 4.15, 2.4, "修改結果截圖");
  s.addText("結果", { x: 6.9, y: 1.7, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  box(s, 6.9, 2.2, 5.8, 1.2, "FFFFFF", "改前", { color: "D9DDD6", width: 1 });
  s.addText([{ text: "改前　", options: { color: C.accent3, fontSize: 15 } }, { text: "上學期作品", options: { color: C.text1, fontSize: 22, bold: true } }], { x: 7.15, y: 2.2, w: 5.4, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  box(s, 6.9, 3.65, 5.8, 1.2, "E9F9EF", "改後", { color: "10E560", width: 1.5 });
  s.addText([{ text: "改後　", options: { color: C.accent2, fontSize: 15 } }, { text: "來看看上學期的精彩作品", options: { color: C.text1, fontSize: 22, bold: true } }], { x: 7.15, y: 3.65, w: 5.4, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  s.addText("其他地方都不動。一次可以點好幾個地方，一起送出。", { x: 6.9, y: 5.15, w: 5.8, h: 0.8, fontSize: 16, color: C.text1, isTextBox: true, margin: 0, valign: "top" });
  s.addNotes("【1:40–2:02】\n想改的時候，點一下標題，打一句「寫得更讓新生想加入，置中」。\n（指左下）AI 回一個修改，你按套用才生效。\n（指右邊）標題變成「來看看上學期的精彩作品」，而且置中了，其他地方都沒動。這是我一開始最想要的東西。\n（換頁。）");
}

// 7. Results
pres.addSection({ title: "成果與影響" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "成果與影響" });
  s.addText("一次生成只要幾秒，AI 費用不到 0.001 美元", { placeholder: "title" });
  const stats = [
    ["2–6 秒", "每次生成網站", "實測 9 次：2.3–5.9 秒"],
    ["0.0005 美元", "每次生成的 AI 費用", "實測 9 次：0.0002–0.0005 美元"],
    ["3 個方向", "同一次呼叫一起給", "不多花錢"],
  ];
  stats.forEach(([n, l, f], i) => {
    const y = 1.65 + i * 1.6;
    box(s, 0.6, y, 7.6, 1.4, "FFFFFF", "數字卡" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(n, { x: 0.85, y, w: 3.4, h: 1.4, fontSize: 36, bold: true, color: C.accent2, isTextBox: true, margin: 0, valign: "middle" });
    s.addText([{ text: l, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: f, options: { fontSize: 13, color: C.accent3 } }], { x: 4.35, y, w: 3.7, h: 1.4, isTextBox: true, margin: 0, valign: "middle" });
  });
  frame(s, "c-phone.png", 9.0, 1.65, 2.6, 4.55, "手機版截圖");
  s.addText("同一個網站，手機版自動排好；可匯出完整網站專案自己架上線", { x: 8.6, y: 6.3, w: 4.2, h: 0.6, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addText("資料：2026/11/26 真實 AI 呼叫紀錄（模型 gpt-6-luna），共 9 次生成；另有 908 個自動測試把關", { x: 0.6, y: 6.6, w: 7.6, h: 0.35, fontSize: 10, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【2:02–2:25】\n我實測了九次：每次生成兩到六秒，AI 費用最多約 0.0005 美元，換算新台幣不到 2 分錢。三個方向是同一次呼叫給的，不多花錢。\n（指右邊）網站會自動排好手機版，也能匯出成完整的網站專案，自己架上線。\n（數字來源在投影片下方，評審問再展開。）\n（換頁。）");
}

// 8. Impact and next steps
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "成果與影響" });
  s.addText("讓不會寫程式的人，也做出不像模板的網站", { placeholder: "title" });
  box(s, 0.6, 1.65, 5.9, 3.3, "0D0E11", "影響底");
  s.addText("可能的改變", { x: 0.95, y: 1.95, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText([
    { text: "社團、小店、課程專題不用找人代做網站", options: { bullet: true, breakLine: true } },
    { text: "改一個地方不用重來，省下來回溝通的時間", options: { bullet: true, breakLine: true } },
    { text: "做出來的網站有自己的樣子，不是 AI 的預設樣子", options: { bullet: true } },
  ], { x: 0.95, y: 2.5, w: 5.2, h: 2.2, fontSize: 18, color: C.background1, paraSpaceAfter: 14, isTextBox: true, margin: 0, valign: "top" });
  s.addText("下一步", { x: 7.0, y: 1.65, w: 5.7, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  const next = [["12 月", "開放網址公開試用（先上線不含 AI 的版本）"], ["試用期間", "請同學實際使用，量從草稿到上線花多久"], ["之後", "加上登入與用量上限，再開放 AI 給所有人"]];
  next.forEach(([w, t], i) => {
    const y = 2.2 + i * 1.3;
    box(s, 7.0, y, 5.7, 1.1, "FFFFFF", "下一步" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText([{ text: w + "　", options: { bold: true, color: C.accent2, fontSize: 15 } }, { text: t, options: { color: C.text1, fontSize: 16 } }], { x: 7.25, y, w: 5.3, h: 1.1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addText("目前還沒有使用者數據，試用後補上", { x: 7.0, y: 6.15, w: 5.7, h: 0.35, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【2:25–2:45】\n我希望社團、小店和課程專題不用找人代做，也能做出有自己樣子的網站。\n目前還沒有使用者數據，下一步是開放試用，請同學實際用，量從草稿到上線要多久。\n（換頁。）");
}

// 9. The dull "questions" slide (looks like the end)
pres.addSection({ title: "結尾" });
{
  const s = pres.addSlide({ masterName: "PLAIN", sectionTitle: "結尾" });
  s.addText("謝謝聆聽\n有問題嗎？", { x: 0.5, y: 2.4, w: 12.33, h: 2.4, fontSize: 44, color: "000000", fontFace: "Arial", align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s.addNotes("【2:45–2:48】\n謝謝大家。有問題嗎？\n（故意用很普通的頁面，讓大家以為結束了。停兩秒，看著螢幕，不要看台下，然後按下一頁。）");
}

// 10. The real ending, tilted one degree
{
  const s = pres.addSlide({ masterName: "PLAIN", sectionTitle: "結尾" });
  s.addText([
    { text: "AI 會越來越會做事。", options: { breakLine: true } },
    { text: "剩下的，是你說不說得出自己想要什麼。" },
  ], { x: 0.9, y: 2.2, w: 11.5, h: 2.2, fontSize: 36, bold: true, color: "000000", align: "center", valign: "middle", rotate: 1, isTextBox: true, margin: 0 });
  s.addText("Sketch2Site 想讓更多人說得出來。", { x: 0.9, y: 4.7, w: 11.5, h: 0.6, fontSize: 20, color: "0F8A3E", align: "center", rotate: 1, isTextBox: true, margin: 0 });
  s.addNotes("【2:48–3:00】\n（慢慢說。）AI 會越來越會做事。剩下的，是你說不說得出自己想要什麼。\nSketch2Site 想讓更多人說得出來。謝謝。\n（這頁的字故意歪了一度，不用解釋。有人問再說：一開始差一點點，做出來就會差很多，所以要先說清楚。）");
}

(async () => {
  const out = D + "Sketch2Site-DemoDay-v1.pptx";
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
