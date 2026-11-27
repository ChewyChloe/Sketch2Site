import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { issueSummary, type SiteIssue } from "./siteCheck";

/** The list of pre-launch issues. Each one can jump to the element it is about. */
export function SiteCheckPanel({
  issues,
  exporting,
  onGo,
  onClose,
  onExportAnyway,
}: {
  issues: readonly SiteIssue[];
  /** Shown before an export: offers 「仍要匯出」. */
  exporting?: boolean;
  onGo(issue: SiteIssue): void;
  onClose(): void;
  onExportAnyway?(): void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    // Capture phase: the workspace has its own Escape handling (clear selection) underneath.
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onClose]);
  const errors = issues.filter((i) => i.level === "error"), warns = issues.filter((i) => i.level === "warn");
  const group = (label: string, list: readonly SiteIssue[], level: string) =>
    list.length > 0 && (
      <section className={"check-group " + level} aria-label={label}>
        <h3>{label}<span>{list.length}</span></h3>
        <ul>
          {list.map((i) => (
            <li key={i.id}>
              <div>
                <strong>{i.title}</strong>
                {i.quote && <q>{i.quote}</q>}
                <p>{i.advice}</p>
              </div>
              {i.targetId && <button type="button" onClick={() => onGo(i)} aria-label={"前往：" + i.title}>前往</button>}
            </li>
          ))}
        </ul>
      </section>
    );
  return createPortal(
    <div className="check-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="check-panel" role="dialog" aria-modal="true" aria-label="上線前檢查">
        <header>
          <h2>上線前檢查</h2>
          <button ref={close} type="button" className="check-close" aria-label="關閉" onClick={onClose}>×</button>
        </header>
        <p className={"check-summary" + (errors.length ? " has-errors" : "")} role="status">{issueSummary(issues)}</p>
        {group("要修正", errors, "error")}
        {group("建議", warns, "warn")}
        {exporting && (
          <footer>
            <button type="button" onClick={onClose}>先去修改</button>
            <button type="button" className="primary" onClick={onExportAnyway}>{errors.length ? "仍要匯出" : "匯出"}</button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
