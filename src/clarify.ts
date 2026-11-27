// Asking back instead of guessing. A note like 「改好看一點」 or 「怪怪的」 does not say what
// to change; sending it to the AI wastes a call and the result is a guess. These notes are
// caught here (free, no AI) and the person picks what they meant from a few concrete choices,
// or writes it in their own words. The AI can also answer with a question (sectionRewrite.ts).

export type Clarify = { question: string; options: string[] };

// Says something is wrong or should be better, without saying what.
const vagueWords = /^(請|幫我|麻煩)?(再)?(改|改一下|改改|修|修一下|調|調整|調一下|弄|弄一下|處理|優化|美化|改好|改漂亮|改好看|好|好看|漂亮|更好|更好看|不喜歡|不好看|不好|不對|怪|怪怪|有點怪|很怪|醜|很醜|不行|爛|普通|再想想|換一下|換個|變好|改得更好)(一點|一些|點|些|的|了|啦|喔|耶|看看|吧)*[。！!～~…]*$/;
// Any of these means the note says what to change, even if the wording is loose.
const specific = /字|文|句|標題|顏色|色|大|小|粗|細|圖|照片|相片|動畫|動態|位置|左|右|中間|置中|上面|下面|上方|下方|排|間距|留白|按鈕|連結|網址|形狀|圓|框|邊|背景|底|字型|字體|輪播|表格|圖表|價格|電話|地址|時間|「|"|“/;

const choices: Record<string, string[]> = {
  heading: ["寫得更吸引人", "字放大一點", "換個顏色", "置中"],
  paragraph: ["寫短一點", "語氣更親切", "字放大一點", "分成重點條列"],
  button: ["按鈕文字更清楚", "換個顏色", "放大一點", "加上動畫"],
  image: ["換一張照片", "加上圓角", "放大一點", "加上動畫"],
  media: ["換成輪播", "放大一點", "加上說明文字"],
  card: ["重新排版", "文字更精簡", "加上照片", "換個配色"],
};
const fallback = ["重新排版", "文字更精簡", "換個配色", "加上動畫"];

/** A question with concrete choices when a note does not say what to change; null when it does. */
export function clarifyNote(text: string, nodeType: string): Clarify | null {
  const t = text.trim().replace(/\s+/g, "");
  if (!t) return { question: "想怎麼改？", options: choices[nodeType] ?? fallback };
  if (specific.test(t) || t.length > 18) return null;
  if (!vagueWords.test(t)) return null;
  return { question: "想改哪個部分？選一個，或自己寫清楚一點", options: choices[nodeType] ?? fallback };
}
