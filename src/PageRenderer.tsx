import { useEffect, useRef } from "react";
import { PageRuntime } from "./PageRuntime";
import { componentIdFromElement } from "./pageSpec";
import "./preview.css";
export {
  animationRegistry,
  componentRegistry,
  RenderNode,
} from "./PageRuntime";
export function PageRenderer({
  input,
  selectedId,
  onSelect,
}: {
  input: unknown;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current
      ?.querySelectorAll<HTMLElement>("[data-page-id]")
      .forEach((el) => {
        if (el.dataset.pageId === selectedId)
          el.setAttribute("data-page-selected", "true");
        else el.removeAttribute("data-page-selected");
      });
  }, [selectedId, input]);
  return (
    <div
      ref={root}
      data-editable={Boolean(onSelect)}
      onClickCapture={(e) => {
        if (onSelect) {
          const id = componentIdFromElement(e.target as Element);
          if (id) onSelect(id);
        }
      }}
    >
      <PageRuntime input={input} />
    </div>
  );
}
