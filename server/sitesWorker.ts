import {generationProtocol} from '../src/generationProtocol';
import {approvedDraft,approvalBase,paidSlot,paidSlots,motionApproved,ownerDraftApproved} from './sitesDraftPolicy';
import { z } from 'zod';
import { CanvasSchema } from '../src/spec';
import { GenerationError, prepareIntent, materialize, type GenerationCode } from '../src/generation';
import { configFromEnv } from './config';
import { openAIProvider, validUsage, type LayoutProvider } from './provider';
import {LUNA_MODEL,LUNA_RATES,LUNA_MAX_OUTPUT_TOKENS,lunaUsageUsd} from './lunaPolicy';
import {authenticatedOwner,type SitesEnv} from './sitesIdentity';
import {exactInputProof} from './sitesPreflight';
import {authConfigFrom,handleAuth} from './auth';
export type {D1,SitesEnv} from './sitesIdentity';

const schema = z.object({ requestId: z.string().uuid(), canvasSpec: CanvasSchema, draftApproval:z.string().max(100).optional() }).strict();
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
export const canvasHash = async (canvas: unknown) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(CanvasSchema.parse(canvas)))));
const fail = (code: GenerationCode, status = 403) => json({ code }, status);
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" } });
}
async function sign(key:string,message:string) {
  const secret = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', secret, encoder.encode(message)));
}
async function csrf(key:string,user:string,origin:string,day:number){return sign(key,`sketch-csrf-v1:${user}:${origin}:${day}`);}
async function draftApproval(key:string,user:string,origin:string,hash:string,expires:number){return `${expires}.${await sign(key,`sketch-draft-v1:${user}:${origin}:${hash}:${expires}`)}`;}
async function validDraftApproval(token:string|undefined,key:string,user:string,origin:string,hash:string){
 if(!token||!/^\d{13}\.[a-f0-9]{64}$/.test(token))return false;
 const expiry=Number(token.split('.')[0]),now=Date.now();if(expiry<=now||expiry-now>600000)return false;
 const expected=await draftApproval(key,user,origin,hash,expiry);let delta=0;for(let i=0;i<expected.length;i++)delta|=expected.charCodeAt(i)^token.charCodeAt(i);return delta===0;
}
async function quotaState(env:SitesEnv){
 const slots=paidSlots(env),rows=await Promise.all(slots.map(id=>env.DB!.prepare('SELECT id,outcome FROM sketch_ai_single_test WHERE id = ?').bind(id).first<{id:string;outcome:string}>()));
 return {slots,remaining:rows.filter(r=>!r).length,active:rows.some(r=>r?.outcome==='RESERVED'),available:slots.find((_,i)=>!rows[i])};
}
function config(env: SitesEnv, now: number) {
  const strings:NodeJS.ProcessEnv={};
  for(const [key,value] of Object.entries(env))if(typeof value==='string')strings[key]=value;
  delete strings.SKETCH_AI_API_KEY; // Sites uses only the configured OPENAI_API_KEY runtime Secret.
  const c = configFromEnv(strings);
  const expires = Date.parse(String(env.SKETCH_AI_TEST_EXPIRES_AT ?? ''));
  const ready = c.enabled && c.model===LUNA_MODEL && c.maxCalls === paidSlots(env).length && c.budgetUsd >= .002048 && c.budgetUsd <= .01 && !!env.DB &&
    c.inputRate===LUNA_RATES.input && c.outputRate===LUNA_RATES.output && c.cachedInputRate===LUNA_RATES.cachedInput &&
    Number(env.SKETCH_AI_CACHE_WRITE_USD_PER_MILLION)===LUNA_RATES.cacheWrite30m &&
    env.SKETCH_AI_BILLING_CONFIRMED === 'true' &&
    env.SKETCH_AI_TEST_APPROVED === 'true' &&
    /^[a-f0-9]{64}$/.test(String(env.SKETCH_AI_TEST_CANVAS_SHA256 ?? '')) &&
    Number.isFinite(expires) && expires > now && expires - now <= 3600000;
  return { ...c, ready };
}
async function readBody(request: Request) {
  if (request.headers.get('content-type') !== 'application/json' || Number(request.headers.get('content-length') ?? 0) > 32768) throw new GenerationError('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new GenerationError('INVALID_INPUT');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32768) { await reader.cancel(); throw new GenerationError('INVALID_INPUT'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return schema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}
export function createSitesAPI(providerFactory: (key: string, model: string) => LayoutProvider = openAIProvider, timeoutMs = 30000, { authenticate = authenticatedOwner, pages = false } = {}) {
  return async function handle(request: Request, env: SitesEnv): Promise<Response> {
    const url = new URL(request.url), now = Date.now();
    // Google sign-in is open to every visitor (not only the owner); POSTs must come from this site.
    if (url.pathname.startsWith('/api/auth/')) {
      const sameOrigin = url.origin === env.SKETCH_SITE_ORIGIN && request.headers.get('origin') === url.origin && request.headers.get('sec-fetch-site') !== 'cross-site';
      return (await handleAuth(request, authConfigFrom(env), { sameOrigin, clientKey: request.headers.get('cf-connecting-ip') ?? 'anon' }))!;
    }
    // Dispatch authenticates these headers. Never trust them on an independently public Worker URL.
    const user = await authenticate(request,env);
    if (!user) return fail('OWNER_REQUIRED');
    if (url.origin !== env.SKETCH_SITE_ORIGIN || request.headers.get('sec-fetch-site') === 'cross-site') return fail('ORIGIN_INVALID');
    if (request.headers.has('origin') && request.headers.get('origin') !== url.origin) return fail('ORIGIN_INVALID');
    // Pages uses the existing one-call slot. A draft policy cannot select a fresh ledger.
    if (pages && env.SKETCH_AI_DRAFT_POLICY) return fail('NOT_CONFIGURED', 503);
    const c = config(env, now);
    let slot=paidSlot(env);
    const day = Math.floor(now / 86400000);
    const readinessOnly = url.pathname === '/api/generation/ready';
    if (request.method === 'GET' && (readinessOnly || url.pathname === '/api/generation/status')) {
      if (!c.ready) return json({ configured: false });
      try {
        const q=await quotaState(env);const available=!!q.available&&!q.active;
        if (readinessOnly) return json({ configured: available });
        return json({configured:available,remainingCalls:q.remaining,busy:q.active,csrfToken:available?await csrf(c.apiKey!,user,url.origin,day):undefined});
      } catch { return fail('NOT_CONFIGURED', 503); }
    }
    if (request.method === 'GET' && url.pathname === '/api/generation/approved-draft') {
      const canvas=approvedDraft(env);
      if(await canvasHash(approvalBase(canvas,env))!==env.SKETCH_AI_TEST_CANVAS_SHA256)return fail('NOT_CONFIGURED',503);
      return json({canvasSpec:canvas,protocol:generationProtocol}); // Fixed sample only, never caller data or credentials.
    }
    if (request.method === 'GET' && url.pathname === '/api/generation/check') {
      if (!c.apiKey) return fail('NOT_CONFIGURED',503);
      return json({csrfToken:await csrf(c.apiKey,user,url.origin,day),protocol:generationProtocol});
    }
    const checkOnly=url.pathname === '/api/generation/check';
    if (request.method !== 'POST' || (!checkOnly && url.pathname !== '/api/generation')) return fail('UNAVAILABLE', 404);
    if (request.headers.get('origin') !== url.origin) return fail('ORIGIN_INVALID');
    if (((pages || !checkOnly) && !c.ready) || !c.apiKey) return fail('NOT_CONFIGURED', 503);
    const token = request.headers.get('x-sketch-csrf') ?? '';
    if (!/^[a-f0-9]{64}$/.test(token)) return fail('CSRF_INVALID');
    const matches = await Promise.all([day, day - 1].map(async d => {
      const expected = await csrf(c.apiKey!, user, url.origin, d);
      let difference = 0; for (let i = 0; i < 64; i++) difference |= expected.charCodeAt(i) ^ token.charCodeAt(i);
      return difference === 0;
    }));
    if (!matches.some(Boolean)) return fail('CSRF_INVALID');
    let payload: z.infer<typeof schema>;
    try { payload = await readBody(request); prepareIntent(payload.canvasSpec); }
    catch { return fail('INVALID_INPUT', 400); }
    const hash = await canvasHash(payload.canvasSpec);
    if (!ownerDraftApproved(env)&&await canvasHash(approvalBase(payload.canvasSpec,env)) !== env.SKETCH_AI_TEST_CANVAS_SHA256) return fail('DRAFT_HASH_MISMATCH');
    if(ownerDraftApproved(env)&&!checkOnly&&!await validDraftApproval(payload.draftApproval,c.apiKey!,user,url.origin,hash))return fail('DRAFT_APPROVAL_INVALID');
    if(checkOnly) {
      if(pages || motionApproved(env)) {
        try {
          if (pages) {
            const q = await quotaState(env);
            if (q.active) return fail('BUSY', 429);
            if (!q.available) return fail('LIMIT', 429);
          }
          const proof=await exactInputProof(providerFactory(c.apiKey!,LUNA_MODEL),prepareIntent(payload.canvasSpec));
          if(!Number.isFinite(c.budgetUsd)||c.budgetUsd<=0||c.budgetUsd>.01||proof.reservedMicros>Math.floor(c.budgetUsd*1e6))return fail('LIMIT',429);
          await env.DB!.prepare('INSERT INTO sketch_ai_preflight (id,outcome,input_tokens,reserved_micros,checked_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET outcome=excluded.outcome,input_tokens=excluded.input_tokens,reserved_micros=excluded.reserved_micros,checked_at=excluded.checked_at').bind(proof.requestHash,'READY',proof.inputTokens,proof.reservedMicros,Date.now()).run();
        }catch{return fail('NOT_CONFIGURED',503);}
      }
      return json({code:'DRAFT_APPROVED',schemaVersion:1,...(ownerDraftApproved(env)?{draftApproval:await draftApproval(c.apiKey!,user,url.origin,hash,Date.now()+600000)}:{})}); // Signed exact owner draft, no generation or paid-quota access.
    }
    const intent=prepareIntent(payload.canvasSpec);
    let provider:LayoutProvider, inputBound:number, reservedMicros:number;
    try {
      // Reject exact replays before even the free count request.
      const q=await quotaState(env);if(q.active)return fail('BUSY',429);if(!q.available)return fail('LIMIT',429);slot=q.available;
      if(await env.DB!.prepare('SELECT id FROM sketch_ai_single_test WHERE request_id = ?').bind(payload.requestId).first())return fail('DUPLICATE',409);
      provider=providerFactory(c.apiKey!,LUNA_MODEL);
      const proof=await exactInputProof(provider,intent);
      inputBound=proof.inputTokens;reservedMicros=proof.reservedMicros;
      const checked=await env.DB!.prepare('SELECT outcome,input_tokens,reserved_micros FROM sketch_ai_preflight WHERE id = ?').bind(proof.requestHash).first<{outcome:string;input_tokens:number;reserved_micros:number}>();
      if(!checked||checked.outcome!=='READY'||checked.input_tokens!==inputBound||checked.reserved_micros!==reservedMicros)return fail('NOT_CONFIGURED',503);
      if(!config(env,Date.now()).ready)return fail('NOT_CONFIGURED',503);
    }catch{return fail('LIMIT',429);}
    if(reservedMicros>Math.floor(c.budgetUsd*1e6))return fail('LIMIT',429);
    try {
      const slots=paidSlots(env);
      const claimed = await env.DB!.prepare(`INSERT INTO sketch_ai_single_test (id, request_id, user_id, canvas_hash, reserved_micros, started_at, outcome) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM sketch_ai_single_test WHERE request_id = ?) AND NOT EXISTS (SELECT 1 FROM sketch_ai_single_test WHERE id IN (${slots.map(()=>'?').join(',')}) AND outcome = 'RESERVED') ON CONFLICT(id) DO NOTHING`)
        .bind(slot,payload.requestId,user,hash,reservedMicros,now,'RESERVED',payload.requestId,...slots).run();
      if (claimed.meta.changes !== 1) return fail('LIMIT', 429);
    } catch { return fail('UNAVAILABLE', 503); } // Uncertain reservation never calls Provider.
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    let outcome = 'UNAVAILABLE';
    try {
      const task = provider.generate(intent, controller.signal);
      const result = await Promise.race([task, new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new GenerationError('TIMEOUT')); }, timeoutMs);
      })]);
      if (!validUsage(result) || result.inputTokens > inputBound || result.outputTokens > 4096) throw new GenerationError('INVALID_OUTPUT');
      const page = materialize(payload.canvasSpec, result.layout);
      const estimatedCostUsd=lunaUsageUsd(result);
      if(estimatedCostUsd>reservedMicros/1e6)throw new GenerationError("INVALID_OUTPUT");
      outcome = 'PASS';
      return json({ requestId: payload.requestId, page, mode: 'live', usage: {
        inputTokens: result.inputTokens, outputTokens: result.outputTokens,
        cachedInputTokens: result.cachedInputTokens ?? null, reasoningTokens: result.reasoningTokens ?? null,
        latencyMs: Date.now() - started,
        estimatedCostUsd,
      } });
    } catch (error) {
      outcome = error instanceof GenerationError ? error.code : 'UNAVAILABLE';
      return fail(outcome as GenerationCode, outcome === 'TIMEOUT' ? 504 : 502);
    } finally {
      if (timer) clearTimeout(timer);
      // Never refund or reopen the slot, including timeouts and failed/uncertain provider calls.
      try { await env.DB!.prepare('UPDATE sketch_ai_single_test SET outcome = ? WHERE id = ? AND request_id = ?').bind(outcome, slot, payload.requestId).run(); } catch { /* RESERVED remains permanently consumed. */ }
    }
  };
}
export default createSitesAPI();
