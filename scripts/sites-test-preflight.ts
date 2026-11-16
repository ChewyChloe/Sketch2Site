// Offline preparation only: never loads secrets or invokes a Provider.
import { writeFile, mkdir } from 'node:fs/promises';
import { generationFixtures } from '../src/demoFixtures';
import { CanvasSchema } from '../src/spec';
import { canvasHash } from '../server/sitesWorker';
import { inputTokenBound } from '../server/provider';
import { prepareIntent } from '../src/generation';
const canvas=CanvasSchema.parse(generationFixtures()[0]);
const hash=await canvasHash(canvas);
const input=inputTokenBound(prepareIntent(canvas));
const report={fixture:'portfolio',canvasHash:hash,elements:canvas.nodes.length,inputTokenReservation:input,maxOutputTokens:4096,maxCalls:1,budgetUsd:.01,
 pricingStatus:'NOT VERIFIED in this session; live model/pricing pages blocked by network CONNECT 403',
 previousRecordedRates:{input:.1,cachedInput:.01,output:.5,unit:'USD per million tokens; unverified'},
 provisionalReservationUsd:(input*.1+4096*.5)/1e6,
 actualPaidCalls:0,activation:'Requires owner ID, reviewed model/pricing, backend key, explicit test approval and <=1h expiry; never enabled automatically'};
await writeFile('docs/SITES_AI_TEST_PROPOSAL.json',JSON.stringify(report,null,2)+'\n');
await mkdir('outputs', {recursive:true});
await writeFile('outputs/sites-approved-test-canvas.json',JSON.stringify(canvas,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
