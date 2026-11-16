import { GenerationError } from '../src/generation';
export const LUNA_MODEL='gpt-6-luna' as const;
export const LUNA_MAX_INPUT_TOKENS=8192;
export const LUNA_MAX_OUTPUT_TOKENS=4096;
export const LUNA_MAX_REQUEST_BYTES=16384;
export const LUNA_RATES=Object.freeze({input:.10,cachedInput:.01,cacheWrite30m:.125,cacheWrite12h:.25,output:.50});
// All input is reserved at the worst rate permitted by the pinned 30m cache policy.
export function reserveLunaMicros(inputTokens:number) {
 if(!Number.isSafeInteger(inputTokens)||inputTokens<1||inputTokens>LUNA_MAX_INPUT_TOKENS) throw new GenerationError('LIMIT');
 return Math.ceil(inputTokens*LUNA_RATES.cacheWrite30m+LUNA_MAX_OUTPUT_TOKENS*LUNA_RATES.output);
}
export function lunaUsageUsd(usage:{inputTokens:number;outputTokens:number;cachedInputTokens?:number|null;cacheWrite30mTokens?:number|null;cacheWrite12hTokens?:number|null}) {
 const cached=usage.cachedInputTokens??0;
 // Missing cache accounting is conservatively priced, never assumed to be a hit.
 const writes=usage.cacheWrite30mTokens??(usage.inputTokens-cached);
 const longWrites=usage.cacheWrite12hTokens??0;
 if(longWrites!==0||writes<0||cached+writes>usage.inputTokens)throw new GenerationError('INVALID_OUTPUT');
 return ((usage.inputTokens-cached-writes)*LUNA_RATES.input+cached*LUNA_RATES.cachedInput+writes*LUNA_RATES.cacheWrite30m+usage.outputTokens*LUNA_RATES.output)/1e6;
}
