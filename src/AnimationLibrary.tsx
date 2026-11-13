import {createMotion} from "./motion";
import {motionCatalog} from "./motionCatalog";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { useMemo, useState } from "react";
import { PageRenderer, animationRegistry } from "./PageRenderer";
import { PageSchema, type effectIds } from "./pageSpec";
import { effectLabels } from "./visualEditing";
type EffectId = (typeof effectIds)[number];
const descriptions=Object.fromEntries(Object.entries(motionCatalog).map(([id,d])=>[id,d.summary])) as Record<EffectId,string>;
function EffectSample({ id, active }: { id: EffectId; active: boolean }) {
  const [ids] = useState(() =>
    Array.from({ length: 4 }, () => crypto.randomUUID()),
  );
  const page = useMemo(
    () =>
      PageSchema.parse({
        schemaVersion: 2,
        metadata: { title: "動畫素材示意", language: "zh-Hant" },
        typography: "sans",
        styles: "neutral",
        responsive: { mobileColumns: 1, desktopColumns: 1 },
        sections: [
          {
            id: ids[0],
            type: "section",
            style: { padding: "none", gap: "none" },
            children: [
              {
                id: ids[1],
                type: id==="breathing-glow"?"button":["count-up","curved-path-text"].includes(id)?"paragraph":"card",
                ...(id==="breathing-glow"?{content:"查看作品",href:"https://learn.microsoft.com/zh-tw/training/"}:id==="count-up"?{content:"1234"}:id==="curved-path-text"?{content:"原創動畫示意"}:{}),
                style: { padding: "small", gap: "small", tone: "soft" },
                effects: active ? [createMotion(id,ids[1],id==="count-up"?{endValue:1234}:id==="flip-card"?{backText:"這是背面示意內容"}:id==="fold-reveal"?{underText:"這是下層示意內容"}:id==="physics-tag-field"?{labels:["示意一","示意二","示意三"]}:{})] : [],
                ...(!["breathing-glow","count-up","curved-path-text"].includes(id)?{children: [
                  {
                    id: ids[2],
                    type: "paragraph",
                    content: "Aa",
                    style: { padding: "none" },
                  },
                  {
                    id: ids[3],
                    type: "paragraph",
                    content: "—",
                    style: { padding: "none" },
                  },
                ]}:{}),
              },
            ],
          },
        ],
      }),
    [id, active, ids],
  );
  return <PageRenderer input={page} />;
}
function EffectGlyph({ id }: { id: EffectId }) {
  const paths: Partial<Record<EffectId, React.ReactNode>> = {
    "fade-in": (
      <>
        <rect x="3" y="7" width="5" height="10" opacity=".2" />
        <rect x="10" y="7" width="5" height="10" opacity=".5" />
        <rect x="17" y="7" width="5" height="10" />
      </>
    ),
    "slide-up": (
      <>
        <path d="M12 20V4m-5 5 5-5 5 5" />
        <path d="M4 20h16" />
      </>
    ),
    "scale-in": (
      <>
        <rect x="8" y="8" width="8" height="8" />
        <path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5" />
      </>
    ),
    "hover-lift": (
      <>
        <rect x="4" y="12" width="16" height="8" />
        <path d="m8 7 4-4 4 4m-4-4v7" />
      </>
    ),
    "hover-glow": (
      <>
        <rect x="6" y="6" width="12" height="12" />
        <path d="M3 7V3h4m10 0h4v4M3 17v4h4m10 0h4v-4" />
      </>
    ),
    "breathing-glow": <><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" opacity=".4"/></>,
    "curved-path-text": <><path d="M3 17Q12 2 21 17"/><path d="M6 9v3m6-6v3m6 0v3"/></>,
    "count-up": <><path d="M4 8h3v11M12 10q0-6 6-3t-4 8l-2 4h9"/><path d="m3 4 2-2 2 2"/></>,
    "flip-card": <><path d="M6 4h12v16H6zM3 9l-2 3 2 3m18-6 2 3-2 3"/><path d="M12 4v16" opacity=".4"/></>,
    "physics-tag-field": <><rect x="2" y="3" width="12" height="6" rx="3"/><rect x="8" y="14" width="14" height="6" rx="3"/><path d="m6 12-2 4m14-9 2 4"/></>,
    "fold-reveal": <><path d="M3 3h12l6 6v12H3zM15 3v6h6"/><path d="m8 15 4-4m-4 0h4v4"/></>,
    "stagger-reveal": (
      <>
        <path d="M3 5h8M7 12h10M12 19h9" />
        <path d="M3 9v10m-2-2 2 2 2-2" opacity=".4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={id === "fade-in" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {paths[id]??<><path d="M4 12h16M12 4v16"/><circle cx="12" cy="12" r="7"/></>}
    </svg>
  );
}
export function AnimationLibrary({
  selectedLabel,
  compatibility,
  onChoose,
  onDragStart,
  onDragEnd,
  disabled = false,
  filter = "",
  draft = false,
}: {
  selectedLabel?: string;
  compatibility(id: EffectId): string | null;
  onChoose(id: EffectId): void;
  onDragStart(id: EffectId, data: DataTransfer): void;
  onDragEnd?(): void;
  disabled?: boolean;
  filter?: string;
  draft?: boolean;
}) {
  const [expanded,setExpanded]=useState<EffectId|null>(null);
  const [replay,setReplay]=useState(0);
  const [active, setActive] = useState<EffectId | null>(null);
  return (
    <section
      className="animation-library"
      aria-label={draft ? "草稿動畫素材" : "預覽動畫效果庫"}
    >
      <div className="panel-intro">
        <h2>動畫素材</h2>
        <small>素材示意，非使用者內容</small>
        <p>
          {selectedLabel
            ? `目前選取：${selectedLabel}`
            : "拖至元件，或選取元件後套用。"}
        </p>
        {draft && <small>草稿只附加標記</small>}
      </div>
      <div className="animation-assets">
        {(Object.keys(animationRegistry) as EffectId[])
          .filter((id) =>
            (effectLabels[id] + id + descriptions[id])
              .toLowerCase()
              .includes(filter.toLowerCase()),
          )
          .map((id) => {
            const reason = compatibility(id);
            return (
              <div
                className={"animation-asset"+(["flip-card","physics-tag-field","fold-reveal","curved-path-text"].includes(id)&&expanded===id?" motion-expanded":"")}
                key={id}
                data-effect-id={id}
                data-compatibility={reason ? "unavailable" : "available"}
                draggable={!disabled && !["flip-card","physics-tag-field","fold-reveal"].includes(id)}
                onDragStart={(e) => {
                  if (disabled) {
                    e.preventDefault();
                    return;
                  }
                  e.currentTarget.classList.add("is-dragging");
                  onDragStart(id, e.dataTransfer);
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove("is-dragging");
                  onDragEnd?.();
                }}
                onMouseEnter={() => {if(!expanded)setActive(id);}}
                onMouseLeave={() => {if(!expanded)setActive(null);}}
                onFocusCapture={() => {if(!expanded)setActive(id);}}
                onBlurCapture={() => {if(!expanded)setActive(null);}}
              >
                <div className="asset-preview" aria-label="效果示意" onClickCapture={e=>{if((e.target as Element).closest("a"))e.preventDefault();}}>
                  <EffectGlyph id={id} />
                  <div className="asset-sample">
                    <EffectSample key={replay} id={id} active={active === id} />
                  </div>
                </div>
                <button
                  className="asset-choose"
                  draggable={!disabled}
                  aria-label={
                    effectLabels[id] +
                    (draft
                      ? " · " +
                        motionCatalog[id].nameEn
                      : "")
                  }
                  disabled={disabled || Boolean(reason)}
                  onClick={() => onChoose(id)}
                  title={reason ?? descriptions[id]}
                >
                  <strong>{effectLabels[id]}</strong>
                  <WorkbenchIcon name="grip" />
                </button>
                <small>{reason ?? descriptions[id]}</small>
                <button type="button" className="motion-replay" aria-label={"重播"+effectLabels[id]+"示意"} onClick={()=>{if(["flip-card","physics-tag-field","fold-reveal","curved-path-text"].includes(id))setExpanded(id);setActive(id);setReplay(v=>v+1);}}>重播示意</button>
                {expanded===id&&<button type="button" onClick={()=>{setExpanded(null);setActive(null);}}>收合示意</button>}
              </div>
            );
          })}
      </div>
    </section>
  );
}
