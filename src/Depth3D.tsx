import { useEffect, useRef, useState, type ReactNode } from "react";

// Wraps a picture that was asked to be 3D. The picture itself stays in the page (alt text,
// fallback); when the browser can draw WebGL, motion is allowed and the element comes near the
// screen, the 3D scene loads and draws over it. Otherwise a still, gently tilted picture shows.
export function Depth3D({ mode, children }: { mode: "float" | "turntable"; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return;
    let cancelled = false, dispose = () => {};
    const start = async () => {
      const img = el.querySelector("img");
      if (!img) return;
      if (!img.complete) await new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); });
      if (cancelled || !img.naturalWidth) return;
      try {
        const { createDepthScene } = await import("./depthScene");
        if (cancelled) return;
        const tint = getComputedStyle(el).getPropertyValue("--accent-soft").trim() || "#eeeeea";
        dispose = createDepthScene(el, img, mode, tint);
        setLive(true);
      } catch {
        setLive(false);
      }
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); void start(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); dispose(); };
  }, [mode]);
  return <div ref={host} className={"page-depth depth-" + mode + (live ? " is-live" : "")}>{children}</div>;
}
