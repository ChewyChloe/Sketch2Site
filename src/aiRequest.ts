import { GenerationError, generationCodes } from "./generation";

/** One signed-in POST to the generation API (status → CSRF token → request); never retried. */
export async function aiPost<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  if (import.meta.env.VITE_SITES_FRONTEND_ONLY === "true") throw new GenerationError("NOT_CONFIGURED");
  let config: { configured?: boolean; csrfToken?: string };
  try {
    config = await (await fetch("/api/generation/status", { signal, credentials: "same-origin", cache: "no-store" })).json();
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  if (!config.configured) throw new GenerationError("NOT_CONFIGURED");
  if (!/^[a-f0-9]{64}$/.test(config.csrfToken ?? "")) throw new GenerationError("CSRF_INVALID");
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST", credentials: "same-origin", signal,
      headers: { "Content-Type": "application/json", "X-Sketch-CSRF": config.csrfToken! },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  let data: Record<string, unknown>;
  try { data = await response.json(); } catch { throw new GenerationError("INVALID_OUTPUT"); }
  if (!response.ok) throw new GenerationError(generationCodes.includes(data.code as never) ? (data.code as (typeof generationCodes)[number]) : "UNAVAILABLE");
  if ("requestId" in body && data.requestId !== body.requestId) throw new GenerationError("INVALID_OUTPUT");
  return data as T;
}
