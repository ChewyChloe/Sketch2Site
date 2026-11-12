import { z } from "zod";
export const motionIds = ["fade-in","slide-up","scale-in","hover-lift","hover-glow","stagger-reveal","breathing-glow","curved-path-text","count-up","flip-card","physics-tag-field","fold-reveal"] as const;
export type MotionId = typeof motionIds[number];
export type ControlValue = string | number | boolean | string[];
export type MotionControls = Record<string, ControlValue>;
export type Control = { label:string; kind:"number"|"select"|"boolean"|"text"|"lines"; default?:ControlValue; min?:number; max?:number; step?:number; options?:readonly string[]; required?:boolean };
export type MotionDefinition = {
 id:MotionId; specVersion:1; nameZh:string; nameEn:string; category:"進場"|"互動"|"內容";
 summary:string; bestFor:string; previewComponent:MotionId; targetType:readonly string[]; tags:readonly string[];
 interactionType:readonly string[]; techBase:string; complexity:"low"|"medium"|"high";
 controls:Record<string,Control>; constraints:readonly string[]; reducedMotionFallback:string;
 compatibilityRules:string; rendererMapping:MotionId; exportMapping:string;
 status:"PARTIAL"|"DONE"|"NOT STARTED";
};
const number=(label:string,value:number,min:number,max:number,step=1):Control=>({label,kind:"number",default:value,min,max,step});
const select=(label:string,value:string,options:readonly string[]):Control=>({label,kind:"select",default:value,options});
const boolean=(label:string,value:boolean):Control=>({label,kind:"boolean",default:value});
const easing=select("速度曲線","smooth",["smooth","linear","ease-out"]);
const trigger=select("播放時機","in-view",["enter","in-view"]);
const dataText=(label:string,max=1000):Control=>({label,kind:"text",required:true,min:1,max});
const define=(id:MotionId,nameZh:string,nameEn:string,category:MotionDefinition["category"],summary:string,bestFor:string,targetType:readonly string[],complexity:MotionDefinition["complexity"],interactionType:readonly string[],controls:Record<string,Control>,constraints:string[],fallback:string,rules:string):MotionDefinition=>({id,specVersion:1,nameZh,nameEn,category,summary,bestFor,targetType,complexity,interactionType,controls,constraints,reducedMotionFallback:fallback,compatibilityRules:rules,techBase:id==="physics-tag-field"?"Canvas 2D / fixed-step local solver":id==="curved-path-text"?"SVG textPath / Web Animations":"Web Animations / CSS / Pointer Events",tags:[category,bestFor],previewComponent:id,rendererMapping:id,exportMapping:"shared PageRuntime + MotionRuntime + motion CSS",status:motionIds.indexOf(id)<6?"PARTIAL":"NOT STARTED"});
// Public, versioned, controlled definitions. Server-only generation briefs are NOT imported here.
export const motionCatalog:Record<MotionId,MotionDefinition>={
 "fade-in":define("fade-in","淡入","Fade In","進場","內容從透明自然顯現。","標題、段落與圖片",["text","heading","paragraph","image","card","container","button","section","stack","grid"],"low",["on-enter","scroll-enter"],{durationMs:number("時長（毫秒）",450,150,1200),delayMs:number("延遲（毫秒）",0,0,1000),easing,trigger},["不改變布局尺寸","進場只播一次"],"直接顯示內容","適用文字、圖片及內容容器"),
 "slide-up":define("slide-up","向上滑入","Slide Up","進場","輕微上移，同時淡入。","介紹、圖片與卡片",["text","heading","paragraph","image","card","container","button","section","stack","grid"],"low",["on-enter","scroll-enter"],{distancePx:number("位移（像素）",24,8,64),durationMs:number("時長（毫秒）",500,180,1200),delayMs:number("延遲（毫秒）",0,0,1000),easing,trigger},["僅transform與opacity","不改變文件布局"],"取消位移，直接顯示","適用文字、圖片及內容容器"),
 "scale-in":define("scale-in","縮放進入","Scale In","進場","從略小尺寸平滑顯現。","圖片與重點區塊",["image","card","container","section","stack","grid"],"low",["on-enter"],{initialScale:number("起始比例",.94,.85,.99,.01),durationMs:number("時長（毫秒）",420,180,900),delayMs:number("延遲（毫秒）",0,0,800)},["不造成layout shift","不過度縮放文字"],"靜態顯示","限圖片與容器，不縮放一般段落"),
 "hover-lift":define("hover-lift","懸停浮起","Hover Lift","互動","移入或聚焦時輕微浮起。","卡片、圖片與按鈕",["card","button","image","container","section","stack","grid"],"low",["hover","focus"],{liftPx:number("浮起（像素）",5,2,12),durationMs:number("時長（毫秒）",180,100,400),shadowIntensity:select("陰影","subtle",["none","subtle","medium"])},["不改變布局","移出可立即反向"],"靜態邊框強調","不套用於一般正文"),
 "hover-glow":define("hover-glow","懸停光暈","Hover Glow","互動","以主題色柔和強調邊緣。","按鈕與互動卡片",["button","card"],"low",["hover","focus"],{intensity:select("強度","subtle",["subtle","medium"]),spreadPx:number("擴散（像素）",8,2,20),durationMs:number("時長（毫秒）",200,100,500)},["不使用任意顏色","保留文字對比"],"靜態主題邊框","限按鈕或卡片"),
 "stagger-reveal":define("stagger-reveal","依序顯示","Stagger Reveal","進場","讓群組內容依序顯現。","列表與作品群組",["card","container","section","stack","grid"],"medium",["on-enter","scroll-enter"],{intervalMs:number("間隔（毫秒）",100,40,300),childDurationMs:number("子項時長（毫秒）",400,150,900),direction:select("順序","forward",["forward","reverse"]),revealStyle:select("顯示方式","slide-up",["fade","slide-up","scale"])},["至少兩個實際子元素","總延遲上限1200ms","不改DOM順序"],"所有內容直接顯示","草稿卡片需至少兩行非空文字；正式頁面至少兩個子元素"),
 "breathing-glow":define("breathing-glow","呼吸光按鈕","Breathing Glow Button","互動","以平緩亮度節奏標示主要行動。","主要行動按鈕",["button"],"medium",["idle-loop","hover","focus"],{cycleMs:number("週期（毫秒）",3200,2000,6000),intensity:select("強度","subtle",["subtle","medium"]),spreadPx:number("擴散（像素）",12,4,24),pauseOnHover:boolean("懸停時暫停",true)},["不快速閃爍","不縮放按鈕","disabled不播放","hover與focus優先"],"停止循環，保留靜態邊框","僅按鈕；不可與hover-glow重疊"),
 "curved-path-text":define("curved-path-text","曲線文字","Curved Path Text","內容","讓短文字沿自製弧線呈現。","品牌標語與短標題",["text","heading","paragraph"],"medium",["on-enter","scroll-enter"],{curvature:select("曲度","gentle",["gentle","medium","strong"]),direction:select("弧線方向","upward",["upward","downward"]),revealDurationMs:number("揭露時長（毫秒）",900,300,1800),textAlign:select("文字對齊","center",["start","center","end"])},["保留原文供讀屏","超過80字改水平文字","只產生可信SVG path"],"靜態曲線或水平文字","只套用文字；不可與count-up合用"),
 "count-up":define("count-up","數字遞增","Count Up","內容","從起始值變化至使用者的真實數值。","已有的統計數字",["text","heading","paragraph"],"medium",["on-enter","scroll-enter"],{startValue:number("起始數字",0,-1e9,1e9,.01),endValue:{label:"最終數字",kind:"number",required:true,min:-1e9,max:1e9,step:.01},durationMs:number("時長（毫秒）",1200,300,3000),decimals:number("小數位數",0,0,4),locale:select("數字格式","zh-TW",["zh-TW","en-US"]),prefix:{label:"前綴",kind:"text",default:"",max:30},suffix:{label:"後綴",kind:"text",default:"",max:30}},["終值必須來自原始文字","不編造統計","不循環","使用tabular numerals"],"直接顯示精確終值","原文需為合法數字（含受控前後綴）"),
 "flip-card":define("flip-card","雙面卡片","Flip Card","內容","點擊翻面，閱讀使用者提供的另一面。","作品與詳情卡片",["card"],"medium",["click","keyboard","hover"],{axis:select("翻轉軸","y",["x","y"]),durationMs:number("時長（毫秒）",500,250,900),perspectivePx:number("透視（像素）",1000,600,1600),trigger:select("觸發方式","click",["click","hover"]),backText:dataText("背面內容")},["背面由使用者提供","不可操作隱藏面","Enter與Space支援","雙面尺寸穩定"],"直接切換兩面，不旋轉","限卡片；與fold-reveal互斥"),
 "physics-tag-field":define("physics-tag-field","物理標籤場","Physics Tag Field","互動","標籤落下、碰撞，並可拖曳拋動。","技能與分類標籤",["card","container","section","stack","grid"],"high",["autoplay","drag","throw"],{labels:{label:"標籤（每行一個）",kind:"lines",required:true,min:1,max:24},gravity:number("重力",.5,0,2,.05),friction:number("摩擦",.92,.75,.99,.01),restitution:number("彈性",.5,0,.8,.05),spawnIntervalMs:number("落下間隔（毫秒）",160,60,500),maxTags:number("標籤上限",12,1,24),draggable:boolean("允許拖曳",true),collisionEnabled:boolean("啟用碰撞",true)},["最多24個標籤，每個最多24字","固定60Hz步長；重力以px/step²計","離屏暫停並清理RAF","高DPI與resize需保留標籤","觸控拖曳模式可退出"],"純文字靜態列表","限容器；與stagger/flip/fold互斥；狹窄容器改靜態列表"),
 "fold-reveal":define("fold-reveal","折頁揭露","Fold Reveal","內容","拖曳折角，揭露使用者提供的下層內容。","前後對照與介紹卡片",["card","container","section"],"high",["drag","click","keyboard"],{foldCorner:select("折角","top-right",["top-right","bottom-right","top-left","bottom-left"]),revealThreshold:number("完成門檻",.45,.2,.8,.05),springResponse:number("回彈時間（秒）",.4,.15,.8,.05),foldShadow:select("折頁陰影","subtle",["none","subtle"]),clickToToggle:boolean("允許點擊切換",true),underText:dataText("下層內容")},["下層由使用者提供","拖曳保留偏移","快速反向不跳位","點擊與鍵盤有等效操作","只用自製遮罩與transform"],"直接切換內容","與flip/physics互斥"),
};
export function controlsSchema(id:MotionId) {
 const fields:Record<string,z.ZodType>={};
 for(const [key,c] of Object.entries(motionCatalog[id].controls)) {
  let s:z.ZodType;
  if(c.kind==="number") {let n=z.number().finite().min(c.min??-1e9).max(c.max??1e9);if(c.step===1)n=n.int();s=n;}
  else if(c.kind==="select")s=z.enum(c.options as [string,...string[]]);
  else if(c.kind==="boolean")s=z.boolean();
  else if(c.kind==="lines")s=z.array(z.string().trim().min(1).max(24)).min(c.min??1).max(c.max??24).refine(a=>new Set(a).size===a.length,"標籤不可重複");
  else s=z.string().min(c.min??0).max(c.max??1000).refine(v=>!/<\s*\/?[a-z][^>]*>|\bon[a-z]+\s*=|javascript\s*:|<\s*!/i.test(v),"只接受純文字");
  fields[key]=c.default!==undefined?s.default(c.default):s;
 }
 return z.object(fields).strict() as z.ZodType<MotionControls>;
}
export const motionControlSchemas=Object.fromEntries(motionIds.map(id=>[id,controlsSchema(id)])) as Record<MotionId,z.ZodType<MotionControls>>;
export const defaultControls=(id:MotionId):MotionControls=>Object.fromEntries(Object.entries(motionCatalog[id].controls).filter(([,v])=>v.default!==undefined).map(([k,v])=>[k,structuredClone(v.default!)]));
