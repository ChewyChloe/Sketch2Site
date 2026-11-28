import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { issueSummary, type SiteIssue } from "./siteCheck";
import type { CriticResult } from "./visualCritic";

/** The list of pre-launch issues. Each one can jump to the element it is about. */
export function SiteCheckPanel({
  issues,
  exporting,
  onGo,
  onClose,
  onExportAnyway,
  critic,
  onFixCritic,
  criticApplied,
}: {
  issues: readonly SiteIssue[];
  /** Shown before an export: offers 「仍要匯出」. */
  exporting?: boolean;
  onGo(issue: SiteIssue): void;
  onClose(): void;
  onExportAnyway?(): void;
  /** What the Visual Critic saw on the drawn page, and its one batch of fixes. */
  critic?: CriticResult;
  onFixCritic?(): void;
  criticApplied?: boolean;
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
        <p className={"check-summary" + (errors.length ? " has-errors" : "")} role="status">{issueSummary(issues)}{critic?.findings.length ? `；畫面上有 ${critic.findings.length} 個地方可以更好看` : ""}</p>
        {group("要修正", errors, "error")}
        {group("建議", warns, "warn")}
        {critic && critic.findings.length > 0 && (
          <section className="check-group critic" aria-label="畫面建議">
            <h3>畫面建議<span>{critic.findings.length}</span></h3>
            <ul>
              {critic.findings.map((f) => (
                <li key={f.id}>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.why}</p>
                    {f.fixed && <small className="critic-auto">{criticApplied ? "已修正" : "可以自動修正"}</small>}
                  </div>
                  {f.targetId && <button type="button" onClick={() => onGo({ id: f.id, level: "warn", title: f.title, advice: f.why, targetId: f.targetId })} aria-label={"前往：" + f.title}>前往</button>}
                </li>
              ))}
            </ul>
            {critic.patches.length > 0 && (
              <button type="button" className="primary critic-fix" disabled={criticApplied} onClick={onFixCritic}>
                {criticApplied ? "已一次修正，可用「撤銷修改」復原" : `一次修正 ${critic.patches.length} 處`}
              </button>
            )}
          </section>
        )}
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
