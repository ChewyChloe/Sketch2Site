import {generationProtocol} from './generationProtocol';
import {it,expect,vi,afterEach} from 'vitest';
import {checkApprovedDraft} from './generationClient';
import {generationFixtures} from './demoFixtures';
afterEach(()=>vi.unstubAllGlobals());
it('free check obtains a fresh token and sends canonical draft only to the free route',async()=>{
 const token='a'.repeat(64), calls:[string,RequestInit|undefined][]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{calls.push([url,init]);return new Response(JSON.stringify(calls.length===1?{csrfToken:token,protocol:generationProtocol}:{code:'DRAFT_APPROVED'}));}));
 await checkApprovedDraft(generationFixtures()[0]);
 expect(calls.map(c=>c[0])).toEqual(['/api/generation/check','/api/generation/check']);
 expect((calls[1][1]?.headers as Record<string,string>)['X-Sketch-CSRF']).toBe(token);
 expect(calls[1][1]?.credentials).toBe('same-origin');
});
it('reports draft mismatch without retrying',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({csrfToken:'a'.repeat(64),protocol:generationProtocol}))).mockResolvedValueOnce(new Response(JSON.stringify({code:'DRAFT_HASH_MISMATCH'}),{status:403}));
 vi.stubGlobal('fetch',fetch);
 await expect(checkApprovedDraft(generationFixtures()[0])).rejects.toMatchObject({code:'DRAFT_HASH_MISMATCH'});
 expect(fetch).toHaveBeenCalledTimes(2);
});
it('rejects a mismatched free preflight without ever posting generation',async()=>{
 const {requestGeneration}=await import('./generationClient');const paths:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{paths.push(url);return new Response(JSON.stringify(paths.length===1?{csrfToken:'a'.repeat(64),protocol:generationProtocol}:{code:'DRAFT_HASH_MISMATCH'}),{status:paths.length===1?200:403});}));
 await expect(requestGeneration(generationFixtures()[0],new AbortController().signal)).rejects.toMatchObject({code:'DRAFT_HASH_MISMATCH'});
 expect(paths).toEqual(['/api/generation/check','/api/generation/check']);
});
it('uses one canonical snapshot for free preflight and generation despite editor changes',async()=>{
 const {requestGeneration}=await import('./generationClient');
 const canvas=generationFixtures()[0],original=JSON.stringify(canvas),bodies:string[]=[];let release!:(r:Response)=>void;
 const status=new Promise<Response>(resolve=>{release=resolve;});let count=0;
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{count++;if(init?.body)bodies.push(init.body);if(count===1)return status;if(count===2)return new Response(JSON.stringify({code:'DRAFT_APPROVED'}));if(count===3)return new Response(JSON.stringify({configured:true,csrfToken:'a'.repeat(64)}));return new Response(JSON.stringify({code:'UNAVAILABLE'}),{status:503});}));
 const pending=requestGeneration(canvas,new AbortController().signal);canvas.metadata.name='changed while awaiting';release(new Response(JSON.stringify({csrfToken:'a'.repeat(64),protocol:generationProtocol})));
 await expect(pending).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(bodies).toHaveLength(2);for(const body of bodies)expect(JSON.stringify(JSON.parse(body).canvasSpec)).toBe(original);
});

it('blocks a stale backend protocol before any draft or generation POST',async()=>{
 const fetch=vi.fn(async()=>new Response(JSON.stringify({csrfToken:'a'.repeat(64)})));vi.stubGlobal('fetch',fetch);
 await expect(checkApprovedDraft(generationFixtures()[0])).rejects.toMatchObject({code:'VERSION_MISMATCH'});expect(fetch).toHaveBeenCalledTimes(1);
});
