import { useLayoutEffect, useState, type RefObject } from "react";
import { interpretAnnotation, suggestionsFor } from "./annotate";
import { GenerationError, generationCodes } from "./generation";
import { NoteEditResponseSchema, noteKinds, type NoteEdit, type NoteKind } from "./noteEdits";
import { allSections, type PageNode, type PageSpec } from "./pageSpec";

// Batch notes: leave notes on several parts of the site, then send them together.
// Each note is read locally first (free); only what is not understood goes to the AI,
// all in one request. Nothing changes until the user presses 套用 on the summary.

/** What 描述網站 says about the site, so a rewrite fits who it is for. */
export type NoteBrief = { audience?: string; purpose?: string; mood?: string };
const short = (v?: string) => (v && v.trim() ? v.trim().slice(0, 20) : undefined);
export type StagedNote = { key: string; nodeId: string; text: string };
export type NoteOutcome = { n: number; note: StagedNote; by: "local" | "ai" | "none"; summary: string; patches: unknown[]; scope: string[] };

const typeNames: Record<string, string> = { heading: "標題", paragraph: "文字", button: "按鈕", card: "卡片", image: "圖片", form: "表單", media: "媒體", grid: "網格", section: "區塊", stack: "群組" };
const nodeOf = (page: PageSpec, id: string): PageNode | undefined => {
  const stack = [...allSections(page)];
  while (stack.length) { const n = stack.pop()!; if (n.id === id) return n; stack.push(...(n.children ?? [])); }
  return undefined;
};
export const noteLabel = (page: PageSpec, id: string) => typeNames[nodeOf(page, id)?.type ?? ""] ?? "元件";
// Generic commands the local reader understands for most elements, offered to the AI as well.
const generic = ["大一點", "小一點", "粗體", "置中", "靠左", "淡入", "加動態", "留白多一點", "底色淡一點"];

/** Sends the notes the local reader could not handle to the AI in one request. */
export async function requestNoteEdits(
  notes: { n: number; kind: NoteKind; text: string; note: string; allowed: string[] }[],
  signal: AbortSignal,
  brief?: NoteBrief,
): Promise<NoteEdit[]> {
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
    response = await fetch("/api/generation/notes", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json", "X-Sketch-CSRF": config.csrfToken! },
      body: JSON.stringify({ requestId, notes, audience: short(brief?.audience), purpose: short(brief?.purpose), mood: short(brief?.mood) }),
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
  const parsed = NoteEditResponseSchema.safeParse({ requestId: (data as { requestId?: unknown }).requestId, results: (data as { results?: unknown }).results });
  if (!parsed.success || parsed.data.requestId !== requestId) throw new GenerationError("INVALID_OUTPUT");
  return parsed.data.results;
}

/**
 * Reads every note locally; notes (or parts of notes) the reader did not understand are sent
 * to the AI once, and its answer is read by the same local reader. Returns one outcome per note.
 */
export async function processNotes(
  page: PageSpec,
  notes: StagedNote[],
  ask: typeof requestNoteEdits,
  signal: AbortSignal,
  brief?: NoteBrief,
): Promise<{ outcomes: NoteOutcome[]; aiError?: string }> {
  const outcomes: NoteOutcome[] = [];
  const pending: { outcome: NoteOutcome; leftover: string }[] = [];
  notes.forEach((note, i) => {
    const n = i + 1;
    const read = interpretAnnotation(page, note.nodeId, note.text);
    const outcome: NoteOutcome = { n, note, by: "none", summary: "", patches: [], scope: [] };
    if (read.ok && read.patches.length) { outcome.by = "local"; outcome.patches = read.patches; outcome.scope = read.scope; outcome.summary = read.summary.join("、"); }
    const leftover = read.ok ? read.skipped.join("，") : note.text;
    if (leftover.trim()) pending.push({ outcome, leftover });
    else if (!read.ok) outcome.summary = read.message;
    outcomes.push(outcome);
  });
  let aiError: string | undefined;
  if (pending.length) {
    const asks = pending.map(({ outcome, leftover }) => {
      const node = nodeOf(page, outcome.note.nodeId);
      const kind = (noteKinds as readonly string[]).includes(node?.type ?? "") ? (node!.type as NoteKind) : "other";
      const text = node?.type === "heading" || node?.type === "paragraph" || node?.type === "button" ? (node.content ?? "").slice(0, 400) : "";
      return { n: outcome.n, kind, text, note: leftover.slice(0, 300), allowed: [...new Set([...suggestionsFor(page, outcome.note.nodeId), ...generic])].filter((c) => c.length <= 20).slice(0, 16) };
    });
    try {
      const edits = await ask(asks, signal, brief);
      for (const { outcome } of pending) {
        const edit = edits.find((e) => e.n === outcome.n);
        if (!edit) continue;
        const current = asks.find((a) => a.n === outcome.n)?.text ?? "";
        const newText = edit.newText && edit.newText.trim() !== current.trim() ? edit.newText : "";
        const instruction = [...(newText ? [`改成「${newText}」`] : []), ...edit.commands].join("，");
        const read = instruction ? interpretAnnotation(page, outcome.note.nodeId, instruction) : null;
        if (read?.ok && read.patches.length) {
          outcome.patches = [...outcome.patches, ...read.patches];
          outcome.scope = [...new Set([...outcome.scope, ...read.scope])];
          outcome.summary = [outcome.summary, read.summary.join("、")].filter(Boolean).join("、");
          outcome.by = "ai";
        }
      }
    } catch (e) {
      const code = e instanceof GenerationError ? e.code : "UNAVAILABLE";
      aiError = code === "NOT_CONFIGURED" || code === "UNAVAILABLE" ? "AI 目前沒有開啟，看不懂的註解先跳過" : code === "LIMIT" ? "AI 這次的次數用完了，看不懂的註解先跳過" : "AI 這次沒有回應，看不懂的註解先跳過";
    }
    for (const { outcome } of pending) if (!outcome.patches.length) { outcome.by = "none"; outcome.summary = aiError ? "看不懂，換個說法試試，例如「大一點」或改成「新的文字」" : "AI 沒有改這則，換個說法試試，例如改成「新的文字」"; }
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
  const usable = result?.outcomes.filter((o) => o.patches.length) ?? [];
  const send = async () => {
    setPhase("working");
    setError("");
    const controller = new AbortController();
    const out = await processNotes(page, notes, requestNoteEdits, controller.signal, brief);
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
        {(phase === "review" && result ? result.outcomes : notes.map((note, i) => ({ n: i + 1, note, by: "none" as const, summary: "", patches: [], scope: [] }))).map((o) => (
          <li key={o.note.key} className={phase === "review" ? "is-" + (o.patches.length ? o.by : "none") : undefined}>
            <span className="note-no">{o.n}</span>
            <span className="note-body">
              <small>{noteLabel(page, o.note.nodeId)}：{o.note.text}</small>
              {phase === "review" && <span className="note-result">{o.patches.length ? (o.by === "ai" ? "AI：" : "") + o.summary : o.summary}</span>}
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
