import {cinematicSample} from "./cinematicSamples";
import {createMotion,defaultControls} from "./motion";
import {cinematicMotionIds,advancedMotionIds,motionCatalog,signatureMotionIds,referenceMotionIds} from "./motionCatalog";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { useEffect, useRef, useMemo, useState } from "react";
import { PageRenderer, animationRegistry } from "./PageRenderer";
import { PageSchema, type effectIds } from "./pageSpec";
import { effectLabels } from "./visualEditing";
import { MotionControlsFields } from "./MotionControls";
import { facetDimensions, matchesFilter, motionFacets, recommendMotions, searchMotions, type Dimension, type FacetFilter } from "./motionFacets";
import type { MotionId, MotionControls } from "./motionCatalog";
type EffectId = (typeof effectIds)[number];
// Per-browser lists; storage may be unavailable (private mode), then nothing is remembered.
const readList=(key:string):string[]=>{try{const v=JSON.parse(localStorage.getItem(key)??"[]");return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&x in motionCatalog):[];}catch{return [];}};
const writeList=(key:string,list:string[])=>{try{localStorage.setItem(key,JSON.stringify(list));}catch{/* not remembered */}};
const descriptions=Object.fromEntries(Object.entries(motionCatalog).map(([id,d])=>[id,d.summary])) as Record<EffectId,string>;
const signatureFamily:Record<string,number>={'dolly-frame':2,'color-wake':2,'scroll-ink-words':0,'hollow-fill-sweep':0,'letter-windows':0,'bold-relay':0,'chart-build':3,typewriter:0,'marquee-text':0,'gradient-text-flow':0,'blur-in':2,'float-idle':2,'confetti-burst':1,'jelly-press':1,'shine-sweep':1};
const motionFamily=(id:EffectId)=>{if(id in signatureFamily)return signatureFamily[id];const cinematic=cinematicMotionIds.indexOf(id as typeof cinematicMotionIds[number]);if(cinematic>=0)return cinematic<4?0:cinematic<9?1:cinematic<14?2:cinematic<18?3:4;const index=advancedMotionIds.indexOf(id as typeof advancedMotionIds[number]);if(index>=0)return Math.floor(index/5);const d=motionCatalog[id];return d.targetType.every(t=>['text','heading','paragraph'].includes(t))?0:d.targetType.includes('button')&&!d.targetType.includes('container')?1:d.targetType.includes('image')||['flip-card','fold-reveal'].includes(id)?2:3;};
const autoplayIds=new Set<string>(['chart-build','dolly-frame','color-wake','scroll-ink-words','hollow-fill-sweep','fade-in','slide-up','scale-in','stagger-reveal','letter-assembly','accent-stroke','image-reveal','character-decode','split-line-assembly','rolling-characters','hand-drawn-highlight','venetian-reveal','circular-mask-expansion','grid-diagonal-turn','svg-path-drawing','numeric-gauge-sweep','count-up','elastic-word-bounce','pixel-dissolve','shutter-lens-transition','glitch-slice-reveal','liquid-distortion-reveal','typewriter','blur-in','curved-path-text','kinetic-text-wave']);
const triggerLabels:Record<string,string>={'on-enter':'出現時','scroll-enter':'捲到時',hover:'滑過',focus:'鍵盤選取','idle-loop':'持續播放',click:'點一下',keyboard:'鍵盤',autoplay:'自動播放',drag:'拖曳',throw:'拋出','pointer-move':'游標移動','pointer-down':'按下','focus-within':'鍵盤選取',scroll:'捲動','text-change':'換字',touch:'觸控','pointer-enter':'滑入','pointer-leave':'滑出','progress-control':'進度控制'};
const families=['文字動態 · Typography','按鈕與互動 · Interactions','圖片與卡片 · Images & Cards','捲動與版面 · Scroll & Layout','實驗圖形 · Graphics'];
function replayCinematic(root:HTMLElement,id:EffectId){
                    if(!root.isConnected)return;
                    if(['text-morph-transition','gooey-blob-merge','elastic-svg-morph','card-stack-shuffle'].includes(id))root.querySelector<HTMLButtonElement>('.motion-toggle')?.click();
                    else if(['horizontal-scroll-gallery','sticky-section-morph','pinned-story-panels','scroll-image-sequence'].includes(id)){
                      const viewport=root.querySelector<HTMLElement>('.story-native-gallery')??root.querySelector<HTMLElement>('.story-viewport,.sequence-scroll');if(viewport)viewport.scrollTo({top:viewport.scrollHeight,left:viewport.scrollWidth,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
                    }else if(id==='spring-drag-snap'){
                      const handle=root.querySelector<HTMLElement>('.cin-drag-handle');if(handle){for(let n=0;n<4;n++)handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));handle.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));}
                    }else if(id==='cursor-trail-particles'){
                      const target=root.querySelector<HTMLElement>('[data-effects~=cursor-trail-particles]');if(target){const box=target.getBoundingClientRect();for(let n=0;n<10;n++)target.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:box.left+10+n*Math.min(10,(box.width-20)/10),clientY:box.top+box.height/2,bubbles:true}));}
                    }else if(['cursor-image-follower','directional-hover-wipe','typographic-stretch'].includes(id))root.querySelector<HTMLElement>('[tabindex="0"],a')?.focus({preventScroll:true});

}
function CinematicSample({id,replay,text,controls}:{id:typeof cinematicMotionIds[number];replay:number;text?:string;controls?:Record<string,unknown>}){
 const [base]=useState(()=>cinematicSample(id)),ref=useRef<HTMLDivElement>(null);
 const page=useMemo(()=>{
   const section=base.sections[0], node=section.children![0], effect=node.effects[0];
   const next={...node, ...(text&&node.content?{content:text}:{}),effects:[sampleMotion(id,node.id,controls,effect.validatedControls)]};
   return {...base,sections:[{...section,children:[next]}]};
 },[base,id,text,controls]);
 useEffect(()=>{const element=ref.current;if(!replay||!element)return;if(typeof IntersectionObserver==='undefined'){replayCinematic(element,id);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();replayCinematic(element,id);}});observer.observe(element);return()=>observer.disconnect();},[id,replay]);
 return <div ref={ref}><PageRenderer input={page} motionPreview/></div>;
}
/** The sample's motion with the tuned values; a value still being typed falls back to the sample's own. */
function sampleMotion(id: EffectId, target: string, tuned: Record<string, unknown> | undefined, base: Record<string, unknown>) {
  if (tuned) try { return createMotion(id, target, { ...base, ...tuned }); } catch { /* keep the sample's values */ }
  return createMotion(id, target, base);
}
function EffectSample({ id, active, text, controls: tuned }: { id: EffectId; active: boolean; text?: string; controls?: Record<string, unknown> }) {
  const [ids] = useState(() =>
    Array.from({ length: 5 }, () => crypto.randomUUID()),
  );
  const page = useMemo(() => {
    const paragraph=(index:number,content:string)=>({id:ids[index],type:"paragraph",content,style:{padding:"none",gap:"none"}});
    // Reference batch 1: each preview uses the kind of element the motion is made for.
    if((referenceMotionIds as readonly string[]).includes(id)){
      const on=active||id!=="chart-build";
      const effect=on?[sampleMotion(id,ids[1],tuned,{})]:[];
      const child=id==="dolly-frame"||id==="color-wake"?{id:ids[1],type:"image",src:id==="dolly-frame"?"/assets/samples/coffee-pourover.jpg":"/assets/samples/coffee-tonic.jpg",alt:"手沖咖啡，慢慢萃取",style:{padding:"none",gap:"none"},effects:effect}
        :id==="vanishing-lattice"?{id:ids[1],type:"card",style:{padding:"medium",gap:"small"},children:[paragraph(2,"在遠方找到方向")],effects:effect}
        :id==="chart-build"?{id:ids[1],type:"media",content:"本月來客",media:{kind:"chart",chart:"bar",points:[{label:"一",value:32},{label:"二",value:48},{label:"三",value:41},{label:"四",value:66}],unit:""},style:{padding:"none",gap:"none"},effects:effect}
        :{id:ids[1],type:"heading",level:2,content:text?text:id==="scroll-ink-words"?"每一杯咖啡，都從一顆豆子的旅程開始。慢慢讀，字會跟著亮起來。":id==="letter-windows"?"COFFEE 咖啡":id==="hollow-fill-sweep"?"滑過填滿":id==="crosswind-ribbons"?"穿過微風":"粗體接力中",style:{padding:"none",gap:"none"},effects:effect};
      return PageSchema.parse({schemaVersion:2,metadata:{title:"動畫素材示意",language:"zh-Hant"},typography:"sans",styles:"neutral",responsive:{mobileColumns:1,desktopColumns:1},sections:[{id:ids[0],type:"section",style:{padding:"none",gap:"none"},children:[child]}]});
    }
    const persistent=advancedMotionIds.includes(id as typeof advancedMotionIds[number])||id in signatureFamily||["breathing-glow","curved-path-text","count-up","flip-card","fold-reveal","physics-tag-field","magnetic-control","press-feedback","focus-transfer","scroll-progress","disclosure-panel"].includes(id);
    const controls=id==="count-up"?{endValue:128,durationMs:1200}:id==="curved-path-text"?{curvature:"medium"}:id==="flip-card"?{backText:"把細節，說清楚"}:id==="fold-reveal"?{underText:"下一層，藏著新想法"}:id==="physics-tag-field"?{labels:["設計","工程","研究"]}:{};
    const button=["confetti-burst","jelly-press","shine-sweep","cursor-spotlight","liquid-button-fill","radial-ink-ripple","orbiting-icon","border-light-trace","hover-glow","breathing-glow","magnetic-control","press-feedback"].includes(id);
    const leaf=["typewriter","marquee-text","gradient-text-flow","character-decode","split-line-assembly","rolling-characters","hand-drawn-highlight","kinetic-text-wave","numeric-gauge-sweep","count-up","curved-path-text","letter-assembly","accent-stroke"].includes(id);
    const content:Record<string,string>={"fade-in":"讓內容自然出現","slide-up":"向上，回到原位","scale-in":"讓重點被看見","hover-lift":"移入，輕輕浮起","flip-card":"從想法到作品","fold-reveal":"把這一頁揭開"};
    return PageSchema.parse({schemaVersion:2,metadata:{title:"動畫素材示意",language:"zh-Hant"},typography:"sans",styles:"neutral",responsive:{mobileColumns:1,desktopColumns:1},sections:[{
      id:ids[0],type:"section",style:{padding:"none",gap:"none"},children:[{
        id:ids[1],type:["image-reveal","venetian-reveal","circular-mask-expansion","cinematic-image-pan","blur-in","float-idle"].includes(id)?"image":button?"button":leaf?"paragraph":id==="physics-tag-field"?"container":"card",
        style:{padding:button?"small":leaf||id==="physics-tag-field"?"none":"small",gap:"small",tone:button?"accent":"plain"},
        effects:active||persistent?[sampleMotion(id,ids[1],tuned,controls)]:[],
        ...(["image-reveal","venetian-reveal","circular-mask-expansion","cinematic-image-pan","blur-in","float-idle"].includes(id)?{src:["blur-in","float-idle","cinematic-image-pan"].includes(id)?"/assets/samples/cafe.jpg":"/assets/samples/camera.jpg",alt:"圖片動畫示意"}:button?{content:id==="confetti-burst"?"報名成功！":id==="jelly-press"?"點我試試":id==="shine-sweep"?"立即購買":"看看作品",href:"#"+ids[1]}:leaf?{content:text&&!["numeric-gauge-sweep","count-up","rolling-characters"].includes(id)?text:id==="numeric-gauge-sweep"?"75%":id==="character-decode"?"Decode 想像 2026":id==="split-line-assembly"?"每一行靈感\n組成完整作品":id==="rolling-characters"?"2026 創作":id==="kinetic-text-wave"?"讓文字起舞":id==="hand-drawn-highlight"?"標記真正重要的事":id==="count-up"?"128":id==="letter-assembly"?"把靈感，拼成作品":id==="accent-stroke"?"讓重點被記住":id==="typewriter"?"你好，歡迎光臨！":id==="marquee-text"?"本週新品上市 · 第二杯半價 · 歡迎預約":id==="gradient-text-flow"?"把想法變成網站":"讓想法流動"}:{children:id==="physics-tag-field"?[]:["stagger-reveal","focus-transfer","disclosure-panel","scroll-progress","card-deck-fan","layered-parallax","grid-diagonal-turn","svg-path-drawing","scroll-milestones"].includes(id)?[paragraph(2,"構思"),paragraph(3,"設計"),paragraph(4,"實作")]:[paragraph(2,content[id]??"內容示意")]}),
      }],
    }]});
  },[id,active,ids,text,tuned]);
  return <PageRenderer input={page} motionPreview={(referenceMotionIds as readonly string[]).includes(id)} />;
}
export function AnimationLibrary({
  selectedLabel,
  compatibility,
  onChoose,
  onDragStart,
  onDragEnd,
  disabled = false,
  filter = "",
  draft = false,
  onTry,
}: {
  selectedLabel?: string;
  compatibility(id: EffectId): string | null;
  onChoose(id: EffectId, controls?: MotionControls): void;
  onDragStart(id: EffectId, data: DataTransfer): void;
  onDragEnd?(): void;
  disabled?: boolean;
  filter?: string;
  draft?: boolean;
  /** Plays a motion on the selected element of the real site for a moment, without saving. */
  onTry?(id: EffectId, controls?: MotionControls): void;

}) {
  const [description,setDescription]=useState("");
  const [recommend,setRecommend]=useState(false);
  const [query,setQuery]=useState("");
  // Filters (A4): same dimension = any of (OR), different dimensions = all of (AND).
  const [facets,setFacets]=useState<FacetFilter>({});
  const [moreOpen,setMoreOpen]=useState(false);
  // Preview settings (A6): own words in text samples, speed, auto replay, and per-motion parameters.
  const [previewText,setPreviewText]=useState("");
  const [speed,setSpeed]=useState(1);
  const [autoReplay,setAutoReplay]=useState(true);
  const [tuning,setTuning]=useState<string|null>(null);
  const [tuned,setTuned]=useState<Record<string,MotionControls>>({});
  const [sort,setSort]=useState<"default"|"name"|"gentle"|"recent">("default");
  const [only,setOnly]=useState<""|"fit"|"favorites"|"recent">("");
  // Favorites and recently used: this browser only (A5). Never counts or popularity.
  const [favorites,setFavorites]=useState<string[]>(()=>readList("sketch2site.motionFavorites"));
  const [recent,setRecent]=useState<string[]>(()=>readList("sketch2site.motionRecent"));
  const remember=(id:string)=>setRecent(r=>{const next=[id,...r.filter(x=>x!==id)].slice(0,12);writeList("sketch2site.motionRecent",next);return next;});
  const toggleFavorite=(id:string)=>setFavorites(f=>{const next=f.includes(id)?f.filter(x=>x!==id):[id,...f].slice(0,40);writeList("sketch2site.motionFavorites",next);return next;});
  const toggleFacet=(dim:Dimension,value:string)=>setFacets(f=>{const cur=f[dim]??[];const next=cur.includes(value)?cur.filter(v=>v!==value):[...cur,value];const out={...f,[dim]:next};if(!next.length)delete out[dim];return out;});
  const activeCount=Object.values(facets).reduce((n,v)=>n+(v?.length??0),0)+(only&&only!=="fit"?1:0);
  const clearAll=()=>{setFacets({});setOnly("");setQuery("");setRecommend(false);};
  const [replay,setReplay]=useState<Record<string,number>>({});
  const [active, setActive] = useState<EffectId | null>(null);
  // Entrance samples replay by themselves while they are on screen, so the library feels
  // alive without clicking 重播 (off when the viewer prefers reduced motion).
  const root=useRef<HTMLElement>(null);
  const turn=useRef(0),autoRef=useRef(true);
  useEffect(()=>{autoRef.current=autoReplay;},[autoReplay]);
  // Playback speed for every running sample animation (CSS and Web Animations alike).
  useEffect(()=>{const el=root.current;if(!el)return;const t=window.setInterval(()=>{for(const a of el.querySelectorAll(".animation-asset"))for(const an of (a as HTMLElement).getAnimations?.({subtree:true})??[])if(an.playbackRate!==speed)an.playbackRate=speed;},200);return()=>window.clearInterval(t);},[speed]);
  useEffect(()=>{
    const el=root.current;
    if(!el||typeof IntersectionObserver==="undefined"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const onScreen=new Set<string>();
    const io=new IntersectionObserver(entries=>{for(const e of entries){const id=(e.target as HTMLElement).dataset.effectId!;if(e.isIntersecting)onScreen.add(id);else onScreen.delete(id);}},{threshold:.6});
    const watch=()=>el.querySelectorAll<HTMLElement>('.animation-asset[data-autoplay]').forEach(a=>io.observe(a));
    watch();
    const mo=new MutationObserver(watch);mo.observe(el,{childList:true,subtree:true});
    const timer=window.setInterval(()=>{
      if(document.hidden||!onScreen.size)return;
      const hovered=el.querySelector('.animation-asset:hover,.animation-asset:focus-within')?.getAttribute("data-effect-id");
      // One sample at a time, in turn: the cards never all move at once.
      const queue=[...onScreen].filter(id=>id!==hovered);if(!queue.length||!autoRef.current)return;
      const id=queue[turn.current++%queue.length];
      setReplay(v=>({...v,[id]:(v[id]??0)+1}));
    },1300);
    return()=>{io.disconnect();mo.disconnect();window.clearInterval(timer);};
  },[]);
  const all=Object.keys(animationRegistry) as EffectId[];
  const recommendations=recommend?recommendMotions(description,all.filter(id=>!compatibility(id))):[];
  const searched=recommend?recommendations.map(item=>item.id):searchMotions(all,filter||query);
  const base=searched.filter(id=>only==="fit"?!compatibility(id):only==="favorites"?favorites.includes(id):only==="recent"?recent.includes(id):true);
  const visibleIds=base.filter(id=>matchesFilter(id as MotionId,facets));
  // Live counts: results if this value were chosen, keeping the other dimensions as they are.
  const countFor=(dim:Dimension,value:string)=>base.filter(id=>matchesFilter(id as MotionId,{...facets,[dim]:[value]})).length;
  const sorted=sort==="name"?[...visibleIds].sort((a,b)=>effectLabels[a].localeCompare(effectLabels[b],"zh-Hant")):sort==="gentle"?[...visibleIds].sort((a,b)=>["low","medium","high"].indexOf(motionFacets[a as MotionId].intensity[0])-["low","medium","high"].indexOf(motionFacets[b as MotionId].intensity[0])):sort==="recent"?[...visibleIds].sort((a,b)=>(recent.indexOf(a)<0?99:recent.indexOf(a))-(recent.indexOf(b)<0?99:recent.indexOf(b))):visibleIds;
  const chips=(dim:Dimension)=>(
    <div className="lib-chips" role="group" aria-label={facetDimensions[dim].label}>
      <span className="lib-chips-label">{facetDimensions[dim].label}</span>
      {Object.entries(facetDimensions[dim].values).map(([value,label])=>{const on=facets[dim]?.includes(value)??false,count=countFor(dim,value);return(
        <button key={value} type="button" aria-pressed={on} disabled={!on&&!count} onClick={()=>toggleFacet(dim,value)}>{label}<span className="lib-count-chip" aria-label={`${count} 種`}>{count}</span></button>
      );})}
    </div>
  );
  return (
    <section
      ref={root}
      className="animation-library"
      aria-label={draft ? "草稿動畫素材" : "預覽動畫效果庫"}
    >
      <div className="panel-intro lib-intro">
        <h2>動畫素材 <span className="lib-count">{Object.keys(animationRegistry).length} 種</span></h2>
        <p>
          {selectedLabel
            ? `目前選取：${selectedLabel}`
            : "先點要加動畫的東西，再按「套用」，用電腦也能直接拖過去"}
        </p>
      </div>
      <div className="motion-library-filters">
        {!draft && <input type="search" aria-label="搜尋動畫" placeholder="搜尋：打字、彈跳、圖片、hover…" value={query} onChange={e=>setQuery(e.target.value)}/>}
        <label>描述想要的動畫（本機規則推薦）<input value={description} maxLength={160} onChange={event=>setDescription(event.target.value)} /></label>
        <button type="button" disabled={!description.trim()} onClick={()=>{clearAll();setRecommend(true);setSort("default");}}>推薦動畫</button>
        {recommend&&<button type="button" onClick={()=>setRecommend(false)}>返回全部動畫</button>}
        <div className="lib-only" role="group" aria-label="顯示範圍">
          {selectedLabel && <button type="button" aria-pressed={only==="fit"} onClick={()=>setOnly(only==="fit"?"":"fit")}>只看適合目前元件（{searched.filter(id=>!compatibility(id)).length}）</button>}
          <button type="button" aria-pressed={only==="favorites"} onClick={()=>setOnly(only==="favorites"?"":"favorites")}>★ 收藏（{favorites.length}）</button>
          <button type="button" aria-pressed={only==="recent"} onClick={()=>setOnly(only==="recent"?"":"recent")}>最近用過（{recent.length}）</button>
        </div>
        {chips("target")}
        {chips("trigger")}
        <details className="lib-more" open={moreOpen} onToggle={e=>setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>更多條件{(["expression","purpose","intensity"] as Dimension[]).some(d=>facets[d]?.length)?`（已選 ${(["expression","purpose","intensity"] as Dimension[]).reduce((n,d)=>n+(facets[d]?.length??0),0)}）`:""}</summary>
          {chips("expression")}
          {chips("purpose")}
          {chips("intensity")}
        </details>
        <div className="lib-result-bar">
          <span role="status" aria-live="polite">{visibleIds.length?`符合 ${visibleIds.length} 種`:"找不到符合的動畫"}</span>
          <label className="lib-sort">排序<select aria-label="排序" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="default">依類別</option><option value="name">名稱</option><option value="gentle">由輕柔到強烈</option><option value="recent">最近用過優先</option></select></label>
          {(activeCount>0||query)&&<button type="button" className="lib-clear" onClick={clearAll}>清除條件</button>}
        </div>
        <details className="lib-more lib-preview-settings">
          <summary>預覽設定</summary>
          <label>預覽文字<input type="text" aria-label="預覽文字" maxLength={30} placeholder="輸入自己的字，例如店名" value={previewText} onChange={e=>setPreviewText(e.target.value)}/></label>
          <label>速度<select aria-label="預覽速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5 倍</option><option value={1}>1 倍</option><option value={2}>2 倍</option></select></label>
          <label className="lib-check"><input type="checkbox" checked={autoReplay} onChange={e=>setAutoReplay(e.target.checked)}/>畫面上的範例輪流自動重播</label>
        </details>
      </div>
      {!visibleIds.length && <div className="lib-empty"><p>找不到符合的動畫，請調整搜尋或條件</p><button type="button" onClick={clearAll}>全部重設</button></div>}
      <div className="animation-groups">
        {(sort==="default"?families:["結果"]).map((family,index)=>(sort!=="default"||visibleIds.some(id=>motionFamily(id)===index))&&sorted.length>0&&<section className="animation-family" key={family} aria-label={family}><h3>{family}</h3><div className="animation-assets" role="list">
        {(sort==="default"?sorted.filter(id=>motionFamily(id)===index):sorted).map((id) => {
            const reason = compatibility(id);
            return (
              <div
                className="animation-asset"
                role="listitem"
                key={id}
                data-effect-id={id}
                data-batch={cinematicMotionIds.includes(id as typeof cinematicMotionIds[number])?"third":"existing"}
                data-category={motionCatalog[id].category}
                data-autoplay={autoplayIds.has(id)?"":undefined}
                data-compatibility={reason ? "unavailable" : "available"}
                draggable={!disabled && !cinematicMotionIds.includes(id as typeof cinematicMotionIds[number]) && !["flip-card","physics-tag-field","fold-reveal","focus-transfer","disclosure-panel","scroll-progress","magnetic-control","press-feedback"].includes(id)}
                onDragStart={(e) => {
                  if (disabled) {
                    e.preventDefault();
                    return;
                  }
                  e.currentTarget.classList.add("is-dragging");
                  remember(id);
                  onDragStart(id, e.dataTransfer);
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove("is-dragging");
                  onDragEnd?.();
                }}
                onMouseEnter={() => setActive(id)}
                onMouseLeave={(e) => {if(!e.currentTarget.contains(document.activeElement))setActive(null);}}
                onFocusCapture={() => setActive(id)}
                onBlurCapture={(e) => {if(!e.currentTarget.contains(e.relatedTarget as Node))setActive(null);}}
              >
                <div className="asset-preview" role="group" aria-label={effectLabels[id]+"效果示意"} onClickCapture={e=>{if((e.target as Element).closest("a"))e.preventDefault();}}>
                  <span className="asset-category">{motionCatalog[id].category}</span>{([...signatureMotionIds,...referenceMotionIds] as readonly string[]).includes(id)&&<span className="asset-new">NEW</span>}
                  <div className="asset-sample">
                    {cinematicMotionIds.includes(id as typeof cinematicMotionIds[number])?<CinematicSample key={replay[id]??0} id={id as typeof cinematicMotionIds[number]} replay={replay[id]??0} text={previewText.trim()} controls={tuned[id]}/>:<EffectSample key={replay[id]??0} id={id} active={active === id} text={previewText.trim()||undefined} controls={tuned[id]} />}
                  </div>
                </div>
                <div className="asset-actions">
                <button
                  className="asset-choose"
                  draggable={!disabled}
                  aria-label={
                    effectLabels[id] +
                    (draft
                      ? " · " +
                        motionCatalog[id].nameEn
                      : "")
                  }
                  disabled={disabled || Boolean(reason)}
                  onClick={() => { remember(id); if(tuned[id]) onChoose(id,tuned[id]); else onChoose(id); }}
                  title={reason ?? descriptions[id]}
                >
                  <span className="asset-name"><strong>{effectLabels[id]}</strong><span>{motionCatalog[id].nameEn}</span></span>
                  <span className="asset-apply">套用</span><WorkbenchIcon name="grip" />
                </button>
                <button type="button" className="motion-replay" aria-label={(["hover-lift","hover-glow"].includes(id)?"體驗":"重播")+effectLabels[id]+"示意"} onClick={(e)=>{
                  const asset=e.currentTarget.closest(".animation-asset");
                  setActive(id);setReplay(values=>({...values,[id]:(values[id]??0)+1}));
                  if(["hover-lift","hover-glow"].includes(id))requestAnimationFrame(()=>{
                    if(asset?.isConnected)asset.querySelector<HTMLElement>(".effect-lift,.effect-glow")?.focus({preventScroll:true});
                  });
                }}>{["hover-lift","hover-glow"].includes(id)?"試玩":"重播"}</button>
                {onTry&&!reason&&<button type="button" className="motion-tune" aria-label={"在元件上試看"+effectLabels[id]} onClick={()=>onTry(id,tuned[id])}>試看</button>}
                <button type="button" className="motion-favorite" aria-pressed={favorites.includes(id)} aria-label={(favorites.includes(id)?"取消收藏":"收藏")+effectLabels[id]} onClick={()=>toggleFavorite(id)}>{favorites.includes(id)?"★":"☆"}</button>
                {Object.keys(motionCatalog[id].controls).length>0&&<button type="button" className="motion-tune" aria-expanded={tuning===id} aria-label={"調整"+effectLabels[id]+"參數"} onClick={()=>setTuning(tuning===id?null:id)}>調整</button>}
                </div>
                {tuning===id&&<div className="motion-tune-fields" role="group" aria-label={effectLabels[id]+"預覽參數"}><MotionControlsFields id={id} values={{...defaultControls(id),...tuned[id]} as never} onChange={(values:MotionControls)=>{setTuned(t=>({...t,[id]:values}));setReplay(v=>({...v,[id]:(v[id]??0)+1}));}}/><button type="button" onClick={()=>{setTuned(previous=>{const next={...previous};delete next[id];return next;});setReplay(v=>({...v,[id]:(v[id]??0)+1}));}}>恢復預設值</button></div>}
                <small>{recommendations.find(item=>item.id===id)?.reasons.join("、") ?? reason ?? descriptions[id]}</small>
                <span className="asset-use-case">{motionCatalog[id].bestFor}</span><span className="asset-trigger">{[...new Set(motionCatalog[id].interactionType.map(t=>triggerLabels[t]??t))].join(" · ")}</span>
              </div>
            );
          })}
      </div></section>)}
      </div>
    </section>
  );
}
