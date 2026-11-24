import { compatibleMotion, combinationReason } from './motion';
import {CanvasSchema,NodeSchema,type CanvasSpec,type CanvasNode} from './spec';
export const clipboardPrefix='Sketch2Site/CanvasNodes/v1:';
export function encodeNodes(canvas:CanvasSpec,ids:readonly string[]){return clipboardPrefix+JSON.stringify(canvas.nodes.filter(n=>ids.includes(n.id)));}
export function decodeNodes(value:string):CanvasNode[]{
 if(!value.startsWith(clipboardPrefix)||value.length>200000)return [];
 try{const nodes=NodeSchema.array().max(100).parse(JSON.parse(value.slice(clipboardPrefix.length)));return new Set(nodes.map(n=>n.id)).size===nodes.length?nodes:[];}catch{return [];}
}
export function cloneNodes(nodes:readonly CanvasNode[],dx=24,dy=24,canvasHeight=1200){
 const map=new Map(nodes.map(n=>[n.id,crypto.randomUUID()])),groups=new Map<string,string>();
 const offsetX=Math.min(dx,...nodes.map(n=>1440-n.x-n.width)),offsetY=Math.min(dy,...nodes.map(n=>canvasHeight-n.y-n.height));
 return nodes.map(n=>{if(n.groupId&&!groups.has(n.groupId))groups.set(n.groupId,crypto.randomUUID());return {...structuredClone(n),id:map.get(n.id)!,x:Math.max(0,n.x+offsetX),y:Math.max(0,n.y+offsetY),effects:n.effects.map(e=>({...structuredClone(e),targetId:map.get(n.id)!})),...(n.href?.startsWith('#')&&map.has(n.href.slice(1))?{href:'#'+map.get(n.href.slice(1))}:{}),...(n.groupId?{groupId:groups.get(n.groupId)!}:{})};});
}
export function deleteNodes(canvas:CanvasSpec,ids:readonly string[]):CanvasSpec{
 return CanvasSchema.parse({...canvas,nodes:canvas.nodes.filter(n=>!ids.includes(n.id)).map(n=>n.href?.startsWith('#')&&ids.includes(n.href.slice(1))?{...n,href:null}:n)});
}
export function groupSelection(canvas:CanvasSpec,ids:readonly string[],ungroup=false):CanvasSpec{
 const groupId=crypto.randomUUID();return CanvasSchema.parse({...canvas,nodes:canvas.nodes.map(n=>ids.includes(n.id)?{...n,groupId:ungroup?undefined:groupId}:n)});
}
export function translateSelection(canvas:CanvasSpec,ids:readonly string[],dx:number,dy:number):CanvasSpec{
 const nodes=canvas.nodes.filter(n=>ids.includes(n.id));if(!nodes.length)return canvas;
 dx=Math.max(-Math.min(...nodes.map(n=>n.x)),Math.min(dx,Math.min(...nodes.map(n=>1440-n.x-n.width))));
 dy=Math.max(-Math.min(...nodes.map(n=>n.y)),Math.min(dy,Math.min(...nodes.map(n=>canvas.metadata.height-n.y-n.height))));
 return {...canvas,nodes:canvas.nodes.map(n=>ids.includes(n.id)?{...n,x:n.x+dx,y:n.y+dy}:n)};
}

/** Format painter: size and animations, like copying formatting in a slide editor. */
export type NodeFormat = { width: number; height: number; effects: CanvasNode["effects"] };
export function formatOf(node: CanvasNode): NodeFormat {
  return { width: node.width, height: node.height, effects: structuredClone(node.effects) };
}
export function applyFormat(canvas: CanvasSpec, ids: readonly string[], format: NodeFormat): { canvas: CanvasSpec; skippedEffects: number } {
  let skipped = 0;
  const nodes = canvas.nodes.map((n) => {
    if (!ids.includes(n.id)) return n;
    const width = Math.max(80, Math.min(format.width, 1440 - n.x));
    const height = Math.max(40, Math.min(format.height, canvas.metadata.height - n.y));
    // Animations are rebound to the target; ones that do not fit this element type are skipped.
    const effects: CanvasNode["effects"] = [];
    for (const effect of format.effects) {
      const candidate = { ...structuredClone(effect), targetId: n.id };
      const probe = { ...n, effects: [...effects, candidate] };
      if (compatibleMotion(probe, candidate) && !combinationReason(probe.effects)) effects.push(candidate);
      else skipped++;
    }
    return { ...n, width, height, effects };
  });
  return { canvas: CanvasSchema.parse({ ...canvas, nodes }), skippedEffects: skipped };
}
