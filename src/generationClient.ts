import {
  GenerationError,
  GenerationResponseSchema,
  prepareIntent,
  generationCodes,
  verifyPreservation,
} from "./generation";
import type { CanvasSpec } from "./spec";
export async function requestGeneration(
  canvasSpec: CanvasSpec,
  signal: AbortSignal,
) {
  prepareIntent(canvasSpec);
  let status: Response;
  try {
    status = await fetch("/api/generation/status", {
      signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  let config: { configured?: boolean; csrfToken?: string };
  try {
    config = await status.json();
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  if (!status.ok) throw new GenerationError("FORBIDDEN");
  if (!config.configured) throw new GenerationError("NOT_CONFIGURED");
  if (!/^[a-f0-9]{64}$/.test(config.csrfToken ?? ""))
    throw new GenerationError("FORBIDDEN");
  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch("/api/generation", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Sketch-CSRF": config.csrfToken!,
      },
      body: JSON.stringify({ requestId, canvasSpec }),
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
    throw new GenerationError(
      generationCodes.includes(code as never)
        ? (code as (typeof generationCodes)[number])
        : "UNAVAILABLE",
    );
  }
  const result = GenerationResponseSchema.safeParse(data);
  if (!result.success || result.data.requestId !== requestId)
    throw new GenerationError("INVALID_OUTPUT");
  verifyPreservation(canvasSpec, result.data.page);
  return result.data;
}
