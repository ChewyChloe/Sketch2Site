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
  type ImageLook,
  effectIds,
  frameRatios,
  lookStyle,
  textCss,
  brandCss,
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
// Forms submit only on a published/exported site; editor previews never send data.
export const FormLive = createContext(true);
function fieldType(label: string) {
  if (/mail|信箱|郵件/i.test(label)) return "email";
  if (/電話|手機|phone|tel/i.test(label)) return "tel";
  if (/訊息|留言|內容|備註|問題|說明|需求|message/i.test(label)) return "textarea";
  return "text";
}
function SiteForm({ node }: { node: PageNode }) {
  const live = useContext(FormLive);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed" | "preview">("idle");
  const fields = node.content!.split("\n");
  return (
    <form
      action={node.href}
      method="POST"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!live) return setState("preview");
        const form = e.currentTarget;
        setState("sending");
        try {
          const response = await fetch(node.href!, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
          setState(response.ok ? "sent" : "failed");
          if (response.ok) form.reset();
        } catch {
          setState("failed");
        }
      }}
    >
      {fields.map((field, i) => {
        const id = "form-" + node.id + "-" + i, type = fieldType(field);
        return (
          <label key={i} htmlFor={id} className="page-form-field">
            <span>{field}</span>
            {type === "textarea" ? <textarea id={id} name={field} rows={4} required /> : <input id={id} name={field} type={type} required autoComplete={type === "email" ? "email" : type === "tel" ? "tel" : undefined} />}
          </label>
        );
      })}
      <button type="submit" className="page-button" disabled={state === "sending"}>{state === "sending" ? "送出中…" : "送出"}</button>
      <p className="page-form-status" role="status" aria-live="polite">
        {state === "sent" ? "已送出，謝謝你的留言。" : state === "failed" ? "送出失敗，請稍後再試。" : state === "preview" ? "預覽中不會送出；匯出網站後才會寄到接收網址。" : ""}
      </p>
    </form>
  );
}
/**
 * A photo inside a frame shape, with crop (focus + zoom), flip and adjustments.
 * Shared by the editor canvas, the site and exported projects.
 */
export function FrameBox({ look, children, className = "", ratio }: { look?: ImageLook; children: ReactNode; className?: string; ratio?: number }) {
  if (!look) return <>{children}</>;
  const r = ratio ?? (look.frame ? frameRatios[look.frame] : undefined);
  const { objectPosition, ...photo } = lookStyle(look);
  return (
    <div
      className={"page-frame frame-" + (look.frame ?? "plain") + (className ? " " + className : "")}
      data-frame={look.frame ?? "plain"}
      style={r ? ({ "--frame-ratio": String(r) } as CSSProperties) : undefined}
    >
      <div className="page-frame-photo" style={{ ...photo, "--focus": objectPosition } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}
// The brand logo is decorative next to the site name (the name stays the link text).
function BrandLogo({ src }: { src: string }) {
  const urls = useContext(AssetUrls);
  const url = urls[src] ?? (src.startsWith("/assets/local/") ? null : import.meta.env.BASE_URL + src.slice(1));
  return url ? <img className="page-brand-logo" src={url} alt="" aria-hidden="true" /> : null;
}
const AssetUrls = createContext<Readonly<Record<string, string | null>>>({});
// The built-in sample image stands for "a picture goes here": show a calm, theme-tinted
// frame with its description instead of repeating the same mock screenshot everywhere.
// Only themed (generated) pages use the frame; pixel-reading motions keep the real <img>.
const sampleImage = "/assets/workspace.svg";
const ThemedPage = createContext(false);
// These read the image pixels, so they keep a real <img>; clip/mask motions animate the frame fine.
const pixelMotions = new Set(["cinematic-image-pan", "pixel-dissolve", "shutter-lens-transition", "glitch-slice-reveal", "liquid-distortion-reveal", "scroll-image-sequence"]);
function SafeImage({ node }: { node: PageNode }) {
  const themed = useContext(ThemedPage);
  if (themed && node.src === sampleImage && !node.effects.some((e) => pixelMotions.has(e.presetId)))
    return (
      <div className="page-image-placeholder" role="img" aria-label={node.alt}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
        <span>{node.alt}</span>
      </div>
    );
  return <LoadedImage node={node} />;
}
function LoadedImage({ node }: { node: PageNode }) {
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
  form: { tag: "div", className: "page-form" },
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
    ...textCss(node.text),
  } as CSSProperties;
  return (
    <Tag
      ref={ref as never}
      id={"page-" + node.id}
      data-page-id={node.id}
      data-page-type={node.type}
      data-text-style={node.text ? "" : undefined}
      data-pause-hover={breathing?.validatedControls.pauseOnHover===true}
      tabIndex={(lift||glow)&&node.type!=="button"?0:undefined}
      data-effects={node.effects.map((e) => e.presetId).join(" ")}
      className={[
        "page-node",
        entry.className,
        node.role ? "role-" + node.role : "",
        // Long display headings get a smaller size so they do not break mid-word.
        node.type === "heading" && (node.content?.length ?? 0) > 9 ? "is-long" : "",
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
      {node.type==="form"?<SiteForm node={node}/>:sequence?<FrameSequence effect={sequence} original={node.src!} alt={node.alt!} urls={motionUrls}/>:node.type === "image" ? (
        <FrameBox look={node.look}><SafeImage key={node.src} node={node} /></FrameBox>
      ) : cinematicText ? <CinematicText effect={cinematicText} text={node.content!}/>:story?<StoryGroup effect={story} demo={motionPreview}>{children}</StoryGroup>:shuffle?<CardShuffle effect={shuffle}>{children}</CardShuffle>:advancedText ? <AdvancedText text={node.content!} effect={advancedText}/> : disclosure ? <DisclosurePanel effect={disclosure}>{children}</DisclosurePanel> : assembly ? <LetterAssembly effect={assembly} text={node.content!}/> : accent ? <AccentStroke effect={accent} text={node.content!}/> : physics ? <>{children}<PhysicsTags effect={physics}/></> : fold ? <FoldReveal effect={fold}>{children}</FoldReveal> : flip ? <FlipCard effect={flip}>{children}</FlipCard> : count ? <CountUp effect={count} original={node.content!}/> : curve ? <CurvedText effect={curve} text={node.content!}/> : node.children ? children : node.text?.highlight ? <span className="text-mark">{node.content}</span> : node.content}
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
function PageNav({ page, view, sections }: { page: PageSpec; view: string | null; sections: PageNode[] }) {
  // Multi-page sites list their pages; single pages list their own section headings.
  const pages = page.subpages?.length && page.home ? [{ id: page.home.id, label: page.home.title }, ...page.subpages.map((p) => ({ id: p.id, label: p.title }))] : null;
  const current = view ?? page.home?.id ?? null;
  const links = pages ?? sections
    .filter((s) => s.role !== "hero")
    .map((s) => ({ id: s.id, label: firstHeading(s)?.content }))
    .filter((l): l is { id: string; label: string } => !!l.label && l.label.length <= 24)
    .slice(0, 5);
  return (
    <header className="page-nav">
      <a className="page-brand" href={"#page-" + (page.home?.id ?? sections[0].id)}>{page.brand?.logo && <BrandLogo src={page.brand.logo} />}{page.metadata.title}</a>
      {links.length > 0 && (
        <nav aria-label={pages ? "網站頁面" : "頁面導覽"}>
          {links.map((l) => (
            <a key={l.id} href={"#page-" + l.id} aria-current={pages && l.id === current ? "page" : undefined}>{l.label}</a>
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
  // Current page of a multi-page site. Published sites mirror it in the URL hash.
  const live = useContext(FormLive);
  const viewFromHash = () => (live ? location.hash.match(/^#view-([0-9a-f-]{36})$/)?.[1] ?? null : null);
  const [view, setView] = useState<string | null>(viewFromHash);
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    if (!live) return;
    const sync = () => setView(viewFromHash());
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, [live]);
  useEffect(() => {
    const id = pendingScroll.current;
    pendingScroll.current = null;
    const target = id ? rootRef.current?.querySelector<HTMLElement>('[id="page-' + id + '"]') : null;
    if (target) {
      target.scrollIntoView({ behavior: "instant", block: "start" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    } else if (id === "") rootRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [view]);
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
  const sub = page.subpages?.find((p) => p.id === view);
  const current = sub ? { sections: sub.sections, draftLayout: sub.draftLayout } : { sections: page.sections, draftLayout: page.draftLayout };
  const pageOf = (nodeId: string) => {
    const has = (list: PageNode[]) => { const stack = [...list]; while (stack.length) { const n = stack.pop()!; if (n.id === nodeId) return true; stack.push(...(n.children ?? [])); } return false; };
    if (has(page.sections)) return null;
    return page.subpages?.find((p) => has(p.sections))?.id ?? undefined;
  };
  const go = (pageId: string | null, scrollTo: string) => {
    pendingScroll.current = scrollTo;
    if (live) {
      const hash = pageId ? "#view-" + pageId : "";
      if (location.hash !== hash) history.pushState(null, "", hash || location.pathname + location.search);
    }
    setView(pageId);
  };
  const sources=new Map<string,PageNode>();const collect=(n:PageNode)=>{sources.set(n.id,n);n.children?.forEach(collect);};current.sections.forEach(collect);
  return (
    <AssetUrls.Provider value={assetUrls}><MotionPreview.Provider value={motionPreview}><ThemedPage.Provider value={!!page.theme}>
      <RenderBoundary resetKey={input}>
        <div
          ref={rootRef}
          className={
            "rendered-page typography-" +
            page.typography +
            " theme-" +
            page.styles
          }
          data-theme={page.theme}
          lang={page.metadata.language}
          aria-label={page.metadata.title}
          style={
            {
              "--desktop-columns": page.responsive.desktopColumns,
              ...brandCss(page.brand),
            } as CSSProperties
          }
          onClick={(e) => {
            const link = (e.target as Element).closest("a");
            const href = link?.getAttribute("href");
            if (href?.startsWith("#page-")) {
              e.preventDefault();
              const id = href.slice(6);
              // Links to another page, or to an element on another page, switch pages first.
              if (page.home && id === page.home.id) { go(null, ""); return; }
              if (page.subpages?.some((p) => p.id === id)) { go(id, ""); return; }
              const owner = pageOf(id);
              if (owner !== undefined && owner !== (sub?.id ?? null)) { go(owner, id); return; }
              const target = e.currentTarget.querySelector<HTMLElement>(
                '[id="' + href.slice(1) + '"]',
              );
              target?.scrollIntoView({ behavior: "instant", block: "start" });
              target?.setAttribute("tabindex", "-1");
              target?.focus({ preventScroll: true });
            }
          }}
        >
          {current.draftLayout?<div className="draft-layout" style={{aspectRatio:`1440 / ${current.draftLayout.height}`}}>{[...current.draftLayout.items].sort((a,b)=>a.y-b.y||a.x-b.x).map(p=><div className="draft-placement" key={p.id} style={{aspectRatio:`${p.width} / ${p.height}`,'--draft-left':`${p.x/14.4}%`,'--draft-top':`${p.y/current.draftLayout!.height*100}%`,'--draft-width':`${p.width/14.4}%`,'--draft-height':`${p.height/current.draftLayout!.height*100}%`,zIndex:p.zIndex} as CSSProperties}><RenderNode node={sources.get(p.id)!}/></div>)}</div>:<>{(page.chrome?.nav||page.subpages?.length)&&<PageNav page={page} view={sub?.id ?? null} sections={current.sections}/>}<main className="page-main">{current.sections.map(section=><RenderNode key={section.id} node={section}/>)}</main>{page.chrome?.footer&&<footer className="page-footer"><span>{page.metadata.title}</span><a href={"#page-"+current.sections[0].id}>回到頂端 ↑</a></footer>}</>}
        </div>
      </RenderBoundary>
    </ThemedPage.Provider></MotionPreview.Provider></AssetUrls.Provider>
  );
}
