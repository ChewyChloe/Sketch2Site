import { z } from 'zod';
import { CanvasSchema } from '../src/spec';
import { GenerationError, prepareIntent, materialize, type GenerationCode } from '../src/generation';
import { configFromEnv } from './config';
import { openAIProvider, validUsage, type LayoutProvider } from './provider';
import {LUNA_MODEL,LUNA_RATES,LUNA_MAX_OUTPUT_TOKENS,lunaUsageUsd} from './lunaPolicy';
import {authenticatedOwner,type SitesEnv} from './sitesIdentity';
import {exactInputProof} from './sitesPreflight';
export type {D1,SitesEnv} from './sitesIdentity';

const slot = 'sites-ai-single-test-v1'; // Permanent across isolates, versions and deployments.
const schema = z.object({ requestId: z.string().uuid(), canvasSpec: CanvasSchema }).strict();
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
export const canvasHash = async (canvas: unknown) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(canvas))));
const fail = (code: GenerationCode, status = 403) => json({ code }, status);
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" } });
}
async function csrf(key: string, user: string, origin: string, day: number) {
  const secret = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', secret, encoder.encode(`sketch-csrf-v1:${user}:${origin}:${day}`)));
}
function config(env: SitesEnv, now: number) {
  const strings:NodeJS.ProcessEnv={};
  for(const [key,value] of Object.entries(env))if(typeof value==='string')strings[key]=value;
  delete strings.SKETCH_AI_API_KEY; // Sites uses only the configured OPENAI_API_KEY runtime Secret.
  const c = configFromEnv(strings);
  const expires = Date.parse(String(env.SKETCH_AI_TEST_EXPIRES_AT ?? ''));
  const ready = c.enabled && c.model===LUNA_MODEL && c.maxCalls === 1 && c.budgetUsd >= .002048 && c.budgetUsd <= .01 && !!env.DB &&
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
export function createSitesAPI(providerFactory: (key: string, model: string) => LayoutProvider = openAIProvider, timeoutMs = 30000) {
  return async function handle(request: Request, env: SitesEnv): Promise<Response> {
    const url = new URL(request.url), now = Date.now();
    // Dispatch authenticates these headers. Never trust them on an independently public Worker URL.
    const user = await authenticatedOwner(request,env);
    if (!user || url.origin !== env.SKETCH_SITE_ORIGIN || request.headers.get('sec-fetch-site') === 'cross-site') return fail('FORBIDDEN');
    if (request.headers.has('origin') && request.headers.get('origin') !== url.origin) return fail('FORBIDDEN');
    const c = config(env, now);
    const day = Math.floor(now / 86400000);
    if (request.method === 'GET' && url.pathname === '/api/generation/status') {
      if (!c.ready) return json({ configured: false });
      try {
        const used = await env.DB!.prepare('SELECT id FROM sketch_ai_single_test WHERE id = ?').bind(slot).first();
        return json({ configured: !used, csrfToken: used ? undefined : await csrf(c.apiKey!, user, url.origin, day) });
      } catch { return fail('NOT_CONFIGURED', 503); }
    }
    if (request.method !== 'POST' || url.pathname !== '/api/generation') return fail('UNAVAILABLE', 404);
    if (request.headers.get('origin') !== url.origin) return fail('FORBIDDEN');
    if (!c.ready) return fail('NOT_CONFIGURED', 503);
    const token = request.headers.get('x-sketch-csrf') ?? '';
    if (!/^[a-f0-9]{64}$/.test(token)) return fail('FORBIDDEN');
    const matches = await Promise.all([day, day - 1].map(async d => {
      const expected = await csrf(c.apiKey!, user, url.origin, d);
      let difference = 0; for (let i = 0; i < 64; i++) difference |= expected.charCodeAt(i) ^ token.charCodeAt(i);
      return difference === 0;
    }));
    if (!matches.some(Boolean)) return fail('FORBIDDEN');
    let payload: z.infer<typeof schema>;
    try { payload = await readBody(request); prepareIntent(payload.canvasSpec); }
    catch { return fail('INVALID_INPUT', 400); }
    const hash = await canvasHash(payload.canvasSpec);
    if (hash !== env.SKETCH_AI_TEST_CANVAS_SHA256) return fail('FORBIDDEN');
    const intent=prepareIntent(payload.canvasSpec);
    let provider:LayoutProvider, inputBound:number, reservedMicros:number;
    try {
      // Reject exact replays before even the free count request.
      if(await env.DB!.prepare('SELECT id FROM sketch_ai_single_test WHERE id = ?').bind(slot).first())return fail('LIMIT',429);
      provider=providerFactory(c.apiKey!,LUNA_MODEL);
      const proof=await exactInputProof(provider,intent);
      inputBound=proof.inputTokens;reservedMicros=proof.reservedMicros;
      const checked=await env.DB!.prepare('SELECT outcome,input_tokens,reserved_micros FROM sketch_ai_preflight WHERE id = ?').bind(proof.requestHash).first<{outcome:string;input_tokens:number;reserved_micros:number}>();
      if(!checked||checked.outcome!=='READY'||checked.input_tokens!==inputBound||checked.reserved_micros!==reservedMicros)return fail('NOT_CONFIGURED',503);
      if(!config(env,Date.now()).ready)return fail('NOT_CONFIGURED',503);
    }catch{return fail('LIMIT',429);}
    if(reservedMicros>Math.floor(c.budgetUsd*1e6))return fail('LIMIT',429);
    try {
      const claimed = await env.DB!.prepare('INSERT INTO sketch_ai_single_test (id, request_id, user_id, canvas_hash, reserved_micros, started_at, outcome) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
        .bind(slot, payload.requestId, user, hash, reservedMicros, now, 'RESERVED').run();
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
