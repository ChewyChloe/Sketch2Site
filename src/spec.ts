import { z } from 'zod';
export const Effect = z.enum(['hover-glow','fade-in','lift']);
export const Kind = z.enum(['text','button','card']);
export const NodeSchema = z.object({
 id:z.string().uuid(), type:Kind, x:z.number().min(0).max(1440), y:z.number().min(0).max(1200),
 width:z.number().min(80).max(1440), height:z.number().min(40).max(1200),
 content:z.string().max(2000), effects:z.array(Effect).max(3).refine(a=>new Set(a).size===a.length),
 parentId:z.string().uuid().nullable(), assetId:z.null(), zIndex:z.number().int().min(0).max(100)
}).strict();
export const CanvasSchema = z.object({
 schemaVersion:z.literal(1), metadata:z.object({name:z.string().min(1).max(80),width:z.literal(1440),height:z.literal(1200)}).strict(),
 nodes:z.array(NodeSchema).max(100), constraints:z.array(z.string().max(200)).max(20)
}).strict().superRefine((v,ctx)=>{
 const ids=new Set(v.nodes.map(n=>n.id));
 if(ids.size!==v.nodes.length)ctx.addIssue({code:'custom',message:'Duplicate IDs'});
 for(const n of v.nodes){
 if(n.x+n.width>v.metadata.width||n.y+n.height>v.metadata.height)ctx.addIssue({code:'custom',message:'Out of bounds'});
 // Phase 1 supports flat nodes only.
 if(n.parentId!==null)ctx.addIssue({code:'custom',message:'Hierarchy not supported yet'});
 }
});
const SafeHref=z.string().max(2048).refine(v=>/^#[a-zA-Z][\w-]*$/.test(v)||(/^https:\/\//.test(v)&&(()=>{try{const u=new URL(v);return !u.username&&!u.password;}catch{return false;}})()),'Unsafe URL');
const PageComponent=z.object({id:z.string().uuid(),type:Kind,content:z.string().max(2000),effects:z.array(Effect).max(3),interaction:z.object({label:z.string().max(100),href:SafeHref}).strict().nullable()}).strict();
export const PageSchema=z.object({
 schemaVersion:z.literal(1),metadata:z.object({title:z.string().min(1).max(100),language:z.literal('zh-Hant')}).strict(),
 sections:z.array(z.object({id:z.string().uuid(),layout:z.enum(['stack','grid']),components:z.array(PageComponent).max(100)}).strict()).max(30),
 typography:z.enum(['sans','serif']),styles:z.enum(['neutral','warm']),responsive:z.object({mobileColumns:z.literal(1),desktopColumns:z.union([z.literal(1),z.literal(2),z.literal(3)])}).strict()
}).strict().superRefine((v,ctx)=>{const ids=v.sections.flatMap(s=>[s.id,...s.components.map(c=>c.id)]);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Duplicate IDs'});});
export type CanvasSpec=z.infer<typeof CanvasSchema>;
export type CanvasNode=z.infer<typeof NodeSchema>;
export const blank=():CanvasSpec=>({schemaVersion:1,metadata:{name:'未命名草稿',width:1440,height:1200},nodes:[],constraints:[]});
export function createNode(type:CanvasNode['type'],x:number,y:number):CanvasNode{
 const width=type==='card'?280:200,height=type==='card'?180:64;
 return {id:crypto.randomUUID(),type,x:Math.max(0,Math.min(1440-width,x)),y:Math.max(0,Math.min(1200-height,y)),width,height,content:{text:'在這裡寫下想法',button:'了解更多',card:'卡片標題\n補充內容與說明'}[type],effects:[],parentId:null,assetId:null,zIndex:0};
}
export type History={past:CanvasSpec[];present:CanvasSpec;future:CanvasSpec[]};
export function commit(h:History,next:CanvasSpec):History{CanvasSchema.parse(next);return JSON.stringify(next)===JSON.stringify(h.present)?h:{past:[...h.past,h.present].slice(-80),present:next,future:[]};}
export function undo(h:History):History{return h.past.length?{past:h.past.slice(0,-1),present:h.past.at(-1)!,future:[h.present,...h.future]}:h;}
export function redo(h:History):History{return h.future.length?{past:[...h.past,h.present].slice(-80),present:h.future[0],future:h.future.slice(1)}:h;}
