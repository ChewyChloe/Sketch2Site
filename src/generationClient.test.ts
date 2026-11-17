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
