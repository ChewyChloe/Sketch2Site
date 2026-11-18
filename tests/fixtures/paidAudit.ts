import {blank,createNode,CanvasSchema,type CanvasSpec} from '../../src/spec';
import {motionCatalog,motionIds,createMotion,type MotionId} from '../../src/motion';
const uid=(i:number)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
export function paidAuditCases():CanvasSpec[]{
 const batches:readonly MotionId[][]=[motionIds.slice(0,4),motionIds.slice(4,8),motionIds.slice(8,12),motionIds.slice(12,16),motionIds.slice(16,20),['slide-up','image-reveal','hover-lift','press-feedback']];
 return batches.map((effects,k)=>{
  const canvas=blank();canvas.metadata={...canvas.metadata,name:['保留草稿布局','互動與曲線','內容型動畫','文字與圖片','群組與閱讀','不規則多選群組'][k],layoutMode:k===4?'reflow':'preserve'};
  const title=createNode('heading',k===5?810:72,48);title.id=uid(k*100+1);title.content=canvas.metadata.name;title.width=500;canvas.nodes.push(title);
  effects.forEach((effect,i)=>{const definition=motionCatalog[effect],types=definition.targetType;
   const type=types.includes('button')?'button':types.includes('image')?'image':types.includes('card')?'card':types.includes('heading')?'heading':'text';
   const x=k===5?[70,925,420,1050][i]:72+(i%2)*690,y=230+Math.floor(i/2)*340;
   const node=createNode(type,x,y);node.id=uid(k*100+10+i);node.width=type==='heading'?440:300;node.height=type==='card'?220:node.height;node.x=Math.min(node.x,1440-node.width);
   node.content=effect==='count-up'?'1,234':type==='card'?definition.nameZh+'\n這是使用者提供的第二行內容。':definition.nameZh+'：保留我的內容';
   if(type==='button')node.href='#'+title.id;
   const extra=effect==='count-up'?{endValue:1234}:effect==='flip-card'?{backText:'這是我提供的背面資訊。'}:effect==='fold-reveal'?{underText:'這是我提供的下層內容。'}:effect==='physics-tag-field'?{labels:['設計','閱讀','動畫'],maxTags:3}:{};
   node.effects=[createMotion(effect,node.id,extra)];if(k===5&&i<2)node.groupId=uid(99999);canvas.nodes.push(node);
  });return CanvasSchema.parse(canvas);
 });
}
