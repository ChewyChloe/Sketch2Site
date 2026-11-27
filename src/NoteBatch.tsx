import { useLayoutEffect, useState, type RefObject } from "react";
import { interpretAnnotation } from "./annotate";
import { GenerationError, generationCodes } from "./generation";
import { RewriteResponseSchema, sectionOf } from "./sectionRewrite";
import { allSections, type PageNode, type PageSpec } from "./pageSpec";

// Batch notes: leave notes on several parts of the site, then send them together.
// Each note is read locally first (free). Notes it does not fully understand go to the AI in
// one request with the whole site; the AI returns new versions of those notes' sections
// (it may restructure them), checked by sectionRewrite.ts and the patch rules.
// Nothing changes until the user presses 套用 on the summary.

/** What 描述網站 says about the site, so a rewrite fits who it is for. */
export type NoteBrief = { audience?: string; purpose?: string; mood?: string };
const short = (v?: string) => (v && v.trim() ? v.trim().slice(0, 20) : undefined);
export type StagedNote = { key: string; nodeId: string; text: string };
// shared: the AI rewrote this note's section together with an earlier note's (one patch for both).
export type NoteOutcome = { n: number; note: StagedNote; by: "local" | "ai" | "none"; summary: string; patches: unknown[]; scope: string[]; shared?: boolean };
export type RewriteAnswer = { sections: PageNode[]; notes: { n: number; summary: string }[] };

const typeNames: Record<string, string> = { heading: "標題", paragraph: "文字", button: "按鈕", card: "卡片", image: "圖片", form: "表單", media: "媒體", grid: "網格", section: "區塊", stack: "群組" };
const nodeOf = (page: PageSpec, id: string): PageNode | undefined => {
  const stack = [...allSections(page)];
  while (stack.length) { const n = stack.pop()!; if (n.id === id) return n; stack.push(...(n.children ?? [])); }
  return undefined;
};
export const noteLabel = (page: PageSpec, id: string) => typeNames[nodeOf(page, id)?.type ?? ""] ?? "元件";
/** Sends the notes the local reader could not handle, with the whole site, to the AI in one request. */
export async function requestSectionRewrite(
  page: PageSpec,
  notes: { n: number; nodeId: string; note: string }[],
  signal: AbortSignal,
  brief?: NoteBrief,
): Promise<RewriteAnswer> {
  if (import.meta.env.VITE_SITES_FRONTEND_ONLY === "true") throw new GenerationError("NOT_CONFIGURED");
  let config: { configured?: boolean; csrfToken?: string };
  try {
    config = await (await fetch("/api/generation/status", { signal, credentials: "same-origin", cache: "no-store" })).json();
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  if (!config.configured) throw new GenerationError("NOT_CONFIGURED");
  if (!/^[a-f0-9]{64}$/.test(config.csrfToken ?? "")) throw new GenerationError("CSRF_INVALID");
  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch("/api/generation/rewrite", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json", "X-Sketch-CSRF": config.csrfToken! },
      body: JSON.stringify({ requestId, page, notes, audience: short(brief?.audience), purpose: short(brief?.purpose), mood: short(brief?.mood) }),
    });
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GenerationError("INVALID_OUTPUT");
  }
  if (!response.ok) {
    const code = (data as { code?: unknown })?.code;
    throw new GenerationError(generationCodes.includes(code as never) ? (code as (typeof generationCodes)[number]) : "UNAVAILABLE");
  }
  const d = data as { requestId?: unknown; sections?: unknown; notes?: unknown };
  const parsed = RewriteResponseSchema.safeParse({ requestId: d.requestId, sections: d.sections, notes: d.notes });
  if (!parsed.success || parsed.data.requestId !== requestId) throw new GenerationError("INVALID_OUTPUT");
  return { sections: parsed.data.sections, notes: parsed.data.notes };
}

/**
 * Reads every note locally. Notes it fully understands become local edits; the others, plus
 * any local note in the same section, go to the AI once, which rewrites those sections.
 * Returns one outcome per note.
 */
export async function processNotes(
  page: PageSpec,
  notes: StagedNote[],
  ask: typeof requestSectionRewrite,
  signal: AbortSignal,
  brief?: NoteBrief,
): Promise<{ outcomes: NoteOutcome[]; aiError?: string }> {
  const outcomes: NoteOutcome[] = notes.map((note, i) => ({ n: i + 1, note, by: "none", summary: "", patches: [], scope: [] }));
  const reads = notes.map((note) => interpretAnnotation(page, note.nodeId, note.text));
  const needsAi = (i: number) => { const r = reads[i]; return !r.ok || !r.patches.length || r.skipped.some((x) => x.trim()); };
  const aiSections = new Set(outcomes.filter((_, i) => needsAi(i)).map((o) => sectionOf(page, o.note.nodeId)?.id).filter(Boolean) as string[]);
  const toAi = outcomes.filter((o) => aiSections.has(sectionOf(page, o.note.nodeId)?.id ?? ""));
  outcomes.forEach((o, i) => {
    if (toAi.includes(o)) return;
    const r = reads[i];
    if (r.ok && r.patches.length) { o.by = "local"; o.patches = r.patches; o.scope = r.scope; o.summary = r.summary.join("、"); }
    else o.summary = r.ok ? "看不懂，換個說法試試" : r.message;
  });
  let aiError: string | undefined;
  if (toAi.length) {
    try {
      const answer = await ask(page, toAi.map((o) => ({ n: o.n, nodeId: o.note.nodeId, note: o.note.text.slice(0, 300) })), signal, brief);
      for (const o of toAi) {
        const sectionId = sectionOf(page, o.note.nodeId)!.id;
        const section = answer.sections.find((s) => s.id === sectionId);
        const said = answer.notes.find((x) => x.n === o.n)?.summary;
        if (!section || JSON.stringify(section) === JSON.stringify(sectionOf(page, sectionId))) { o.summary = said ? "AI：" + said : "AI 沒有改這則，換個說法試試"; continue; }
        o.by = "ai";
        o.scope = [sectionId];
        o.summary = said ?? "改好了這一區";
        const first = toAi.find((x) => sectionOf(page, x.note.nodeId)?.id === sectionId);
        if (first === o) o.patches = [{ operation: "replace-section", targetId: sectionId, payload: { section } }];
        else o.shared = true;
      }
    } catch (e) {
      const code = e instanceof GenerationError ? e.code : "UNAVAILABLE";
      aiError = code === "NOT_CONFIGURED" || code === "UNAVAILABLE" ? "AI 目前沒有開啟，看不懂的註解先跳過" : code === "LIMIT" ? "AI 這次的次數用完了，看不懂的註解先跳過" : "AI 這次沒有回應，看不懂的註解先跳過";
      // Without the AI, notes the reader fully understood still work on their own.
      for (const o of toAi) {
        const r = reads[o.n - 1];
        if (r.ok && r.patches.length && !needsAi(o.n - 1)) { o.by = "local"; o.patches = r.patches; o.scope = r.scope; o.summary = r.summary.join("、"); }
        else o.summary = "看不懂，換個說法試試，例如「大一點」或改成「新的文字」";
      }
    }
  }
  return { outcomes, aiError };
}

/** Numbered dots over the elements that have notes. */
export function NoteMarkers({ notes, stage, page }: { notes: StagedNote[]; stage: RefObject<HTMLElement | null>; page: PageSpec }) {
  const [spots, setSpots] = useState<{ key: string; n: number; top: number; left: number }[]>([]);
  useLayoutEffect(() => {
    const host = stage.current;
    if (!host) return;
    const place = () => {
      const s = host.getBoundingClientRect();
      setSpots(notes.flatMap((note, i) => {
        const el = host.querySelector<HTMLElement>(`[data-page-id="${note.nodeId}"]`);
        if (!el) return [];
        // Sit at the start of the visible text (a centred heading spans the whole row).
        const range = document.createRange();
        range.selectNodeContents(el);
        const t = el.textContent?.trim() ? range.getBoundingClientRect() : null;
        const r = t && t.width > 0 ? t : el.getBoundingClientRect();
        return [{ key: note.key, n: i + 1, top: Math.max(2, r.top - s.top - 12), left: Math.max(2, r.left - s.left - 14) }];
      }));
    };
    place();
    const scroller = host.querySelector(".preview-scroll") ?? host;
    scroller.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    ro?.observe(host);
    return () => { scroller.removeEventListener("scroll", place); window.removeEventListener("resize", place); ro?.disconnect(); };
  }, [notes, page, stage]);
  return (
    <>
      {spots.map((s) => <span key={s.key} className="note-marker" style={{ top: s.top, left: s.left }} aria-hidden="true">{s.n}</span>)}
    </>
  );
}

/** The list of staged notes, sending, and the summary to apply or cancel. */
export function NoteTray({
  page,
  notes,
  brief,
  onRemove,
  onClear,
  onApply,
}: {
  page: PageSpec;
  notes: StagedNote[];
  brief?: NoteBrief;
  onRemove: (key: string) => void;
  onClear: () => void;
  onApply: (patches: unknown[], scope: string[]) => boolean;
}) {
  const [phase, setPhase] = useState<"list" | "working" | "review">("list");
  const [result, setResult] = useState<{ outcomes: NoteOutcome[]; aiError?: string } | null>(null);
  const [error, setError] = useState("");
  if (!notes.length && phase === "list") return null;
  const usable = result?.outcomes.filter((o) => o.patches.length || o.shared) ?? [];
  const send = async () => {
    setPhase("working");
    setError("");
    const controller = new AbortController();
    const out = await processNotes(page, notes, requestSectionRewrite, controller.signal, brief);
    setResult(out);
    setPhase("review");
  };
  const apply = () => {
    const patches = usable.flatMap((o) => o.patches), scope = [...new Set(usable.flatMap((o) => o.scope))];
    if (!patches.length) return;
    if (!onApply(patches, scope)) { setError("這些修改套用不了，頁面沒有變動"); return; }
    setPhase("list");
    setResult(null);
    onClear();
  };
  return (
    <section className="note-tray" aria-label="待送出的修改">
      <header>
        <strong>{phase === "review" ? "修改結果" : "待送出的修改"}</strong>
        <small>{phase === "review" ? `可以改 ${usable.length} / ${notes.length} 則` : `${notes.length} 則`}</small>
      </header>
      <ol>
        {(phase === "review" && result ? result.outcomes : notes.map((note, i): NoteOutcome => ({ n: i + 1, note, by: "none", summary: "", patches: [], scope: [] }))).map((o) => (
          <li key={o.note.key} className={phase === "review" ? "is-" + (o.patches.length || o.shared ? o.by : "none") : undefined}>
            <span className="note-no">{o.n}</span>
            <span className="note-body">
              <small>{noteLabel(page, o.note.nodeId)}：{o.note.text}</small>
              {phase === "review" && <span className="note-result">{o.patches.length || o.shared ? (o.by === "ai" ? "AI：" : "") + o.summary : o.summary}</span>}
            </span>
            {phase === "list" && <button type="button" className="note-remove" aria-label={`刪除第 ${o.n} 則註解`} onClick={() => onRemove(o.note.key)}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>}
          </li>
        ))}
      </ol>
      {result?.aiError && phase === "review" && <p className="note-tray-msg" role="status">{result.aiError}</p>}
      {error && <p className="note-tray-msg bad" role="alert">{error}</p>}
      <footer>
        {phase === "review" ? (
          <>
            <button type="button" onClick={() => { setPhase("list"); setResult(null); }}>回去修改</button>
            <button type="button" className="primary" disabled={!usable.length} onClick={apply}>套用 {usable.length} 則</button>
          </>
        ) : (
          <>
            <button type="button" disabled={phase === "working"} onClick={onClear}>全部清除</button>
            <button type="button" className="primary" disabled={phase === "working"} onClick={() => void send()}>{phase === "working" ? "處理中…" : "送出修改"}</button>
          </>
        )}
      </footer>
    </section>
  );
}
