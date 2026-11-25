import { useEffect, useRef, useState } from "react";
import { CopyResponseSchema, type CopyKind } from "./copySuggest";
import { GenerationError, generationCodes } from "./generation";
import type { Brief } from "./brief";

/** Asks the server for 1–3 alternative wordings. Nothing is changed here. */
export async function requestCopy(kind: CopyKind, text: string, brief: Partial<Brief> | undefined, signal: AbortSignal): Promise<string[]> {
  if (import.meta.env.VITE_SITES_FRONTEND_ONLY === "true") throw new GenerationError("NOT_CONFIGURED");
  let config: { configured?: boolean; csrfToken?: string };
  try {
    const status = await fetch("/api/generation/status", { signal, credentials: "same-origin", cache: "no-store" });
    config = await status.json();
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  if (!config.configured) throw new GenerationError("NOT_CONFIGURED");
  if (!/^[a-f0-9]{64}$/.test(config.csrfToken ?? "")) throw new GenerationError("CSRF_INVALID");
  const requestId = crypto.randomUUID();
  const short = (v?: string) => (v && v.trim() ? v.trim().slice(0, 20) : undefined);
  let response: Response;
  try {
    response = await fetch("/api/generation/copy", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json", "X-Sketch-CSRF": config.csrfToken! },
      body: JSON.stringify({ requestId, kind, text: text.trim().slice(0, 400), audience: short(brief?.audience), purpose: short(brief?.purpose), mood: short(brief?.mood) }),
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
  const parsed = CopyResponseSchema.safeParse({ requestId: (data as { requestId?: unknown }).requestId, options: (data as { options?: unknown }).options });
  if (!parsed.success || parsed.data.requestId !== requestId) throw new GenerationError("INVALID_OUTPUT");
  return parsed.data.options;
}

/** "Ask AI for other wordings" under a text field: suggestions only, the user picks. */
export function CopySuggest({ kind, text, brief, onPick }: { kind: CopyKind; text: string; brief?: Partial<Brief>; onPick: (value: string) => void }) {
  const [state, setState] = useState<{ phase: "idle" | "loading" | "done" | "error"; options: string[]; message?: string }>({ phase: "idle", options: [] });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => setState({ phase: "idle", options: [] }), [text, kind]);
  const ask = async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ phase: "loading", options: [] });
    try {
      const options = await requestCopy(kind, text, brief, controller.signal);
      setState({ phase: "done", options });
    } catch (e) {
      if (controller.signal.aborted) return;
      setState({ phase: "error", options: [], message: e instanceof GenerationError ? e.message : "暫時想不出來，請稍後再試" });
    }
  };
  return (
    <div className="copy-suggest">
      {state.phase !== "done" && (
        <button type="button" className="copy-ask" disabled={!text.trim() || state.phase === "loading"} onClick={() => void ask()}>
          {state.phase === "loading" ? "AI 正在想…" : <><span className="kao" aria-hidden="true">(・∀・)</span> 請 AI 想幾個說法</>}
        </button>
      )}
      {state.phase === "error" && <p className="copy-note bad" role="status">{state.message}</p>}
      {state.phase === "done" && (
        <div className="copy-options" role="group" aria-label="AI 建議的說法">
          <p className="copy-note">挑一個喜歡的就會換上，不喜歡再按還原</p>
          {state.options.map((o) => (
            <button key={o} type="button" onClick={() => { onPick(o); setState({ phase: "idle", options: [] }); }}>
              <span>用這個</span>
              {o}
            </button>
          ))}
          <button type="button" className="copy-dismiss" onClick={() => setState({ phase: "idle", options: [] })}>都不要</button>
        </div>
      )}
    </div>
  );
}
