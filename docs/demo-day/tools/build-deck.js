// Sketch2Site Demo Day deck v1 (3-minute pitch). Speaker script lives in each slide's notes.
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/36746548-5168-4249-b392-4aa251c447a5_6ccabd34-ca77-47ae-a4ba-92f029bd1b15/pptx/scripts/apply_theme.js");
const D = __dirname + "/";
const NOTES = ["【0:00–0:15】\n各位評審好，我是資管三的呂沛珍。我的作品 Sketch2Site，讓使用者先在畫布上排出網站草稿，再由 AI 決定設計方向，最後產生可以部署的網站專案。", "【0:15–0:26】\n這三個網站是我畫的示意。需求描述得不夠具體時，AI 通常會套用慣用的版型和配色，所以很多網站看起來都差不多。", "【0:26–0:46】\n我自己用 AI 做網站時，最花時間的有兩件事：版面和動畫很難用文字精確描述，要來回修改好幾次；只想調整一個標題，整個頁面卻跟著被改掉。所以這個作品要處理兩件事：讓需求能表達清楚，以及只修改想改的地方。", "【0:46–1:20】\n使用者可以從範本或空白畫布開始，把標題、圖片、按鈕拖到想要的位置，系統會依照元素的排列，在本機推算出首屏、作品區等區塊。接著回答幾個問題，包括目標對象、參考網站和想避開的風格。\n送出後，AI 收到的是區塊大綱、這些回答和一張低解析度的草稿縮圖，只能回傳固定格式的設計選擇。網站上的文字、圖片和連結由程式保留，組好之後還會逐一比對。", "【1:20–1:46】\n三個方向會並排顯示，每張都是首屏的即時預覽，並附上 AI 的理由。選定後可以再換標題字體和強調色，構圖與主題也能細調；品牌設定裡指定過的顏色和字型會優先採用。\n滿意的組合可以存成「我的風格」，下次一鍵套用，但不會自動套用。沒有開啟 AI 時，三個方向會在本機產生。", "【1:46–2:08】\n網站產生後，使用者可以點選任何元素，用一句話說明要怎麼改，也能一次標註多處一起送出。置中、放大這類指令由本機處理，需要改寫文字才交給 AI，而且只能使用該元素允許的操作。修改會先預覽，按下套用才生效，也可以撤銷。", "【2:08–2:27】\n版面採用依容器寬度排列的響應式設計，可以直接切換手機版檢查。完成後能匯出完整的 React 專案，包含頁面資料、圖片和實際用到的字型，可以獨立建置，部署到靜態主機。實測每次生成約兩到六秒。", "【2:27–2:37】\n下一步是先部署不含 AI 的公開版本開放試用，再加上登入與用量限制開放 AI 功能，並加入標題改寫建議。", "【2:37–3:00】\n回到一開始的兩個問題。需求說不清楚，Sketch2Site 讓使用者用畫布、問答和並排預覽來表達；修改牽動整頁，它讓每次修改只作用在指定的元素，並由使用者確認後才套用。這就是我設計 Sketch2Site 的目的。謝謝各位評審。"];

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
  s.addNotes(NOTES[0]);
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
  s.addNotes(NOTES[1]);
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
  s.addNotes(NOTES[2]);
}


// 4. How the system works
pres.addSection({ title: "AI 應用" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "AI 應用" });
  s.addText("AI 只負責設計判斷", { placeholder: "title" });
  const ins = ["區塊大綱\n由畫布上的元素位置推算", "需求與設計偏好\n對象、參考網站、要避開的風格", "低解析度草稿縮圖"];
  ins.forEach((t, i) => {
    const y = 1.75 + i * 1.2;
    box(s, 0.6, y, 3.7, 1.0, "FFFFFF", "輸入" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(t, { x: 0.8, y, w: 3.3, h: 1.0, fontSize: 15, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 4.5, y: 2.85, w: 0.8, h: 0.5, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "箭頭1" });
  box(s, 5.5, 1.75, 2.4, 3.4, "0D0E11", "AI 方塊");
  s.addText([{ text: "AI", options: { fontSize: 40, bold: true, color: C.accent1, breakLine: true } }, { text: "只回傳固定格式的\n設計選擇", options: { fontSize: 14, color: C.background1 } }], { x: 5.65, y: 1.75, w: 2.1, h: 3.4, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 8.1, y: 2.85, w: 0.8, h: 0.5, fill: { color: "5A625C" }, line: { color: "5A625C" }, objectName: "箭頭2" });
  const outs = [["三個設計方向", "設計概念、主題、構圖與理由"], ["各區塊的排法", "欄數、版面配置、強調的區塊"]];
  outs.forEach(([a, b], i) => {
    const y = 1.75 + i * 1.8;
    box(s, 9.1, y, 3.6, 1.6, "E9F9EF", "輸出" + (i + 1), { color: "10E560", width: 1.5 });
    s.addText([{ text: a, options: { fontSize: 20, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 14, color: C.accent3 } }], { x: 9.3, y, w: 3.2, h: 1.6, isTextBox: true, margin: 0, valign: "middle" });
  });
  const rules = ["文字、圖片、連結由程式保留，組好後逐一比對", "參考圖與草稿縮圖不保存", "未開啟 AI 時，方向在本機產生"];
  rules.forEach((t, i) => {
    const x = 0.6 + i * 4.1;
    box(s, x, 5.55, 3.9, 0.9, "FFFFFF", "規則" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(t, { x: x + 0.2, y: 5.55, w: 3.5, h: 0.9, fontSize: 14, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addNotes(NOTES[3]);
}

// 5. Comparing and customising directions
pres.addSection({ title: "解決方案" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "解決方案" });
  s.addText("並排比較三個方向，再細部調整", { placeholder: "title" });
  const steps = ["範本與畫布", "需求問答", "三個方向", "局部編輯", "匯出專案"];
  steps.forEach((t, i) => {
    const x = 0.6 + i * 2.46;
    const on = i === 2;
    box(s, x, 1.6, 2.3, 0.7, on ? "0D0E11" : "FFFFFF", "步驟" + (i + 1), { color: on ? "0D0E11" : "D9DDD6", width: 1 });
    s.addText(`${i + 1}　${t}`, { x: x + 0.15, y: 1.6, w: 2.0, h: 0.7, fontSize: 16, bold: true, color: on ? C.accent1 : C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  frame(s, "c-directions.png", 0.6, 2.6, 12.1, 3.78, "三個方向並排截圖");
  s.addText("攝影社草稿實際產生的三個方向；選定後可換標題字體與強調色，也可存成「我的風格」重複使用", { x: 0.6, y: 6.5, w: 12.1, h: 0.35, fontSize: 12, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes(NOTES[4]);
}

// 6. Local editing with preview and confirmation
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "解決方案" });
  s.addText("局部編輯：只改指定的元素", { placeholder: "title" });
  s.addText("對標題下的註解", { x: 0.6, y: 1.7, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  box(s, 0.6, 2.2, 5.6, 1.2, "FFFFFF", "註解內容", { color: "D9DDD6", width: 1 });
  s.addText("「寫得更讓新生想加入，置中」", { x: 0.85, y: 2.2, w: 5.2, h: 1.2, fontSize: 22, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  s.addText("修改預覽（按「套用」才會生效）", { x: 0.6, y: 3.7, w: 5.6, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  frame(s, "c-tray.png", 0.6, 4.2, 4.15, 2.4, "修改預覽截圖");
  s.addText("結果", { x: 6.9, y: 1.7, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: C.accent3, isTextBox: true, margin: 0 });
  box(s, 6.9, 2.2, 5.8, 1.2, "FFFFFF", "改前", { color: "D9DDD6", width: 1 });
  s.addText([{ text: "改前　", options: { color: C.accent3, fontSize: 15 } }, { text: "上學期作品", options: { color: C.text1, fontSize: 22, bold: true } }], { x: 7.15, y: 2.2, w: 5.4, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  box(s, 6.9, 3.65, 5.8, 1.2, "E9F9EF", "改後", { color: "10E560", width: 1.5 });
  s.addText([{ text: "改後　", options: { color: C.accent2, fontSize: 15 } }, { text: "來看看上學期的精彩作品（置中）", options: { color: C.text1, fontSize: 20, bold: true } }], { x: 7.15, y: 3.65, w: 5.4, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  s.addText("置中由本機規則處理，改寫文字才交給 AI；AI 只能使用該元素允許的操作。頁面其他部分維持不變。", { x: 6.9, y: 5.1, w: 5.8, h: 1.0, fontSize: 15, color: C.text1, isTextBox: true, margin: 0, valign: "top" });
  s.addNotes(NOTES[5]);
}

// 7. Responsive layout and export
pres.addSection({ title: "成果與影響" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "成果與影響" });
  s.addText("響應式版面與完整專案匯出", { placeholder: "title" });
  const stats = [
    ["手機版", "響應式版面", "依容器寬度重新排列，可直接切換檢查"],
    ["React 專案", "完整匯出", "頁面資料、圖片與用到的字型，可獨立建置部署"],
    ["2–6 秒", "每次生成", "實測 9 次：2.3–5.9 秒"],
  ];
  stats.forEach(([n, l, f], i) => {
    const y = 1.65 + i * 1.6;
    box(s, 0.6, y, 7.6, 1.4, "FFFFFF", "重點卡" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText(n, { x: 0.85, y, w: 3.0, h: 1.4, fontSize: 30, bold: true, color: C.accent2, isTextBox: true, margin: 0, valign: "middle" });
    s.addText([{ text: l, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: f, options: { fontSize: 13, color: C.accent3 } }], { x: 3.95, y, w: 4.1, h: 1.4, isTextBox: true, margin: 0, valign: "middle" });
  });
  frame(s, "c-phone.png", 9.0, 1.65, 2.6, 4.55, "手機版截圖");
  s.addText("同一個網站的手機版", { x: 8.6, y: 6.3, w: 4.2, h: 0.4, fontSize: 12, color: C.accent3, align: "center", isTextBox: true, margin: 0 });
  s.addText("生成時間：2026/11/26 實測紀錄（模型 gpt-6-luna）", { x: 0.6, y: 6.6, w: 7.6, h: 0.35, fontSize: 10, color: C.accent3, isTextBox: true, margin: 0 });
  s.addNotes(NOTES[6]);
}

// 8. Next steps
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "成果與影響" });
  s.addText("下一步", { placeholder: "title" });
  box(s, 0.6, 1.65, 5.9, 3.95, "0D0E11", "已完成底");
  s.addText("目前已完成", { x: 0.95, y: 1.95, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
  s.addText([
    { text: "範本與視覺化畫布", options: { bullet: true, breakLine: true } },
    { text: "需求問答與參考圖分析", options: { bullet: true, breakLine: true } },
    { text: "三個設計方向與細部調整", options: { bullet: true, breakLine: true } },
    { text: "我的風格", options: { bullet: true, breakLine: true } },
    { text: "局部編輯與修改預覽", options: { bullet: true, breakLine: true } },
    { text: "響應式版面與專案匯出", options: { bullet: true } },
  ], { x: 0.95, y: 2.5, w: 5.2, h: 3.0, fontSize: 17, color: C.background1, paraSpaceAfter: 6, isTextBox: true, margin: 0, valign: "top" });
  const next = [["1", "部署公開網址，先開放不含 AI 的版本試用"], ["2", "加上登入與用量限制，再開放 AI 功能"], ["3", "加入標題改寫建議"]];
  next.forEach(([w, t], i) => {
    const y = 1.65 + i * 1.4;
    box(s, 7.0, y, 5.7, 1.2, "FFFFFF", "下一步" + (i + 1), { color: "D9DDD6", width: 1 });
    s.addText([{ text: w + "　", options: { bold: true, color: C.accent2, fontSize: 20 } }, { text: t, options: { color: C.text1, fontSize: 16 } }], { x: 7.25, y, w: 5.3, h: 1.2, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addNotes(NOTES[7]);
}

// 9. Back to the two problems
pres.addSection({ title: "結尾" });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "結尾" });
  s.addText("回到一開始的兩個問題", { x: 0.7, y: 0.8, w: 12, h: 0.8, fontSize: 34, bold: true, color: C.background1, isTextBox: true, margin: 0 });
  const rows = [["需求很難用文字說清楚", "用畫布、問答與三個方向的並排預覽來表達"], ["改一個地方，整頁都被改動", "修改只作用在指定元素，確認後才套用"]];
  rows.forEach(([a, b], i) => {
    const y = 2.1 + i * 1.9;
    box(s, 0.7, y, 5.4, 1.5, "1D2420", "問題" + (i + 1), { color: "5A625C", width: 1 });
    s.addText(a, { x: 0.95, y, w: 5.0, h: 1.5, fontSize: 20, bold: true, color: C.accent4, isTextBox: true, margin: 0, valign: "middle" });
    s.addShape(pres.shapes.RIGHT_ARROW, { x: 6.3, y: y + 0.5, w: 0.7, h: 0.5, fill: { color: "10E560" }, line: { color: "10E560" }, objectName: "對應" + (i + 1) });
    box(s, 7.2, y, 5.4, 1.5, "E9F9EF", "做法" + (i + 1), { color: "10E560", width: 1.5 });
    s.addText(b, { x: 7.45, y, w: 5.0, h: 1.5, fontSize: 20, bold: true, color: C.text1, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addText("Sketch2Site｜全隊　呂沛珍", { x: 0.7, y: 6.4, w: 12, h: 0.4, fontSize: 16, color: C.accent1, isTextBox: true, margin: 0 });
  s.addNotes(NOTES[8]);
}

(async () => {
  const out = D + "Sketch2Site-DemoDay-v1.pptx";
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
