import { describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSitesAPI, canvasHash, type D1, type SitesEnv } from './sitesWorker';
import { generationFixtures, mockProvider } from '../tests/fixtures/generation';
import { CanvasSchema } from '../src/spec';
import {warmOwnerPreflight} from './sitesPreflight';
import {LUNA_MAX_INPUT_TOKENS,LUNA_MAX_OUTPUT_TOKENS,reserveLunaMicros,lunaUsageUsd} from './lunaPolicy';
import {authenticatedOwner} from './sitesIdentity';
const origin = 'https://test.example';
const user = 'test-site-scoped-user';
function db(sqlite = new DatabaseSync(':memory:'), migrate = true): D1 {
 const migrations = readdirSync('drizzle').filter(p=>p.endsWith('.sql')).sort();
 if (migrate) for(const migration of migrations)sqlite.exec(readFileSync('drizzle/'+migration,'utf8'));
 return { prepare(sql) { return { bind(...values) { return {
  async run() { const result=sqlite.prepare(sql).run(...values as never[]); return {meta:{changes:Number(result.changes)}}; },
  async first<T>() { return (sqlite.prepare(sql).get(...values as never[]) ?? null) as T|null; },
 }; } }; } };
}
async function setup() {
 const canvas = CanvasSchema.parse(generationFixtures()[0]);
 const database=db();
 const env: SitesEnv={DB:database,SKETCH_SITE_ORIGIN:origin,OPENAI_API_KEY:'test-only-placeholder',SKETCH_AI_API_KEY:'test-only-placeholder',SKETCH_AI_OWNER_EMAIL:'owner@sites.test',SKETCH_AI_BILLING_CONFIRMED:'true',SKETCH_AI_CACHE_WRITE_USD_PER_MILLION:'0.125',
 SKETCH_AI_ENABLED:'true',SKETCH_AI_MODEL_REVIEWED:'true',SKETCH_AI_PRICING_REVIEWED:'true',
 SKETCH_AI_INPUT_USD_PER_MILLION:'0.1',SKETCH_AI_OUTPUT_USD_PER_MILLION:'0.5',SKETCH_AI_CACHED_INPUT_USD_PER_MILLION:'0.01',
 SKETCH_AI_MAX_CALLS:'1',SKETCH_AI_BUDGET_USD:'0.01',SKETCH_AI_TEST_APPROVED:'true',
 SKETCH_AI_TEST_EXPIRES_AT:new Date(Date.now()+1800000).toISOString(),SKETCH_AI_TEST_CANVAS_SHA256:await canvasHash(canvas)};
 const generate=vi.fn(mockProvider.generate); const factory=vi.fn(()=>({generate,countInputTokens:vi.fn(async()=>2000),modelAvailable:vi.fn(async()=>true)})); const api=createSitesAPI(factory);
 const req=(path:string, init:RequestInit={})=>new Request(origin+path,{...init,headers:{'oai-authenticated-user-id':user,'oai-authenticated-user-email':'owner@sites.test',...init.headers}});
 const status=()=>api(req('/api/generation/status'),env);
 const post=async (overrides:Record<string,unknown>={},headers:Record<string,string>={})=>{
  const state=await (await status()).json() as {csrfToken?:string};
  return api(req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':state.csrfToken??'0'.repeat(64),...headers},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:canvas,...overrides})}),env);
 };
 await warmOwnerPreflight(req('/'),env,factory);factory.mockClear();generate.mockClear();
 return {canvas,env,api,factory,generate,req,status,post,database};
}
describe('Sites paid-test boundary (mock only)',()=>{
 it('rejects model/tier/tool/owner overrides from the browser before Provider construction',async()=>{
  const s=await setup();for(const override of [{model:'gpt-6.1-sol'},{service_tier:'priority'},{tools:[{type:'web_search'}]},{ownerId:user}])expect((await s.post(override)).status).toBe(400);
  expect(s.factory).not.toHaveBeenCalled();
 });
 it('refuses unknown counts and counts over the hard limit before consuming any paid slot',async()=>{
  for(const count of [undefined,0,8193,NaN,Infinity]){
   const s=await setup();const provider={generate:s.generate,countInputTokens:count===undefined?undefined:async()=>count};
   const api=createSitesAPI(()=>provider);const token=(await (await s.status()).json()).csrfToken;
   const r=await api(s.req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:s.canvas})}),s.env);
   expect(r.status).toBe(429);expect(s.generate).not.toHaveBeenCalled();
   expect(await s.database.prepare('SELECT id FROM sketch_ai_single_test WHERE id = ?').bind('sites-ai-single-test-v1').first()).toBe(null);
  }
 });
 it('will not use a cheaper configured price or a different model to bypass the hard budget',async()=>{
  for(const override of [{SKETCH_AI_INPUT_USD_PER_MILLION:'.001'},{SKETCH_AI_CACHE_WRITE_USD_PER_MILLION:'.01'},{SKETCH_AI_MODEL:'gpt-6.1-sol'},{SKETCH_AI_BILLING_CONFIRMED:'false'}]){
   const s=await setup();Object.assign(s.env,override);expect((await s.post()).status).toBe(503);expect(s.factory).not.toHaveBeenCalled();
  }
 });
 it('binds only dispatch-authenticated owner subject, using trusted owner email once and then persistent subject',async()=>{
  const env:SitesEnv={DB:db(),SKETCH_AI_OWNER_EMAIL:'owner@sites.test'};
  const make=(id:string,email:string)=>new Request(origin,{headers:{'oai-authenticated-user-id':id,'oai-authenticated-user-email':email}});
  expect(await authenticatedOwner(make('intruder','intruder@sites.test'),env)).toBe(null);
  expect(await authenticatedOwner(new Request(origin,{method:'POST',body:JSON.stringify({ownerId:user,email:'owner@sites.test'})}),env)).toBe(null);
  expect(await authenticatedOwner(make(user,'owner@sites.test'),env)).toBe(user);
  expect(await authenticatedOwner(make('different-subject','owner@sites.test'),env)).toBe(null);
  expect(await authenticatedOwner(make(user,'changed-display-email@sites.test'),env)).toBe(user);
 });
 it('runs only free model access/count on an authenticated page load while generation is off, once per profile',async()=>{
  const s=await setup();const env:SitesEnv={...s.env,DB:db(),SKETCH_AI_ENABLED:'false',SKETCH_AI_TEST_APPROVED:'false'};
  const count=vi.fn(async()=>1791),available=vi.fn(async()=>true),factory=vi.fn(()=>({generate:s.generate,countInputTokens:count,modelAvailable:available}));
  await warmOwnerPreflight(new Request(origin+'/'),env,factory);expect(factory).not.toHaveBeenCalled();
  await warmOwnerPreflight(s.req('/'),env,factory);await warmOwnerPreflight(s.req('/'),env,factory);
  expect(available).toHaveBeenCalledTimes(1);expect(count).toHaveBeenCalledTimes(1);expect(s.generate).not.toHaveBeenCalled();
  const proof=await env.DB!.prepare('SELECT outcome,input_tokens,reserved_micros FROM sketch_ai_preflight WHERE outcome = ?').bind('READY').first<{input_tokens:number;reserved_micros:number}>();
  expect(proof).toMatchObject({input_tokens:1791,reserved_micros:2272});
 });
 it('reserves the full worst-case cache write cost, never counts reasoning twice, and rejects 12h writes',()=>{
  expect(reserveLunaMicros(1791)).toBe(2272);
  expect(reserveLunaMicros(LUNA_MAX_INPUT_TOKENS)).toBe(3072);
  expect(()=>reserveLunaMicros(8193)).toThrow();
  expect(lunaUsageUsd({inputTokens:1000,outputTokens:100,cachedInputTokens:200,cacheWrite30mTokens:300,cacheWrite12hTokens:0})).toBeCloseTo((500*.1+200*.01+300*.125+100*.5)/1e6);
  expect(lunaUsageUsd({inputTokens:1000,outputTokens:LUNA_MAX_OUTPUT_TOKENS})).toBe((1000*.125+4096*.5)/1e6);
  expect(()=>lunaUsageUsd({inputTokens:1000,outputTokens:100,cacheWrite12hTokens:1})).toThrow();
 });

 it('retains the consumed slot after closing and reopening the database with a new Worker handler',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'sketch-sites-persistent-'));
  let connection:DatabaseSync|undefined=new DatabaseSync(join(dir,'quota.sqlite'));
  try {
   const s=await setup();s.env.DB=db(connection);await warmOwnerPreflight(s.req('/'),s.env,s.factory);s.factory.mockClear();
   const token=(await (await s.status()).json()).csrfToken;
   expect((await s.post()).status).toBe(200);
   connection.close();connection=new DatabaseSync(join(dir,'quota.sqlite'));s.env.DB=db(connection,false);
   const cold=createSitesAPI(s.factory);
   expect((await (await cold(s.req('/api/generation/status'),s.env)).json()).configured).toBe(false);
   const retry=s.req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:s.canvas})});
   expect((await cold(retry,s.env)).status).toBe(429);expect(s.generate).toHaveBeenCalledTimes(1);
  } finally {connection?.close();rmSync(dir,{recursive:true,force:true});}
 });
 it('allows one call across independent SQLite connections and independent Worker handlers, including exact replay',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'sketch-sites-concurrent-'));
  const first=new DatabaseSync(join(dir,'quota.sqlite')),second=new DatabaseSync(join(dir,'quota.sqlite'));
  try {
   const s=await setup(),env1={...s.env,DB:db(first)},env2={...s.env,DB:db(second,false)};
   await warmOwnerPreflight(s.req('/'),env1,s.factory);s.factory.mockClear();
   const a=createSitesAPI(s.factory),b=createSitesAPI(s.factory);
   const token=(await (await a(s.req('/api/generation/status'),env1)).json()).csrfToken;
   const requestId=crypto.randomUUID(),body=JSON.stringify({requestId,canvasSpec:s.canvas});
   const make=()=>s.req('/api/generation',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body});
   const result=await Promise.all([a(make(),env1),b(make(),env2),b(make(),env2)]);
   expect(result.map(r=>r.status).sort()).toEqual([200,429,429]);expect(s.generate).toHaveBeenCalledTimes(1);
  } finally {first.close();second.close();rmSync(dir,{recursive:true,force:true});}
 });

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

 describe('safe free draft diagnostics',()=>{
 it('distinguishes missing/invalid CSRF from changed draft, including with generation off',async()=>{
  const s=await setup();s.env.SKETCH_AI_ENABLED='false';s.env.SKETCH_AI_TEST_APPROVED='false';
  const state=await (await s.api(s.req('/api/generation/check'),s.env)).json();
  const send=(canvas:unknown,token:string)=>s.api(s.req('/api/generation/check',{method:'POST',headers:{origin,'content-type':'application/json','x-sketch-csrf':token},body:JSON.stringify({requestId:crypto.randomUUID(),canvasSpec:canvas})}),s.env);
  for(const token of ['', '0'.repeat(64)]){const r=await send(s.canvas,token);expect(r.status).toBe(403);expect(await r.json()).toEqual({code:'CSRF_INVALID'});}
  const changed=structuredClone(s.canvas);changed.metadata.name+=' changed';
  const mismatch=await send(changed,state.csrfToken);expect(mismatch.status).toBe(403);expect(await mismatch.json()).toEqual({code:'DRAFT_HASH_MISMATCH'});
  const reordered=JSON.parse(JSON.stringify(s.canvas),(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).reverse()):v);
  expect(await (await send(reordered,state.csrfToken)).json()).toEqual({code:'DRAFT_APPROVED',schemaVersion:1});
  expect(s.factory).not.toHaveBeenCalled();
  expect(await s.env.DB!.prepare('SELECT id FROM sketch_ai_single_test WHERE id = ?').bind('sites-ai-single-test-v1').first()).toBeNull();
 });
 it('returns distinct codes on actual generation POST before provider or reservation',async()=>{
  const s=await setup();
  expect(await (await s.post({}, {'x-sketch-csrf':'0'.repeat(64)})).json()).toEqual({code:'CSRF_INVALID'});
  const changed=structuredClone(s.canvas);changed.metadata.name+=' changed';
  expect(await (await s.post({canvasSpec:changed})).json()).toEqual({code:'DRAFT_HASH_MISMATCH'});
  expect(s.factory).not.toHaveBeenCalled();
 });
 });
