import {it,expect,vi,afterEach} from 'vitest';
import {checkApprovedDraft} from './generationClient';
import {generationFixtures} from './demoFixtures';
afterEach(()=>vi.unstubAllGlobals());
it('free check obtains a fresh token and sends canonical draft only to the free route',async()=>{
 const token='a'.repeat(64), calls:[string,RequestInit|undefined][]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{calls.push([url,init]);return new Response(JSON.stringify(calls.length===1?{csrfToken:token}:{code:'DRAFT_APPROVED'}));}));
 await checkApprovedDraft(generationFixtures()[0]);
 expect(calls.map(c=>c[0])).toEqual(['/api/generation/check','/api/generation/check']);
 expect((calls[1][1]?.headers as Record<string,string>)['X-Sketch-CSRF']).toBe(token);
 expect(calls[1][1]?.credentials).toBe('same-origin');
});
it('reports draft mismatch without retrying',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({csrfToken:'a'.repeat(64)}))).mockResolvedValueOnce(new Response(JSON.stringify({code:'DRAFT_HASH_MISMATCH'}),{status:403}));
 vi.stubGlobal('fetch',fetch);
 await expect(checkApprovedDraft(generationFixtures()[0])).rejects.toMatchObject({code:'DRAFT_HASH_MISMATCH'});
 expect(fetch).toHaveBeenCalledTimes(2);
});
it('snapshots generation input before awaiting status so later editor changes do not alter sent draft',async()=>{
 const {requestGeneration}=await import('./generationClient');
 const canvas=generationFixtures()[0], original=JSON.stringify(canvas);let release!:(r:Response)=>void;
 const status=new Promise<Response>(resolve=>{release=resolve;});let body='';
 vi.stubGlobal('fetch',vi.fn().mockImplementationOnce(()=>status).mockImplementationOnce(async(_u,init)=>{body=init.body;return new Response(JSON.stringify({code:'DRAFT_HASH_MISMATCH'}),{status:403});}));
 const pending=requestGeneration(canvas,new AbortController().signal);canvas.metadata.name='changed while awaiting';
 release(new Response(JSON.stringify({configured:true,csrfToken:'a'.repeat(64)})));
 await expect(pending).rejects.toMatchObject({code:'DRAFT_HASH_MISMATCH'});
 expect(JSON.stringify(JSON.parse(body).canvasSpec)).toBe(original);
});
