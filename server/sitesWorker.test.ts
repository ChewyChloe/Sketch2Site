import { describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createSitesAPI, canvasHash, type D1, type SitesEnv } from './sitesWorker';
import { generationFixtures, mockProvider } from '../tests/fixtures/generation';
import { CanvasSchema } from '../src/spec';
const origin = 'https://test.example';
const user = 'test-site-scoped-user';
function db(): D1 {
 const sqlite = new DatabaseSync(':memory:');
 const migration = readdirSync('drizzle').find(p=>p.endsWith('.sql'))!;
 sqlite.exec(readFileSync('drizzle/'+migration,'utf8'));
 return { prepare(sql) { return { bind(...values) { return {
  async run() { const result=sqlite.prepare(sql).run(...values as never[]); return {meta:{changes:Number(result.changes)}}; },
  async first<T>() { return (sqlite.prepare(sql).get(...values as never[]) ?? null) as T|null; },
 }; } }; } };
}
async function setup() {
 const canvas = CanvasSchema.parse(generationFixtures()[0]);
 const database=db();
 const env: SitesEnv={DB:database,SKETCH_SITE_ORIGIN:origin,SKETCH_AI_API_KEY:'test-only-placeholder',SKETCH_AI_OWNER_ID:user,
 SKETCH_AI_ENABLED:'true',SKETCH_AI_MODEL_REVIEWED:'true',SKETCH_AI_PRICING_REVIEWED:'true',
 SKETCH_AI_INPUT_USD_PER_MILLION:'0.1',SKETCH_AI_OUTPUT_USD_PER_MILLION:'0.5',SKETCH_AI_CACHED_INPUT_USD_PER_MILLION:'0.01',
 SKETCH_AI_MAX_CALLS:'1',SKETCH_AI_BUDGET_USD:'0.01',SKETCH_AI_TEST_APPROVED:'true',
 SKETCH_AI_TEST_EXPIRES_AT:new Date(Date.now()+1800000).toISOString(),SKETCH_AI_TEST_CANVAS_SHA256:await canvasHash(canvas)};
 const generate=vi.fn(mockProvider.generate); const factory=vi.fn(()=>({generate})); const api=createSitesAPI(factory);
 const req=(path:string, init:RequestInit={})=>new Request(origin+path,{...init,headers:{'oai-authenticated-user-id':user,...init.headers}});
 const status=()=>api(req('/api/generation/status'),env);
 const post=async (overrides:Record<string,unknown>={},headers:Record<string,string>={})=>{
  const state=await (await status()).json() as {csrfToken?:string};
  return api(req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':state.csrfToken??'0'.repeat(64),...headers},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:canvas,...overrides})}),env);
 };
 return {canvas,env,api,factory,generate,req,status,post,database};
}
describe('Sites paid-test boundary (mock only)',()=>{
 it('reads OPENAI_API_KEY from runtime env and never echoes or logs the mock key',async()=>{
  const marker='SKETCH2SITE_RUNTIME_SECRET_CANARY_4e52';
  const logs:string[]=[];
  const spies=(["log","info","warn","error","debug"] as const).map(method=>vi.spyOn(console,method).mockImplementation((...args)=>{logs.push(args.map(String).join(' '));}));
  try {
   for(const failure of [false,true]) {
    const s=await setup();delete s.env.SKETCH_AI_API_KEY;s.env.OPENAI_API_KEY=marker;
    if(failure)s.generate.mockRejectedValue(new Error('upstream includes '+marker));
    const status=await s.status();expect(await status.text()).not.toContain(marker);
    const response=await s.post();expect(response.status).toBe(failure?502:200);
    expect(await response.text()).not.toContain(marker);
    expect(JSON.stringify([...response.headers])).not.toContain(marker);
    expect(s.factory).toHaveBeenCalledWith(marker,'gpt-6-luna');
    expect(s.generate).toHaveBeenCalledTimes(1);
   }
   expect(logs.some(line=>line.includes(marker))).toBe(false);
  } finally {spies.forEach(spy=>spy.mockRestore());}
 });
 it('keeps AI off with a mock runtime key while billing/test approval is absent',async()=>{
  const s=await setup();delete s.env.SKETCH_AI_API_KEY;s.env.OPENAI_API_KEY='SKETCH2SITE_RUNTIME_SECRET_CANARY_4e52';
  s.env.SKETCH_AI_ENABLED='false';s.env.SKETCH_AI_TEST_APPROVED='false';
  expect((await (await s.status()).json()).configured).toBe(false);
  expect((await s.post()).status).toBe(503);expect(s.factory).not.toHaveBeenCalled();
 });

 it('returns original validated DTO and permanently consumes the slot across cold instances',async()=>{
  const s=await setup(); const r=await s.post(); expect(r.status).toBe(200); expect((await r.json()).mode).toBe('live'); expect(s.generate).toHaveBeenCalledTimes(1);
  const cold=createSitesAPI(s.factory); const r2=await cold(s.req('/api/generation/status'),s.env); expect((await r2.json()).configured).toBe(false);
  expect((await s.post()).status).not.toBe(200); expect(s.generate).toHaveBeenCalledTimes(1);
 });
 it('atomically allows only one concurrent reservation, including different request IDs',async()=>{
  const s=await setup(); const token=(await (await s.status()).json()).csrfToken;
  const send=()=>s.api(s.req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:s.canvas})}),s.env);
  const results=await Promise.all([send(),send(),send()]);expect(results.map(x=>x.status).sort()).toEqual([200,429,429]);expect(s.generate).toHaveBeenCalledTimes(1);
 });
 it.each(['SKETCH_AI_ENABLED','SKETCH_AI_MODEL_REVIEWED','SKETCH_AI_PRICING_REVIEWED','SKETCH_AI_TEST_APPROVED'])('fails closed without %s',async key=>{
  const s=await setup();s.env[key]='false';expect((await s.post()).status).toBe(503);expect(s.factory).not.toHaveBeenCalled();
 });
 it('requires signed-in owner identity, exact origin and CSRF token',async()=>{
  const s=await setup();expect((await s.api(new Request(origin+'/api/generation/status'),s.env)).status).toBe(403);
  expect((await s.api(new Request(origin+'/api/generation/status',{headers:{'oai-authenticated-user-id':'someone-else'}}),s.env)).status).toBe(403);
  for(const headers of ([{origin:'https://evil.example'},{'sec-fetch-site':'cross-site'},{'x-sketch-csrf':'0'.repeat(64)}] as Record<string,string>[])) expect((await s.post({},headers)).status).toBe(403);
  expect(s.factory).not.toHaveBeenCalled();
 });
 it('rejects changed fixture, invalid schema and oversized streaming body before reserving',async()=>{
  const s=await setup();const changed=structuredClone(s.canvas);changed.metadata.name='changed';
  expect((await s.post({canvasSpec:changed})).status).toBe(403);
  expect((await s.post({canvasSpec:{}})).status).toBe(400);
  const token=(await (await s.status()).json()).csrfToken;
  expect((await s.api(s.req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body:' '.repeat(32769)}),s.env)).status).toBe(400);
  expect((await s.post()).status).toBe(200);expect(s.generate).toHaveBeenCalledTimes(1);
 });
 it('does not refund provider failures, invalid output or timeouts',async()=>{
  for(const mode of ['failure','invalid','timeout']) {
   const s=await setup();s.generate.mockImplementation(async (_intent,signal)=>{
    if(mode==='failure')throw Error('upstream-secret-stack');
    if(mode==='invalid')return {layout:{},inputTokens:1,outputTokens:1};
    return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));
   });
   const api=createSitesAPI(s.factory,5);const token=(await (await s.status()).json()).csrfToken;
   const request=s.req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:s.canvas})});
   const r=await api(request,s.env);expect(r.status).toBe(mode==='timeout'?504:502);expect(await r.text()).not.toContain('secret');
   expect((await (await s.status()).json()).configured).toBe(false);expect(s.generate).toHaveBeenCalledTimes(1);
  }
 });
 it('fails closed on absent/failed DB, expired approval, multi-call config and insufficient budget',async()=>{
  for(const change of [{DB:undefined},{SKETCH_AI_TEST_EXPIRES_AT:new Date(0).toISOString()},{SKETCH_AI_MAX_CALLS:'2'},{SKETCH_AI_BUDGET_USD:'0.000001'}]) {
   const s=await setup();Object.assign(s.env,change);expect((await s.post()).status).toBeGreaterThanOrEqual(400);expect(s.factory).not.toHaveBeenCalled();
  }
  const s=await setup();s.env.DB={prepare(){throw Error('private-db-error')}} as D1;
  const r=await s.post();expect(r.status).toBeGreaterThanOrEqual(400);expect(s.factory).not.toHaveBeenCalled();
 });
});
