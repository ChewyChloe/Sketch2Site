import { useMemo, useState } from "react";
import { HomeNav, WhySection, StepsSection, Showcase, HomeFaq } from "./HomeSections";
import { starterDrafts } from "./starters";
import type { CanvasSpec } from "./spec";
import type { ProjectSummary } from "./projects";

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
  // Rough test drafts stay in the draft menu; the showcase only shows finished-looking sites.
  const templates = useMemo(() => [...starterDrafts(), ...demos.filter((d) => !["不規則草稿", "動畫草稿"].includes(d.metadata.name))], [demos]);
  return (
    <main className="home-page" aria-label="Sketch2Site 首頁">
      <HomeNav />
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

      <WhySection />
      <StepsSection />
      <Showcase templates={templates} onUse={onLoadDemo} />
      <HomeFaq />
    </main>
  );
}

// Miniature of the draft drawn from the real node geometry.
function DraftThumb({ draft }: { draft: CanvasSpec }) {
  // Crop to the drawn content so a short draft does not sit in a sea of blank canvas.
  // Multi-page drafts show their first page.
  const first = draft.metadata.pages?.[0]?.id;
  const nodes = first ? draft.nodes.filter((n) => (n.pageId ?? first) === first) : draft.nodes;
  const bottom = nodes.reduce((m, n) => Math.max(m, n.y + n.height), 0);
  const height = Math.min(draft.metadata.height, Math.max(720, bottom + 80));
  return (
    <svg className="home-thumb" viewBox={`0 0 1440 ${height}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <rect width="1440" height={height} rx="24" className="thumb-bg" />
      {nodes.map((n) => (
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
          {live.metadata.pages && live.metadata.pages.length > 1 ? `${live.metadata.pages.length} 頁 · ` : ""}
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
