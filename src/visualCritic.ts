import { allSections, type PageNode, type PageSpec } from "./pageSpec";

// Visual Critic: looks at the page as drawn (measured from the rendered DOM, the same pixels a
// screenshot shows) and proposes ONE batch of small, checked fixes. Every fix is an ordinary
// patch (set-style), applied once, in one undo step; locked sections are never touched. This
// runs on the device and costs nothing; it judges proportions, not taste.

export type CriticFinding = { id: string; title: string; why: string; targetId?: string; fixed: boolean };
export type CriticResult = { findings: CriticFinding[]; patches: { operation: "set-style"; targetId: string; payload: Record<string, string> }[] };

const textOf = (el: Element) => (el.textContent ?? "").trim();
const isCjk = (s: string) => /[㐀-鿿]/.test(s);

/** Characters per line of a paragraph as drawn (CJK counts one per em, Latin about half). */
function charsPerLine(el: HTMLElement) {
  const s = getComputedStyle(el), size = parseFloat(s.fontSize) || 16;
  const width = el.getBoundingClientRect().width;
  return width / (isCjk(textOf(el)) ? size : size * 0.5);
}

export function critique(root: HTMLElement, page: PageSpec): CriticResult {
  const findings: CriticFinding[] = [];
  const patches: CriticResult["patches"] = [];
  const nodes = new Map<string, PageNode>();
  const walk = (n: PageNode) => { nodes.set(n.id, n); n.children?.forEach(walk); };
  allSections(page).forEach(walk);
  const sectionOf = new Map<string, PageNode>();
  allSections(page).forEach((s) => { const mark = (n: PageNode) => { sectionOf.set(n.id, s); n.children?.forEach(mark); }; mark(s); });
  const locked = (id: string) => !!sectionOf.get(id)?.lock?.layout;
  const fix = (targetId: string, payload: Record<string, string>) => {
    const n = nodes.get(targetId);
    if (!n || locked(targetId)) return false;
    if (Object.entries(payload).every(([k, v]) => (n.style as Record<string, string>)[k] === v)) return false;
    const existing = patches.find((p) => p.targetId === targetId);
    if (existing) Object.assign(existing.payload, payload);
    else patches.push({ operation: "set-style", targetId, payload });
    return true;
  };
  const el = (id: string) => root.querySelector<HTMLElement>(`[data-page-id="${id}"]`);

  // 1. Lines too long to read comfortably (more than about 40 Chinese characters).
  for (const [id, n] of nodes) {
    if (n.type !== "paragraph" || (n.content ?? "").length < 60) continue;
    const e = el(id);
    if (!e || e.getBoundingClientRect().width < 200) continue;
    const per = charsPerLine(e);
    if (per > 42) findings.push({ id: "measure:" + id, title: "一行字太長", why: `一行約 ${Math.round(per)} 個字，超過 40 字很難讀；收窄成一欄`, targetId: id, fixed: fix(id, { width: "content" }) });
  }

  // 2. Rhythm: three sections in a row with the same background read as one long block.
  const sections = page.sections;
  for (let i = 1; i + 1 < sections.length; i++) {
    const [a, b, c] = [sections[i - 1], sections[i], sections[i + 1]];
    if (a.style.tone === b.style.tone && b.style.tone === c.style.tone && !["hero", "footer"].includes(b.role ?? "")) {
      const next = b.style.tone === "soft" ? "plain" : "soft";
      findings.push({ id: "rhythm:" + b.id, title: "連續三段同一個底色", why: "整頁像一大塊，看不出段落；中間這段換個底色", targetId: b.id, fixed: fix(b.id, { tone: next }) });
      i++;
    }
  }

  // 3. Crowding: a section whose parts almost touch.
  for (const s of sections) {
    const e = el(s.id);
    if (!e) continue;
    // The section's own parts, in reading order, as drawn.
    const kids = (s.children ?? []).map((c) => el(c.id)).filter((k): k is HTMLElement => !!k && k.getBoundingClientRect().height > 0);
    if (kids.length < 2) continue;
    let tight = 0;
    for (let k = 1; k < kids.length; k++) if (kids[k].getBoundingClientRect().top - kids[k - 1].getBoundingClientRect().bottom < 12) tight++;
    if (tight >= 1 && s.style.gap !== "large") findings.push({ id: "crowd:" + s.id, title: "內容擠在一起", why: "標題和內容之間幾乎沒有空隙；拉開間距", targetId: s.id, fixed: fix(s.id, { gap: "large" }) });
  }

  // 4. The opening picture is too small to carry the page (shown, not changed: the composition decides).
  const hero = sections.find((s) => s.role === "hero");
  const heroEl = hero && el(hero.id);
  const img = heroEl?.querySelector("img");
  if (heroEl && img) {
    const h = heroEl.getBoundingClientRect(), r = img.getBoundingClientRect();
    if (h.width * h.height > 0 && (r.width * r.height) / (h.width * h.height) < 0.12)
      findings.push({ id: "hero-image", title: "首屏照片太小", why: "照片不到首屏的一成，撐不起第一眼；試試「主圖焦點」或「大字導讀」構圖", targetId: hero.id, fixed: false });
  }

  // 5. The main action is below the first screen.
  const button = heroEl?.querySelector<HTMLElement>(".page-button");
  if (button) {
    const top = button.getBoundingClientRect().top - root.getBoundingClientRect().top;
    if (top > Math.min(window.innerHeight, 900)) findings.push({ id: "cta", title: "主要按鈕在第一屏之外", why: "訪客要往下捲才看得到行動按鈕；縮短首屏文字或選較緊湊的構圖", targetId: button.dataset.pageId, fixed: false });
  }
  return { findings, patches };
}
