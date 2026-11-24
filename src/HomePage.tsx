import { useState } from "react";
import type { CanvasSpec } from "./spec";
import type { ProjectSummary } from "./projects";
import { themeIds, themeLabels } from "./pageSpec";
import { blockTemplateIds, blockTemplateInfo } from "./blockTemplates";

// Product home: real workspace data only (no invented statistics or accounts).
export default function HomePage({
  draft,
  savedState,
  motionCount,
  demos,
  onOpenDraft,
  onOpenSite,
  onOpenLibrary,
  onLoadDemo,
  projects,
  actions,
}: {
  draft: CanvasSpec;
  savedState: "saved" | "unsaved" | "empty";
  motionCount: number;
  demos: CanvasSpec[];
  onOpenDraft: () => void;
  onOpenSite: () => void;
  onOpenLibrary: () => void;
  onLoadDemo: (demo: CanvasSpec) => void;
  projects: ProjectSummary[] | null;
  actions: {
    open: (id: string) => void;
    create: (from?: CanvasSpec) => void;
    rename: (id: string, name: string) => Promise<void>;
    duplicate: (id: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
}) {
  return (
    <main className="home-page" aria-label="Sketch2Site 首頁">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">視覺化網站工作台</p>
          <h1>把草圖，變成可以上線的網站。</h1>
          <p className="home-lead">
            在畫布上擺出標題、圖片與按鈕，Sketch2Site 幫你整理成首屏、特色、價目表等區塊，套上主題與動畫，最後匯出獨立的 React 專案。
          </p>
          <div className="home-actions">
            <button className="home-primary" onClick={onOpenDraft}>
              {draft.nodes.length ? "繼續編輯草稿" : "開始畫草稿"}
            </button>
            <button className="home-secondary" onClick={onOpenLibrary}>
              瀏覽動畫素材庫
            </button>
          </div>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <div className="art-sketch">
            <i className="a1" /><i className="a2" /><i className="a3" /><i className="a4" /><i className="a5" />
          </div>
          <span className="art-arrow">→</span>
          <div className="art-site">
            <b /><i className="s1" /><i className="s2" /><i className="s3" />
            <span><i /><i /><i /></span>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-workspace">
        <div className="home-section-head">
          <h2 id="home-workspace">我的工作區</h2>
          <div className="home-quick">
            <button className="home-link-button" onClick={onOpenSite}>開啟網站工作區</button>
            <button className="home-link-button" onClick={onOpenLibrary}>動畫素材庫（{motionCount}）</button>
          </div>
        </div>
        <p className="home-note">專案存在這個瀏覽器；切換專案前會自動儲存目前的草稿。</p>
        <div className="home-projects" aria-busy={projects === null}>
          <button className="home-new" onClick={() => actions.create()}>
            <span aria-hidden="true">＋</span>
            新增專案
          </button>
          {projects?.map((p) => (
            <ProjectCard key={p.id} project={p} unsaved={p.active && savedState === "unsaved"} live={p.active ? draft : p.draft} actions={actions} onOpen={p.active ? onOpenDraft : undefined} />
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-demos">
        <h2 id="home-demos">從範例開始</h2>
        <p className="home-note">範例會建立成新專案，不影響現有的專案。</p>
        <div className="home-demos">
          {demos.map((demo) => (
            <button key={demo.metadata.name} className="home-demo" onClick={() => onLoadDemo(demo)}>
              <DraftThumb draft={demo} />
              <span>{demo.metadata.name}</span>
              <small>{demo.nodes.length} 個元件</small>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-steps">
        <h2 id="home-steps">怎麼運作</h2>
        <ol className="home-steps">
          <li><b>畫草稿</b><span>拖入元件或區塊範本，位置不必精準。</span></li>
          <li><b>生成網站</b><span>智慧排版整理成完整頁面；設定 AI 後也可交給模型。</span></li>
          <li><b>調整風格</b><span>切換主題、附加動畫、雙擊直接改字。</span></li>
          <li><b>匯出上線</b><span>下載 React + TypeScript 專案，部署到任何靜態主機。</span></li>
        </ol>
      </section>

      <section className="home-section" aria-labelledby="home-features">
        <h2 id="home-features">你可以用到的</h2>
        <div className="home-features">
          <div>
            <h3>區塊範本</h3>
            <p>{blockTemplateIds.map((id) => blockTemplateInfo(id).label).join("、")}</p>
          </div>
          <div>
            <h3>{themeIds.length} 套主題</h3>
            <p>{themeIds.map((id) => themeLabels[id]).join("、")}</p>
          </div>
          <div>
            <h3>聯絡表單</h3>
            <p>接上 Formspree 等服務，匯出的網站就能收到留言。</p>
          </div>
          <div>
            <h3>資料留在本機</h3>
            <p>草稿與圖片只存在這個瀏覽器，不會上傳。</p>
          </div>
        </div>
      </section>
    </main>
  );
}

// Miniature of the draft drawn from the real node geometry.
function DraftThumb({ draft }: { draft: CanvasSpec }) {
  // Crop to the drawn content so a short draft does not sit in a sea of blank canvas.
  const bottom = draft.nodes.reduce((m, n) => Math.max(m, n.y + n.height), 0);
  const height = Math.min(draft.metadata.height, Math.max(720, bottom + 80));
  return (
    <svg className="home-thumb" viewBox={`0 0 1440 ${height}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <rect width="1440" height={height} rx="24" className="thumb-bg" />
      {draft.nodes.map((n) => (
        <rect key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} rx="10" className={"thumb-" + n.type} />
      ))}
    </svg>
  );
}

function ProjectCard({
  project,
  live,
  unsaved,
  actions,
  onOpen,
}: {
  project: ProjectSummary;
  live: CanvasSpec;
  unsaved: boolean;
  actions: { open: (id: string) => void; rename: (id: string, name: string) => Promise<void>; duplicate: (id: string) => Promise<void>; remove: (id: string) => Promise<void> };
  onOpen?: () => void;
}) {
  const [renaming, setRenaming] = useState(false),
    [name, setName] = useState(live.metadata.name),
    [confirmDelete, setConfirmDelete] = useState(false);
  const updated = new Date(project.updatedAt);
  return (
    <article className={"home-project" + (project.active ? " is-active" : "")} aria-label={"專案：" + live.metadata.name}>
      <button className="home-project-open" onClick={() => (onOpen ? onOpen() : actions.open(project.id))} aria-label={"開啟 " + live.metadata.name}>
        <DraftThumb draft={live} />
      </button>
      <div className="home-project-body">
        {renaming ? (
          <form
            className="home-rename"
            onSubmit={(e) => {
              e.preventDefault();
              void actions.rename(project.id, name).then(() => setRenaming(false));
            }}
          >
            <input aria-label="專案名稱" value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setName(live.metadata.name); setRenaming(false); } }} />
            <button type="submit">儲存</button>
          </form>
        ) : (
          <h3>{live.metadata.name}</h3>
        )}
        <p className="home-meta">
          {live.nodes.length ? `${live.nodes.length} 個元件` : "空白草稿"}
          {project.hasPage ? " · 已有網站" : ""} · {updated.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })} 更新
        </p>
        {project.active && <p className={"home-state " + (unsaved ? "state-unsaved" : "state-saved")}>{unsaved ? "目前開啟 · 有尚未儲存的修改" : "目前開啟"}</p>}
        {confirmDelete ? (
          <div className="home-project-actions" role="group" aria-label="確認刪除">
            <span className="home-danger-text">確定刪除？無法復原</span>
            <button className="home-danger" onClick={() => void actions.remove(project.id)}>刪除</button>
            <button onClick={() => setConfirmDelete(false)}>取消</button>
          </div>
        ) : (
          <div className="home-project-actions">
            <button className="home-primary small" onClick={() => (onOpen ? onOpen() : actions.open(project.id))}>開啟</button>
            <button onClick={() => { setName(live.metadata.name); setRenaming(true); }}>改名</button>
            <button onClick={() => void actions.duplicate(project.id)}>複製</button>
            <button onClick={() => setConfirmDelete(true)}>刪除</button>
          </div>
        )}
      </div>
    </article>
  );
}
