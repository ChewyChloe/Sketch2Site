import { useEffect, useRef } from "react";

// Esc closes a window even when focus has left it (e.g. after a pressed button re-renders or
// disables itself). Controls that handle Esc themselves (open dropdowns) stop it first.
export function useEscapeToClose(onClose: () => void) {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); latest.current(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
}
