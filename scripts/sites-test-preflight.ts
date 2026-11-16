// Offline metadata only: no env/secret loading, provider invocation or remote token-count request.
import { writeFile, mkdir } from 'node:fs/promises';
import { generationFixtures } from '../src/demoFixtures';
import { CanvasSchema } from '../src/spec';
import { canvasHash } from '../server/sitesWorker';
import { inputTokenBound,systemRules,providerInput } from '../server/provider';
import { motionGenerationContext } from '../server/motionBriefs';
import { prepareIntent,layoutJSONSchema } from '../src/generation';
const canvas=CanvasSchema.parse(generationFixtures()[0]);
const hash=await canvasHash(canvas),intent=prepareIntent(canvas);
const developer=systemRules+'\n'+JSON.stringify(motionGenerationContext([...new Set(intent.canvas.nodes.flatMap(n=>n.effects.map(e=>e.presetId)))]));
const user=JSON.stringify(providerInput(intent)),schema=JSON.stringify(layoutJSONSchema);
const input=inputTokenBound(intent),output=4096;
const bytes=(s:string)=>Buffer.byteLength(s);
const report={status:'BLOCKED',checkedAt:'2026-11-17',fixture:'portfolio',canvasHash:hash,elements:canvas.nodes.length,
 intendedModel:'gpt-6-luna',effectiveModel:'gpt-6-luna (server default; explicit runtime pin absent)',
 measuredInput:{canvasUtf8Bytes:bytes(JSON.stringify(canvas)),developerUtf8Bytes:bytes(developer),userUtf8Bytes:bytes(user),schemaUtf8Bytes:bytes(schema),combinedContentUtf8Bytes:bytes(developer+user+schema)},
 exactInputTokens:null,inputTokenReservation:input,inputReservationIsHardAPILimit:false,maxOutputTokens:output,maxCalls:1,budgetUsd:.01,
 pricing:{unit:'USD per million tokens',service:'Standard',input:.10,cachedInput:.01,cacheWrite30m:.125,cacheWrite12h:.25,output:.50,
 sources:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/prompt-caching','https://developers.openai.com/api/docs/guides/reasoning']},
 estimates:{noCacheWritesUsd:(input*.10+output*.50)/1e6,conservative30mWritesUsd:(input*.125+output*.50)/1e6,alternative12hWritesUsd:(input*.25+output*.50)/1e6,strictMaximumBillVerified:false,
 assumptions:'Exact approved fixture; reservation bounds actual tokens; Standard tier; <=4096 total output/reasoning tokens; no tools; taxes/FX and Sites hosting not included.'},
 backendGaps:['service_tier omitted: auto may inherit Project tier','reservation and usage accounting omit cache-write prices','14,288 is a byte-based heuristic, not exact counted input tokens or a pre-call token hard cap','runtime owner ID/model pin/prices/canvas hash/review settings not configured','Project billing/spend controls and real Worker-to-OpenAI access unverified'],
 extraPaidTools:false,reasoningEffort:'low',reasoningIncludedInOutputCap:true,actualPaidCalls:0,
 activation:'No runtime flags changed. Keep ENABLED and TEST_APPROVED=false. Stop after acceptance and wait for explicit paid approval only after blockers are resolved.'};
await writeFile('docs/SITES_AI_TEST_PROPOSAL.json',JSON.stringify(report,null,2)+'\n');
await mkdir('outputs',{recursive:true});await writeFile('outputs/sites-approved-test-canvas.json',JSON.stringify(canvas,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
