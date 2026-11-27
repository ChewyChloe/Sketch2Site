import { flushSync } from "react-dom";
import { layoutHost, type SectionArrangement } from "./sectionLayout";
import { Depth3D } from "./Depth3D";
import {useCinematicMotion,cinematicTextIds} from "./CinematicMotion";
import {CinematicText} from "./CinematicText";
import {StoryGroup,CardShuffle,FrameSequence,storyGroupIds} from "./StoryMotion";
import {useAdvancedMotion,AdvancedText,advancedTextIds} from "./AdvancedMotion";
import {useSignatureMotion} from "./SignatureMotion";
import {useReferenceMotion} from "./ReferenceMotion";
import {useExtendedMotion,LetterAssembly,AccentStroke,DisclosurePanel,TabbedPanels} from "./ExtendedMotion";
import {FoldReveal} from "./FoldReveal";
import {PhysicsTags} from "./PhysicsTags";
import {CountUp,CurvedText,FlipCard,useReducedMotion} from "./MotionRuntime";
import {MediaView} from "./MediaRuntime";
import { motionCatalog, motionIds, motionNumber, motionDuration, splitStoryImage, tabPanelName } from "./motion";
import {
  createContext,
  useContext,
  Component,
  memo,
  useEffect,
  useId,
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
  shortNavLabel,
  parallaxConcepts,
  cardLineKind,
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
        {state === "sent" ? "已送出，謝謝你的留言" : state === "failed" ? "送出失敗，請稍後再試" : state === "preview" ? "預覽時不會真的送出，網站上線後才會收到" : ""}
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
const noExtras = {};
/** Inside a small preview card: no element ids, so the page shown full size keeps the only copy. */
export const ThumbnailRender = createContext(false);
const PageExtras = createContext<{ pricingBuilder?: boolean; galleryViews?: boolean }>({});
/** Reads a price such as "NT$ 1,200 / 杯" from a card's lines (the first number on the price line). */
export function priceOf(card: PageNode): number | null {
  const lines = (card.children ?? []).filter((c) => c.type === "paragraph").map((c) => c.content ?? "");
  const all = lines.length ? lines : (card.content ?? "").split("\n");
  for (const line of all.slice(1)) { const m = line.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/); if (m) return Number(m[1]); }
  return null;
}
// A row of partner logos (pictures described as 標誌) is not a gallery of works.
const imagesOf = (n: PageNode): PageNode[] => (n.type === "image" ? [n] : (n.children ?? []).flatMap(imagesOf));
const isLogoWall = (n: PageNode) => { const imgs = imagesOf(n); return imgs.length > 0 && imgs.every((i) => (i.alt ?? "").includes("標誌")); };
const cardsOf = (n: PageNode): PageNode[] => (n.type === "card" ? [n] : (n.children ?? []).flatMap(cardsOf));
const firstLine = (n: PageNode) => ((n.children ?? []).find((c) => c.type === "paragraph")?.content ?? n.content ?? "").split("\n")[0].trim();
// 互動價目表: pick the plans or items you want and see the total. It only adds up; nothing is paid here.
function PricingBuilder({ section }: { section: PageNode }) {
  const items = cardsOf(section).map((c) => ({ id: c.id, name: firstLine(c), price: priceOf(c) })).filter((i): i is { id: string; name: string; price: number } => i.price !== null && Boolean(i.name));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  if (items.length < 2) return null;
  const total = items.filter((i) => picked.has(i.id)).reduce((t, i) => t + i.price, 0);
  return (
    <div className="pricing-builder" role="group" aria-label="自己組合">
      <span className="pricing-builder-label">自己組合</span>
      <div className="pricing-builder-items">
        {items.map((i) => (
          <label key={i.id} className={picked.has(i.id) ? "is-on" : undefined}>
            <input type="checkbox" checked={picked.has(i.id)} onChange={() => setPicked((s) => { const x = new Set(s); if (x.has(i.id)) x.delete(i.id); else x.add(i.id); return x; })} />
            {i.name}<small>{i.price.toLocaleString("zh-TW")}</small>
          </label>
        ))}
      </div>
      <output className="pricing-builder-total" aria-live="polite">{picked.size ? `已選 ${picked.size} 項，合計 ${total.toLocaleString("zh-TW")}` : "勾選想要的項目，馬上算出合計"}</output>
    </div>
  );
}
// 作品瀏覽切換: visitors choose how to look at a gallery (one at a time, a grid or a list).
const galleryViewNames = { big: "大圖", grid: "網格", list: "清單" } as const;
const GalleryFilter = createContext<{ selected: string; items: Map<string, string> } | null>(null);
function GalleryViews({ section, children, enableViews }: { section: PageNode; children: ReactNode; enableViews?: boolean }) {
  const [view, setView] = useState<keyof typeof galleryViewNames>("grid");
  const [selected, setSelected] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation[]>([]);
  const revision = useRef(0);
  const reduced = useReducedMotion();
  const items = useMemo(() => {
    const tagged = new Map<string, string>();
    const hasCategory = (node: PageNode): boolean => !!node.galleryCategory || !!node.children?.some(hasCategory);
    const visit = (node: PageNode) => {
      if (node.galleryCategory || node.type === "image" || (node.type === "card" && !node.children?.some(hasCategory))) {
        tagged.set(node.id, node.galleryCategory ?? "");
      } else node.children?.forEach(visit);
    };
    section.children?.forEach(visit);
    return tagged;
  }, [section]);
  const categories = [...new Set(items.values())].filter(Boolean);
  const current = categories.includes(selected) ? selected : "";
  useEffect(() => () => {
    revision.current++;
    motion.current.forEach(animation => animation.cancel());
  }, [section, reduced]);

  async function choose(category: string) {
    const token = ++revision.current;
    motion.current.forEach(animation => animation.cancel());
    motion.current = [];
    if (reduced || !root.current?.animate) {
      setSelected(category);
      return;
    }
    const visible = () => Array.from(root.current?.querySelectorAll<HTMLElement>("[data-gallery-item]:not([data-gallery-filtered])") ?? []);
    const before = new Map(visible().map(item => [item, item.getBoundingClientRect()]));
    const departing = [...before.keys()].filter(item => category && item.dataset.galleryItem !== category);
    const exits = departing.map(item => item.animate([{ scale: "1", opacity: 1 }, { scale: ".85", opacity: 0 }], { duration: 130, fill: "forwards", easing: "ease-in" }));
    motion.current = exits;
    await Promise.allSettled(exits.map(animation => animation.finished));
    if (token !== revision.current) return;
    flushSync(() => setSelected(category));
    exits.forEach(animation => animation.cancel());
    motion.current = visible().map(item => {
      const previous = before.get(item);
      if (!previous) return item.animate([{ scale: ".9", opacity: 0 }, { scale: "1", opacity: 1 }], { duration: 200, easing: "ease-out" });
      const next = item.getBoundingClientRect();
      return item.animate([{ translate: `${previous.x - next.x}px ${previous.y - next.y}px` }, { translate: "0 0" }], { duration: 220, easing: "ease-out" });
    });
  }
  if (!enableViews && categories.length === 0) return children;
  return (
    <div className="gallery-views" data-view={enableViews ? view : undefined} ref={root}>
      {enableViews && <div className="gallery-views-switch" role="radiogroup" aria-label="瀏覽方式">
        {(Object.keys(galleryViewNames) as (keyof typeof galleryViewNames)[]).map(v => (
          <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}>{galleryViewNames[v]}</button>
        ))}
      </div>}
      {categories.length > 0 && <div className="gallery-views-switch gallery-categories" role="group" aria-label="作品分類">
        <button type="button" aria-pressed={current === ""} onClick={() => void choose("")}>全部作品</button>
        {categories.map(category => <button key={category} type="button" aria-pressed={current === category} onClick={() => void choose(category)}>{category}</button>)}
      </div>}
      <GalleryFilter.Provider value={{ selected: current, items }}>{children}</GalleryFilter.Provider>
    </div>
  );
}
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
        找不到本機圖片，請重新匯入
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
      onLoad={(e) => markPictureKind(e.currentTarget)}
    />
  );
}
/** Screenshots and slides have runs of identical neighbouring pixels; photos, even dark ones, do not.
 *  Measured on the samples: photos 0.17–0.44, screenshots 0.66–0.85. Editorial layouts crop photos
 *  boldly but keep a screenshot whole. data is a 32×32 RGBA thumbnail. */
export function pictureKind(data: ArrayLike<number>, width = 32) {
  let same = 0, pairs = 0;
  for (let i = 4; i < data.length; i += 4) {
    if ((i / 4) % width === 0) continue;
    pairs++;
    if (Math.abs(data[i] - data[i - 4]) + Math.abs(data[i + 1] - data[i - 3]) + Math.abs(data[i + 2] - data[i - 2]) < 6) same++;
  }
  return pairs && same / pairs > 0.55 ? "screen" : "photo";
}
function markPictureKind(img: HTMLImageElement) {
  const box = img.closest<HTMLElement>(".page-image");
  if (!box) return;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 32, 32);
    box.dataset.kind = pictureKind(ctx.getImageData(0, 0, 32, 32).data);
  } catch {
    // A picture the browser will not let us read stays unmarked and is shown whole.
  }
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
  media: { tag: "div", className: "page-media" },
};
function useInteractiveBento(ref: React.RefObject<HTMLElement | null>, enabled: boolean, children: PageNode[] | undefined) {
  useEffect(() => {
    const host = ref.current;
    if (!enabled || !host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tiles = Array.from(host.children).filter((child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains("page-node")
    );
    const frame = host.closest(".rendered-page");
    let active: HTMLElement | undefined, animations: Animation[] = [];
    let lastPointer: [number, number] | undefined;
    const directTile = (target: EventTarget | null) => tiles.find(tile => target instanceof Node && tile.contains(target));
    const choose = (tile?: HTMLElement) => {
      if (active === tile) return;
      animations.forEach(animation => animation.cancel());
      animations = [];
      const onDesktop = !reduced.matches && (frame?.clientWidth ?? window.innerWidth) > 700;
      const before = tile || onDesktop ? tiles.map(item => item.getBoundingClientRect()) : [];
      active?.removeAttribute("data-bento-active");
      active = onDesktop ? tile : undefined;
      host.toggleAttribute("data-bento-reflow", !!active);
      active?.setAttribute("data-bento-active", "");
      if (!onDesktop || !host.animate) return;
      const after = tiles.map(item => item.getBoundingClientRect());
      animations = tiles.flatMap((item, i) => {
        const from = before[i], to = after[i];
        if (!from?.width || !to.width || !to.height || !from.height) return [];
        if (from.left === to.left && from.top === to.top && from.width === to.width && from.height === to.height) return [];
        return [item.animate([
          { translate: `${from.left - to.left}px ${from.top - to.top}px`, scale: `${from.width / to.width} ${from.height / to.height}`, transformOrigin: "top left" },
          { translate: "0 0", scale: "1", transformOrigin: "top left" },
        ], { duration: 240, easing: "ease-out" })];
      });
    };
    const pointer = (event: PointerEvent) => {
      if (reduced.matches || event.pointerType === "touch" || (lastPointer?.[0] === event.clientX && lastPointer[1] === event.clientY)) return;
      lastPointer = [event.clientX, event.clientY];
      const tile = directTile(event.target);
      if (tile) choose(tile);
    };
    const leave = () => { lastPointer = undefined; choose(directTile(document.activeElement)); };
    const focus = (event: FocusEvent) => { if (!reduced.matches) choose(directTile(event.target)); };
    const blur = (event: FocusEvent) => { if (!host.contains(event.relatedTarget as Node | null)) choose(); };
    const resize = typeof ResizeObserver === "undefined" || !frame ? null : new ResizeObserver(() => {
      if (frame.clientWidth <= 700) choose();
    });
    if (frame) resize?.observe(frame);
    const preferenceChanged = () => {
      if (!reduced.matches) return;
      choose();
      animations.forEach(animation => animation.cancel());
      animations = [];
    };
    reduced.addEventListener("change", preferenceChanged);
    host.addEventListener("pointermove", pointer);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focusin", focus);
    host.addEventListener("focusout", blur);
    return () => {
      resize?.disconnect();
      reduced.removeEventListener("change", preferenceChanged);
      animations.forEach(animation => animation.cancel());
      active?.removeAttribute("data-bento-active");
      host.removeAttribute("data-bento-reflow");
      host.removeEventListener("pointermove", pointer);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("focusin", focus);
      host.removeEventListener("focusout", blur);
    };
  }, [ref, enabled, children]);
}

type LayoutTarget = { id: string; arrangement: SectionArrangement };
export const RenderNode = memo(function NodeView({ node, layout }: { node: PageNode; layout?: LayoutTarget }) {
  const sectionArrangement = node.sectionLayout?.arrangement;
  const target = sectionArrangement ? { id: layoutHost(node).id, arrangement: sectionArrangement } : layout;
  const arrangement = target?.id === node.id ? target.arrangement : undefined;
  const ref = useRef<HTMLElement>(null);
  useInteractiveBento(ref, arrangement?.mode === "bento" && arrangement.interactive === true, node.children);
  useAnimations(node, ref);
  useExtendedMotion(node,ref);
  useAdvancedMotion(node,ref);
  useSignatureMotion(node,ref);
  const motionUrls=useContext(AssetUrls),motionPreview=useContext(MotionPreview);
  useCinematicMotion(node,ref,motionUrls);
  useReferenceMotion(node,ref,motionUrls,motionPreview);
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
  const extras=useContext(PageExtras), thumbnail=useContext(ThumbnailRender);
  const gallery = useContext(GalleryFilter), category = gallery?.items.get(node.id);
  const kids=node.children?.map(child=><RenderNode key={child.id} node={child} layout={target}/>);
  const storyMedia = story?.validatedControls.presentation === "media" ? node.children?.map(card => {
    const imageIndex = splitStoryImage(card);
    if (imageIndex < 0 || !card.children) return null;
    return {
      id: card.id,
      image: <RenderNode node={card.children[imageIndex]} layout={target} />,
      copy: <RenderNode node={{...card, children: card.children.filter((_, index) => index !== imageIndex)}} layout={target} />,
    };
  }).filter(panel => panel !== null) : undefined;
  const children=node.type==="section"&&node.role==="pricing"&&extras.pricingBuilder?<>{kids}<PricingBuilder section={node}/></>:node.type==="section"&&node.role==="gallery"&&!isLogoWall(node)?<GalleryViews section={node} enableViews={extras.galleryViews}>{kids}</GalleryViews>:kids;
  const style = {
    "--breathing-cycle":(breathing?motionNumber(breathing,"cycleMs"):3200)+"ms",
    "--breathing-spread":(breathing?motionNumber(breathing,"spreadPx"):12)+"px",
    "--breathing-strength":breathing?.validatedControls.intensity==="medium"?"30%":"15%",
    "--page-columns": node.columns ?? 1,
    ...(arrangement && {
      "--section-gap": { small: "12px", medium: "24px", large: "40px" }[arrangement.gap],
      "--section-columns": "columns" in arrangement ? arrangement.columns : 2,
      ...(arrangement.mode === "bento" && { "--bento-span": arrangement.columns === 3 ? 2 : 1 }),
      ...(arrangement.mode === "split" && {
        "--section-split": { equal: "minmax(0, 1fr) minmax(0, 1fr)", left: "minmax(0, 2fr) minmax(0, 1fr)", right: "minmax(0, 1fr) minmax(0, 2fr)" }[arrangement.ratio],
      }),
    }),
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
      id={thumbnail ? undefined : "page-" + node.id}
      data-page-id={thumbnail ? undefined : node.id}
      data-gallery-item={category}
      data-gallery-filtered={category !== undefined && gallery?.selected && category !== gallery.selected ? "" : undefined}
      data-locked={!thumbnail && node.lock ? (["text", "assets", "layout", "motion"] as const).filter((k) => node.lock![k]).join(" ") || undefined : undefined}
      data-page-type={node.type}
      data-section-arrangement={arrangement?.mode}
      data-section-mobile={arrangement && "mobile" in arrangement ? arrangement.mobile : undefined}
      data-section-bleed={node.sectionLayout?.fullBleed ? "" : undefined}
      data-text-style={node.text ? "" : undefined}
      data-breathing-pulse={breathing?.validatedControls.pulse === "heartbeat" ? "" : undefined}
      data-pause-hover={breathing?.validatedControls.pauseOnHover===true}
      tabIndex={(lift||glow)&&node.type!=="button"?0:undefined}
      data-effects={node.effects.map((e) => e.presetId).join(" ")}
      data-caption={node.type === "image" ? node.alt : undefined}
      data-stat={node.type === "card" && /^[\d,.]+[+%萬千]?\+?$/.test(firstLine(node)) ? "" : undefined}
      data-line={node.type === "paragraph" ? cardLineKind(node.content) : undefined}
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
        node.text?.depth ? "text-depth" : "",
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
      {node.type==="form"?<SiteForm node={node}/>:node.type==="media"&&node.media?<MediaView media={node.media} caption={node.content??""} resolve={(r)=>motionUrls[r]||import.meta.env.BASE_URL+r.slice(1)}/>:sequence?<FrameSequence effect={sequence} original={node.src!} alt={node.alt!} urls={motionUrls}/>:node.type === "image" ? (
        node.look?.depth ? <Depth3D mode={node.look.depth}><FrameBox look={node.look}><SafeImage key={node.src} node={node} /></FrameBox></Depth3D> : <FrameBox look={node.look}><SafeImage key={node.src} node={node} /></FrameBox>
      ) : cinematicText ? <CinematicText effect={cinematicText} text={node.content!}/>:story?<StoryGroup effect={story} demo={motionPreview} media={storyMedia?.length === node.children?.length ? storyMedia : undefined}>{children}</StoryGroup>:shuffle?<CardShuffle effect={shuffle}>{children}</CardShuffle>:advancedText ? <AdvancedText text={node.content!} effect={advancedText}/> : disclosure?.validatedControls.presentation === "tabs" ? <TabbedPanels effect={disclosure} labels={node.children?.map(tabPanelName) ?? []}>{children}</TabbedPanels> : disclosure ? <DisclosurePanel effect={disclosure}>{children}</DisclosurePanel> : assembly ? <LetterAssembly effect={assembly} text={node.content!}/> : accent ? <AccentStroke effect={accent} text={node.content!}/> : physics ? <>{children}<PhysicsTags effect={physics}/></> : fold ? <FoldReveal effect={fold}>{children}</FoldReveal> : flip ? <FlipCard effect={flip}>{children}</FlipCard> : count ? <CountUp effect={count} original={node.content!}/> : curve ? <CurvedText effect={curve} text={node.content!}/> : node.children ? children : node.text?.highlight ? <span className="text-mark">{node.content}</span> : node.type === "paragraph" && cardLineKind(node.content) === "tags" ? node.content!.trim().split(/\s+/).map((t, i) => <span key={i} className="line-tag">{t.replace(/^#/, "")}</span>) : node.content}
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
type NavLink = { key: string; target: string; label: string; hero?: boolean };
const firstText = (n: PageNode): string | undefined => {
  if (n.content?.trim()) return n.content.split("\n")[0].trim();
  for (const c of n.children ?? []) { const t = firstText(c); if (t) return t; }
  return undefined;
};
/** Headings and cards in reading order: what a saved menu can link to. */
function linkable(nodes: PageNode[]): NavLink[] {
  const out: NavLink[] = [];
  const walk = (n: PageNode) => {
    if (n.type === "heading" && n.content?.trim()) { out.push({ key: n.id, target: n.id, label: shortNavLabel(n.content) }); return; }
    if (n.type === "card") { const t = firstText(n); if (t) out.push({ key: n.id, target: n.id, label: shortNavLabel(t) }); return; }
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}
/** Links for the site navigation: pages, or the page's own headings, then the saved order, names and hidden items. */
export function navLinks(page: PageSpec, sections: PageNode[], placed?: PageNode[]): NavLink[] {
  const pages = page.subpages?.length && page.home ? [{ key: page.home.id, target: page.home.id, label: page.home.title }, ...page.subpages.map((p) => ({ key: p.id, target: p.id, label: p.title }))] : null;
  const saved = page.chrome?.navItems;
  if (!saved) {
    // No choices made: pages, or each section's heading (not the opening one), at most five.
    const auto: NavLink[] = pages ?? (placed
      ? placed.filter((n) => n.type === "heading" && n.content).map((n, i) => ({ key: n.id, target: n.id, label: shortNavLabel(n.content!), hero: i === 0 }))
      : sections.flatMap((s) => { const h = s.role === "footer" ? undefined : firstHeading(s); return h?.content ? [{ key: h.id, target: s.id, label: shortNavLabel(h.content), hero: s.role === "hero" }] : []; }));
    return auto.filter((l) => !l.hero).slice(0, 5);
  }
  const candidates = pages ?? linkable(placed ?? sections);
  const byKey = new Map(candidates.map((l) => [l.key, l]));
  // Saved items in their order; anything added later is left out until it is switched on.
  return saved.flatMap((item) => { const l = byKey.get(item.id); return l && !item.hidden ? [{ ...l, label: item.label ?? l.label }] : []; }).slice(0, 8);
}
/** The element that scrolls the page: the preview panel in the editor, the window on a live site. */
function scrollRoot(el: HTMLElement | null): HTMLElement | Window {
  for (let p = el?.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p; }
  return window;
}
// Deterministic, decorative blocks using the active palette.
function GenerativeGrid({ seed }: { seed: string }) {
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.codePointAt(0)!, 16777619);
  return <div className="pg-gen-grid" aria-hidden="true">
    {Array.from({ length: 48 }, (_, index) => {
      hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
      return <span key={index} data-grid-tone={(hash >>> 0) % 5} />;
    })}
  </div>;
}
function PageNav({ page, view, sections, placed }: { page: PageSpec; view: string | null; sections: PageNode[]; placed?: PageNode[] }) {
  const style = page.chrome?.navStyle ?? "top-sticky";
  const links = navLinks(page, sections, placed);
  const isPages = !!(page.subpages?.length && page.home);
  const currentPage = view ?? page.home?.id ?? null;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLButtonElement>(null);
  const menuMotion = page.chrome?.menuMotion;
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !menuRef.current?.closest(".page-nav")?.contains(document.activeElement)) return;
      event.stopPropagation();
      setOpen(false);
      menuRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const side = style === "side-left" || style === "side-right";
  // Hide-on-scroll for the top bar, and "you are here" for the side list.
  useEffect(() => {
    if (style !== "top-autohide" && style !== "top-compact" && !side && style !== "dots") return;
    const root = scrollRoot(ref.current);
    const top = () => (root instanceof Window ? root.scrollY : root.scrollTop);
    let last = top();
    const onScroll = () => {
      const y = top();
      if (style === "top-compact") {
        setCompact(current => current ? y > 54 : y > 78);
        return;
      }
      if (style === "top-autohide") {
        if (y < last || y <= 80) setHidden(false);
        else if (y > last) setHidden(true);
        last = y;
        return;
      }
      if (isPages) return;
      const rootTop = root instanceof Window ? 0 : root.getBoundingClientRect().top;
      let current: string | null = null;
      for (const l of links) { const t = ref.current?.ownerDocument.getElementById("page-" + l.target); if (t && t.getBoundingClientRect().top - rootTop < 140) current = l.target; }
      setActive(current);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [style, side, isPages, links.map((l) => l.target).join()]);
  if (style === "none") return null;
  const brand = <a className="page-brand" href={"#page-" + (page.home?.id ?? sections[0]?.id ?? placed?.[0]?.id)}>{page.brand?.logo && <BrandLogo src={page.brand.logo} />}<span>{page.metadata.title}</span></a>;
  const list = links.length > 0 && (
    <nav aria-label={isPages ? "網站頁面" : "頁面導覽"} id={menuId} data-menu-motion={menuMotion} data-menu-open={open ? "" : undefined}>
      {menuMotion === "strips" && <span className="page-nav-strips" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <span key={i} />)}
      </span>}
      {links.map((l) => (
        <a key={l.key} href={"#page-" + l.target} aria-current={isPages ? (l.target === currentPage ? "page" : undefined) : l.target === active ? "location" : undefined} onClick={() => setOpen(false)}>{l.label}</a>
      ))}
    </nav>
  );
  const menu = links.length > 0 && (
    <button ref={menuRef} type="button" className="page-nav-menu" data-menu-motion={menuMotion} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((v) => !v)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{menuMotion && menuMotion !== "capsule" && menuMotion !== "strips" ? <>
        <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
      </> : open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
      <span>{open ? "關閉選單" : "選單"}</span>
    </button>
  );
  if (side)
    return (
      <div className={"page-side-col" + (collapsed ? " is-collapsed" : "")}>
      <aside ref={ref} className={"page-nav nav-side nav-" + style + (collapsed ? " is-collapsed" : "") + (open ? " is-open" : "")} data-nav-style={style}>
        <div className="page-nav-head">
          {brand}
          <button type="button" className="page-nav-collapse" aria-expanded={!collapsed} aria-label={collapsed ? "展開目錄" : "收起目錄"} title={collapsed ? "展開目錄" : "收起目錄"} onClick={() => setCollapsed((v) => !v)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={(style === "side-left") !== collapsed ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} /></svg>
          </button>
          {menu}
        </div>
        {list}
      </aside>
      </div>
    );
  // Side dots: the name stays on top; each section is a dot on the right that lights up when you are there.
  if (style === "dots")
    return (
      <>
        <header ref={ref} className={"page-nav nav-dots" + (open ? " is-open" : "")} data-nav-style={style}>
          {brand}
          {menu}
          {list}
        </header>
        {links.length > 0 && !isPages && (
          <div className="page-dots-rail" aria-hidden="true">
            <div className="page-dots">
              {links.map((l) => (
                <a key={l.key} href={"#page-" + l.target} tabIndex={-1} className={l.target === active ? "is-here" : undefined}>
                  <span>{l.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </>
    );
  if (style === "floating")
    return (
      <div className="page-nav-float" data-nav-style={style}>
        <header ref={ref} className={"page-nav nav-floating" + (open ? " is-open" : "")}>
          {brand}
          {menu}
          {list}
        </header>
      </div>
    );
  return (
    <header ref={ref} className={"page-nav nav-" + style + (style === "top-autohide" && hidden && !open ? " is-hidden" : "") + (style === "top-compact" && compact ? " is-compact" : "") + (open ? " is-open" : "")} data-nav-style={style}>
      {brand}
      {menu}
      {list}
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
        預覽失敗：頁面無法顯示，請重新載入檔案
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
    <AssetUrls.Provider value={assetUrls}><MotionPreview.Provider value={motionPreview}><ThemedPage.Provider value={!!page.theme}><PageExtras.Provider value={page.extras ?? noExtras}>
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
          data-art={page.art?.principles.join(" ") || undefined}
          data-concept={page.concept}
          data-layout-theme={page.designControl?.layoutTheme === undefined ? page.theme : page.designControl.layoutTheme ?? undefined}
          data-layout-concept={page.designControl?.composition ? undefined : page.designControl?.layoutConcept === undefined ? page.concept : page.designControl.layoutConcept ?? undefined}
          data-explicit-composition={page.designControl?.composition ? "" : undefined}
          data-compose={page.designControl?.composition ? page.composition ?? "tidy" : (page.designControl?.layoutConcept === undefined ? page.concept : page.designControl.layoutConcept) ? undefined : page.composition}
          data-parallax={(page.designControl?.conceptMotion ?? (page.concept && parallaxConcepts.includes(page.concept))) ? "" : undefined}
          data-branded={page.brand?.primary ? "" : undefined}
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
          {page.concept === "generative-grid" && <GenerativeGrid seed={page.metadata.title} />}
          {(() => {
            const navStyle = page.chrome?.navStyle;
            // Saved draft positions keep their own look: a nav appears only when one was chosen.
            const showNav = current.draftLayout ? !!(page.chrome?.nav && navStyle && navStyle !== "none") : !!(page.chrome?.nav || page.subpages?.length);
            const placed = current.draftLayout ? [...current.draftLayout.items].sort((a, b) => a.y - b.y || a.x - b.x).map((p) => sources.get(p.id)!).filter(Boolean) : undefined;
            const nav = showNav ? <PageNav page={page} view={sub?.id ?? null} sections={current.sections} placed={placed} /> : null;
            const body = <>{current.draftLayout?<div className="draft-layout" style={{aspectRatio:`1440 / ${current.draftLayout.height}`}}>{[...current.draftLayout.items].sort((a,b)=>a.y-b.y||a.x-b.x).map(p=><div className="draft-placement" key={p.id} style={{aspectRatio:`${p.width} / ${p.height}`,'--draft-left':`${p.x/14.4}%`,'--draft-top':`${p.y/current.draftLayout!.height*100}%`,'--draft-width':`${p.width/14.4}%`,'--draft-height':`${p.height/current.draftLayout!.height*100}%`,zIndex:p.zIndex} as CSSProperties}><RenderNode node={sources.get(p.id)!}/></div>)}</div>:<><main className="page-main">{current.sections.map(section=><RenderNode key={section.id} node={section}/>)}</main>{page.chrome?.footer&&!current.sections.some(s=>s.role==="footer")&&<footer className="page-footer"><span className="page-footer-brand">{page.brand?.logoAlt && <BrandLogo src={page.brand.logoAlt}/>}{page.metadata.title}</span><a href={"#page-"+current.sections[0].id}>回到頂端 ↑</a></footer>}</>}</>;
            if (!nav) return body;
            if (navStyle === "side-left" || navStyle === "side-right") return <div className={"page-with-side " + navStyle}>{nav}<div className="page-side-body">{body}</div></div>;
            return <>{nav}{body}</>;
          })()}
        </div>
      </RenderBoundary>
    </PageExtras.Provider></ThemedPage.Provider></MotionPreview.Provider></AssetUrls.Provider>
  );
}
