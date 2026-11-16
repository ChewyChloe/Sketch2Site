// Offline summary only. Runtime must obtain its own fresh, exact free count before a paid reservation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {generationFixtures} from '../src/demoFixtures';
import {CanvasSchema} from '../src/spec';
import {prepareIntent} from '../src/generation';
import {buildLunaRequest} from '../server/provider';
import {sha256} from '../server/sitesPreflight';
import {LUNA_MODEL,LUNA_RATES,LUNA_MAX_INPUT_TOKENS,LUNA_MAX_OUTPUT_TOKENS,LUNA_MAX_REQUEST_BYTES,reserveLunaMicros} from '../server/lunaPolicy';
const canvas=CanvasSchema.parse(generationFixtures()[0]),request=buildLunaRequest(prepareIntent(canvas));
const requestHash=await sha256(JSON.stringify(request));
let count:number|null=null;
try{const saved=JSON.parse(await readFile('docs/LUNA_FREE_CHECK.json','utf8'));if(saved.status==='PASS'&&saved.requestSha256===requestHash&&Number.isSafeInteger(saved.inputTokens))count=saved.inputTokens;}catch{/* Unknown historical count does not authorize anything. */}
const report={model:LUNA_MODEL,serviceTier:'default',requestSha256:requestHash,canvasHash:await sha256(JSON.stringify(canvas)),requestUtf8Bytes:Buffer.byteLength(JSON.stringify(request)),maxRequestUtf8Bytes:LUNA_MAX_REQUEST_BYTES,
 inputTokens:count,maxInputTokens:LUNA_MAX_INPUT_TOKENS,maxOutputTokens:LUNA_MAX_OUTPUT_TOKENS,extraPaidTools:0,cacheTTL:'30m',rates:LUNA_RATES,
 estimatedUpperUsd:count===null?null:reserveLunaMicros(count)/1e6,hardMaximumReservedUsd:reserveLunaMicros(LUNA_MAX_INPUT_TOKENS)/1e6,budgetUsd:.01,
 unknownCountPolicy:'REJECT; no heuristic or memory fallback',maxPaidCalls:1,retries:0,
 identity:'Trusted Sites dispatch identity, sole-owner policy email bootstrap, D1 permanent Site subject; no browser owner ID',
 verification:'Local free count used Codex Cloud HTTP Secret. Actual Sites Key is checked on signed-in owner page load, persisted separately in D1; both generation switches stay false.',
 manualItems:['Confirm OpenAI Project billing/credit/spend controls and Responses/model permissions','Sign in to the private Site once if durable owner/free-preflight row is not yet present','Explicit later paid-generation approval; never enabled automatically'],paidGenerationRequests:0};
await writeFile('docs/SITES_AI_TEST_PROPOSAL.json',JSON.stringify(report,null,2)+'\n');await mkdir('outputs',{recursive:true});await writeFile('outputs/sites-approved-test-canvas.json',JSON.stringify(canvas,null,2)+'\n');console.log(JSON.stringify(report,null,2));
