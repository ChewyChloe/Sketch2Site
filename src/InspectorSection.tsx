import { useState, type ReactNode } from "react";

// A collapsible group in the object inspector. Whether it is open is remembered per
// section, so people who never use a group can keep it out of the way.
const KEY = "sketch2site:inspector-sections";
function load(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>; } catch { return {}; }
}

export function InspectorSection({ id, title, defaultOpen = true, children }: { id: string; title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(() => load()[id] ?? defaultOpen);
  return (
    <section className={"insp-section" + (open ? " is-open" : "")} aria-label={title}>
      <button
        type="button"
        className="insp-section-head"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          try { localStorage.setItem(KEY, JSON.stringify({ ...load(), [id]: next })); } catch { /* per-viewer convenience only */ }
        }}
      >
        <span>{title}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div className="insp-section-body">{children}</div>}
    </section>
  );
}
