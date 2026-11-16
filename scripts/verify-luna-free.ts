// Only two non-generative endpoints: GET /models/gpt-6-luna and POST /responses/input_tokens.
import {writeFile} from 'node:fs/promises';
import {CanvasSchema} from '../src/spec';
import {generationFixtures} from '../src/demoFixtures';
import {prepareIntent} from '../src/generation';
import {openAIProvider,buildLunaRequest} from '../server/provider';
import {sha256} from '../server/sitesPreflight';
import {LUNA_MODEL,LUNA_MAX_INPUT_TOKENS,LUNA_MAX_OUTPUT_TOKENS,reserveLunaMicros} from '../server/lunaPolicy';
const canvas=CanvasSchema.parse(generationFixtures()[0]),intent=prepareIntent(canvas),request=buildLunaRequest(intent);
const provider=openAIProvider(process.env.OPENAI_API_KEY??'',LUNA_MODEL);
const report:Record<string,unknown>={generationRequests:0,model:LUNA_MODEL,serviceTier:request.service_tier,maxOutputTokens:LUNA_MAX_OUTPUT_TOKENS,hardMaxInputTokens:LUNA_MAX_INPUT_TOKENS,hardMaxReservedUsd:reserveLunaMicros(LUNA_MAX_INPUT_TOKENS)/1e6,requestUtf8Bytes:Buffer.byteLength(JSON.stringify(request)),extraTools:request.tools.length,requestSha256:await sha256(JSON.stringify(request)),verificationScope:'Codex Cloud HTTP Secret; Sites runtime key is checked independently on authenticated owner page load'};
try{
 report.modelVisible=await provider.modelAvailable!(AbortSignal.timeout(20000));
 if(!report.modelVisible)throw Error('Model unavailable');
 const count=await provider.countInputTokens!(intent,AbortSignal.timeout(20000));
 report.inputTokens=count;report.reservedMicros=reserveLunaMicros(count);report.estimatedUpperUsd=reserveLunaMicros(count)/1e6;report.status='PASS';
}catch{report.status='BLOCKED';report.reason='Free model access or exact token count unavailable; credentials/upstream details suppressed';}
await writeFile('docs/LUNA_FREE_CHECK.json',JSON.stringify(report,null,2)+'\n');
await writeFile('/workspace/sites/sketch2site-luna-free-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
