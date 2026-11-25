import {cinematicSample} from "./cinematicSamples";
import {createMotion} from "./motion";
import {cinematicMotionIds,advancedMotionIds,motionCatalog,signatureMotionIds} from "./motionCatalog";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { useEffect, useRef, useMemo, useState } from "react";
import { PageRenderer, animationRegistry } from "./PageRenderer";
import { PageSchema, type effectIds } from "./pageSpec";
import { effectLabels } from "./visualEditing";
type EffectId = (typeof effectIds)[number];
const descriptions=Object.fromEntries(Object.entries(motionCatalog).map(([id,d])=>[id,d.summary])) as Record<EffectId,string>;
const signatureFamily:Record<string,number>={typewriter:0,'marquee-text':0,'gradient-text-flow':0,'blur-in':2,'float-idle':2,'confetti-burst':1,'jelly-press':1,'shine-sweep':1};
const motionFamily=(id:EffectId)=>{if(id in signatureFamily)return signatureFamily[id];const cinematic=cinematicMotionIds.indexOf(id as typeof cinematicMotionIds[number]);if(cinematic>=0)return cinematic<4?0:cinematic<9?1:cinematic<14?2:cinematic<18?3:4;const index=advancedMotionIds.indexOf(id as typeof advancedMotionIds[number]);if(index>=0)return Math.floor(index/5);const d=motionCatalog[id];return d.targetType.every(t=>['text','heading','paragraph'].includes(t))?0:d.targetType.includes('button')&&!d.targetType.includes('container')?1:d.targetType.includes('image')||['flip-card','fold-reveal'].includes(id)?2:3;};
const autoplayIds=new Set<string>(['fade-in','slide-up','scale-in','stagger-reveal','letter-assembly','accent-stroke','image-reveal','character-decode','split-line-assembly','rolling-characters','hand-drawn-highlight','venetian-reveal','circular-mask-expansion','grid-diagonal-turn','svg-path-drawing','numeric-gauge-sweep','count-up','elastic-word-bounce','pixel-dissolve','shutter-lens-transition','glitch-slice-reveal','liquid-distortion-reveal','typewriter','blur-in','curved-path-text','kinetic-text-wave']);
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
function CinematicSample({id,replay}:{id:typeof cinematicMotionIds[number];replay:number}){
 const [page]=useState(()=>cinematicSample(id)),ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const element=ref.current;if(!replay||!element)return;if(typeof IntersectionObserver==='undefined'){replayCinematic(element,id);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();replayCinematic(element,id);}});observer.observe(element);return()=>observer.disconnect();},[id,replay]);
 return <div ref={ref}><PageRenderer input={page} motionPreview/></div>;
}
function EffectSample({ id, active }: { id: EffectId; active: boolean }) {
  const [ids] = useState(() =>
    Array.from({ length: 5 }, () => crypto.randomUUID()),
  );
  const page = useMemo(() => {
    const paragraph=(index:number,content:string)=>({id:ids[index],type:"paragraph",content,style:{padding:"none",gap:"none"}});
    const persistent=advancedMotionIds.includes(id as typeof advancedMotionIds[number])||id in signatureFamily||["breathing-glow","curved-path-text","count-up","flip-card","fold-reveal","physics-tag-field","magnetic-control","press-feedback","focus-transfer","scroll-progress","disclosure-panel"].includes(id);
    const controls=id==="count-up"?{endValue:128,durationMs:1200}:id==="curved-path-text"?{curvature:"medium"}:id==="flip-card"?{backText:"把細節，說清楚。"}:id==="fold-reveal"?{underText:"下一層，藏著新想法。"}:id==="physics-tag-field"?{labels:["設計","工程","研究"]}:{};
    const button=["confetti-burst","jelly-press","shine-sweep","cursor-spotlight","liquid-button-fill","radial-ink-ripple","orbiting-icon","border-light-trace","hover-glow","breathing-glow","magnetic-control","press-feedback"].includes(id);
    const leaf=["typewriter","marquee-text","gradient-text-flow","character-decode","split-line-assembly","rolling-characters","hand-drawn-highlight","kinetic-text-wave","numeric-gauge-sweep","count-up","curved-path-text","letter-assembly","accent-stroke"].includes(id);
    const content:Record<string,string>={"fade-in":"讓內容自然出現","slide-up":"向上，回到原位。","scale-in":"讓重點被看見","hover-lift":"移入，輕輕浮起。","flip-card":"從想法到作品","fold-reveal":"把這一頁揭開。"};
    return PageSchema.parse({schemaVersion:2,metadata:{title:"動畫素材示意",language:"zh-Hant"},typography:"sans",styles:"neutral",responsive:{mobileColumns:1,desktopColumns:1},sections:[{
      id:ids[0],type:"section",style:{padding:"none",gap:"none"},children:[{
        id:ids[1],type:["image-reveal","venetian-reveal","circular-mask-expansion","cinematic-image-pan","blur-in","float-idle"].includes(id)?"image":button?"button":leaf?"paragraph":id==="physics-tag-field"?"container":"card",
        style:{padding:button?"small":leaf||id==="physics-tag-field"?"none":"small",gap:"small",tone:button?"accent":"plain"},
        effects:active||persistent?[createMotion(id,ids[1],controls)]:[],
        ...(["image-reveal","venetian-reveal","circular-mask-expansion","cinematic-image-pan","blur-in","float-idle"].includes(id)?{src:["blur-in","float-idle","cinematic-image-pan"].includes(id)?"/assets/samples/cafe.jpg":"/assets/samples/camera.jpg",alt:"圖片動畫示意"}:button?{content:id==="confetti-burst"?"報名成功！":id==="jelly-press"?"點我試試":id==="shine-sweep"?"立即購買":"看看作品",href:"#"+ids[1]}:leaf?{content:id==="numeric-gauge-sweep"?"75%":id==="character-decode"?"Decode 想像 2026":id==="split-line-assembly"?"每一行靈感\n組成完整作品":id==="rolling-characters"?"2026 創作":id==="kinetic-text-wave"?"讓文字起舞":id==="hand-drawn-highlight"?"標記真正重要的事":id==="count-up"?"128":id==="letter-assembly"?"把靈感，拼成作品。":id==="accent-stroke"?"讓重點被記住":id==="typewriter"?"你好，歡迎光臨！":id==="marquee-text"?"本週新品上市 · 第二杯半價 · 歡迎預約":id==="gradient-text-flow"?"把想法變成網站":"讓想法流動"}:{children:id==="physics-tag-field"?[]:["stagger-reveal","focus-transfer","disclosure-panel","scroll-progress","card-deck-fan","layered-parallax","grid-diagonal-turn","svg-path-drawing","scroll-milestones"].includes(id)?[paragraph(2,"構思"),paragraph(3,"設計"),paragraph(4,"實作")]:[paragraph(2,content[id]??"內容示意")]}),
      }],
    }]});
  },[id,active,ids]);
  return <PageRenderer input={page} />;
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
}: {
  selectedLabel?: string;
  compatibility(id: EffectId): string | null;
  onChoose(id: EffectId): void;
  onDragStart(id: EffectId, data: DataTransfer): void;
  onDragEnd?(): void;
  disabled?: boolean;
  filter?: string;
  draft?: boolean;
}) {
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("");
  const [replay,setReplay]=useState<Record<string,number>>({});
  const [active, setActive] = useState<EffectId | null>(null);
  // Entrance samples replay by themselves while they are on screen, so the library feels
  // alive without clicking 重播 (off when the viewer prefers reduced motion).
  const root=useRef<HTMLElement>(null);
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
      setReplay(v=>{const next={...v};for(const id of onScreen)if(id!==hovered)next[id]=(next[id]??0)+1;return next;});
    },3800);
    return()=>{io.disconnect();mo.disconnect();window.clearInterval(timer);};
  },[]);
  const visibleIds=(Object.keys(animationRegistry) as EffectId[]).filter(id=>
    (effectLabels[id]+id+motionCatalog[id].nameEn+descriptions[id]+motionCatalog[id].bestFor).toLowerCase().includes((filter||query).trim().toLowerCase()) && (!category||motionCatalog[id].category===category));
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
            : "先點一下要動的元件，再按「套用」；用電腦也可以直接拖過去。"}
        </p>
      </div>
      <div className="motion-library-filters">
        {!draft && <input type="search" aria-label="搜尋動畫" placeholder="搜尋：打字、彈跳、圖片…" value={query} onChange={e=>setQuery(e.target.value)}/>}
        <div className="lib-chips" role="group" aria-label="動畫使用情境">
          {([["","全部"],["進場","出場動畫"],["互動","滑過與點擊"],["內容","閱讀與卡片"],["資訊","捲動"]] as const).map(([value,label])=>(
            <button key={value||"all"} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{label}</button>
          ))}
        </div>
      </div>
      {!visibleIds.length && <p role="status">找不到符合的動畫，請調整搜尋或情境。</p>}
      <div className="animation-groups">
        {families.map((family,index)=>visibleIds.some(id=>motionFamily(id)===index)&&<section className="animation-family" key={family} aria-label={family}><h3>{family}</h3><div className="animation-assets" role="list">
        {visibleIds.filter(id=>motionFamily(id)===index).map((id) => {
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
                  <span className="asset-category">{motionCatalog[id].category}</span>{(signatureMotionIds as readonly string[]).includes(id)&&<span className="asset-new">NEW</span>}
                  <div className="asset-sample">
                    {cinematicMotionIds.includes(id as typeof cinematicMotionIds[number])?<CinematicSample key={replay[id]??0} id={id as typeof cinematicMotionIds[number]} replay={replay[id]??0}/>:<EffectSample key={replay[id]??0} id={id} active={active === id} />}
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
                  onClick={() => onChoose(id)}
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
                </div>
                <small>{reason ?? descriptions[id]}</small>
                <span className="asset-use-case">{motionCatalog[id].bestFor}</span><span className="asset-trigger">{[...new Set(motionCatalog[id].interactionType.map(t=>triggerLabels[t]??t))].join(" · ")}</span>
              </div>
            );
          })}
      </div></section>)}
      </div>
    </section>
  );
}
