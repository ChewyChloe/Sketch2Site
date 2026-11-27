import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageRenderer } from "./PageRenderer";
import { CompareView } from "./CompareView";
import type { PageSpec } from "./pageSpec";
import { addVersion, listVersions, renameVersion, versionKindLabels, type SiteVersion } from "./versions";

const when = (iso: string) => {
  const d = new Date(iso), today = new Date();
  const time = d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toDateString() === today.toDateString() ? "今天 " + time : `${d.getMonth() + 1}/${d.getDate()} ${time}`;
};

/** A small, real rendering of a version: the page itself, scaled down. */
function Thumb({ page }: { page: PageSpec }) {
  return (
    <div className="version-thumb" aria-hidden="true" inert>
      <div className="version-thumb-page"><PageRenderer input={page} /></div>
    </div>
  );
}

/**
 * Site version timeline: every saved version with a thumbnail; preview any of them, compare it
 * with the current site, or restore it. Restoring adds a new version, so nothing is lost.
 */
export function VersionTimeline({ current, onRestore, onClose }: { current: PageSpec; onRestore(v: SiteVersion): void; onClose(): void }) {
  const [versions, setVersions] = useState<SiteVersion[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<SiteVersion | null>(null);
  const [compare, setCompare] = useState<SiteVersion | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const reload = useCallback(() => listVersions().then(setVersions, () => setError("讀不到版本紀錄，請重新整理頁面")), []);
  useEffect(() => { void reload(); close.current?.focus(); }, [reload]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || compare) return;
      e.stopPropagation();
      if (open) setOpen(null); else onClose();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [open, compare, onClose]);
  const save = async () => {
    const added = await addVersion(name || "手動存檔", "manual", current).catch(() => undefined);
    if (added === undefined) setError("存檔失敗，請再試一次");
    else setError(added ? "" : "和最新的版本一樣，不用再存");
    setName("");
    void reload();
  };
  return createPortal(
    <div className="check-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="version-panel" role="dialog" aria-modal="true" aria-label="網站版本">
        <header>
          <h2>{open ? open.label : "網站版本"}</h2>
          <div className="compare-actions">
            {open && <button type="button" onClick={() => setOpen(null)}>回到列表</button>}
            <button ref={close} type="button" className="check-close" aria-label="關閉版本" onClick={onClose}>×</button>
          </div>
        </header>
        {open ? (
          <div className="version-detail">
            <p className="version-meta">{versionKindLabels[open.kind]} · {when(open.at)}</p>
            <div className="version-actions">
              <button type="button" onClick={() => setCompare(open)}>和現在比較</button>
              <button type="button" className="primary" onClick={() => onRestore(open)}>還原這一版</button>
            </div>
            <div className="version-large" aria-label={"預覽：" + open.label}>
              <PageRenderer input={open.page} />
            </div>
          </div>
        ) : (
          <>
            <form className="version-save" onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <input aria-label="版本名稱" placeholder="替現在這一版取名，例如「正式發布版」" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="primary">存成新版本</button>
            </form>
            {error && <p className="version-error" role="status">{error}</p>}
            {versions === null ? (
              <p className="version-empty">讀取中…</p>
            ) : !versions.length ? (
              <p className="version-empty">還沒有版本。生成網站、用註解修改或匯出時會自動存一版，也可以在上面手動存。</p>
            ) : (
              <ol className="version-list" aria-label="版本時間軸">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button type="button" className="version-open" onClick={() => setOpen(v)} aria-label={"預覽 " + v.label}>
                      <Thumb page={v.page} />
                    </button>
                    <div className="version-info">
                      {editing === v.id ? (
                        <input
                          autoFocus
                          aria-label="新的版本名稱"
                          defaultValue={v.label}
                          maxLength={40}
                          onBlur={async (e) => { await renameVersion(v.id, e.currentTarget.value); setEditing(null); void reload(); }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }}
                        />
                      ) : (
                        <strong onDoubleClick={() => setEditing(v.id)}>{v.label}</strong>
                      )}
                      <small><span className={"version-kind " + v.kind}>{versionKindLabels[v.kind]}</span>{when(v.at)}</small>
                      <div className="version-row-actions">
                        <button type="button" onClick={() => setOpen(v)}>預覽</button>
                        <button type="button" onClick={() => setCompare(v)}>比較</button>
                        <button type="button" onClick={() => setEditing(v.id)}>改名</button>
                        <button type="button" onClick={() => onRestore(v)}>還原</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {compare && (
          <CompareView before={compare.page} after={current} title={`「${compare.label}」和現在比較`} beforeLabel={compare.label} afterLabel="現在" onClose={() => setCompare(null)} />
        )}
      </div>
    </div>,
    document.body,
  );
}
