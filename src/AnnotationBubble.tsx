import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { interpretAnnotation, suggestionsFor } from "./annotate";
import type { PageNode, PageSpec } from "./pageSpec";

export const typeNames: Record<string, string> = { heading: "標題", paragraph: "文字", button: "按鈕", card: "卡片", image: "圖片", form: "表單", grid: "網格", section: "區塊", stack: "群組" };

/**
 * "Click it, say how to change it": a small note box anchored next to the selected
 * element. The instruction becomes ordinary patches (validated, scoped, undoable).
 */
export function AnnotationBubble({
  page,
  node,
  stage,
  onApply,
  onStage,
  chip = true,
  openToken = 0,
}: {
  page: PageSpec;
  node: PageNode;
  stage: RefObject<HTMLElement | null>;
  onApply: (patches: unknown[], scope: string[]) => boolean;
  /** Keeps the note in the list to send later (returns its number). */
  onStage?: (text: string) => number;
  /** false: the site toolbar shows the 註解 button instead of the small chip. */
  chip?: boolean;
  /** Changing this opens the note box (from the toolbar's 註解 button). */
  openToken?: number;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean; chipTop: number; chipLeft: number } | null>(null);
  // Selecting shows a small 「註解」 button; the note box opens only when asked,
  // so clicking around the live page (links, toggles, motion) is never blocked.
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  // Anchor below the element (or above when it sits low), clamped to the stage.
  useLayoutEffect(() => {
    const host = stage.current;
    if (!host) return;
    const place = () => {
      const el = host.querySelector<HTMLElement>(`[data-page-id="${node.id}"]`);
      if (!el) return setPos(null);
      const r = el.getBoundingClientRect(), s = host.getBoundingClientRect();
      const width = Math.min(360, s.width - 16);
      const below = r.bottom - s.top + 220 < Math.max(host.scrollHeight, s.height) || r.top - s.top < 220;
      setPos({
        top: below ? r.bottom - s.top + 10 : r.top - s.top - 10,
        left: Math.max(8, Math.min(r.left - s.left, s.width - width - 8)),
        below,
        chipTop: Math.max(4, r.top - s.top - 40),
        chipLeft: Math.max(8, Math.min(r.right - s.left - 76, s.width - 84)),
      });
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    const frame = host.querySelector(".preview-frame");
    if (frame) observer.observe(frame);
    return () => observer.disconnect();
  }, [node.id, page, stage]);
  useEffect(() => {
    setStatus(null);
    setText("");
    setOpen(false);
  }, [node.id]);
  // Opens when the toolbar's 註解 is pressed, not because an earlier press left the count above zero.
  const seenToken = useRef(openToken);
  useEffect(() => {
    if (openToken !== seenToken.current) { seenToken.current = openToken; setOpen(true); }
  }, [openToken]);
  useEffect(() => {
    if (!open) return;
    box.current?.scrollIntoView?.({ block: "nearest" });
    input.current?.focus({ preventScroll: true });
  }, [open]);

  const submit = (instruction: string) => {
    const result = interpretAnnotation(page, node.id, instruction);
    if (!result.ok) return setStatus({ ok: false, message: result.message });
    if (result.patches.length && !onApply(result.patches, result.scope)) return setStatus({ ok: false, message: "這樣改不了，頁面沒有變動" });
    const extra = result.skipped.length ? `（看不懂：${result.skipped.join("、")}）` : "";
    setStatus({ ok: true, message: "已" + result.summary.join("、") + (extra ? "，" + extra.replace(/^[，。\s]+/, "") : "") });
    setText("");
  };

  if (!pos) return null;
  if (!open && !chip) return null;
  if (!open)
    return (
      <button
        type="button"
        className="note-chip"
        style={{ top: pos.chipTop, left: pos.chipLeft }}
        aria-label={"註解：說說這個" + (typeNames[node.type] ?? "元件") + "要怎麼改"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4h12v9H9l-4 3v-3H4z" /></svg>
        註解
      </button>
    );
  return (
    <div
      ref={box}
      className={"note-bubble" + (pos.below ? "" : " above")}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label={"註解：修改這個" + (typeNames[node.type] ?? "元件")}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <span className="note-target">{typeNames[node.type] ?? "元件"}</span>
        <input
          ref={input}
          value={text}
          maxLength={300}
          aria-label="想怎麼改這個元件"
          placeholder="想怎麼改？例如：大一點、換成藍色"
          onChange={(e) => setText(e.target.value)}
        />
        {onStage && (
          <button
            type="button"
            className="note-stage"
            disabled={!text.trim()}
            title="先記下來，寫完幾則再一起送出"
            onClick={() => {
              const n = onStage(text.trim());
              setStatus({ ok: true, message: `已暫存第 ${n} 則，寫完按「送出修改」一起改` });
              setText("");
            }}
          >
            暫存
          </button>
        )}
        <button type="submit" className="primary" disabled={!text.trim()}>改</button>
        <button type="button" className="note-close" aria-label="關閉註解" onClick={() => setOpen(false)}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </form>
      <div className="note-chips" role="group" aria-label="常用修改">
        {suggestionsFor(page, node.id).map((s) => (
          <button key={s} type="button" onClick={() => submit(s)}>{s}</button>
        ))}
      </div>
      <p className={"note-status" + (status && !status.ok ? " bad" : "")} role="status" aria-live="polite">
        {status ? status.message + (status.ok && !status.message.startsWith("已暫存") ? " 可按「撤銷修改」復原" : "") : onStage ? "「改」馬上改；「暫存」先記下，看不懂的會交給 AI" : "要改文字請用引號：改成「新的標題」"}
      </p>
    </div>
  );
}
