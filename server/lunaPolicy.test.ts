import {it,expect,vi} from 'vitest';
import {prepareIntent} from '../src/generation';
import {generationFixtures,mockLayout} from '../tests/fixtures/generation';
import {buildLunaRequest,openAIProvider} from './provider';
import {LUNA_MODEL} from './lunaPolicy';
const intent=()=>prepareIntent(generationFixtures()[0]);
it('pins Luna/Standard/30m/no tools and counts the exact generation input and strict schema',async()=>{
 const calls:{url:string;body:Record<string,unknown>}[]=[];
 const provider=openAIProvider('synthetic-policy-key',LUNA_MODEL,async(url,init)=>{
  const body=JSON.parse(String(init?.body));calls.push({url:String(url),body});
  if(String(url).endsWith('/input_tokens'))return Response.json({object:'response.input_tokens',input_tokens:1791});
  return Response.json({id:'resp_mock',object:'response',status:'completed',service_tier:'default',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mockLayout(intent()))}]}],output_text:JSON.stringify(mockLayout(intent())),usage:{input_tokens:1791,output_tokens:600,input_tokens_details:{cached_tokens:100,cache_write_tokens:300,cache_write_tokens_details:{ttl_30m_tokens:300,ttl_12h_tokens:0}},output_tokens_details:{reasoning_tokens:50}}});
 });
 expect(await provider.countInputTokens!(intent(),new AbortController().signal)).toBe(1791);
 const generated=await provider.generate(intent(),new AbortController().signal);
 const r=buildLunaRequest(intent());
 expect(calls[0].url).toBe('https://api.openai.com/v1/responses/input_tokens');
 for(const key of ['model','input','text','reasoning','tools','tool_choice','parallel_tool_calls'])expect(calls[0].body[key]).toEqual(calls[1].body[key]);
 expect(calls[1].body).toMatchObject({model:LUNA_MODEL,service_tier:'default',max_output_tokens:4096,tools:[],tool_choice:'none',parallel_tool_calls:false,prompt_cache_options:{mode:'implicit',ttl:'30m'}});
 expect(generated).toMatchObject({cacheWrite30mTokens:300,cacheWrite12hTokens:0,reasoningTokens:50});
 expect(JSON.stringify(r)).not.toContain('synthetic-policy-key');
});
it('refuses a non-Luna provider before any SDK request',()=>{
 const fetcher=vi.fn();expect(()=>openAIProvider('synthetic-policy-key','gpt-6.1-sol',fetcher)).toThrow();expect(fetcher).not.toHaveBeenCalled();
});
it('refuses oversized complete requests before the free counter or generator',async()=>{
 const tooLarge=intent();tooLarge.canvas.metadata.name='x'.repeat(20000);
 const fetcher=vi.fn(),p=openAIProvider('synthetic-policy-key',LUNA_MODEL,fetcher);
 await expect(p.countInputTokens!(tooLarge,new AbortController().signal)).rejects.toThrow();
 await expect(p.generate(tooLarge,new AbortController().signal)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
it.each([0,8193,1.5])('rejects an unusable exact API count %s',async input_tokens=>{
 const fetcher=vi.fn(async()=>Response.json({object:'response.input_tokens',input_tokens}));
 const p=openAIProvider('synthetic-policy-key',LUNA_MODEL,fetcher);
 await expect(p.countInputTokens!(intent(),new AbortController().signal)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
});
it('free access check calls only the fixed model metadata endpoint',async()=>{
 const urls:string[]=[];const p=openAIProvider('synthetic-policy-key',LUNA_MODEL,async(url)=>{urls.push(String(url));return Response.json({id:LUNA_MODEL,object:'model'});});
 expect(await p.modelAvailable!(new AbortController().signal)).toBe(true);expect(urls).toEqual(['https://api.openai.com/v1/models/gpt-6-luna']);
});
