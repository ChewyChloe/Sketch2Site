import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The editor's own tooltips. Any control with a `title` shows this designed bubble instead of
// the browser's grey box: after a short hover, or right away on keyboard focus. The title is
// moved to `data-tip` so the browser's box never appears; icon-only controls keep it as their
// accessible name. Page content (the generated site) and embedded players keep their own titles.
type Tip = { text: string; keys?: string; x: number; y: number; below: boolean };

function readTip(el: Element): string | null {
  const title = el.getAttribute("title");
  if (title !== null) {
    el.removeAttribute("title");
    if (title) {
      el.setAttribute("data-tip", title);
      if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.textContent?.trim()) el.setAttribute("aria-label", title);
    }
  }
  return el.getAttribute("data-tip");
}
const skip = (el: Element) => el.tagName === "IFRAME" || !!el.closest(".rendered-page, [data-native-title]");

export function DesignedTooltips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Keep the bubble inside the window: shift it sideways near the edges.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !tip) return;
    const w = el.offsetWidth, left = Math.min(Math.max(tip.x - w / 2, 8), innerWidth - w - 8);
    el.style.left = left + "px";
    el.style.setProperty("--arrow-x", tip.x - left + "px");
    el.style.visibility = "visible";
  }, [tip]);
  useEffect(() => {
    let current: Element | null = null;
    let timer = 0;
    const hide = () => { window.clearTimeout(timer); current = null; setTip(null); };
    const show = (el: Element) => {
      const text = el.getAttribute("data-tip");
      if (!text || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      // 「儲存草稿（⌘ / Ctrl S）」: the part in brackets is shown as a key hint.
      const m = text.match(/^(.*?)[（(]([^（）()]*(?:⌘|Ctrl|Shift|Alt|Esc|Enter|Tab)[^（）()]*)[）)]$/);
      const below = r.top < 56;
      setTip({ text: m ? m[1].trim() : text, keys: m?.[2].trim(), x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const enter = (target: EventTarget | null, delay: number) => {
      const el = (target as Element | null)?.closest?.("[title], [data-tip]");
      if (!el || skip(el)) return;
      if (!readTip(el)) return;
      if (el === current) return;
      current = el;
      window.clearTimeout(timer);
      setTip(null);
      timer = window.setTimeout(() => show(el), delay);
    };
    const over = (e: PointerEvent) => { if (e.pointerType !== "touch") enter(e.target, 450); };
    const out = (e: PointerEvent) => { if (current && !current.contains(e.relatedTarget as Node | null)) hide(); };
    const focus = (e: FocusEvent) => { const t = e.target as Element; if (t.matches?.(":focus-visible")) enter(t, 0); };
    const blur = () => hide();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    // Elements rendered with a title later (or whose title changes) are picked up on hover.
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);
  if (!tip) return null;
  return createPortal(
    <div ref={box} className={"ui-tooltip" + (tip.below ? " is-below" : "")} role="tooltip" style={{ left: tip.x, top: tip.y, visibility: "hidden" }}>
      <span>{tip.text}</span>
      {tip.keys && <kbd>{tip.keys}</kbd>}
    </div>,
    document.body,
  );
}
