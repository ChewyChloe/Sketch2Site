import { allSections, filterLabels, fontLabels, frameLabels, themeIds, themeLabels, type FontId, type FrameId, type ImageLook, type PageNode, type PageSpec, type TextStyle, type ThemeId } from "./pageSpec";
import { combinationReason, createMotion, numericContent, targetReason, type MotionInstance } from "./motion";
import { defaultControls, motionCatalog, motionIds, type MotionId } from "./motionCatalog";

// Annotations: "click something, say how to change it". The instruction is read
// locally (no model, no cost) and turned into ordinary Patch operations, so the
// result goes through the same validation, scope check and undo as manual edits.
// Text is only replaced with words the user typed inside quotes.

export type AnnotationResult =
  | { ok: true; patches: unknown[]; scope: string[]; summary: string[]; skipped: string[] }
  | { ok: false; message: string };

type Ctx = { page: PageSpec; node: PageNode; chain: PageNode[]; looks: Map<string, ImageLook>; texts: Map<string, TextStyle> };
type Step = { patches: unknown[]; summary: string } | { error: string } | null;

const levelNames = { 1: "主標題（大）", 2: "章節標題（中）", 3: "小標題" } as const;
const typeNames: Record<string, string> = { heading: "標題", paragraph: "文字", button: "按鈕", card: "卡片", image: "圖片", form: "表單", grid: "網格", section: "區塊", stack: "群組" };

const colorThemes: [RegExp, ThemeId][] = [
  [/藍|海|專業/, "ocean"],
  [/粉|桃|可愛|活潑/, "blossom"],
  [/暖|咖啡|木頭|書/, "forest"],
  [/綠|自然|森林|植物/, "forest"],
  [/黑白|灰|簡約|極簡|素/, "mono"],
  [/深色|暗|黑|夜|科技|紫/, "midnight"],
  [/清爽|乾淨|預設|原本/, "classic"],
];

// Words people use for motion, mapped to library presets (checked in order).
const motionWords: [RegExp, MotionId[]][] = [
  // Reference batch 1 (listed first: more specific than the older words below).
  [/圖表.*(長|畫出|動)|長條.*長/, ["chart-build"]],
  [/空心|描邊.*填|填滿/, ["hollow-fill-sweep"]],
  [/字裡.*(照片|圖)|照片.*(字裡|文字裡)|文字.*填.*(照片|圖)/, ["letter-windows"]],
  [/粗細.*(輪|變化|波)|字重.*(輪|變化|波)/, ["bold-relay"]],
  [/逐字.*(亮|深|上墨)|讀到.*(亮|深)|捲.*字.*(亮|深)/, ["scroll-ink-words"]],
  [/褪色|回彩|黑白.*彩色|恢復.*顏色/, ["color-wake"]],
  [/推近|框.*放大|放大.*框/, ["dolly-frame"]],
  [/逐字|聚合|一個字一個字/, ["letter-assembly"]],
  [/打字|解碼|亂碼/, ["character-decode"]],
  [/螢光|畫重點|標記|劃線/, ["hand-drawn-highlight"]],
  [/底線|描線/, ["accent-stroke"]],
  [/彈跳|跳動|彈/, ["elastic-word-bounce"]],
  [/旗面|伸縮波浪|波浪/, ["kinetic-text-wave"]],
  [/雙向吸附|從兩邊聚合/, ["letter-assembly"]],
  [/拖影|殘影.*入場/, ["blur-in"]],
  [/心跳|脈衝波紋/, ["breathing-glow"]],
  [/滾輪|滾動數字/, ["rolling-characters"]],
  [/數字|遞增|跑數字|倒數/, ["count-up"]],
  [/分行/, ["split-line-assembly"]],
  [/呼吸|閃|發光|光暈/, ["breathing-glow", "hover-glow"]],
  [/磁吸|吸/, ["magnetic-control"]],
  [/液態|填充/, ["liquid-button-fill"]],
  [/打字機|打字/, ["typewriter"]],
  [/跑馬燈/, ["marquee-text"]],
  [/漸層字|流光|彩虹字/, ["gradient-text-flow"]],
  [/模糊|對焦/, ["blur-in"]],
  [/定格|頓拍|跳格/, ["cutout-ticks"]],
  [/鐘擺|懸牌|支點擺/, ["sign-pivot"]],
  [/雷痕|雷擊.*落/, ["storm-landing"]],
  [/逆重力|往上.*彈/, ["inverse-spring"]],
  [/顫抖.*(穩定|停)|顫波/, ["quiet-landing"]],
  [/漂浮|飄|浮動/, ["float-idle"]],
  [/彩紙|撒花|慶祝/, ["confetti-burst"]],
  [/果凍|Q彈|q彈|彈跳/, ["jelly-press"]],
  [/光澤|亮光|閃亮|反光/, ["shine-sweep"]],
  [/漣漪|水波/, ["radial-ink-ripple"]],
  [/按壓|按下/, ["press-feedback"]],
  [/邊框.*光|光線/, ["border-light-trace"]],
  [/傾斜|3D|立體/i, ["perspective-tilt"]],
  [/浮起|浮|抬/, ["hover-lift"]],
  [/翻|雙面/, ["flip-card"]],
  [/收合|展開|折疊/, ["disclosure-panel"]],
  [/依序|一個一個|逐項/, ["stagger-reveal"]],
  [/百葉/, ["venetian-reveal"]],
  [/圓形|圓/, ["circular-mask-expansion"]],
  [/鏡頭|平移|電影/, ["cinematic-image-pan"]],
  [/像素/, ["pixel-dissolve"]],
  [/快門/, ["shutter-lens-transition"]],
  [/故障|glitch/i, ["glitch-slice-reveal"]],
  [/展幕|揭露|拉開/, ["image-reveal"]],
  [/縮放|放大進場/, ["scale-in"]],
  [/滑入|往上|向上/, ["slide-up"]],
  [/淡入|淡出|慢慢出現/, ["fade-in"]],
];
// A sensible default per element type when the user only says "add motion".
const defaultMotion: Record<string, MotionId[]> = {
  heading: ["letter-assembly", "slide-up"],
  paragraph: ["fade-in"],
  button: ["magnetic-control", "press-feedback"],
  card: ["perspective-tilt", "hover-lift"],
  image: ["circular-mask-expansion", "image-reveal"],
  form: ["fade-in"],
  grid: ["stagger-reveal", "fade-in"],
  section: ["fade-in"],
  stack: ["fade-in"],
};

function chainOf(page: PageSpec, id: string): PageNode[] | null {
  const walk = (n: PageNode, path: PageNode[]): PageNode[] | null => {
    const next = [...path, n];
    if (n.id === id) return next;
    for (const c of n.children ?? []) {
      const hit = walk(c, next);
      if (hit) return hit;
    }
    return null;
  };
  for (const s of allSections(page)) {
    const hit = walk(s, []);
    if (hit) return hit;
  }
  return null;
}
const nearest = (ctx: Ctx, type: string) => [...ctx.chain].reverse().find((n) => n.type === type);
const firstSection = (page: PageSpec) => page.sections[0];

function motionPatches(node: PageNode, wanted: MotionId[], replace: boolean, request: string): Step {
  for (const id of wanted) {
    if (node.effects.some((e) => e.presetId === id)) return { patches: [], summary: `已經有「${motionCatalog[id].nameZh}」了` };
    const reason = targetReason(node, id);
    if (reason) continue;
    if (Object.values(motionCatalog[id].controls).some((c) => c.required && c.default === undefined) && id !== "count-up") continue;
    let motion: MotionInstance;
    try {
      const values = id === "count-up" ? numericContent(node.content ?? "") : null;
      const falling = /倒數/.test(request) && values?.decimals === 0 && values.endValue < 1e9 - 3;
      const custom: Record<string, string> = {};
      if (id === "kinetic-text-wave" && /旗面|伸縮/.test(request)) custom.form = /旗面/.test(request) ? "flag" : "stretch-wave";
      if (id === "letter-assembly" && /吸附|兩邊/.test(request)) custom.arrival = "magnet";
      if (id === "blur-in" && /拖影|殘影/.test(request)) custom.entry = "trail";
      if (id === "breathing-glow" && /心跳|脈衝/.test(request)) custom.pulse = "heartbeat";
      motion = createMotion(id, node.id, {
        ...defaultControls(id), ...values, ...custom,
        ...(falling && values ? { cadence: "impact", startValue: values.endValue + 3 } : {}),
      });
    } catch {
      continue;
    }
    const keep = replace ? [] : node.effects;
    const conflict = combinationReason([...keep, motion]);
    // A conflicting effect of the same family is swapped out instead of refused.
    const removed = conflict ? node.effects : replace ? node.effects : [];
    if (combinationReason([...node.effects.filter((e) => !removed.includes(e)), motion])) continue;
    return {
      patches: [
        ...removed.map((e) => ({ operation: "remove-effect", targetId: node.id, payload: { effectId: e.presetId } })),
        { operation: "attach-effect", targetId: node.id, payload: motion },
      ],
      summary: (removed.length ? `把動態換成` : `加上動態`) + `「${motionCatalog[id].nameZh}」`,
    };
  }
  const names = wanted.map((id) => motionCatalog[id].nameZh).join("、");
  return { error: `${typeNames[node.type] ?? "這個元件"}不適合「${names}」，可以試試其他動態` };
}

function clause(text: string, ctx: Ctx): Step {
  const { node, page } = ctx;
  const t = text.trim();
  if (!t) return null;

  // 1. Replace text: only with the user's own quoted words.
  const quoted = /[「『“"]([^」』”"]{1,2000})[」』”"]/.exec(t);
  if (quoted && /改|換|寫|變成|標題|文字|按鈕/.test(t)) {
    if (!["heading", "paragraph", "button"].includes(node.type)) return { error: `請直接點選要改的文字，${typeNames[node.type] ?? "這個元件"}本身沒有文字` };
    return { patches: [{ operation: "set-text", targetId: node.id, payload: { content: quoted[1] } }], summary: `把文字改成「${quoted[1]}」` };
  }

  // 2. Links.
  const url = /https:\/\/[^\s，。」』"]+/.exec(t);
  if (url) {
    if (node.type !== "button") return { error: "只有按鈕可以設定連結" };
    return { patches: [{ operation: "set-property", targetId: node.id, payload: { property: "href", value: url[0] } }], summary: "更新按鈕連結" };
  }

  // 2.5 Photo frames and adjustments (images only; "配色" stays a page theme request).
  if (node.type === "image" && !/配色|主題|色系/.test(t)) {
    // Several clauses in one sentence build on each other ("愛心框，黑白，亮一點").
    const look: ImageLook = { ...(ctx.looks.get(node.id) ?? node.look ?? {}) };
    const done: string[] = [];
    // 3D on request: a floating card, or a turntable when the note asks for turning.
    if (/(不要|取消|拿掉|移除).{0,2}(3D|３Ｄ|立體)|變回平面|平面就好/i.test(t)) (delete look.depth, done.push("改回平面圖片"));
    else if (/3D|３Ｄ|立體|展示台/i.test(t) || /(會|慢慢|一直)(旋)?轉|轉動/.test(t)) {
      look.depth = /轉|展示台/.test(t) ? "turntable" : "float";
      done.push(look.depth === "turntable" ? "做成 3D 旋轉展示台" : "做成 3D 浮動立體卡");
    }
    const frameWord = /框|形狀|相框|裁成|變成.*(形|框)/.test(t);
    const frame = ([
      [/不要框|拿掉框|移除框|取消框|原本的形狀/, null],
      [/愛心|心形/, "heart"], [/星/, "star"], [/六角/, "hexagon"], [/菱/, "diamond"], [/花/, "flower"],
      [/拍立得/, "polaroid"], [/手機/, "phone"], [/筆電|電腦/, "laptop"], [/瀏覽器|網頁視窗/, "browser"],
      [/圓角/, "rounded"], [/膠囊/, "pill"], [/有機|不規則/, "blob"], [/圓潤|方形/, "squircle"], [/圓/, "circle"],
    ] as [RegExp, FrameId | null][]).find(([re]) => re.test(t));
    if (frame && (frameWord || /愛心|心形|拍立得|手機|筆電|瀏覽器|六角|菱形|花瓣|星形|膠囊/.test(t))) {
      if (frame[1]) look.frame = frame[1];
      else delete look.frame;
      done.push(frame[1] ? `換成${frameLabels[frame[1]]}相框` : "移除相框");
    }
    const filter = ([
      [/不要濾鏡|原圖|拿掉濾鏡/, "none"], [/高對比黑白/, "noir"], [/黑白/, "mono"], [/暖/, "warm"], [/冷/, "cool"],
      [/復古|懷舊/, "vintage"], [/鮮豔|飽和/, "vivid"], [/褪色|淡一點|柔和/, "fade"],
    ] as [RegExp, keyof typeof filterLabels][]).find(([re]) => re.test(t));
    if (filter) {
      if (filter[1] === "none") delete look.filter;
      else look.filter = filter[1];
      done.push(filter[1] === "none" ? "拿掉濾鏡" : `套用「${filterLabels[filter[1]]}」濾鏡`);
    }
    if (/亮一點|變亮|太暗/.test(t)) (look.brightness = Math.min(50, (look.brightness ?? 0) + 15), done.push("照片調亮"));
    if (/暗一點|變暗|太亮/.test(t)) (look.brightness = Math.max(-50, (look.brightness ?? 0) - 15), done.push("照片調暗"));
    if (/透明/.test(t)) (look.opacity = /不要透明|不透明/.test(t) ? 100 : Math.max(10, (look.opacity ?? 100) - 30), done.push("調整透明度"));
    if (/翻轉|鏡像|反過來/.test(t)) {
      if (/上下|垂直/.test(t)) look.flipY = !look.flipY || undefined;
      else look.flipX = !look.flipX || undefined;
      done.push(/上下|垂直/.test(t) ? "上下翻轉" : "左右翻轉");
    }
    if (/放大照片|照片放大|拉近/.test(t)) (look.zoom = Math.min(4, (look.zoom ?? 1) + 0.3), done.push("照片拉近"));
    if (/拉遠|縮小照片|照片縮小|完整/.test(t)) (look.zoom = undefined, done.push("顯示完整照片"));
    if (done.length) {
      for (const k of Object.keys(look) as (keyof ImageLook)[]) if (look[k] === undefined || (k === "opacity" && look[k] === 100)) delete look[k];
      ctx.looks.set(node.id, look);
      return { patches: [{ operation: "set-property", targetId: node.id, payload: { property: "look", value: look } }], summary: done.join("、") };
    }
  }

  // 2.6 Text styling (fonts, colours, emphasis) for text elements.
  if (["heading", "paragraph", "button", "card"].includes(node.type)) {
    const text: TextStyle = { ...(ctx.texts.get(node.id) ?? node.text ?? {}) };
    const done: string[] = [];
    const font = ([[/明體|宋體/, "serif"], [/楷體|手寫/, "kai"], [/圓體/, "rounded"], [/等寬|程式字/, "mono"], [/黑體|預設字/, "sans"]] as [RegExp, FontId][]).find(([re]) => re.test(t));
    if (font) (font[1] === "sans" ? delete text.font : (text.font = font[1]), done.push(`字型換成${fontLabels[font[1]]}`));
    const colorWords: [RegExp, string][] = [[/紅/, "#e5484d"], [/橘|橙/, "#f76b15"], [/黃/, "#ffc53d"], [/綠/, "#30a46c"], [/藍/, "#0d74ce"], [/紫/, "#6e56cf"], [/粉/, "#d6409f"], [/咖啡|棕/, "#8d5a3b"], [/白/, "#ffffff"], [/灰/, "#5b5f58"], [/黑/, "#111111"]];
    const color = /字|文字|標題|按鈕/.test(t) && !/配色|主題|底色|背景/.test(t) ? colorWords.find(([re]) => re.test(t)) : undefined;
    if (color) (text.color = color[1], done.push("文字顏色改好了"));
    if (/原本的顏色|預設顏色/.test(t)) (delete text.color, done.push("文字顏色恢復預設"));
    const flags: [RegExp, RegExp, "bold" | "italic" | "underline" | "strike", string][] = [
      [/粗體|加粗|變粗/, /不要粗體|取消粗體|不要加粗/, "bold", "粗體"],
      [/斜體/, /不要斜體|取消斜體/, "italic", "斜體"],
      [/底線/, /不要底線|取消底線/, "underline", "底線"],
      [/刪除線/, /不要刪除線/, "strike", "刪除線"],
    ];
    for (const [on, off, key, label] of flags) {
      if (off.test(t)) (delete text[key], done.push("取消" + label));
      else if (on.test(t)) (text[key] = true, done.push("改成" + label));
    }
    if (/螢光筆/.test(t) && !/動態|動畫/.test(t)) (text.highlight = "#fff3a3", done.push("加上螢光筆"));
    // Extruded lettering; cards keep "3D" as their tilt motion.
    if (node.type !== "card") {
      if (/(不要|取消|拿掉).{0,2}(3D|３Ｄ|立體)/i.test(t)) (delete text.depth, done.push("改回平面文字"));
      else if (/3D|３Ｄ|立體/i.test(t)) (text.depth = true, done.push("改成立體字"));
    }
    // Paragraphs, buttons and cards have no heading level: "大一點" changes the type size.
    if (node.type !== "heading") {
      const sizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
      const current = text.size ?? (node.type === "paragraph" ? 18 : 16);
      if (/字.{0,2}(大一點|放大|變大)|大一點/.test(t) && !/卡片|照片|圖片/.test(t)) (text.size = sizes.find((v) => v > current) ?? 48, done.push("字變大"));
      else if (/字.{0,2}(小一點|縮小|變小)|小一點/.test(t) && !/卡片|照片|圖片/.test(t)) (text.size = [...sizes].reverse().find((v) => v < current) ?? 12, done.push("字變小"));
    }
    if (done.length) {
      ctx.texts.set(node.id, text);
      return { patches: [{ operation: "set-property", targetId: node.id, payload: { property: "text", value: text } }], summary: done.join("、") };
    }
  }

  // 3. Remove motion.
  if (/(不要|移除|取消|拿掉|刪掉|關掉|停止).{0,3}(動態|動畫|特效|效果)|(動態|動畫).{0,2}(拿掉|移除|取消)/.test(t)) {
    if (!node.effects.length) return { patches: [], summary: "這個元件本來就沒有動態" };
    return { patches: node.effects.map((e) => ({ operation: "remove-effect", targetId: node.id, payload: { effectId: e.presetId } })), summary: "移除動態" };
  }

  // 4. Add or change motion (named or default).
  if (/動態|動畫|特效|效果|動起來|會動/.test(t) || /^(漂浮|飄浮|浮動|倒數)$/.test(t) || motionWords.some(([re]) => re.test(t) && /加|換|改|用|要|讓|做/.test(t))) {
    const replace = /換|改/.test(t);
    const named = motionIds.find((id) => t.includes(motionCatalog[id].nameZh));
    // Every matching word is a candidate; the first one that suits this element wins.
    const words = motionWords.filter(([re]) => re.test(t)).flatMap(([, ids]) => ids);
    return motionPatches(node, named ? [named] : words.length ? words : defaultMotion[node.type] ?? ["fade-in"], replace, t);
  }

  // 5. Colors / theme (page-wide, anchored on the first section like the theme menu).
  if (/配色|顏色|色系|主題|風格|色調|感覺|換色|主色/.test(t) || /(換|改|用|變).{0,3}(藍|粉|橘|綠|黑白|深色|暗)/.test(t)) {
    const anchor = firstSection(page);
    if (!anchor) return null;
    const named = colorThemes.find(([re]) => re.test(t))?.[1];
    const current = page.theme ?? "classic";
    const theme = named ?? themeIds[(themeIds.indexOf(current) + 1) % themeIds.length];
    if (theme === page.theme) return { patches: [], summary: `已經是「${themeLabels[theme]}」配色` };
    return { patches: [{ operation: "set-theme", targetId: anchor.id, payload: { theme } }], summary: `整頁換成「${themeLabels[theme]}」配色` };
  }

  // 6. Alignment.
  const align = /置中|居中|中間/.test(t) ? "center" : /靠左|左對齊|左邊/.test(t) ? "start" : /靠右|右對齊|右邊/.test(t) ? "end" : null;
  if (align) return { patches: [{ operation: "set-style", targetId: node.id, payload: { align } }], summary: { center: "置中對齊", start: "靠左對齊", end: "靠右對齊" }[align] };

  // 7. Explicit column count.
  const cols = /(一|二|兩|三|1|2|3)\s*(欄|排|列|個一排)/.exec(t);
  if (cols) {
    const grid = node.type === "grid" ? node : nearest(ctx, "grid");
    if (!grid) return { error: "這個元件不在網格裡，無法改欄數" };
    const value = ({ 一: 1, 1: 1, 二: 2, 兩: 2, 2: 2, 三: 3, 3: 3 } as Record<string, 1 | 2 | 3>)[cols[1]];
    return { patches: [{ operation: "set-property", targetId: grid.id, payload: { property: "columns", value } }], summary: `改成一排 ${value} 欄` };
  }

  // 8. Heading level by name.
  if (node.type === "heading") {
    const named = /主標題|大標題/.test(t) ? 1 : /章節標題|中標題/.test(t) ? 2 : /小標題/.test(t) ? 3 : null;
    if (named) return { patches: [{ operation: "set-property", targetId: node.id, payload: { property: "level", value: named } }], summary: `改成${levelNames[named]}` };
  }

  // 9. Bigger / smaller.
  const bigger = /大一點|大一些|放大|變大|加大|大點|更大|太小|顯眼|醒目/.test(t);
  const smaller = /小一點|小一些|縮小|變小|小點|更小|太大/.test(t);
  if (bigger || smaller) {
    if (node.type === "heading" && node.level) {
      const level = Math.min(3, Math.max(1, node.level + (bigger ? -1 : 1))) as 1 | 2 | 3;
      if (level === node.level) return { patches: [], summary: bigger ? "已經是最大的標題" : "已經是最小的標題" };
      return { patches: [{ operation: "set-property", targetId: node.id, payload: { property: "level", value: level } }], summary: `標題${bigger ? "放大" : "縮小"}為${levelNames[level]}` };
    }
    const grid = nearest(ctx, "grid");
    if ((node.type === "card" || node.type === "image") && grid?.columns) {
      const value = Math.min(3, Math.max(1, grid.columns + (bigger ? -1 : 1))) as 1 | 2 | 3;
      if (value === grid.columns) return { patches: [], summary: bigger ? "已經是一排一個，最大了" : "已經是一排三個，最小了" };
      return { patches: [{ operation: "set-property", targetId: grid.id, payload: { property: "columns", value } }], summary: `${typeNames[node.type]}${bigger ? "放大" : "縮小"}（一排 ${value} 個）` };
    }
    if (node.type === "button" && bigger) return { patches: [{ operation: "set-style", targetId: node.id, payload: { tone: "accent" } }], summary: "按鈕改成強調樣式" };
    if (node.type === "image" || node.type === "paragraph") {
      const width = bigger ? "full" : "narrow";
      return { patches: [{ operation: "set-style", targetId: node.id, payload: { width } }], summary: bigger ? "寬度放到最大" : "寬度縮窄" };
    }
    return { error: `${typeNames[node.type] ?? "這個元件"}的大小由版面決定，可以試試「標題大一點」或「卡片放大」` };
  }

  // 10. Spacing of the surrounding section.
  const roomy = /留白|間距|空間|鬆|擠|太密|緊/.exec(t);
  if (roomy) {
    const section = nearest(ctx, "section") ?? (node.type === "section" ? node : undefined);
    if (!section) return null;
    const more = /多|大|鬆|擠|太密|開/.test(t) && !/少|小|緊一點|緊湊/.test(t);
    return { patches: [{ operation: "set-style", targetId: section.id, payload: { padding: more ? "large" : "small", gap: more ? "large" : "small" } }], summary: more ? "這個區塊留白加大" : "這個區塊排得緊湊一點" };
  }

  // 11. Section background.
  if (/底色|背景/.test(t)) {
    const section = nearest(ctx, "section");
    if (!section) return null;
    const tone = /深|強調|重|顏色/.test(t) ? "accent" : /淡|淺|柔/.test(t) ? "soft" : /白|拿掉|不要|素/.test(t) ? "plain" : section.style?.tone === "soft" ? "plain" : "soft";
    return { patches: [{ operation: "set-style", targetId: section.id, payload: { tone } }], summary: { accent: "區塊改成強調底色", soft: "區塊改成淡色底", plain: "區塊改成白底" }[tone] };
  }
  return null;
}

// "卡片放大" said while a card's text is selected means the card, and so on.
const nouns: [RegExp, string][] = [[/圖片|照片|相片|相框/, "image"], [/卡片|方案/, "card"], [/區塊|這區|整段|這一段|背景|底色|留白|間距/, "section"], [/網格|欄/, "grid"]];
function retarget(text: string, ctx: Ctx): Ctx {
  for (const [re, type] of nouns) {
    if (!re.test(text) || ctx.node.type === type) continue;
    const at = ctx.chain.map((n): string => n.type).lastIndexOf(type);
    if (at >= 0) return { ...ctx, node: ctx.chain[at], chain: ctx.chain.slice(0, at + 1) };
  }
  return ctx;
}

/** Reads an instruction for the selected element. Several requests can be joined with ，、；或「然後」. */
export function interpretAnnotation(page: PageSpec, targetId: string, instruction: string): AnnotationResult {
  const text = instruction.trim().slice(0, 300);
  if (!text) return { ok: false, message: "請輸入想怎麼改，例如「標題大一點」" };
  const chain = chainOf(page, targetId);
  if (!chain) return { ok: false, message: "找不到選取的元件，請重新點選" };
  const ctx: Ctx = { page, node: chain[chain.length - 1], chain, looks: new Map(), texts: new Map() };
  // Keep quoted text intact while splitting into clauses.
  const parts: string[] = [];
  let buf = "", depth = 0;
  for (const ch of text) {
    if ("「『“\"".includes(ch) && !(ch === '"' && depth)) depth++;
    else if ("」』”\"".includes(ch) && depth) depth--;
    if (!depth && /[，,；;。]/.test(ch)) { parts.push(buf); buf = ""; continue; }
    buf += ch;
  }
  parts.push(buf);
  const clauses = parts.flatMap((p) => (/[「『“"]/.test(p) ? [p] : p.split(/然後|再|並且|而且|、|和|跟/))).map((p) => p.trim()).filter(Boolean);
  const patches: unknown[] = [], summary: string[] = [], skipped: string[] = [], errors: string[] = [];
  for (const c of clauses) {
    const step = clause(c, retarget(c, ctx));
    if (!step) skipped.push(c);
    else if ("error" in step) errors.push(step.error);
    else {
      patches.push(...step.patches);
      summary.push(step.summary);
    }
  }
  if (!patches.length && !summary.length)
    return { ok: false, message: errors[0] ?? `還看不懂「${skipped.join("、") || text}」，可以試試：標題大一點、置中、換成藍色、加動態、改成「新的文字」` };
  // Only the last look / text style per element is needed: it already includes the earlier clauses.
  const last = new Map<string, number>();
  const keyOf = (p: unknown) => {
    const q = p as { targetId: string; payload?: { property?: string } };
    return q.payload?.property === "look" || q.payload?.property === "text" ? q.payload.property + ":" + q.targetId : null;
  };
  patches.forEach((p, i) => { const k = keyOf(p); if (k) last.set(k, i); });
  const merged = patches.filter((p, i) => { const k = keyOf(p); return !k || last.get(k) === i; });
  patches.splice(0, patches.length, ...merged);
  const scope = [...new Set(patches.map((p) => (p as { targetId: string }).targetId))];
  return { ok: true, patches, scope, summary, skipped: [...skipped, ...errors] };
}

/** Chips for the selected element; text inside a card also offers card changes. */
export function suggestionsFor(page: PageSpec, id: string): string[] {
  const chain = chainOf(page, id) ?? [];
  const type = chain.at(-1)?.type ?? "";
  const inCard = type !== "card" && chain.some((n) => n.type === "card");
  const base = annotationSuggestions(type);
  return inCard ? [...base.slice(0, 2), "卡片放大", "卡片加 3D 傾斜", ...base.slice(2)].slice(0, 7) : base;
}

/** Quick suggestions shown as chips for the selected element type. */
export function annotationSuggestions(type: string): string[] {
  const common = ["加動態", "換個配色"];
  switch (type) {
    case "heading": return ["標題大一點", "改成明體", "藍色字", "置中", "立體字", "加螢光標記", ...common];
    case "paragraph": return ["字大一點", "粗體", "紅色字", "置中", "淡入", ...common];
    case "button": return ["按鈕更醒目", "加磁吸效果", "呼吸發光", ...common];
    case "card": return ["卡片放大", "卡片縮小", "加 3D 傾斜", ...common];
    case "image": return ["做成 3D", "3D 旋轉展示台", "換成圓形框", "黑白濾鏡", "亮一點", "左右翻轉", ...common];
    default: return ["留白多一點", "底色淡一點", ...common];
  }
}
