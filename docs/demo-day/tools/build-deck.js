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
  s.addText("先畫草稿，\n再做成網站", { x: 0.7, y: 1.6, w: 6.6, h: 2.4, fontSize: 50, bold: true, color: C.background1, isTextBox: true, margin: 0, valign: "top" });
  s.addText("Sketch2Site", { x: 0.7, y: 4.15, w: 6, h: 0.6, fontSize: 28, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText("全隊｜呂沛珍｜資訊管理學系三年級", { x: 0.7, y: 6.3, w: 6.5, h: 0.4, fontSize: 16, color: C.accent4, isTextBox: true, margin: 0 });
  frame(s, "c-draft.png", 7.75, 1.0, 4.95, 4.0, "草稿畫布截圖");
  s.addText("畫布的實際畫面", { x: 7.75, y: 5.15, w: 4.95, h: 0.35, fontSize: 11, color: C.accent4, isTextBox: true, margin: 0 });
  s.addNotes("【0:00–0:10】\n大家好，我是資管三的呂沛珍。這個作品叫 Sketch2Site，你先畫一張網站的草稿，它幫你做成網站。");
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
  s.addText("我自己畫的示意圖", { x: 0.7, y: 6.55, w: 12, h: 0.4, fontSize: 16, color: C.accent4, isTextBox: true, margin: 0 });
  s.addNotes("【0:10–0:25】\n先看這三個。（停一下。）\n應該分不太出來哪個是哪個。這是我自己畫的示意，可是用 AI 做網站，真的很常拿到長這樣的東西。沒跟它講清楚要什麼，它就用它習慣的樣子。");
}

// 3. Problem
pres.addSection({ title: "問題與需求" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "問題與需求" });
  s.addText("用 AI 做網站，我卡在這兩件事", { placeholder: "title" });
  s.addText("我自己遇到的", { x: 0.6, y: 1.65, w: 6.6, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  const pains = [
    ["想要一個動畫", "要來回講很多次，它才做對"],
    ["想改一個小地方", "改完整頁都變了"],
  ];
  pains.forEach(([a, b], i) => {
    const y = 2.2 + i * 1.75;
    box(s, 0.6, y, 6.6, 1.5, "FFFFFF", "痛點卡片" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(String(i + 1), { x: 0.85, y: y + 0.35, w: 0.8, h: 0.8, fontSize: 36, bold: true, color: C.accent2, isTextBox: true, margin: 0, valign: "middle" });
    s.addText([{ text: a, options: { fontSize: 22, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 16, color: C.accent3 } }], { x: 1.75, y: y + 0.2, w: 5.25, h: 1.1, isTextBox: true, margin: 0, valign: "middle" });
  });
  box(s, 7.7, 1.65, 5.0, 3.0, "0D0E11", "需求對象底");
  s.addText("可能也會遇到的人", { x: 8.05, y: 1.95, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText([
    { text: "要招新生的社團", options: { breakLine: true } },
    { text: "巷口的小店" },
  ], { x: 8.05, y: 2.5, w: 4.3, h: 1.0, fontSize: 22, bold: true, color: C.background1, paraSpaceAfter: 10, isTextBox: true, margin: 0, valign: "top" });
  s.addText("照片和文字都有，不知道怎麼跟 AI 講。", { x: 8.05, y: 3.6, w: 4.3, h: 0.95, fontSize: 15, color: C.accent4, isTextBox: true, margin: 0, valign: "top" });
  s.addText("來源：我自己實際使用 AI 工具做網站的經驗", { x: 0.6, y: 6.9, w: 8, h: 0.3, fontSize: 10, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【0:25–0:50】\n我自己用 AI 做網站，卡最久的是兩件事。\n一個是動畫。我想要某種動法，可是很難用文字講清楚，來回講了好幾次。\n另一個是改細節。我只想改一個標題，結果它整頁重做，原本喜歡的地方也不見了。\n我想社團要招生，或是巷口的小店，應該也會碰到一樣的事。照片跟文字都有，只是不知道怎麼跟 AI 講。");
}

// 4. How AI is used
pres.addSection({ title: "AI 應用" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "AI 應用" });
  s.addText("AI 在這裡做什麼", { placeholder: "title" });
  const ins = ["草稿縮圖", "你的回答\n例如給誰看、一定不要什麼", "參考圖（選填）"];
  ins.forEach((t, i) => {
    const y = 1.75 + i * 1.2;
    box(s, 0.6, y, 3.7, 1.0, "FFFFFF", "輸入" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(t, { x: 0.8, y, w: 3.3, h: 1.0, fontSize: i === 1 ? 15 : 18, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 4.5, y: 2.85, w: 0.8, h: 0.5, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "箭頭1" });
  box(s, 5.5, 1.75, 2.4, 3.4, "0D0E11", "AI 方塊");
  s.addText([{ text: "AI", options: { fontSize: 40, bold: true, color: C.accent1, breakLine: true } }, { text: "只從設計選項裡挑", options: { fontSize: 14, color: C.background1 } }], { x: 5.65, y: 1.75, w: 2.1, h: 3.4, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 8.1, y: 2.85, w: 0.8, h: 0.5, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "箭頭2" });
  const outs = [["三個方向", "每個附一句理由"], ["一句話的修改", "只改你點的地方"]];
  outs.forEach(([a, b], i) => {
    const y = 1.75 + i * 1.8;
    box(s, 9.1, y, 3.6, 1.6, "E9F9EF", "輸出" + (i + 1), { color: "10E560", width: 1.5 });
    s.addText([{ text: a, options: { fontSize: 20, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 15, color: C.accent3 } }], { x: 9.3, y, w: 3.2, h: 1.6, isTextBox: true, margin: 0, valign: "middle" });
  });
  const rules = ["不能改你寫的字和照片", "參考圖看完不存", "沒開 AI 時，在你的電腦上挑方向"];
  rules.forEach((t, i) => {
    const x = 0.6 + i * 4.1;
    box(s, x, 5.55, 3.9, 0.9, "FFFFFF", "規則" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(t, { x: x + 0.2, y: 5.55, w: 3.5, h: 0.9, fontSize: 15, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addNotes("【0:50–1:15】\n所以我把順序換過來。先畫草稿，標題放哪、照片放哪，自己擺。\n然後回答幾個問題，例如這是給誰看的，有什麼樣子一定不要。\nAI 會看草稿的縮圖跟這些回答，給三個方向，每個附一句理由。\n這邊我有限制它：它只能從我準備好的設計選項裡選，你寫的字跟照片它不能動。參考圖它看完也不會存。");
}

// 5. Solution: the flow
pres.addSection({ title: "解決方案" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "解決方案" });
  s.addText("實際流程", { placeholder: "title" });
  const steps = ["畫草稿", "先問清楚", "三個方向", "點哪裡改哪裡", "匯出上線"];
  steps.forEach((t, i) => {
    const x = 0.6 + i * 2.46;
    const on = i === 2;
    box(s, x, 1.6, 2.3, 0.7, on ? "0D0E11" : "FFFFFF", "步驟" + (i + 1), { color: on ? "0D0E11" : "D9DDD6", width: 1 });
    s.addText(`${i + 1}　${t}`, { x: x + 0.15, y: 1.6, w: 2.0, h: 0.7, fontSize: 16, bold: true, color: on ? C.accent1 : C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  frame(s, "c-directions.png", 0.6, 2.6, 12.1, 3.78, "三個方向並排截圖");
  s.addText("用攝影社草稿實際跑出來的三個方向", { x: 0.6, y: 6.5, w: 12.1, h: 0.35, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【1:15–1:40】\n這是我用攝影社的草稿實際跑的，它給了這三個。\n擺在一起，看哪個順眼就點哪個。選完還可以換字體跟顏色。\n喜歡的話可以存起來，下次再用，不想用就不用管它。");
}

// 6. Point and say
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "解決方案" });
  s.addText("點哪裡改哪裡", { placeholder: "title" });
  s.addText("你說", { x: 0.6, y: 1.7, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  box(s, 0.6, 2.2, 5.6, 1.2, "FFFFFF", "你說的話", { color: "D9DDD6", width: 1 });
  s.addText("「寫得更讓新生想加入，置中」", { x: 0.85, y: 2.2, w: 5.2, h: 1.2, fontSize: 22, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  s.addText("AI 打算怎麼改（按套用才會改）", { x: 0.6, y: 3.7, w: 5.6, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  frame(s, "c-tray.png", 0.6, 4.2, 4.15, 2.4, "修改結果截圖");
  s.addText("結果", { x: 6.9, y: 1.7, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  box(s, 6.9, 2.2, 5.8, 1.2, "FFFFFF", "改前", { color: "D9DDD6", width: 1 });
  s.addText([{ text: "改前　", options: { color: C.accent3, fontSize: 15 } }, { text: "上學期作品", options: { color: C.text1, fontSize: 22, bold: true } }], { x: 7.15, y: 2.2, w: 5.4, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  box(s, 6.9, 3.65, 5.8, 1.2, "E9F9EF", "改後", { color: "10E560", width: 1.5 });
  s.addText([{ text: "改後　", options: { color: C.accent2, fontSize: 15 } }, { text: "來看看上學期的精彩作品", options: { color: C.text1, fontSize: 22, bold: true } }], { x: 7.15, y: 3.65, w: 5.4, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  s.addText("其他地方沒有動。", { x: 6.9, y: 5.15, w: 5.8, h: 0.8, fontSize: 16, color: C.text1, isTextBox: true, margin: 0, valign: "top" });
  s.addNotes("【1:40–2:00】\n做好之後要改，就點那個地方，打一句話。\n它會先讓你看它打算怎麼改，你按套用才會真的改。\n這邊只有標題變了，其他地方沒動。這個是我一開始最想要的。");
}

// 7. Results
pres.addSection({ title: "成果與影響" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "成果與影響" });
  s.addText("測了九次的結果", { placeholder: "title" });
  const stats = [
    ["2–6 秒", "每次生成網站", "實測 9 次：2.3–5.9 秒"],
    ["0.0005 美元", "每次生成的 AI 費用", "實測 9 次：0.0002–0.0005 美元"],
    ["3 個方向", "同一次呼叫給的", "不會多算錢"],
  ];
  stats.forEach(([n, l, f], i) => {
    const y = 1.65 + i * 1.6;
    box(s, 0.6, y, 7.6, 1.4, "FFFFFF", "數字卡" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(n, { x: 0.85, y, w: 3.4, h: 1.4, fontSize: 36, bold: true, color: C.accent2, isTextBox: true, margin: 0, valign: "middle" });
    s.addText([{ text: l, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: f, options: { fontSize: 13, color: C.accent3 } }], { x: 4.35, y, w: 3.7, h: 1.4, isTextBox: true, margin: 0, valign: "middle" });
  });
  frame(s, "c-phone.png", 9.0, 1.65, 2.6, 4.55, "手機版截圖");
  s.addText("手機版會自己排；做完可以匯出整個網站專案", { x: 8.6, y: 6.3, w: 4.2, h: 0.6, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addText("資料：2026/11/26 的 AI 呼叫紀錄（模型 gpt-6-luna），共 9 次生成", { x: 0.6, y: 6.6, w: 7.6, h: 0.35, fontSize: 10, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【2:00–2:25】\n速度跟費用我測了九次。生成一次大概兩到六秒，AI 的費用最多大概 0.0005 美元，台幣不到兩分錢。\n三個方向是同一次給的，所以不會多算錢。\n手機版它會自己排。做完也可以把整個網站專案匯出來，自己放上網路。");
}

// 8. Impact and next steps
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "成果與影響" });
  s.addText("還沒做到的", { placeholder: "title" });
  box(s, 0.6, 1.65, 5.9, 2.2, "0D0E11", "影響底");
  s.addText("想解決的事", { x: 0.95, y: 1.95, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText([
    { text: "社團、小店可以自己做網站，不用找人代做", options: { bullet: true, breakLine: true } },
    { text: "改一個地方，不用整頁重做", options: { bullet: true } },
  ], { x: 0.95, y: 2.5, w: 5.2, h: 1.1, fontSize: 18, color: C.background1, paraSpaceAfter: 14, isTextBox: true, margin: 0, valign: "top" });
  s.addText("下一步", { x: 7.0, y: 1.65, w: 5.7, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  const next = [["12 月", "開放網址公開試用（先上線不含 AI 的版本）"], ["試用期間", "請同學實際使用，量從草稿到上線花多久"], ["之後", "加上登入與用量上限，再開放 AI 給所有人"]];
  next.forEach(([w, t], i) => {
    const y = 2.2 + i * 1.3;
    box(s, 7.0, y, 5.7, 1.1, "FFFFFF", "下一步" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText([{ text: w + "　", options: { bold: true, color: C.accent2, fontSize: 15 } }, { text: t, options: { color: C.text1, fontSize: 16 } }], { x: 7.25, y, w: 5.3, h: 1.1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addText("目前還沒有人實際用過，沒有使用數據", { x: 7.0, y: 6.15, w: 5.7, h: 0.35, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes("【2:25–2:50】\n目前還沒有人實際用過，所以我手上沒有使用數據。\n下一步是先開放給同學試，看大家做一個網站要花多久，會卡在哪裡。\nAI 的部分，要先加上登入跟用量限制，才能開給大家用。");
}

// 9. Questions
pres.addSection({ title: "結尾" });
{
  const s = pres.addSlide({ masterName: "PLAIN", sectionTitle: "結尾" });
  s.addText("謝謝\n有問題可以問我", { x: 0.5, y: 2.4, w: 12.33, h: 2.4, fontSize: 44, color: "000000", fontFace: "Arial", align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s.addNotes("【2:50–3:00】\n大概是這樣。謝謝，有問題可以問我。");
}

(async () => {
  const out = D + "Sketch2Site-DemoDay-v1.pptx";
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
