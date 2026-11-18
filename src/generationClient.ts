import {generationProtocol} from './generationProtocol';
import {CanvasSchema} from "./spec";
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
  if (import.meta.env.VITE_SITES_FRONTEND_ONLY === "true")
    throw new GenerationError("NOT_CONFIGURED");
  canvasSpec=CanvasSchema.parse(structuredClone(canvasSpec)); // Snapshot before asynchronous status fetch.
  prepareIntent(canvasSpec);
  const draftApproval=await checkApprovedDraft(canvasSpec); // Same immutable snapshot; failure cannot send generation POST.
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
  let config: { configured?: boolean; csrfToken?: string; remainingCalls?:number; busy?:boolean };
  try {
    config = await status.json();
  } catch {
    throw new GenerationError("UNAVAILABLE");
  }
  if (!status.ok) { const code=(config as {code?:unknown}).code; throw new GenerationError(generationCodes.includes(code as never)?code as (typeof generationCodes)[number]:"FORBIDDEN"); }
  if (!config.configured) throw new GenerationError(config.remainingCalls===0?"LIMIT":config.busy?"BUSY":"NOT_CONFIGURED");
  if (!/^[a-f0-9]{64}$/.test(config.csrfToken ?? ""))
    throw new GenerationError("CSRF_INVALID");
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
      body: JSON.stringify({ requestId, canvasSpec:CanvasSchema.parse(canvasSpec),...(draftApproval?{draftApproval}:{}) }),
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

// Owner-only free verification, available while generation is disabled. No token is persisted.
export async function checkApprovedDraft(canvasSpec:CanvasSpec) {
 const status=await fetch('/api/generation/check',{credentials:'same-origin',cache:'no-store'});
 const state=await status.json();
 if(!status.ok)throw new GenerationError(generationCodes.includes(state.code)?state.code:'FORBIDDEN');
 if(state.protocol!==generationProtocol)throw new GenerationError('VERSION_MISMATCH');
 if(!/^[a-f0-9]{64}$/.test(state.csrfToken??''))throw new GenerationError('CSRF_INVALID');
 const response=await fetch('/api/generation/check',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Sketch-CSRF':state.csrfToken},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:CanvasSchema.parse(canvasSpec)})});
 const result=await response.json();
 if(!response.ok||result.code!=='DRAFT_APPROVED')throw new GenerationError(generationCodes.includes(result.code)?result.code:'UNAVAILABLE');
 return typeof result.draftApproval==='string'?result.draftApproval:undefined;
}

export async function loadApprovedDraft():Promise<CanvasSpec>{
 const response=await fetch('/api/generation/approved-draft',{credentials:'same-origin',cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw new GenerationError(generationCodes.includes(data.code)?data.code:'UNAVAILABLE');
 if(data.protocol!==generationProtocol)throw new GenerationError('VERSION_MISMATCH');
 return CanvasSchema.parse(data.canvasSpec);
}
