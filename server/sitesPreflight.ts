import {GenerationError,prepareIntent} from '../src/generation';
import {generationFixtures} from '../src/demoFixtures';
import {CanvasSchema} from '../src/spec';
import {buildLunaRequest,openAIProvider,type LayoutProvider,type Intent} from './provider';
import {LUNA_MODEL,reserveLunaMicros} from './lunaPolicy';
import {authenticatedOwner,type SitesEnv} from './sitesIdentity';
export async function sha256(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function exactInputProof(provider:LayoutProvider,intent:Intent){
 if(!provider.countInputTokens)throw new GenerationError('NOT_CONFIGURED');
 const inputTokens=await provider.countInputTokens(intent,AbortSignal.timeout(20000));
 return {inputTokens,reservedMicros:reserveLunaMicros(inputTokens),requestHash:await sha256(JSON.stringify(buildLunaRequest(intent)))};
}
// Free, read-only OpenAI endpoints only. It can run while both generation switches are false.
// Called on a signed-in owner page load; never accepts an owner ID or model from the browser.
export async function warmOwnerPreflight(request:Request,env:SitesEnv,factory:(key:string,model:string)=>LayoutProvider=openAIProvider){
 if(new URL(request.url).origin!==env.SKETCH_SITE_ORIGIN||request.headers.get('sec-fetch-site')==='cross-site')return;
 if(!await authenticatedOwner(request,env))return;
 const key=typeof env.OPENAI_API_KEY==='string'?env.OPENAI_API_KEY:'';
 if(!key||!env.DB)return;
 const canvas=CanvasSchema.parse(generationFixtures()[0]);
 if(await sha256(JSON.stringify(canvas))!==env.SKETCH_AI_TEST_CANVAS_SHA256)return;
 const intent=prepareIntent(canvas),id=await sha256(JSON.stringify(buildLunaRequest(intent)));
 let claimed=false;
 try {
  const r=await env.DB.prepare('INSERT INTO sketch_ai_preflight (id,outcome,checked_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,'PENDING',Date.now()).run();
  if(r.meta.changes!==1)return; // No automatic polling or retry loop.
  claimed=true;
  const provider=factory(key,LUNA_MODEL);
  if(!provider.modelAvailable||!await provider.modelAvailable(AbortSignal.timeout(20000)))throw new GenerationError('NOT_CONFIGURED');
  const proof=await exactInputProof(provider,intent);
  await env.DB.prepare('UPDATE sketch_ai_preflight SET outcome = ?,input_tokens = ?,reserved_micros = ?,checked_at = ? WHERE id = ?').bind('READY',proof.inputTokens,proof.reservedMicros,Date.now(),id).run();
 }catch{
  if(claimed)try{await env.DB.prepare('UPDATE sketch_ai_preflight SET outcome = ?,checked_at = ? WHERE id = ?').bind('FAILED',Date.now(),id).run();}catch{/* Fail closed; no credentials or upstream error logging. */}
 }
}
