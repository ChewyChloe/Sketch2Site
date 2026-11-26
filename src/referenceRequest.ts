import { GenerationError, generationCodes } from "./generation";
import { ReferenceStyleSchema, type ReferenceStyle } from "./referenceStyle";

/** Asks the AI what a reference picture's style is; only fixed choices come back. */
export async function requestReferenceStyle(image: string, signal?: AbortSignal): Promise<ReferenceStyle> {
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
    response = await fetch("/api/generation/reference", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json", "X-Sketch-CSRF": config.csrfToken! },
      body: JSON.stringify({ requestId, image }),
    });
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  let data: { requestId?: unknown; style?: unknown; code?: unknown };
  try {
    data = await response.json();
  } catch {
    throw new GenerationError("INVALID_OUTPUT");
  }
  if (!response.ok) throw new GenerationError(generationCodes.includes(data.code as never) ? (data.code as (typeof generationCodes)[number]) : "UNAVAILABLE");
  const style = ReferenceStyleSchema.safeParse(data.style);
  if (!style.success || data.requestId !== requestId) throw new GenerationError("INVALID_OUTPUT");
  return style.data;
}
