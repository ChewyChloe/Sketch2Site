import {useCinematicMotion,cinematicTextIds} from "./CinematicMotion";
import {CinematicText} from "./CinematicText";
import {StoryGroup,CardShuffle,FrameSequence,storyGroupIds} from "./StoryMotion";
import {useAdvancedMotion,AdvancedText,advancedTextIds} from "./AdvancedMotion";
import {useExtendedMotion,LetterAssembly,AccentStroke,DisclosurePanel} from "./ExtendedMotion";
import {FoldReveal} from "./FoldReveal";
import {PhysicsTags} from "./PhysicsTags";
import {CountUp,CurvedText,FlipCard} from "./MotionRuntime";
import { motionCatalog, motionIds, motionNumber, motionDuration } from "./motion";
import {
  createContext,
  useContext,
  Component,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  validatePage,
  reconcilePage,
  type PageNode,
  type PageSpec,
  effectIds,
} from "./pageSpec";
import "./pageRuntime.css";
type Effect = PageNode["effects"][number];
export const animationRegistry = Object.fromEntries(motionIds.filter(id=>motionCatalog[id].status==="DONE").map(id=>[id,{entrance:["fade-in","slide-up","scale-in"].includes(id),hover:["hover-lift","hover-glow"].includes(id),stagger:id==="stagger-reveal"}])) as Record<typeof motionIds[number],{entrance?:boolean;hover?:boolean;stagger?:boolean}>;
const easingValues:Record<string,string>={smooth:"cubic-bezier(.2,.7,.3,1)",linear:"linear","ease-out":"ease-out"};
function animateEntrance(element:HTMLElement,effects:Effect[],extraDelay=0) {
  const entrance=effects.filter(e=>animationRegistry[e.presetId]?.entrance);
  if(!entrance.length)return null;
  const slide=entrance.find(e=>e.presetId==="slide-up"),scale=entrance.find(e=>e.presetId==="scale-in");
  return element.animate([
    {opacity:0,translate:`0 ${slide?motionNumber(slide,"distancePx"):0}px`,scale:scale?motionNumber(scale,"initialScale",.96):1},
    {opacity:1,translate:"0 0",scale:1}
  ],{duration:Math.max(...entrance.map(motionDuration)),delay:Math.max(...entrance.map(e=>motionNumber(e,"delayMs")))+extraDelay,
    easing:easingValues[String(entrance[0].validatedControls.easing??"smooth")],fill:"backwards"});
}
function useAnimations(node:PageNode,ref:React.RefObject<HTMLElement|null>) {
 useEffect(()=>{
  const el=ref.current;if(!el||!node.effects.length||!el.animate)return;
  const media=matchMedia("(prefers-reduced-motion: reduce)"),running:Animation[]=[];
  let observer:IntersectionObserver|undefined;
  const cancel=()=>{observer?.disconnect();running.forEach(a=>a.cancel());};
  const play=(effects:Effect[])=>{if(media.matches)return;const own=animateEntrance(el,effects);if(own)running.push(own);
   const stagger=effects.find(e=>e.presetId==="stagger-reveal");
   if(stagger)node.children?.forEach((child,index)=>{
    if(child.effects.some(e=>animationRegistry[e.presetId]?.entrance))return;
    const target=el.querySelector<HTMLElement>('[data-page-id="'+child.id+'"]');if(!target)return;
    const v1=stagger.presetVersion===1,c=stagger.validatedControls;
    const presetId=v1?(c.revealStyle==="fade"?"fade-in":c.revealStyle==="scale"?"scale-in":"slide-up"):"slide-up";
    const animation=animateEntrance(target,[{...stagger,presetId,validatedControls:{durationMs:motionDuration(stagger),delayMs:0,distancePx:v1?16:motionNumber(stagger,"distancePx"),initialScale:.96}}],
      Math.min(1200,(c.direction==="reverse"?(node.children!.length-1-index):index)*motionNumber(stagger,"intervalMs",100)));
    if(animation)running.push(animation);
   });
  };
  if(!media.matches){
   play(node.effects.filter(e=>e.validatedControls.trigger==="enter"||e.presetId==="scale-in"&&e.presetVersion===1));
   const observed=node.effects.filter(e=>e.validatedControls.trigger!=="enter"&&!(e.presetId==="scale-in"&&e.presetVersion===1));
   if(observed.length){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){play(observed);observer?.disconnect();}},{threshold:.05});observer.observe(el);}
  }
  media.addEventListener("change",cancel);return ()=>{cancel();media.removeEventListener("change",cancel);};
 },[node,ref]);
}
const MotionPreview = createContext(false);
const AssetUrls = createContext<Readonly<Record<string, string | null>>>({});
function SafeImage({ node }: { node: PageNode }) {
  const urls = useContext(AssetUrls);
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const resolved = urls[node.src!];
  useEffect(() => {
    setFailed(false);
  }, [resolved, node.src]);
  if (resolved === "")
    return (
      <div className="page-image-error" role="status">
        正在載入圖片…
      </div>
    );
  if (resolved === null)
    return (
      <div className="page-image-error" role="status">
        找不到本機圖片，請重新匯入。
      </div>
    );
  return failed ? (
    <div className="page-image-error" role="status">
      <p>圖片無法載入</p>
      <button
        onClick={() => {
          setFailed(false);
          setAttempt((n) => n + 1);
        }}
      >
        重試圖片
      </button>
    </div>
  ) : (
    <img
      key={attempt}
      src={urls[node.src!] ?? import.meta.env.BASE_URL + node.src!.slice(1)}
      alt={node.alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
type RegistryEntry = {
  tag: "section" | "div" | "article" | "h1" | "h2" | "h3" | "p" | "a";
  className: string;
};
export const componentRegistry: Record<PageNode["type"], RegistryEntry> = {
  section: { tag: "section", className: "page-section" },
  container: { tag: "div", className: "page-container" },
  heading: { tag: "h2", className: "page-heading" },
  paragraph: { tag: "p", className: "page-paragraph" },
  button: { tag: "a", className: "page-button" },
  image: { tag: "div", className: "page-image" },
  card: { tag: "article", className: "page-card" },
  stack: { tag: "div", className: "page-stack" },
  grid: { tag: "div", className: "page-grid" },
};
export const RenderNode = memo(function NodeView({ node }: { node: PageNode }) {
  const ref = useRef<HTMLElement>(null);
  useAnimations(node, ref);
  useExtendedMotion(node,ref);
  useAdvancedMotion(node,ref);
  const motionUrls=useContext(AssetUrls),motionPreview=useContext(MotionPreview);
  useCinematicMotion(node,ref,motionUrls);
  const entry = componentRegistry[node.type],
    Tag =
      node.type === "heading"
        ? (`h${node.level}` as "h1" | "h2" | "h3")
        : entry.tag;
  const lift = node.effects.find((e) => e.presetId === "hover-lift"),
    glow = node.effects.find((e) => e.presetId === "hover-glow");
  const breathing=node.effects.find(e=>e.presetId==="breathing-glow"),curve=node.effects.find(e=>e.presetId==="curved-path-text"),count=node.effects.find(e=>e.presetId==="count-up"),flip=node.effects.find(e=>e.presetId==="flip-card");
  const physics=node.effects.find(e=>e.presetId==="physics-tag-field"),fold=node.effects.find(e=>e.presetId==="fold-reveal");
  useEffect(()=>{
    const el=ref.current;if(!breathing||!el)return;
    let visible=false;
    const update=()=>{el.dataset.motionPaused=String(!visible||document.hidden);};
    const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);update();});
    observer.observe(el);document.addEventListener('visibilitychange',update);update();
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
  },[breathing]);
  const assembly=node.effects.find(e=>e.presetId==="letter-assembly"),accent=node.effects.find(e=>e.presetId==="accent-stroke"),disclosure=node.effects.find(e=>e.presetId==="disclosure-panel");
  const advancedText=node.effects.find(e=>advancedTextIds.includes(e.presetId));
  const cinematicText=node.effects.find(e=>cinematicTextIds.includes(e.presetId)),story=node.effects.find(e=>storyGroupIds.includes(e.presetId)),shuffle=node.effects.find(e=>e.presetId==="card-stack-shuffle"),sequence=node.effects.find(e=>e.presetId==="scroll-image-sequence");
  const children=node.children?.map(child=><RenderNode key={child.id} node={child}/>);
  const style = {
    "--breathing-cycle":(breathing?motionNumber(breathing,"cycleMs"):3200)+"ms",
    "--breathing-spread":(breathing?motionNumber(breathing,"spreadPx"):12)+"px",
    "--breathing-strength":breathing?.validatedControls.intensity==="medium"?"30%":"15%",
    "--page-columns": node.columns ?? 1,
    "--effect-shadow": lift?.validatedControls.shadowIntensity==="none"?"none":lift?.validatedControls.shadowIntensity==="medium"?"0 8px 18px rgb(0 0 0 / .16)":"0 4px 10px rgb(0 0 0 / .08)",
    "--glow-spread": (glow?motionNumber(glow,"spreadPx",4):4)+"px",
    "--glow-strength": glow?.validatedControls.intensity==="medium"?"35%":"18%",
    "--effect-lift": (lift ? motionNumber(lift,lift.presetVersion===0?"distancePx":"liftPx",5) : 0) + "px",
    "--hover-duration": (lift ? motionDuration(lift) : glow ? motionDuration(glow) : 250) + "ms",
  } as CSSProperties;
  return (
    <Tag
      ref={ref as never}
      id={"page-" + node.id}
      data-page-id={node.id}
      data-page-type={node.type}
      data-pause-hover={breathing?.validatedControls.pauseOnHover===true}
      tabIndex={(lift||glow)&&node.type!=="button"?0:undefined}
      data-effects={node.effects.map((e) => e.presetId).join(" ")}
      className={[
        "page-node",
        entry.className,
        node.role ? "role-" + node.role : "",
        "gap-" + node.style.gap,
        "pad-" + node.style.padding,
        "align-" + node.style.align,
        "tone-" + node.style.tone,
        "width-" + node.style.width,
        lift ? "effect-lift" : "",
        glow ? "effect-glow" : "",
        breathing ? "effect-breathing" : "",
      ].join(" ")}
      style={style}
      {...(node.type === "button"
        ? {
            href: node.href!.startsWith("#")
              ? "#page-" + node.href!.slice(1)
              : node.href,
            target: node.href!.startsWith("#") ? undefined : "_blank",
            rel: "noopener noreferrer",
          }
        : {})}
    >
      {sequence?<FrameSequence effect={sequence} original={node.src!} alt={node.alt!} urls={motionUrls}/>:node.type === "image" ? (
        <SafeImage key={node.src} node={node} />
      ) : cinematicText ? <CinematicText effect={cinematicText} text={node.content!}/>:story?<StoryGroup effect={story} demo={motionPreview}>{children}</StoryGroup>:shuffle?<CardShuffle effect={shuffle}>{children}</CardShuffle>:advancedText ? <AdvancedText text={node.content!} effect={advancedText}/> : disclosure ? <DisclosurePanel effect={disclosure}>{children}</DisclosurePanel> : assembly ? <LetterAssembly effect={assembly} text={node.content!}/> : accent ? <AccentStroke effect={accent} text={node.content!}/> : physics ? <>{children}<PhysicsTags effect={physics}/></> : fold ? <FoldReveal effect={fold}>{children}</FoldReveal> : flip ? <FlipCard effect={flip}>{children}</FlipCard> : count ? <CountUp effect={count} original={node.content!}/> : curve ? <CurvedText effect={curve} text={node.content!}/> : node.children ? children : node.content}
    </Tag>
  );
});
// Navigation labels are the page's own section headings; no text is invented.
function firstHeading(node: PageNode): PageNode | undefined {
  if (node.type === "heading") return node;
  for (const child of node.children ?? []) {
    const found = firstHeading(child);
    if (found) return found;
  }
  return undefined;
}
function PageNav({ page }: { page: PageSpec }) {
  const links = page.sections
    .filter((s) => s.role !== "hero")
    .map((s) => ({ id: s.id, label: firstHeading(s)?.content }))
    .filter((l): l is { id: string; label: string } => !!l.label && l.label.length <= 24)
    .slice(0, 5);
  return (
    <header className="page-nav">
      <a className="page-brand" href={"#page-" + page.sections[0].id}>{page.metadata.title}</a>
      {links.length > 0 && (
        <nav aria-label="頁面導覽">
          {links.map((l) => (
            <a key={l.id} href={"#page-" + l.id}>{l.label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}
class RenderBoundary extends Component<
  { children: ReactNode; resetKey: unknown },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(
    previous: Readonly<{ children: ReactNode; resetKey: unknown }>,
  ) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey)
      this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="preview-error">
        預覽失敗：頁面無法顯示。請重新載入檔案。
      </p>
    ) : (
      this.props.children
    );
  }
}
export function PageRuntime({
  input,
  assetUrls = {},
  motionPreview = false,
}: {
  input: unknown;
  assetUrls?: Readonly<Record<string, string | null>>;
  motionPreview?:boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previous = useRef<PageSpec | undefined>(undefined);
  const result = useMemo(() => {
    const checked = validatePage(input);
    return checked.ok
      ? {
          ok: true as const,
          page: reconcilePage(previous.current, checked.page),
        }
      : checked;
  }, [input]);
  useEffect(() => {
    if (result.ok) previous.current = result.page;
  }, [result]);
  if (!result.ok)
    return (
      <p role="alert" className="preview-error">
        {result.error}
      </p>
    );
  const page = result.page;
  const sources=new Map<string,PageNode>();const collect=(n:PageNode)=>{sources.set(n.id,n);n.children?.forEach(collect);};page.sections.forEach(collect);
  return (
    <AssetUrls.Provider value={assetUrls}><MotionPreview.Provider value={motionPreview}>
      <RenderBoundary resetKey={input}>
        <div
          ref={rootRef}
          className={
            "rendered-page typography-" +
            page.typography +
            " theme-" +
            page.styles
          }
          data-theme={page.theme ?? "classic"}
          lang={page.metadata.language}
          aria-label={page.metadata.title}
          style={
            {
              "--desktop-columns": page.responsive.desktopColumns,
            } as CSSProperties
          }
          onClick={(e) => {
            const link = (e.target as Element).closest("a");
            const href = link?.getAttribute("href");
            if (href?.startsWith("#page-")) {
              e.preventDefault();
              const target = e.currentTarget.querySelector<HTMLElement>(
                '[id="' + href.slice(1) + '"]',
              );
              target?.scrollIntoView({ behavior: "instant", block: "start" });
              target?.setAttribute("tabindex", "-1");
              target?.focus({ preventScroll: true });
            }
          }}
        >
          {page.draftLayout?<div className="draft-layout" style={{aspectRatio:'1440 / 1200'}}>{[...page.draftLayout.items].sort((a,b)=>a.y-b.y||a.x-b.x).map(p=><div className="draft-placement" key={p.id} style={{aspectRatio:`${p.width} / ${p.height}`,'--draft-left':`${p.x/14.4}%`,'--draft-top':`${p.y/12}%`,'--draft-width':`${p.width/14.4}%`,'--draft-height':`${p.height/12}%`,zIndex:p.zIndex} as CSSProperties}><RenderNode node={sources.get(p.id)!}/></div>)}</div>:<>{page.chrome?.nav&&<PageNav page={page}/>}<main className="page-main">{page.sections.map(section=><RenderNode key={section.id} node={section}/>)}</main>{page.chrome?.footer&&<footer className="page-footer"><span>{page.metadata.title}</span><a href={"#page-"+page.sections[0].id}>回到頂端 ↑</a></footer>}</>}
        </div>
      </RenderBoundary>
    </MotionPreview.Provider></AssetUrls.Provider>
  );
}
