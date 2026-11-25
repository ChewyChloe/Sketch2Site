import { useMemo, useRef, type ReactNode } from "react";
import type { CanvasSpec } from "./spec";
import { createDemoCandidate } from "./demo";
import { PageRenderer } from "./PageRenderer";
import { themeLabels, type PageSpec } from "./pageSpec";

// Original illustrations and copy for the Sketch2Site home page.
// Palette: neo green, ink, paper, plus a soft lilac used only in illustrations.

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function HomeNav() {
  const links: [string, string][] = [
    ["home-workspace", "我的工作區"],
    ["home-why", "為什麼好用"],
    ["home-steps", "四個步驟"],
    ["home-showcase", "範本"],
    ["home-faq", "常見問題"],
  ];
  return (
    <nav className="home-nav" aria-label="首頁導覽">
      {links.map(([id, label]) => (
        <button key={id} onClick={() => scrollTo(id)}>{label}</button>
      ))}
    </nav>
  );
}

/* ---------- Why section: folder-tab cards ---------- */
function ArtSketchToSite() {
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true">
      <g fill="none" stroke="#0d0e11" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round">
        <rect x="18" y="26" width="56" height="16" rx="4" transform="rotate(-6 46 34)" />
        <rect x="30" y="56" width="40" height="10" rx="3" transform="rotate(4 50 61)" />
        <rect x="14" y="84" width="34" height="40" rx="5" transform="rotate(-3 31 104)" />
        <rect x="54" y="92" width="30" height="34" rx="5" transform="rotate(7 69 109)" />
      </g>
      <path d="M100 80 h30" stroke="#0d0e11" strokeWidth="3" strokeLinecap="round" />
      <path d="M124 72 l10 8 -10 8" fill="none" stroke="#0d0e11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="146" y="20" width="80" height="120" rx="10" fill="#fff" stroke="#0d0e11" strokeWidth="2.5" />
      <rect x="156" y="32" width="52" height="9" rx="3" fill="#0d0e11" />
      <rect x="156" y="47" width="38" height="5" rx="2" fill="#9aa39c" />
      <rect x="156" y="58" width="24" height="9" rx="4.5" fill="#10e560" stroke="#0d0e11" strokeWidth="1.5" />
      <rect x="156" y="78" width="18" height="24" rx="3" fill="#c9b8ff" stroke="#0d0e11" strokeWidth="1.5" />
      <rect x="177" y="78" width="18" height="24" rx="3" fill="#fff" stroke="#0d0e11" strokeWidth="1.5" />
      <rect x="198" y="78" width="18" height="24" rx="3" fill="#fff" stroke="#0d0e11" strokeWidth="1.5" />
      <rect x="156" y="112" width="60" height="16" rx="4" fill="#0d0e11" />
      <path d="M214 14 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#10e560" stroke="#0d0e11" strokeWidth="1.5" />
    </svg>
  );
}
function ArtThemes() {
  const cards: [string, string, number][] = [["#0b0d1a", "#9d8cff", -14], ["#fffaf4", "#e2540b", -2], ["#f8fbff", "#1463d6", 10]];
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true">
      {cards.map(([bg, accent, r], i) => (
        <g key={i} transform={`rotate(${r} 120 150)`}>
          <rect x="72" y="28" width="96" height="112" rx="12" fill={bg} stroke="#0d0e11" strokeWidth="2.5" />
          <rect x="84" y="44" width="52" height="8" rx="3" fill={i === 0 ? "#eef0ff" : "#0d0e11"} />
          <rect x="84" y="58" width="36" height="5" rx="2" fill={i === 0 ? "#a4aad0" : "#9aa39c"} />
          <rect x="84" y="72" width="28" height="11" rx="5.5" fill={accent} />
        </g>
      ))}
      <g stroke="#0d0e11" strokeWidth="2">
        <circle cx="34" cy="46" r="10" fill="#10e560" />
        <circle cx="30" cy="76" r="8" fill="#c9b8ff" />
        <circle cx="210" cy="40" r="9" fill="#fff" />
        <circle cx="206" cy="118" r="7" fill="#10e560" />
      </g>
    </svg>
  );
}
function ArtShip() {
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true">
      <rect x="36" y="30" width="168" height="108" rx="12" fill="#fff" stroke="#0d0e11" strokeWidth="2.5" />
      <path d="M36 52 h168" stroke="#0d0e11" strokeWidth="2.5" />
      {[52, 64, 76].map((x) => <circle key={x} cx={x} cy="41" r="4" fill={x === 52 ? "#10e560" : "#d9ddd6"} stroke="#0d0e11" strokeWidth="1.5" />)}
      <text x="60" y="100" fontFamily="ui-monospace, monospace" fontSize="30" fontWeight="800" fill="#0d0e11">{"</>"}</text>
      <g transform="translate(150 66)">
        <circle cx="22" cy="22" r="22" fill="#10e560" stroke="#0d0e11" strokeWidth="2.5" />
        <path d="M22 32 v-20 M14 20 l8 -8 8 8" fill="none" stroke="#0d0e11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M26 128 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z" fill="#c9b8ff" stroke="#0d0e11" strokeWidth="1.5" />
    </svg>
  );
}
export function WhySection() {
  const cards: [string, string, string, ReactNode][] = [
    ["排版", "亂擺也能變整齊", "標題、文字、卡片隨手放，智慧排版會讀懂順序，整理成首屏、特色、價目表與問答。", <ArtSketchToSite />],
    ["風格", "換風格只要一下", `${Object.keys(themeLabels).length} 套配色與字體一鍵切換，內容不變；再加上動畫，頁面立刻有個性。`, <ArtThemes />],
    ["上線", "做完就能帶走", "匯出獨立的 React + TypeScript 專案，聯絡表單也能接上收件服務，放到任何主機都能用。", <ArtShip />],
  ];
  return (
    <section className="home-section" id="home-why" aria-labelledby="home-why-title">
      <h2 id="home-why-title" className="home-center-title">為什麼用 Sketch2Site 做網站</h2>
      <div className="why-grid">
        {cards.map(([tab, title, text, art]) => (
          <article className="why-card" key={tab}>
            <span className="why-tab">{tab}</span>
            <div className="why-art">{art}</div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Steps with two perspectives ---------- */
const stepIcons: Record<string, ReactNode> = {
  draw: <><rect x="10" y="14" width="44" height="36" rx="6" fill="#fff" /><path d="M18 26 h20 M18 34 h12" strokeDasharray="4 3" /><path d="M40 46 l14 -14 4 4 -14 14 -6 2z" fill="#10e560" /></>,
  build: <><rect x="8" y="10" width="48" height="44" rx="7" fill="#fff" /><rect x="15" y="17" width="34" height="8" rx="2" fill="#0d0e11" /><rect x="15" y="31" width="15" height="16" rx="2" fill="#c9b8ff" /><rect x="34" y="31" width="15" height="16" rx="2" fill="#10e560" /></>,
  style: <><circle cx="24" cy="26" r="13" fill="#10e560" /><circle cx="40" cy="26" r="13" fill="#c9b8ff" /><circle cx="32" cy="40" r="13" fill="#fff" /></>,
  ship: <><rect x="10" y="30" width="44" height="24" rx="6" fill="#fff" /><path d="M32 40 v-28 M22 22 l10 -10 10 10" fill="none" strokeWidth="3.5" /><circle cx="50" cy="12" r="5" fill="#10e560" /></>,
};
const steps: [string, string, string][] = [
  ["draw", "畫草稿", "拖入元件或區塊範本，位置不必精準。"],
  ["build", "生成網站", "自動整理成完整、好看的頁面。"],
  ["style", "調整風格", "換主題、加動畫、雙擊直接改字。"],
  ["ship", "匯出上線", "下載 React 專案，部署到任何靜態主機。"],
];
export function StepsSection() {
  return (
    <section className="home-section" id="home-steps" aria-labelledby="home-steps-title">
      <h2 id="home-steps-title" className="home-center-title">四個步驟，從想法到網站</h2>
      <ol className="steps-track">
        {steps.map(([icon, title, text]) => (
          <li key={title}>
            <svg viewBox="0 0 64 64" className="step-icon" aria-hidden="true" fill="none" stroke="#0d0e11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{stepIcons[icon]}</svg>
            <b>{title}</b>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Template showcase: real rendered pages ---------- */
const roleLabels: Record<string, string> = { hero: "首屏", features: "特色", gallery: "圖庫", pricing: "價目表", faq: "問答", contact: "聯絡", cta: "行動呼籲", content: "內容" };
export function Showcase({ templates, onUse }: { templates: CanvasSpec[]; onUse: (draft: CanvasSpec) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const pages = useMemo(
    () =>
      templates.map((draft) => {
        try {
          const reflow = { ...draft, metadata: { ...draft.metadata, layoutMode: "reflow" as const } };
          return { draft, page: createDemoCandidate(reflow).page as PageSpec };
        } catch {
          return { draft, page: null };
        }
      }),
    [templates],
  );
  const step = (dir: number) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <section className="home-section" id="home-showcase" aria-labelledby="home-showcase-title">
      <div className="home-section-head">
        <h2 id="home-showcase-title">從範本開始</h2>
        <div className="showcase-arrows">
          <button aria-label="上一組範本" onClick={() => step(-1)}>←</button>
          <button aria-label="下一組範本" onClick={() => step(1)}>→</button>
        </div>
      </div>
      <p className="home-note">每個範本都是真的生成結果；使用後會建立成新專案，不影響現有的專案。</p>
      <div className="showcase-track" ref={track}>
        {pages.map(({ draft, page }) => {
          const roles = [...new Set(page?.sections.map((s) => s.role).filter(Boolean) as string[])];
          return (
            <article className="showcase-card" key={draft.metadata.name} aria-label={"範本：" + draft.metadata.name}>
              <span className="showcase-badge">{page?.theme ? themeLabels[page.theme] : "示範"}</span>
              <div className="showcase-frame" inert aria-hidden="true">
                {page ? <div className="showcase-scale"><PageRenderer input={page} /></div> : null}
              </div>
              <div className="showcase-body">
                <div className="showcase-tags">
                  {roles.slice(0, 4).map((r) => <span key={r}>{roleLabels[r] ?? r}</span>)}
                </div>
                <h3>{draft.metadata.name}</h3>
                <button className="showcase-use" onClick={() => onUse(draft)}>用這個範本開始 <span aria-hidden="true">→</span></button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const faqs: [string, string][] = [
  ["需要會寫程式嗎？", "不需要。拖拉元件、雙擊改字、選主題就能完成；想自己改程式時，匯出的 React 專案也能直接編輯。"],
  ["我的資料存在哪裡？", "草稿、網站和圖片都存在你這台裝置的瀏覽器裡，不會上傳。清除瀏覽器資料會一起刪掉，重要的作品記得匯出備份。"],
  ["要付費嗎？", "編輯、智慧排版、主題、動畫與匯出都可以免費使用。"],
  ["做好的網站怎麼上線？", "在網站工作區匯出 React 專案，放到 GitHub Pages、Netlify 等靜態主機即可，也能設定自己的網域。"],
  ["聯絡表單收得到留言嗎？", "可以。在表單填入 Formspree 等收件服務的網址，匯出的網站就會把留言送到那裡；編輯時的預覽不會真的送出。"],
];
export function HomeFaq() {
  return (
    <section className="home-section" id="home-faq" aria-labelledby="home-faq-title">
      <h2 id="home-faq-title">常見問題</h2>
      <div className="home-faq">
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
