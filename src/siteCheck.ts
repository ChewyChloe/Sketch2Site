import type { PageNode, PageSpec } from "./pageSpec";

// Pre-launch check: plain-language problems a non-designer can fix before publishing.
// Two passes: one on the page data (works anywhere, also in tests), one on the rendered
// page in the browser (colour contrast, pictures that fail to load, content wider than the
// page). Nothing is changed automatically; each issue points at the element to fix.

export type CheckLevel = "error" | "warn";
export type SiteIssue = {
  id: string;
  level: CheckLevel;
  /** Short heading, e.g. 「按鈕沒有連結」. */
  title: string;
  /** What to do about it, one sentence. */
  advice: string;
  targetId?: string;
  /** A short quote of the element, so the person recognises it. */
  quote?: string;
};

const placeholderWords = /例如|範例|示意|請輸入|在這裡|這裡寫|Lorem|ipsum|XXX|xxx|○○|OOO|TODO|待補|標題文字|內容文字/;
const exampleHosts = /^https:\/\/(www\.)?(example\.(com|org|net)|forms\.example\.com|test\.com)(\/|$)/i;
const short = (text = "") => (text.length > 18 ? text.slice(0, 18) + "…" : text);
const walk = (nodes: readonly PageNode[], out: PageNode[] = []) => {
  for (const n of nodes) {
    out.push(n);
    if (n.children) walk(n.children, out);
  }
  return out;
};

/** Checks on the page data. */
export function checkSite(page: PageSpec): SiteIssue[] {
  const issues: SiteIssue[] = [];
  const views = [{ name: "", sections: page.sections }, ...(page.subpages ?? []).map((p) => ({ name: p.title, sections: p.sections }))];
  const add = (i: Omit<SiteIssue, "id">) => issues.push({ ...i, id: `${i.title}:${i.targetId ?? issues.length}` });

  const allIds = new Set([...views.flatMap((v) => walk(v.sections).map((n) => n.id)), ...(page.subpages ?? []).map((p) => p.id), ...(page.home ? [page.home.id] : [])]);
  const title = page.metadata.title.trim();
  if (!title || /^未命名|^Untitled|動畫素材示意/.test(title)) add({ level: "error", title: "網站名稱還沒取", advice: "瀏覽器分頁和搜尋結果會顯示這個名字，在左上角的名稱欄替網站取名" });

  for (const view of views) {
    const nodes = walk(view.sections);
    const where = view.name ? `（${view.name}）` : "";
    const h1 = nodes.filter((n) => n.type === "heading" && n.level === 1);
    if (!h1.length) add({ level: "warn", title: "沒有主標題" + where, advice: "每一頁最好有一個最大的標題，讓人一眼知道這頁在講什麼" });
    if (h1.length > 1) add({ level: "warn", title: `有 ${h1.length} 個主標題` + where, advice: "只留一個最大的標題，其他改成小一級", targetId: h1[1].id, quote: short(h1[1].content) });

    let motions = 0;
    for (const n of nodes) {
      motions += n.effects.length;
      const text = n.content?.trim() ?? "";
      if (n.type === "image" && (!n.alt?.trim() || /^(圖片|照片|相片|圖|image|photo|picture|img|未命名|[\w-]+\.(jpe?g|png|webp))$/i.test(n.alt.trim())))
        add({ level: "error", title: "圖片沒有說明文字", advice: "替圖片寫一句說明，例如「店裡的吧台」，看不到圖的人和搜尋引擎才知道它是什麼", targetId: n.id });
      if (n.type === "button") {
        if (!n.href) add({ level: "error", title: "按鈕沒有連結", advice: "設定按下去要去哪裡，例如報名表或聯絡頁", targetId: n.id, quote: short(text) });
        else if (exampleHosts.test(n.href)) add({ level: "error", title: "按鈕連到範例網址", advice: "把連結換成你真正的網址", targetId: n.id, quote: short(text) });
        else if (n.href.startsWith("#") && !allIds.has(n.href.slice(1)))
          add({ level: "error", title: "按鈕連到不存在的區塊", advice: "那一區可能被刪了，重新選要跳到哪裡", targetId: n.id, quote: short(text) });
      }
      if (n.type === "form" && n.href && exampleHosts.test(n.href)) add({ level: "error", title: "表單還沒接上收件網址", advice: "表單送出的資料會寄到範例網址，請換成你自己的表單服務網址", targetId: n.id });
      if ((n.type === "heading" || n.type === "paragraph" || n.type === "button") && placeholderWords.test(text))
        add({ level: "warn", title: "還有範本文字沒改", advice: "這段看起來是範本的示意文字，換成你自己的內容", targetId: n.id, quote: short(text) });
      if ((n.type === "heading" || n.type === "paragraph" || n.type === "button") && !text) add({ level: "warn", title: "有空白的文字", advice: "填上內容，或把這個元件刪掉", targetId: n.id });
      if (n.type === "paragraph" && text.length > 320) add({ level: "warn", title: "段落太長", advice: "超過 320 字很難在手機上讀完，拆成兩三段或加小標題", targetId: n.id, quote: short(text) });
      if (n.type === "heading" && text.length > 60) add({ level: "warn", title: "標題太長", advice: "標題超過 60 字，縮短成一句重點，細節放到內文", targetId: n.id, quote: short(text) });
      if (n.effects.length > 2) add({ level: "warn", title: "同一個元件動畫太多", advice: "一個元件留一到兩個動畫，看起來比較穩", targetId: n.id, quote: short(text) });
      if (n.media?.kind === "video" && !n.media.videoId) add({ level: "error", title: "影片還沒有網址", advice: "貼上 YouTube 或 Vimeo 的網址", targetId: n.id });
      if (n.media?.kind === "carousel" && n.media.images.length < 2) add({ level: "warn", title: "輪播只有一張照片", advice: "至少放兩張，輪播才有意義；只有一張就改成一般圖片", targetId: n.id });
    }
    if (motions > 24) add({ level: "warn", title: `整頁有 ${motions} 個動畫` + where, advice: "動畫太多會讓人分心，也比較耗電；留給最重要的地方" });
  }
  return issues;
}

/** WCAG contrast ratio of two colours given as rgb()/rgba() strings. */
export function contrastRatio(fg: string, bg: string): number | null {
  const parse = (c: string) => {
    const m = c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
    return m ? [m[1], m[2], m[3]].map(Number) : null;
  };
  const a = parse(fg), b = parse(bg);
  if (!a || !b) return null;
  const lum = ([r, g, bl]: number[]) => {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const transparent = (c: string) => c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);

/** Checks on the rendered page: contrast, broken pictures, content wider than the page. */
export function checkRendered(root: HTMLElement): SiteIssue[] {
  const issues: SiteIssue[] = [];
  const seen = new Set<string>();
  const add = (i: Omit<SiteIssue, "id">) => { const id = `${i.title}:${i.targetId}`; if (!seen.has(id)) { seen.add(id); issues.push({ ...i, id }); } };
  const backgroundOf = (el: Element | null): string | null => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== "none") return null; // over a picture or gradient: cannot judge
      if (!transparent(s.backgroundColor)) return s.backgroundColor;
    }
    return "rgb(255, 255, 255)";
  };
  for (const el of root.querySelectorAll<HTMLElement>("[data-page-id]")) {
    const id = el.dataset.pageId!;
    if (el.matches(".page-heading, .page-paragraph, .page-button, h1, h2, h3, p")) {
      const s = getComputedStyle(el);
      if (!el.textContent?.trim() || s.visibility === "hidden" || Number(s.opacity) < 0.1) continue;
      // Effects that paint the letters themselves (gradients, photos, outlines) are judged by eye.
      if (s.webkitTextFillColor === "transparent" || s.backgroundClip === "text" || transparent(s.color)) continue;
      const bg = backgroundOf(el);
      const ratio = bg ? contrastRatio(s.color, bg) : null;
      const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && Number(s.fontWeight) >= 700);
      if (ratio !== null && ratio < (large ? 3 : 4.5))
        add({ level: ratio < 2.5 ? "error" : "warn", title: "文字和底色太接近", advice: `對比只有 ${ratio.toFixed(1)}:1，${large ? "大字" : "一般文字"}至少要 ${large ? 3 : 4.5}:1，換深一點的字或淺一點的底`, targetId: id, quote: short(el.textContent.trim()) });
    }
    for (const img of el.querySelectorAll<HTMLImageElement>(":scope > img, :scope > * > img")) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) add({ level: "error", title: "圖片讀不到", advice: "這張圖片載入失敗，重新上傳或換一張", targetId: id });
    }
  }
  const page = root.querySelector<HTMLElement>(".rendered-page") ?? root;
  if (page.scrollWidth > page.clientWidth + 4) add({ level: "warn", title: "有內容超出頁面寬度", advice: "有東西比頁面還寬，手機上會需要左右滑，檢查太寬的圖片或表格", targetId: undefined });
  return issues;
}

export const issueSummary = (issues: readonly SiteIssue[]) => {
  const errors = issues.filter((i) => i.level === "error").length, warns = issues.length - errors;
  return !issues.length ? "沒有發現問題，可以上線" : [errors ? `${errors} 個要修正` : "", warns ? `${warns} 個建議` : ""].filter(Boolean).join("、");
};
