import { useMemo, useState } from "react";
import { themeIds, themeLabels, type PageSpec, type ThemeId } from "./pageSpec";
import { PageRenderer } from "./PageRenderer";
import type { CandidateResult } from "./demo";
export default function CandidatePreview({
  candidate,
  previewOnly=false,
  aiFallback=false,
  kept=0,
  stale,
  onAccept,
  onBack,
}: {
  candidate: CandidateResult;
  previewOnly?:boolean;
  aiFallback?: boolean;
  /** Site tweaks carried over from the previous version. */
  kept?: number;
  stale: boolean;
  onAccept: (page: PageSpec) => Promise<void>;
  onBack: () => void;
}) {
  const [mobile, setMobile] = useState(false),
    [saving, setSaving] = useState(false),
    [theme, setTheme] = useState<ThemeId>(candidate.page.theme ?? "classic");
  // Theme is a reviewed token set; switching it never touches content.
  const page = useMemo(() => ({ ...candidate.page, theme }), [candidate.page, theme]);
  return (
    <main className="preview-workspace" aria-label="生成候選預覽">
      <div className="preview-tools">
        <div>
          <strong data-candidate-mode={previewOnly ? "preview" : candidate.mode} data-ai-fallback={aiFallback ? "" : undefined}>
            {previewOnly ? "網站預覽" : "你的網站"}
          </strong>
          <small>
            滿意就按「使用此版本」，不喜歡可以返回草稿再改
            {kept > 0 && ` 已保留你在網站上的 ${kept} 項版面修改`}
          </small>
        </div>
        <div>
          <button aria-pressed={!mobile} onClick={() => setMobile(false)}>
            桌面
          </button>
          <button aria-pressed={mobile} onClick={() => setMobile(true)}>
            手機
          </button>
          <button
            className="primary"
            disabled={stale || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onAccept(page);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "儲存中…" : "使用此版本"}
          </button>
          <button disabled={saving} onClick={onBack}>
            返回草稿
          </button>
        </div>
      </div>
      <div className="theme-picker" role="radiogroup" aria-label="網站主題">
        <span>主題</span>
        {themeIds.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={theme === id}
            className={"theme-swatch theme-swatch-" + id}
            onClick={() => setTheme(id)}
          >
            <i aria-hidden="true" />
            {themeLabels[id]}
          </button>
        ))}
      </div>
      {stale && (
        <p role="alert" className="preview-error">
          草稿已更新，請返回草稿重新生成
        </p>
      )}
      <div className="preview-scroll">
        <div className={"preview-frame " + (mobile ? "mobile" : "desktop")}>
          <PageRenderer input={page} />
        </div>
      </div>
    </main>
  );
}
