import { useState } from "react";
import { useAssetUrls } from "./useAssetUrls";
import type { PageNode, PageSpec } from "./pageSpec";

// The site's layers in words people use: 區塊｜飲品價目, 卡片｜拿鐵, T 文字, a picture thumbnail.
// Layout wrappers (container / stack / grid) are hidden unless 顯示版面結構 is on.
// Hovering a row outlines the element on the page; clicking selects it and scrolls to it.

const structural = new Set(["container", "stack", "grid"]);
const roleNames: Record<string, string> = { hero: "首屏", features: "特色", content: "內容", gallery: "圖庫", pricing: "價目", faq: "常見問題", contact: "聯絡", cta: "行動呼籲" };
const firstText = (n: PageNode): string => {
  if (n.content?.trim()) return n.content.split("\n")[0].trim();
  for (const c of n.children ?? []) { const t = firstText(c); if (t) return t; }
  return "";
};
const firstHeading = (n: PageNode): string => {
  if (n.type === "heading" && n.content) return n.content;
  for (const c of n.children ?? []) { const t = firstHeading(c); if (t) return t; }
  return "";
};
type Row = { node: PageNode; depth: number; label: string; kind: string; hasChildren: boolean };

function rowsOf(list: PageNode[], depth: number, showStructure: boolean, open: Set<string>): Row[] {
  const out: Row[] = [];
  for (const n of list) {
    if (structural.has(n.type) && !showStructure) { out.push(...rowsOf(n.children ?? [], depth, showStructure, open)); continue; }
    const kids = n.children ?? [];
    const label =
      n.type === "section" ? firstHeading(n) || roleNames[n.role ?? ""] || "區塊"
      : n.type === "card" ? firstText(n) || "卡片"
      : n.type === "image" ? n.alt || "圖片"
      : n.type === "media" ? n.content || "媒體"
      : n.type === "form" ? "表單"
      : structural.has(n.type) ? ({ container: "容器", stack: "堆疊", grid: "網格" } as Record<string, string>)[n.type]
      : (n.content ?? "").split("\n")[0];
    out.push({ node: n, depth, label, kind: n.type, hasChildren: kids.length > 0 });
    if (kids.length && open.has(n.id)) out.push(...rowsOf(kids, depth + 1, showStructure, open));
  }
  return out;
}
const kindNames: Record<string, string> = { section: "區塊", card: "卡片", heading: "標題", paragraph: "文字", button: "按鈕", image: "圖片", form: "表單", media: "媒體", container: "容器", stack: "堆疊", grid: "網格" };

function Icon({ kind }: { kind: string }) {
  const d: Record<string, string> = {
    section: "M4 5h16v14H4z M4 9h16",
    card: "M5 5h14v14H5z M8 9h8 M8 13h5",
    heading: "M6 5h12 M12 5v14",
    paragraph: "M6 5h12 M12 5v14",
    button: "M4 8h16v8H4z M8 12h8",
    form: "M5 5h14v14H5z M8 9h8 M8 13h8",
    media: "M4 6h16v12H4z M10 9v6l5-3z",
    container: "M4 4h16v16H4z",
    stack: "M5 6h14 M5 12h14 M5 18h14",
    grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="layer-icon"><path d={d[kind] ?? d.container} /></svg>;
}

export function LayerTree({ page, selectedIds, onSelect }: { page: PageSpec; selectedIds: string[]; onSelect: (id: string) => void }) {
  const groups = page.subpages?.length && page.home
    ? [{ id: page.home.id, title: page.home.title, sections: page.sections }, ...page.subpages.map((p) => ({ id: p.id, title: p.title, sections: p.sections }))]
    : [{ id: "", title: "", sections: page.sections }];
  // Sections start open; cards start closed (their text shows in the label already).
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [showStructure, setShowStructure] = useState(false);
  const open = new Set<string>();
  const markOpen = (list: PageNode[]) => { for (const n of list) { if (n.type === "card" ? openCards.has(n.id) : !closed.has(n.id)) open.add(n.id); markOpen(n.children ?? []); } };
  groups.forEach((g) => markOpen(g.sections));
  // The selected element's parents open so its row is visible.
  const parents = new Map<string, string>();
  const link = (list: PageNode[], parent?: string) => list.forEach((n) => { if (parent) parents.set(n.id, parent); link(n.children ?? [], n.id); });
  groups.forEach((g) => link(g.sections));
  for (const id of selectedIds) for (let p = parents.get(id); p; p = parents.get(p)) open.add(p);
  const images: string[] = [];
  const collect = (list: PageNode[]) => list.forEach((n) => { if (n.type === "image" && n.src) images.push(n.src); collect(n.children ?? []); });
  groups.forEach((g) => collect(g.sections));
  const urls = useAssetUrls(images);
  const toggle = (n: PageNode) => {
    if (n.type === "card") setOpenCards((s) => { const x = new Set(s); if (open.has(n.id)) x.delete(n.id); else x.add(n.id); return x; });
    else setClosed((s) => { const x = new Set(s); if (open.has(n.id)) x.add(n.id); else x.delete(n.id); return x; });
  };
  const outline = (id: string | null) => {
    document.querySelectorAll(".layer-hover").forEach((el) => el.classList.remove("layer-hover"));
    if (id) document.querySelector(`.preview-frame [data-page-id="${id}"]`)?.classList.add("layer-hover");
  };
  return (
    <section className="element-browser layer-tree" aria-label="圖層" onPointerLeave={() => outline(null)}>
      <div className="layer-head">
        <h2>圖層</h2>
        <label className="layer-structure">
          <input type="checkbox" checked={showStructure} onChange={(e) => setShowStructure(e.target.checked)} />
          顯示版面結構
        </label>
      </div>
      {groups.map((g) => (
        <div key={g.id || "home"} className="layer-group">
          {g.title && <p className="layer-page">頁面｜{g.title}</p>}
          <ul>
            {rowsOf(g.sections, 0, showStructure, open).map((r) => {
              const src = r.kind === "image" && r.node.src ? urls[r.node.src] || import.meta.env.BASE_URL + r.node.src.slice(1) : null;
              return (
                <li key={r.node.id} className={"layer-row kind-" + r.kind + (structural.has(r.kind) ? " structural" : "")} style={{ "--depth": r.depth } as React.CSSProperties}>
                  {r.hasChildren ? (
                    <button type="button" className="layer-toggle" aria-expanded={open.has(r.node.id)} aria-label={(open.has(r.node.id) ? "收起" : "展開") + (kindNames[r.kind] ?? "") + "：" + r.label} onClick={() => toggle(r.node)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                    </button>
                  ) : <span className="layer-toggle-space" aria-hidden="true" />}
                  <button
                    type="button"
                    className="layer-name"
                    data-component-id={r.node.id}
                    aria-pressed={selectedIds.includes(r.node.id)}
                    onPointerEnter={() => outline(r.node.id)}
                    onFocus={() => outline(r.node.id)}
                    onClick={() => {
                      onSelect(r.node.id);
                      document.querySelector(`.preview-frame [data-page-id="${r.node.id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
                    }}
                  >
                    {src ? <img className="layer-thumb" src={src} alt="" /> : r.kind === "heading" || r.kind === "paragraph" ? <span className="layer-t" aria-hidden="true">T</span> : <Icon kind={r.kind} />}
                    <small>{kindNames[r.kind] ?? r.kind}</small>
                    <span>{r.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
