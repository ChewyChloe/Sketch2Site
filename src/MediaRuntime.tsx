import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { videoEmbedUrl, type Media } from "./pageSpec";

// Media elements on the generated site: video (play cover first), carousel, flipbook,
// animated character and 3D object. Pictures come from `resolve` (the app's own images only).
type Resolve = (ref: string) => string;
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function MediaView({ media, caption, resolve, still = false }: { media: Media; caption: string; resolve: Resolve; still?: boolean }) {
  switch (media.kind) {
    case "video": return <VideoEmbed m={media} caption={caption} still={still} />;
    case "carousel": return <Carousel m={media} caption={caption} resolve={resolve} still={still} />;
    case "flipbook": return <Flipbook m={media} caption={caption} resolve={resolve} />;
    case "character": return <Character m={media} caption={caption} still={still} />;
    case "object3d": return <Object3D m={media} caption={caption} resolve={resolve} still={still} />;
  }
}

/* ---------- Video: a cover with a play button; the player loads only when pressed (or on autoplay) ---------- */
function VideoEmbed({ m, caption, still }: { m: Extract<Media, { kind: "video" }>; caption: string; still: boolean }) {
  const [play, setPlay] = useState(false);
  const [muted, setMuted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Autoplay starts muted once the video is on screen (browsers block sound without a press).
  useEffect(() => {
    if (!m.autoplay || still || play || !ref.current) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setMuted(true); setPlay(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [m.autoplay, still, play]);
  const host = m.provider === "youtube" ? "YouTube" : "Vimeo";
  return (
    <div ref={ref} className="media-video">
      {play && !still ? (
        <iframe
          src={videoEmbedUrl(m, true, muted)}
          title={caption || host + " 影片"}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      ) : (
        <button type="button" className="media-video-cover" aria-label={"播放影片" + (caption ? "：" + caption : "")} onClick={() => !still && setPlay(true)}>
          <span className="media-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg></span>
          <span className="media-video-title">{caption || "播放影片"}</span>
          <small>{host}</small>
        </button>
      )}
    </div>
  );
}

/* ---------- Carousel: slides with arrows, dots, swipe and optional autoplay ---------- */
function Carousel({ m, caption, resolve, still }: { m: Extract<Media, { kind: "carousel" }>; caption: string; resolve: Resolve; still: boolean }) {
  const n = m.images.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const start = useRef<number | null>(null);
  const go = (k: number) => setI(((k % n) + n) % n);
  useEffect(() => {
    if (!m.autoplay || still || paused || n < 2 || reducedMotion()) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), m.seconds * 1000);
    return () => clearInterval(t);
  }, [m.autoplay, m.seconds, still, paused, n]);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  return (
    <div
      className="media-carousel"
      role="region"
      aria-roledescription="輪播"
      aria-label={caption || "輪播圖片"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => { start.current = e.clientX; }}
      onPointerUp={(e) => { if (start.current === null) return; const dx = e.clientX - start.current; start.current = null; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); }}
    >
      <div className="mc-track" style={{ transform: `translateX(${-i * 100}%)` }}>
        {m.images.map((src, k) => (
          <div className="mc-slide" key={k} aria-hidden={k !== i}>
            <img src={resolve(src)} alt={`${caption || "圖片"}（${k + 1} / ${n}）`} loading="lazy" decoding="async" draggable={false} referrerPolicy="no-referrer" />
          </div>
        ))}
      </div>
      {m.arrows && n > 1 && (
        <>
          <button type="button" className="mc-arrow mc-prev" aria-label="上一張" onClick={() => go(i - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
          <button type="button" className="mc-arrow mc-next" aria-label="下一張" onClick={() => go(i + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
        </>
      )}
      {m.dots && n > 1 && (
        <div className="mc-dots">
          {m.images.map((_, k) => <button type="button" key={k} aria-label={`第 ${k + 1} 張`} aria-current={k === i} onClick={() => go(k)} />)}
        </div>
      )}
    </div>
  );
}

/* ---------- Flipbook: each picture is a page; click a side, drag, or use the arrows to turn ---------- */
function Flipbook({ m, caption, resolve }: { m: Extract<Media, { kind: "flipbook" }>; caption: string; resolve: Resolve }) {
  const n = m.images.length;
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState<null | { dir: 1 | -1; from: number }>(null);
  const start = useRef<number | null>(null);
  const flip = (dir: 1 | -1) => {
    const to = page + dir;
    if (to < 0 || to >= n || turn) return;
    if (reducedMotion()) { setPage(to); return; }
    setTurn({ dir, from: page });
    setPage(to);
  };
  // The turning leaf: forwards it shows the old page lifting off; backwards the new page settling down.
  const leaf = turn ? (turn.dir === 1 ? turn.from : page) : null;
  return (
    <div className="media-flipbook" role="group" aria-roledescription="翻頁書" aria-label={caption || "翻頁書"}
      onKeyDown={(e) => { if (e.key === "ArrowRight") flip(1); else if (e.key === "ArrowLeft") flip(-1); }}>
      <div
        className="fb-book"
        onPointerDown={(e) => { start.current = e.clientX; }}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current; start.current = null;
          if (Math.abs(dx) > 30) { flip(dx < 0 ? 1 : -1); return; }
          const r = e.currentTarget.getBoundingClientRect();
          flip(e.clientX - r.left > r.width / 2 ? 1 : -1);
        }}
      >
        {/* Underneath: the page that will be showing when the turn ends (forwards) or the one being left (backwards). */}
        <div className="fb-page fb-under"><img src={resolve(m.images[turn?.dir === -1 ? turn.from : page])} alt="" draggable={false} referrerPolicy="no-referrer" /></div>
        {leaf !== null && (
          <div key={turn!.from + ":" + turn!.dir} className={"fb-leaf " + (turn!.dir === 1 ? "is-forward" : "is-back")} onAnimationEnd={() => setTurn(null)}>
            <div className="fb-face"><img src={resolve(m.images[leaf])} alt="" draggable={false} referrerPolicy="no-referrer" /></div>
            <div className="fb-face fb-back" />
          </div>
        )}
        {!turn && <span className="fb-sr" role="img" aria-label={`${caption || "第"} ${page + 1} / ${n} 頁`} />}
        <span className="fb-edge" aria-hidden="true" />
      </div>
      <div className="fb-controls">
        <button type="button" aria-label="上一頁" disabled={page === 0} onClick={() => flip(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
        <span aria-live="polite">{page + 1} / {n}</span>
        <button type="button" aria-label="下一頁" disabled={page === n - 1} onClick={() => flip(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
    </div>
  );
}

/* ---------- Animated characters: original drawn mascots with a looping action ---------- */
export const characterLabels = { sprout: "小芽", cat: "貓咪", bird: "小鳥", robot: "機器人", ghost: "小幽靈", star: "星星" } as const;
export const actionLabels = { wave: "搖擺", bounce: "跳跳", float: "漂浮", blink: "眨眼", spin: "轉圈" } as const;
function Eyes({ y = 52, gap = 14 }: { y?: number; gap?: number }) {
  return (
    <g className="ch-eyes">
      <ellipse cx={50 - gap} cy={y} rx="4.5" ry="6" fill="#17181b" />
      <ellipse cx={50 + gap} cy={y} rx="4.5" ry="6" fill="#17181b" />
      <circle cx={50 - gap + 1.5} cy={y - 2} r="1.6" fill="#fff" />
      <circle cx={50 + gap + 1.5} cy={y - 2} r="1.6" fill="#fff" />
    </g>
  );
}
const cheeks = (y = 62) => <g opacity=".35"><ellipse cx="28" cy={y} rx="6" ry="3.5" fill="#ff7a8a" /><ellipse cx="72" cy={y} rx="6" ry="3.5" fill="#ff7a8a" /></g>;
export function CharacterArt({ id, color }: { id: keyof typeof characterLabels; color: string }) {
  const ink = "#17181b";
  switch (id) {
    case "sprout":
      return <svg viewBox="0 0 100 100"><path d="M50 30C44 16 30 12 22 16c4 10 16 16 28 14zM50 30c6-14 20-18 28-14-4 10-16 16-28 14z" fill="#3fbf6b" stroke={ink} strokeWidth="2.5" /><path d="M50 30v10" stroke={ink} strokeWidth="2.5" /><ellipse cx="50" cy="64" rx="32" ry="28" fill={color} stroke={ink} strokeWidth="3" /><Eyes y={60} />{cheeks(70)}<path d="M44 74q6 5 12 0" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" /></svg>;
    case "cat":
      return <svg viewBox="0 0 100 100"><path d="M20 44L24 12l22 18M80 44L76 12 54 30" fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" /><ellipse cx="50" cy="58" rx="36" ry="30" fill={color} stroke={ink} strokeWidth="3" /><Eyes y={54} gap={15} />{cheeks(66)}<path d="M46 64l4 3 4-3M50 67v4M40 72q10 6 20 0" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" /><path d="M14 60h14M16 68l12-3M86 60H72M84 68l-12-3" stroke={ink} strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "bird":
      return <svg viewBox="0 0 100 100"><ellipse cx="50" cy="56" rx="34" ry="32" fill={color} stroke={ink} strokeWidth="3" /><path className="ch-wing" d="M22 60q-14-6-12 10 8 6 18-2z" fill={color} stroke={ink} strokeWidth="2.5" /><path d="M46 62l8 0-4 7z" fill="#ffb02e" stroke={ink} strokeWidth="2" strokeLinejoin="round" /><path d="M44 24q6-12 14-6-6 2-6 8" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" /><Eyes y={52} gap={12} />{cheeks(64)}</svg>;
    case "robot":
      return <svg viewBox="0 0 100 100"><path d="M50 14v12" stroke={ink} strokeWidth="3" /><circle cx="50" cy="12" r="5" fill="#ff5a5f" stroke={ink} strokeWidth="2.5" /><rect x="16" y="26" width="68" height="58" rx="16" fill={color} stroke={ink} strokeWidth="3" /><rect x="26" y="38" width="48" height="30" rx="10" fill="#1d2430" /><g className="ch-eyes"><rect x="34" y="46" width="9" height="12" rx="4" fill="#5ff5c6" /><rect x="57" y="46" width="9" height="12" rx="4" fill="#5ff5c6" /></g><path d="M40 76h20" stroke={ink} strokeWidth="3" strokeLinecap="round" /><rect x="8" y="46" width="8" height="18" rx="4" fill={color} stroke={ink} strokeWidth="2.5" /><rect x="84" y="46" width="8" height="18" rx="4" fill={color} stroke={ink} strokeWidth="2.5" /></svg>;
    case "ghost":
      return <svg viewBox="0 0 100 100"><path d="M18 86V46a32 32 0 0164 0v40l-10-8-11 8-11-8-11 8-11-8z" fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" /><Eyes y={48} gap={13} />{cheeks(60)}<ellipse cx="50" cy="64" rx="5" ry="6" fill={ink} /></svg>;
    case "star":
      return <svg viewBox="0 0 100 100"><path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" /><Eyes y={50} gap={10} />{cheeks(60)}<path d="M44 62q6 5 12 0" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" /></svg>;
  }
}
function Character({ m, caption, still }: { m: Extract<Media, { kind: "character" }>; caption: string; still: boolean }) {
  return (
    <div className={"media-character act-" + m.action + (still ? " is-still" : "")} role="img" aria-label={caption || characterLabels[m.character]}>
      <div className="ch-body"><CharacterArt id={m.character} color={m.color} /></div>
      <span className="ch-shadow" aria-hidden="true" />
    </div>
  );
}

/* ---------- 3D object: a cube, coin or ring of pictures; drag to turn, optional slow spin ---------- */
function Object3D({ m, caption, resolve, still }: { m: Extract<Media, { kind: "object3d" }>; caption: string; resolve: Resolve; still: boolean }) {
  const [angle, setAngle] = useState({ x: m.shape === "ring" ? -8 : -18, y: 28 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const holding = useRef(false);
  useEffect(() => {
    if (!m.spin || still || reducedMotion()) return;
    let raf = 0, last = performance.now();
    const tick = (t: number) => { if (!holding.current) setAngle((a) => ({ ...a, y: a.y + (t - last) * 0.02 })); last = t; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [m.spin, still]);
  const down = (e: ReactPointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); holding.current = true; drag.current = { px: e.clientX, py: e.clientY, ...angle }; };
  const move = (e: ReactPointerEvent) => { const d = drag.current; if (!d) return; setAngle({ x: Math.max(-70, Math.min(70, d.x - (e.clientY - d.py) * 0.4)), y: d.y + (e.clientX - d.px) * 0.5 }); };
  const up = () => { drag.current = null; holding.current = false; };
  const pics = m.images.map(resolve);
  const pic = (k: number) => pics[k % pics.length];
  const faces =
    m.shape === "cube"
      ? ["rotateY(0deg)", "rotateY(90deg)", "rotateY(180deg)", "rotateY(-90deg)", "rotateX(90deg)", "rotateX(-90deg)"].map((t, k) => ({ t: t + " translateZ(var(--half))", src: pic(k) }))
      : m.shape === "coin"
        ? [{ t: "translateZ(4px)", src: pic(0) }, { t: "rotateY(180deg) translateZ(4px)", src: pic(1) }]
        : pics.concat(pics.length < 5 ? pics : []).slice(0, Math.max(5, pics.length)).map((src, k, all) => ({ t: `rotateY(${(360 / all.length) * k}deg) translateZ(var(--ring-r))`, src }));
  return (
    <div className={"media-3d shape-" + m.shape} role="img" aria-label={(caption || "3D 物件") + "，可以拖曳轉動"}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ "--ring-n": faces.length } as CSSProperties}>
      <div className="m3-stage">
        <div className="m3-object" style={{ transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)` }}>
          {faces.map((f, k) => <div key={k} className="m3-face" style={{ transform: f.t }}><img src={f.src} alt="" draggable={false} referrerPolicy="no-referrer" /></div>)}
          {m.shape === "coin" && <div className="m3-rim" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
}
