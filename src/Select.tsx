import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

// The app's own dropdown, used instead of the browser's native <select> so the open list
// matches the rest of the interface. Keyboard: ↑/↓ to move, Enter or Space to pick, Esc to close.
export type SelectOption = { value: string; label: string; hint?: string; style?: CSSProperties; disabled?: boolean };

export function Select({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className = "",
  buttonStyle,
  title,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  buttonStyle?: CSSProperties;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<CSSProperties>({});
  const button = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value);
  const close = (focus = true) => { setOpen(false); if (focus) button.current?.focus(); };
  const pick = (o: SelectOption) => { if (o.disabled) return; onChange(o.value); close(); };
  // Open below the button (or above when there is no room), never off-screen; fixed so
  // panels with their own scrolling cannot clip it.
  const place = () => {
    if (!button.current || !list.current) return;
    const r = button.current.getBoundingClientRect(), h = list.current.offsetHeight, w = list.current.offsetWidth;
    const below = innerHeight - r.bottom - 8, up = below < h && r.top > below;
    const left = Math.min(Math.max(8, r.left), Math.max(8, innerWidth - w - 8));
    setPos({ position: "fixed", left, minWidth: r.width, top: up ? Math.max(8, r.top - h - 6) : r.bottom + 6, maxHeight: Math.max(160, up ? r.top - 16 : below - 8) });
  };
  useLayoutEffect(() => { if (open) place(); else setPos({}); }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!button.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) close(false); };
    // The page or a panel scrolling moves the list along with its button.
    const follow = (e: Event) => { if (!list.current?.contains(e.target as Node)) place(); };
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", follow);
    document.addEventListener("scroll", follow, true);
    // Show the current choice without scrolling anything outside the list.
    const l = list.current, sel = l?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (l && sel) l.scrollTop = Math.max(0, sel.offsetTop - l.clientHeight / 2);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("resize", follow); document.removeEventListener("scroll", follow, true); };
  }, [open]);
  const move = (step: number) => {
    let i = active;
    for (let n = 0; n < options.length; n++) { i = (i + step + options.length) % options.length; if (!options[i].disabled) break; }
    setActive(i);
  };
  return (
    <div className={"ui-select " + className}>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={label}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-value={value}
        disabled={disabled}
        className="ui-select-button"
        style={{ ...current?.style, ...buttonStyle }}
        onClick={() => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen((v) => !v); }}
        onKeyDown={(e) => {
          if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); return; }
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
          else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
          else if (e.key === "Home") { e.preventDefault(); setActive(0); }
          else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
          else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(options[active]); }
          else if (e.key === "Escape" || e.key === "Tab") { e.stopPropagation(); if (e.key === "Escape") e.preventDefault(); close(e.key === "Escape"); }
        }}
      >
        <span className="ui-select-value">{current?.label ?? ""}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && createPortal(
        <ul ref={list} role="listbox" aria-label={label} className="ui-select-list" style={{ visibility: pos.position ? "visible" : "hidden", ...pos }}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              data-value={o.value}
              className={i === active ? "is-active" : undefined}
              style={o.style}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              <span>{o.label}</span>
              {o.hint && <small>{o.hint}</small>}
              {o.value === value && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
