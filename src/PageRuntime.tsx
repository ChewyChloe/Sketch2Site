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
export const animationRegistry: Record<
  (typeof effectIds)[number],
  { entrance?: boolean; hover?: boolean; stagger?: boolean }
> = {
  "fade-in": { entrance: true },
  "slide-up": { entrance: true },
  "scale-in": { entrance: true },
  "hover-lift": { hover: true },
  "hover-glow": { hover: true },
  "stagger-reveal": { stagger: true },
};
function animateEntrance(
  element: HTMLElement,
  effects: Effect[],
  extraDelay = 0,
) {
  const entrance = effects.filter(
    (e) => animationRegistry[e.effectId].entrance,
  );
  if (!entrance.length) return null;
  const slide = entrance.find((e) => e.effectId === "slide-up");
  const scale = entrance.some((e) => e.effectId === "scale-in");
  return element.animate(
    [
      {
        opacity: 0,
        transform: `translateY(${slide?.distance ?? 0}px) scale(${scale ? 0.96 : 1})`,
      },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    {
      duration: Math.max(...entrance.map((e) => e.duration)),
      delay: Math.max(...entrance.map((e) => e.delay)) + extraDelay,
      easing: "cubic-bezier(.2,.7,.3,1)",
      fill: "backwards",
    },
  );
}
function useAnimations(
  node: PageNode,
  ref: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !node.effects.length || !el.animate) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const running: Animation[] = [];
    let observer: IntersectionObserver | undefined;
    const cancel = () => {
      observer?.disconnect();
      running.forEach((a) => a.cancel());
    };
    const start = () => {
      if (media.matches) return;
      const own = animateEntrance(el, node.effects);
      if (own) running.push(own);
      const stagger = node.effects.find(
        (e) => animationRegistry[e.effectId].stagger,
      );
      if (stagger)
        node.children?.forEach((child, index) => {
          if (child.effects.some((e) => animationRegistry[e.effectId].entrance))
            return;
          const target = el.querySelector<HTMLElement>(
            '[data-page-id="' + child.id + '"]',
          );
          if (target) {
            const animation = animateEntrance(
              target,
              [{ ...stagger, effectId: "slide-up" }],
              Math.min(index, 12) * stagger.stagger,
            );
            if (animation) running.push(animation);
          }
        });
    };
    if (!media.matches) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            observer?.disconnect();
          }
        },
        { threshold: 0.05 },
      );
      observer.observe(el);
    }
    media.addEventListener("change", cancel);
    return () => {
      cancel();
      media.removeEventListener("change", cancel);
    };
  }, [node, ref]);
}
const AssetUrls = createContext<Readonly<Record<string,string|null>>>({});
function SafeImage({ node }: { node: PageNode }) {
  const urls = useContext(AssetUrls);
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const resolved = urls[node.src!];
  useEffect(()=>{setFailed(false);},[resolved,node.src]);
  if(resolved === "") return <div className="page-image-error" role="status">正在載入圖片…</div>;
  if(resolved === null) return <div className="page-image-error" role="status">找不到本機圖片，請重新匯入。</div>;
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
      src={urls[node.src!] ?? (import.meta.env.BASE_URL + node.src!.slice(1))}
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
  const entry = componentRegistry[node.type],
    Tag =
      node.type === "heading"
        ? (`h${node.level}` as "h1" | "h2" | "h3")
        : entry.tag;
  const lift = node.effects.find((e) => e.effectId === "hover-lift"),
    glow = node.effects.find((e) => e.effectId === "hover-glow");
  const style = {
    "--page-columns": node.columns ?? 1,
    "--effect-lift": (lift?.distance ?? 0) + "px",
    "--hover-duration": (lift?.duration ?? glow?.duration ?? 250) + "ms",
  } as CSSProperties;
  return (
    <Tag
      ref={ref as never}
      id={"page-" + node.id}
      data-page-id={node.id}
      data-page-type={node.type}
      data-effects={node.effects.map((e) => e.effectId).join(" ")}
      className={[
        "page-node",
        entry.className,
        "gap-" + node.style.gap,
        "pad-" + node.style.padding,
        "align-" + node.style.align,
        "tone-" + node.style.tone,
        "width-" + node.style.width,
        lift ? "effect-lift" : "",
        glow ? "effect-glow" : "",
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
      {node.type === "image" ? (
        <SafeImage key={node.src} node={node} />
      ) : node.children ? (
        node.children.map((child) => <RenderNode key={child.id} node={child} />)
      ) : (
        node.content
      )}
    </Tag>
  );
});
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
export function PageRuntime({ input, assetUrls = {} }: { input: unknown; assetUrls?: Readonly<Record<string,string|null>> }) {
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
  return (
    <AssetUrls.Provider value={assetUrls}><RenderBoundary resetKey={input}>
      <div
        ref={rootRef}
        className={
          "rendered-page typography-" +
          page.typography +
          " theme-" +
          page.styles
        }
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
        {page.sections.map((section) => (
          <RenderNode key={section.id} node={section} />
        ))}
      </div>
    </RenderBoundary></AssetUrls.Provider>
  );
}
