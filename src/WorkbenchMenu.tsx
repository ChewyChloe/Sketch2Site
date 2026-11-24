import { useEffect, useRef, type ReactNode } from "react";
export function WorkbenchMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        e.preventDefault();
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    // Keep the open dropdown inside the viewport (menus near a screen edge would open off-screen).
    const place = () => {
      const menu = ref.current, content = menu?.querySelector<HTMLElement>(".workbench-menu-content");
      if (!menu?.open || !content) return;
      content.style.left = "";
      content.style.right = "";
      const box = content.getBoundingClientRect();
      if (box.left < 8) { content.style.left = "0"; content.style.right = "auto"; }
      if (content.getBoundingClientRect().right > innerWidth - 8) { content.style.left = "auto"; content.style.right = "0"; }
    };
    ref.current?.addEventListener("toggle", place);
    window.addEventListener("resize", place);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      ref.current?.removeEventListener("toggle", place);
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details className="workbench-menu" ref={ref}>
      <summary>{label}</summary>
      <div
        className="workbench-menu-content"
        onClick={(e) => {
          if ((e.target as Element).closest("button"))
            ref.current?.removeAttribute("open");
        }}
      >
        {children}
      </div>
    </details>
  );
}
