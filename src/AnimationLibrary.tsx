import { WorkbenchIcon } from "./WorkbenchIcon";
import { useMemo, useState } from "react";
import { PageRenderer, animationRegistry } from "./PageRenderer";
import { PageSchema, type effectIds } from "./pageSpec";
import { effectLabels } from "./visualEditing";
type EffectId = (typeof effectIds)[number];
const descriptions: Record<EffectId, string> = {
  "fade-in": "由淡到清晰",
  "slide-up": "輕盈向上進入",
  "scale-in": "輕微縮放進入",
  "hover-lift": "游標移入時上浮",
  "hover-glow": "游標移入時強調",
  "stagger-reveal": "子元件依序出現",
};
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
                type: "card",
                style: { padding: "small", gap: "small", tone: "soft" },
                effects: active ? [{ effectId: id }] : [],
                children: [
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
                ],
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
  const paths: Record<EffectId, React.ReactNode> = {
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
      {paths[id]}
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
  const [active, setActive] = useState<EffectId | null>(null);
  return (
    <section
      className="animation-library"
      aria-label={draft ? "草稿動畫素材" : "預覽動畫效果庫"}
    >
      <div className="panel-intro">
        <h2>動畫素材</h2>
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
                className="animation-asset"
                key={id}
                data-effect-id={id}
                data-compatibility={reason ? "unavailable" : "available"}
                draggable={!disabled}
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
                onMouseEnter={() => setActive(id)}
                onMouseLeave={() => setActive(null)}
                onFocusCapture={() => setActive(id)}
                onBlurCapture={() => setActive(null)}
              >
                <div className="asset-preview" aria-hidden="true">
                  <EffectGlyph id={id} />
                  <div className="asset-sample">
                    <EffectSample id={id} active={active === id} />
                  </div>
                </div>
                <button
                  className="asset-choose"
                  aria-label={
                    effectLabels[id] +
                    (draft
                      ? " · " +
                        {
                          "hover-glow": "Hover Glow",
                          "fade-in": "Fade In",
                          "hover-lift": "Hover Lift",
                          "slide-up": "Slide Up",
                          "scale-in": "Scale In",
                          "stagger-reveal": "Stagger Reveal",
                        }[id]
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
              </div>
            );
          })}
      </div>
    </section>
  );
}
