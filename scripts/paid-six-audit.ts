import {mkdir,open,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {paidAuditCases} from '../tests/fixtures/paidAudit';
import {openAIProvider,buildLunaRequest,validUsage} from '../server/provider';
import {prepareIntent,materialize,verifyPreservation} from '../src/generation';
import {PageSchema} from '../src/pageSpec';
import {LUNA_MODEL,reserveLunaMicros,lunaUsageUsd} from '../server/lunaPolicy';
const cases=paidAuditCases(),root='outputs/paid-six-audit';await mkdir(root,{recursive:true});
const index=Number(process.argv.find(v=>v.startsWith('--case='))?.split('=')[1]);
if(!Number.isInteger(index)||index<0||index>=6)throw Error('Choose exactly one fixed case 0..5');
const path=root+'/'+index;await mkdir(path,{recursive:true});
if(existsSync(path+'/attempt.json')){console.log(JSON.stringify({case:index,status:'ALREADY_ATTEMPTED_NO_RETRY'}));process.exit(1);}
const canvas=cases[index],intent=prepareIntent(canvas),provider=openAIProvider(process.env.OPENAI_API_KEY??'',LUNA_MODEL);
const report:Record<string,unknown>={case:index,name:canvas.metadata.name,model:LUNA_MODEL,tier:'default',effects:canvas.nodes.flatMap(n=>n.effects.map(e=>e.presetId)),paidCalls:0};
try{
 const count=await provider.countInputTokens!(intent,AbortSignal.timeout(20000)),reserved=reserveLunaMicros(count);
 if(reserved>10000)throw Error('Per-call cap');
 let prior=0;for(let i=0;i<6;i++)if(existsSync(root+'/'+i+'/attempt.json'))prior+=JSON.parse(await readFile(root+'/'+i+'/attempt.json','utf8')).reservedMicros;
 if(prior+reserved>60000)throw Error('Six-test cap');
 Object.assign(report,{inputTokens:count,reservedUsd:reserved/1e6,bytes:Buffer.byteLength(JSON.stringify(buildLunaRequest(intent))),status:'FREE_PREFLIGHT_PASS'});console.log(JSON.stringify(report));
 await writeFile(path+'/canvas.json',JSON.stringify(canvas,null,2));
 if(!process.argv.includes('--paid'))process.exit(0);
 const ledger=await open(path+'/attempt.json','wx',0o600);await ledger.writeFile(JSON.stringify({reservedMicros:reserved,at:new Date().toISOString()}));await ledger.close();report.paidCalls=1;
 const result=await provider.generate(intent,AbortSignal.timeout(30000));
 if(!validUsage(result)||result.inputTokens>count||result.outputTokens>4096)throw Error('Usage invalid');
 const cost=lunaUsageUsd(result);if(cost>reserved/1e6)throw Error('Cost mismatch');
 const page=PageSchema.parse(materialize(canvas,result.layout));verifyPreservation(canvas,page);
 if(canvas.metadata.layoutMode!=='reflow'&&JSON.stringify(page.draftLayout?.items)!==JSON.stringify(canvas.nodes.map(({id,x,y,width,height,zIndex})=>({id,x,y,width,height,zIndex}))))throw Error('Geometry changed');
 await writeFile(path+'/page.json',JSON.stringify(page,null,2));
 Object.assign(report,{status:'PASS',usage:{inputTokens:result.inputTokens,outputTokens:result.outputTokens,reasoningTokens:result.reasoningTokens??null,cachedInputTokens:result.cachedInputTokens??null,estimatedCostUsd:cost,latencyMs:0},pageSpec:'PASS',effectsPreserved:'PASS',geometry:canvas.metadata.layoutMode==='reflow'?'REFLOW_BY_CHOICE':'EXACT_SOURCE_FRAME'});
 await writeFile(path+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch{
 report.status=report.paidCalls?'FAILED_NO_RETRY':'BLOCKED_BEFORE_PAYMENT';await writeFile(path+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=1;
}
