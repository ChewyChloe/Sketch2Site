import { useState } from "react";
import { PageRenderer } from "./PageRenderer";
import type { GenerationResponse } from "./generation";
export default function CandidatePreview({
  candidate,
  stale,
  onAccept,
  onBack,
}: {
  candidate: GenerationResponse;
  stale: boolean;
  onAccept: () => Promise<void>;
  onBack: () => void;
}) {
  const [mobile, setMobile] = useState(false),
    [saving, setSaving] = useState(false);
  return (
    <main className="preview-workspace" aria-label="生成候選預覽">
      <div className="preview-tools">
        <div>
          <strong>
            {candidate.mode === "mock" ? "測試生成（非 AI）" : "生成候選版本"}
          </strong>
          <small>確認後才儲存</small>
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
                await onAccept();
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
      {stale && (
        <p role="alert" className="preview-error">
          草稿已更新，請返回草稿重新生成。
        </p>
      )}
      <div className="preview-scroll">
        <div className={"preview-frame " + (mobile ? "mobile" : "desktop")}>
          <PageRenderer input={candidate.page} />
        </div>
      </div>
    </main>
  );
}
