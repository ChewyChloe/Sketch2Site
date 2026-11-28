import { motionNumber, type MotionInstance } from "./motion";
import { useReducedMotion } from "./MotionRuntime";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { videoEmbedUrl, type Media } from "./pageSpec";

// Media elements on the generated site: video (play cover first), carousel, flipbook,
// animated character and 3D object. Pictures come from `resolve` (the app's own images only).
type Resolve = (ref: string) => string;
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function MediaView({ media, caption, resolve, still = false, carouselEffect }: { carouselEffect?: MotionInstance; media: Media; caption: string; resolve: Resolve; still?: boolean }) {
  switch (media.kind) {
    case "video": return <VideoEmbed m={media} caption={caption} still={still} />;
    case "carousel": return <Carousel m={media} caption={caption} resolve={resolve} still={still} effect={carouselEffect} />;
    case "flipbook": return <Flipbook m={media} caption={caption} resolve={resolve} />;
    case "character": return <Character m={media} caption={caption} still={still} />;
    case "object3d": return <Object3D m={media} caption={caption} resolve={resolve} still={still} />;
    case "chart": return <ChartView m={media} caption={caption} />;
    case "table": return <TableView m={media} caption={caption} />;
  }
}

/* ---------- Chart: the author's numbers as bars, a line or a pie (SVG, theme colours) ---------- */
const fmt = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString("zh-Hant") : String(Math.round(v * 100) / 100));
function ChartView({ m, caption }: { m: Extract<Media, { kind: "chart" }>; caption: string }) {
  const W = 600, H = 320, pad = { l: 16, r: 16, t: 28, b: 44 };
  const values = m.points.map((p) => p.value);
  const max = Math.max(...values, 0), min = Math.min(...values, 0);
  const span = max - min || 1;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / span);
  const step = (W - pad.l - pad.r) / m.points.length;
  const label = (caption || "圖表") + "：" + m.points.map((p) => `${p.label} ${fmt(p.value)}${m.unit}`).join("，");
  let body;
  if (m.chart === "pie") {
    const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    let a0 = -Math.PI / 2;
    const cx = 170, cy = H / 2, r = 120;
    body = (
      <>
        {m.points.map((p, i) => {
          const a1 = a0 + (Math.max(0, p.value) / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = a1 - a0 >= Math.PI * 2 - 1e-6
            ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`
            : `M${cx},${cy}L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}Z`;
          a0 = a1;
          return <path key={i} d={d} className={"chart-slice s" + (i % 6)} />;
        })}
        {m.points.map((p, i) => (
          <g key={"l" + i} transform={`translate(330 ${50 + i * Math.min(24, 240 / m.points.length)})`}>
            <rect width="14" height="14" rx="3" className={"chart-slice s" + (i % 6)} />
            <text x="22" y="12" className="chart-label">{p.label}　{Math.round((Math.max(0, p.value) / total) * 100)}%</text>
          </g>
        ))}
      </>
    );
  } else if (m.chart === "line") {
    const pts = m.points.map((p, i) => [pad.l + step * (i + 0.5), y(p.value)] as const);
    body = (
      <>
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="chart-axis" />
        <polyline points={pts.map(([a, b]) => a + "," + b).join(" ")} className="chart-line" />
        {pts.map(([a, b], i) => (
          <g key={i}>
            <circle cx={a} cy={b} r="5" className="chart-dot" />
            <text x={a} y={b - 12} textAnchor="middle" className="chart-value">{fmt(m.points[i].value)}{m.unit}</text>
            <text x={a} y={H - 16} textAnchor="middle" className="chart-label">{m.points[i].label}</text>
          </g>
        ))}
      </>
    );
  } else {
    const bw = Math.min(64, step * 0.6);
    body = (
      <>
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="chart-axis" />
        {m.points.map((p, i) => {
          const x = pad.l + step * (i + 0.5);
          const top = Math.min(y(p.value), y(0)), h = Math.abs(y(p.value) - y(0));
          return (
            <g key={i}>
              <rect x={x - bw / 2} y={top} width={bw} height={Math.max(1, h)} rx="4" className={"chart-bar" + (p.value === max ? " top" : "")} />
              <text x={x} y={top - 8} textAnchor="middle" className="chart-value">{fmt(p.value)}{m.unit}</text>
              <text x={x} y={H - 16} textAnchor="middle" className="chart-label">{p.label}</text>
            </g>
          );
        })}
      </>
    );
  }
  return (
    <figure className={"media-chart chart-" + m.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>{body}</svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/* ---------- Table: plain text cells; scrolls sideways on narrow screens ---------- */
function TableView({ m, caption }: { m: Extract<Media, { kind: "table" }>; caption: string }) {
  const [head, ...rest] = m.header ? m.rows : [undefined, ...m.rows];
  return (
    <div className="media-table" role="region" aria-label={caption || "表格"} tabIndex={0}>
      <table>
        {caption && <caption>{caption}</caption>}
        {head && <thead><tr>{head.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>}
        <tbody>{rest.map((r, i) => r && <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
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
function Carousel({ m, caption, resolve, still, effect }: { effect?: MotionInstance; m: Extract<Media, { kind: "carousel" }>; caption: string; resolve: Resolve; still: boolean }) {
  const n = m.images.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const start = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mode = effect?.presetId;
  const modern = !!mode && !reduced;
  const orbit = modern && mode === "orbit-exhibit";
  const [turn, setTurn] = useState(0);
  const [drag, setDrag] = useState(0);
  const [visible, setVisible] = useState(false);
  const angle = 360 / n;
  const duration = effect ? motionNumber(effect, "durationMs", 500) : 500;
  const strength = effect ? motionNumber(effect, "strength", .72) : .72;
  const go = (k: number) => { setI(((k % n) + n) % n); setTurn(value => value + k - i); };
  useEffect(() => {
    if (!mode || !root.current) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [mode]);
  useEffect(() => {
    if ((!m.autoplay && !orbit) || still || paused || n < 2 || reduced || (mode && !visible)) return;
    const tick = () => {
      if (document.hidden) return;
      setI(value => (value + 1) % n);
      setTurn(value => value + 1);
    };
    const t = setInterval(tick, orbit ? Math.max(1100, duration) : m.seconds * 1000);
    return () => clearInterval(t);
  }, [m.autoplay, m.seconds, still, paused, n, reduced, mode, orbit, visible, duration]);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  return (
    <div
      ref={root}
      className={"media-carousel" + (modern ? " hundred-carousel" : "")}
      data-carousel-effect={modern ? mode : undefined}
      data-dragging={drag ? "" : undefined}
      style={{ "--hundred-carousel-duration": orbit && !paused ? Math.max(1100, duration) + "ms" : Math.min(duration, 900) + "ms" } as CSSProperties}
      role="region"
      aria-roledescription="輪播"
      aria-label={caption || "輪播圖片"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => { setPaused(false); start.current = null; setDrag(0); }}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => { start.current = e.clientX; }}
      onPointerMove={(e) => { if (orbit && start.current !== null) setDrag((e.clientX - start.current) * .32); }}
      onPointerCancel={() => { start.current = null; setDrag(0); }}
      onPointerUp={(e) => { if (start.current === null) return; const dx = e.clientX - start.current; start.current = null; setDrag(0); if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); }}
    >
      <div className="mc-track" style={{ transform: orbit ? `rotateY(${-turn * angle + drag}deg)` : modern ? undefined : `translateX(${-i * 100}%)` }}>
        {m.images.map((src, k) => {
          const offset = ((k - i + Math.floor(n / 2) + n) % n) - Math.floor(n / 2);
          const style: CSSProperties | undefined = orbit ? { transform: `rotateY(${k * angle}deg) translateZ(${strength}px)` } : modern
            ? { transform: `translateX(${offset * 37}%) scale(${offset ? strength : 1})`, zIndex: offset ? 0 : 1, opacity: offset ? Math.abs(offset) > 1 ? 0 : .36 : 1 } : undefined;
          return <div className="mc-slide" key={k} aria-hidden={k !== i} style={style}>
            <img src={resolve(src)} alt={`${caption || "圖片"}（${k + 1} / ${n}）`} loading="lazy" decoding="async" draggable={false} referrerPolicy="no-referrer" />
          </div>;
        })}
      </div>
      {(m.arrows || mode) && n > 1 && (
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
