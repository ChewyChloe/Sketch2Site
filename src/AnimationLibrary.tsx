import {createMotion} from "./motion";
import {motionCatalog} from "./motionCatalog";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { useMemo, useState } from "react";
import { PageRenderer, animationRegistry } from "./PageRenderer";
import { PageSchema, type effectIds } from "./pageSpec";
import { effectLabels } from "./visualEditing";
type EffectId = (typeof effectIds)[number];
const descriptions=Object.fromEntries(Object.entries(motionCatalog).map(([id,d])=>[id,d.summary])) as Record<EffectId,string>;
function EffectSample({ id, active }: { id: EffectId; active: boolean }) {
  const [ids] = useState(() =>
    Array.from({ length: 5 }, () => crypto.randomUUID()),
  );
  const page = useMemo(() => {
    const paragraph=(index:number,content:string)=>({id:ids[index],type:"paragraph",content,style:{padding:"none",gap:"none"}});
    const persistent=["breathing-glow","curved-path-text","count-up","flip-card","fold-reveal","physics-tag-field","magnetic-control","press-feedback","focus-transfer","scroll-progress","disclosure-panel"].includes(id);
    const controls=id==="count-up"?{endValue:128,durationMs:1200}:id==="curved-path-text"?{curvature:"medium"}:id==="flip-card"?{backText:"把細節，說清楚。"}:id==="fold-reveal"?{underText:"下一層，藏著新想法。"}:id==="physics-tag-field"?{labels:["設計","工程","研究"]}:{};
    const button=["hover-glow","breathing-glow","magnetic-control","press-feedback"].includes(id);
    const leaf=["count-up","curved-path-text","letter-assembly","accent-stroke"].includes(id);
    const content:Record<string,string>={"fade-in":"讓內容自然出現","slide-up":"向上，回到原位。","scale-in":"讓重點被看見","hover-lift":"移入，輕輕浮起。","flip-card":"從想法到作品","fold-reveal":"把這一頁揭開。"};
    return PageSchema.parse({schemaVersion:2,metadata:{title:"動畫素材示意",language:"zh-Hant"},typography:"sans",styles:"neutral",responsive:{mobileColumns:1,desktopColumns:1},sections:[{
      id:ids[0],type:"section",style:{padding:"none",gap:"none"},children:[{
        id:ids[1],type:id==="image-reveal"?"image":button?"button":leaf?"paragraph":id==="physics-tag-field"?"container":"card",
        style:{padding:button?"small":leaf||id==="physics-tag-field"?"none":"small",gap:"small",tone:button?"accent":"plain"},
        effects:active||persistent?[createMotion(id,ids[1],controls)]:[],
        ...(id==="image-reveal"?{src:"/assets/workspace.svg",alt:"圖片揭露示意"}:button?{content:"看看作品",href:"https://example.com"}:leaf?{content:id==="count-up"?"128":id==="letter-assembly"?"把靈感，拼成作品。":id==="accent-stroke"?"讓重點被記住":"讓想法流動"}:{children:id==="physics-tag-field"?[]:["stagger-reveal","focus-transfer","disclosure-panel","scroll-progress"].includes(id)?[paragraph(2,"構思"),paragraph(3,"設計"),paragraph(4,"實作")]:[paragraph(2,content[id]??"內容示意")]}),
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
  const visibleIds=(Object.keys(animationRegistry) as EffectId[]).filter(id=>
    (effectLabels[id]+id+motionCatalog[id].nameEn+descriptions[id]+motionCatalog[id].bestFor).toLowerCase().includes((filter||query).trim().toLowerCase()) && (!category||motionCatalog[id].category===category));
  return (
    <section
      className="animation-library"
      aria-label={draft ? "草稿動畫素材" : "預覽動畫效果庫"}
    >
      <div className="panel-intro">
        <h2>動畫素材</h2>
        <small>{Object.keys(animationRegistry).length} 種效果 · 互動示意</small>
        <p>
          {selectedLabel
            ? `目前選取：${selectedLabel}`
            : "拖至元件，或選取元件後套用。"}
        </p>
        {draft && <small>草稿只附加標記</small>}
      </div>
      <div className="motion-library-filters">
        {!draft && <input type="search" aria-label="搜尋動畫" placeholder="搜尋動畫…" value={query} onChange={e=>setQuery(e.target.value)}/>}
        <select aria-label="動畫使用情境" value={category} onChange={e=>setCategory(e.target.value)}>
          <option value="">全部情境</option><option value="進場">內容進場</option><option value="互動">互動回饋</option><option value="內容">閱讀與卡片</option><option value="資訊">捲動資訊</option>
        </select>
      </div>
      {!visibleIds.length && <p role="status">找不到符合的動畫，請調整搜尋或情境。</p>}
      <div className="animation-assets" role="list">
        {visibleIds          .map((id) => {
            const reason = compatibility(id);
            return (
              <div
                className="animation-asset"
                role="listitem"
                key={id}
                data-effect-id={id}
                data-category={motionCatalog[id].category}
                data-compatibility={reason ? "unavailable" : "available"}
                draggable={!disabled && !["flip-card","physics-tag-field","fold-reveal","focus-transfer","disclosure-panel","scroll-progress","magnetic-control","press-feedback"].includes(id)}
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
                  <span className="asset-category">{motionCatalog[id].category}</span>
                  <div className="asset-sample">
                    <EffectSample key={replay[id]??0} id={id} active={active === id} />
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
                  <WorkbenchIcon name="grip" />
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
                <span className="asset-use-case">{motionCatalog[id].bestFor}</span>
              </div>
            );
          })}
      </div>
    </section>
  );
}
