import {CanvasSchema,type CanvasSpec} from '../src/spec';
import {generationFixtures} from '../src/demoFixtures';
import {legacyMotion,type MotionInstance} from '../src/motion';
import type {SitesEnv} from './sitesIdentity';
export const MOTION_APPROVAL='portfolio-motion-v1';
export function ownerDraftApproved(env:SitesEnv){return ['owner-draft-v1','owner-draft-studio-review-v1','owner-draft-three-20261118-v1'].includes(String(env.SKETCH_AI_DRAFT_POLICY));}
export function motionApproved(env:SitesEnv){return env.SKETCH_AI_DRAFT_POLICY===MOTION_APPROVAL||ownerDraftApproved(env);}
export function paidSlots(env:SitesEnv):string[]{
 if(env.SKETCH_AI_DRAFT_POLICY==='owner-draft-three-20261118-v1')return ['sites-ai-three-20261118-v1-1','sites-ai-three-20261118-v1-2','sites-ai-three-20261118-v1-3'];
 return [env.SKETCH_AI_DRAFT_POLICY==='owner-draft-studio-review-v1'?'sites-ai-studio-review-v1':motionApproved(env)?'sites-ai-motion-test-v1':'sites-ai-single-test-v1'];
}
export function paidSlot(env:SitesEnv){return paidSlots(env)[0];}

export function approvedDraft(env:SitesEnv):CanvasSpec{
 const canvas=CanvasSchema.parse(generationFixtures()[0]);
 if(motionApproved(env)){
  const effects=['slide-up','fade-in','scale-in','stagger-reveal','lift','hover-glow'] as const;
  canvas.nodes.forEach((node,i)=>{node.effects=[legacyMotion(effects[i],node.id) as MotionInstance];});
 }
 return CanvasSchema.parse(canvas);
}
// Only motion may vary under the separate motion approval. All other fields remain pinned.
// CanvasSchema + prepareIntent validate targets, controls, compatibility and effect budgets.
export function approvalBase(input:unknown,env:SitesEnv){
 const canvas=CanvasSchema.parse(input);
 return motionApproved(env)?CanvasSchema.parse({...canvas,nodes:canvas.nodes.map(n=>({...n,effects:[]}))}):canvas;
}
