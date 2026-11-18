import {existsSync} from 'node:fs';
import {writeFile,open,mkdir} from 'node:fs/promises';
import {approvedDraft} from '../server/sitesDraftPolicy';
import {prepareIntent,materialize,verifyPreservation} from '../src/generation';
import {PageSchema} from '../src/pageSpec';
import {openAIProvider,buildLunaRequest,validUsage} from '../server/provider';
import {LUNA_MODEL,reserveLunaMicros,lunaUsageUsd} from '../server/lunaPolicy';
const custom=process.argv.includes('--custom-draft');
const root=custom?'outputs/motion-custom-selftest':'outputs/motion-live-selftest';await mkdir(root,{recursive:true});
if(process.argv.includes('--paid-once')&&existsSync(root+'/paid-once.json')){console.log(JSON.stringify({status:'ALREADY_ATTEMPTED_NO_RETRY'}));process.exit(1);}
const canvas=approvedDraft({SKETCH_AI_DRAFT_POLICY:'portfolio-motion-v1'});
if(custom){const {createNode}=await import('../src/spec');const {createMotion}=await import('../src/motion');canvas.metadata.name='我的動畫網站';canvas.nodes[0].x=200;const node=createNode('card',70,624);node.id='00000000-0000-4000-8000-000000009999';node.effects=[createMotion('fade-in',node.id)];canvas.nodes.push(node);}
const intent=prepareIntent(canvas);
const provider=openAIProvider(process.env.OPENAI_API_KEY??'',LUNA_MODEL);
const report:Record<string,unknown>={scope:'Existing backend Provider through Codex Cloud HTTP Secret; does not impersonate Sites owner or test Sites runtime identity',model:LUNA_MODEL,serviceTier:'default',maxOutputTokens:4096,tools:0,retries:0,requestBytes:Buffer.byteLength(JSON.stringify(buildLunaRequest(intent))),paidCalls:0};
try{
 if(!await provider.modelAvailable!(AbortSignal.timeout(20000)))throw Error('Model not available');
 const inputTokens=await provider.countInputTokens!(intent,AbortSignal.timeout(20000));
 const reserve=reserveLunaMicros(inputTokens);if(reserve>10000)throw Error('Budget limit');
 Object.assign(report,{inputTokens,reservedUsd:reserve/1e6,status:'FREE_PREFLIGHT_PASS'});
 await writeFile(root+'/preflight.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
 if(!process.argv.includes('--paid-once'))process.exit(0);
 // Exclusive durable local journal for this separate CLI integration approval. Never reopen/refund.
 const ledger=await open(root+'/paid-once.json','wx',0o600);
 await ledger.writeFile(JSON.stringify({status:'RESERVED',reservedMicros:reserve,at:new Date().toISOString()}));await ledger.close();
 report.paidCalls=1;
 const result=await provider.generate(intent,AbortSignal.timeout(30000));
 if(!validUsage(result)||result.inputTokens>inputTokens||result.outputTokens>4096)throw Error('Invalid usage');
 const cost=lunaUsageUsd(result);if(cost>reserve/1e6)throw Error('Budget exceeded');
 const page=PageSchema.parse(materialize(canvas,result.layout));verifyPreservation(canvas,page);
 await writeFile(root+'/page.json',JSON.stringify(page,null,2));
 await writeFile(root+'/canvas.json',JSON.stringify(canvas,null,2));
 Object.assign(report,{status:'LIVE_PROVIDER_PASS',usage:{inputTokens:result.inputTokens,outputTokens:result.outputTokens,cachedInputTokens:result.cachedInputTokens??null,reasoningTokens:result.reasoningTokens??null,calculatedCostUsd:cost},pageSpec:'PASS',effectPreservation:'PASS'});
 await writeFile(root+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch{
 report.status=report.paidCalls?'LIVE_FAILED_NO_RETRY':'BLOCKED_BEFORE_PAYMENT';
 report.reason='Sanitized failure; raw provider details suppressed. Do not retry a paid call.';
 await writeFile(root+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=1;
}
