import { filterLabels, frameIds, frameLabels, imageFilters, type FrameId, type ImageLook } from "./pageSpec";

/** Small shape preview used in the frame library and picker. */
export function FrameThumb({ frame }: { frame: FrameId }) {
  return (
    <span className="frame-thumb" aria-hidden="true">
      <span className={"page-frame frame-" + frame} style={{ "--frame-ratio": "auto" } as React.CSSProperties}>
        <span className="page-frame-photo frame-thumb-fill" />
      </span>
    </span>
  );
}

type Props = {
  look: ImageLook | undefined;
  hasPhoto: boolean;
  onChange: (look: ImageLook | undefined) => void;
  onPickPhoto: () => void;
  onClearPhoto: () => void;
  onCrop: () => void;
  onSmartCrop: () => void;
};

const sliders = [
  ["brightness", "亮度", -50, 50],
  ["contrast", "對比", -50, 50],
  ["saturation", "飽和度", -100, 100],
  ["opacity", "不透明度", 10, 100],
] as const;

/** Frame, crop and photo adjustments for the selected image (one undo step per change). */
export function FrameControls({ look, hasPhoto, onChange, onPickPhoto, onClearPhoto, onCrop, onSmartCrop }: Props) {
  const l = look ?? {};
  const set = (patch: Partial<ImageLook>) => {
    const next: ImageLook = { ...l, ...patch };
    for (const k of Object.keys(next) as (keyof ImageLook)[]) if (next[k] === undefined) delete next[k];
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div className="frame-controls">
      <div className="frame-actions">
        <button type="button" className={hasPhoto ? undefined : "frame-primary"} onClick={onPickPhoto}>{hasPhoto ? "換照片" : "放入照片"}</button>
        <button type="button" disabled={!hasPhoto} onClick={onCrop} title="也可以雙擊圖片">調整裁切</button>
        <button type="button" disabled={!hasPhoto} onClick={onSmartCrop} title="依照片細節估計重點，自動移到畫面中">自動對準重點</button>
        <button type="button" disabled={!hasPhoto} onClick={onClearPhoto}>清空相框</button>
      </div>
      <fieldset className="frame-picker">
        <legend>相框</legend>
        <button type="button" aria-pressed={!l.frame} aria-label="不用相框" onClick={() => set({ frame: undefined })}>
          <span className="frame-thumb none" aria-hidden="true" />
          <small>無</small>
        </button>
        {frameIds.map((f) => (
          <button key={f} type="button" aria-pressed={l.frame === f} aria-label={"相框：" + frameLabels[f]} onClick={() => set({ frame: f })}>
            <FrameThumb frame={f} />
            <small>{frameLabels[f]}</small>
          </button>
        ))}
      </fieldset>
      <fieldset className="frame-filters">
        <legend>濾鏡</legend>
        {imageFilters.map((f) => (
          <button key={f} type="button" aria-pressed={(l.filter ?? "none") === f} onClick={() => set({ filter: f === "none" ? undefined : f })}>
            {filterLabels[f]}
          </button>
        ))}
      </fieldset>
      <fieldset className="frame-adjust">
        <legend>調整</legend>
        {sliders.map(([key, label, min, max]) => {
          const neutral = key === "opacity" ? 100 : 0;
          const value = l[key] ?? neutral;
          return (
            <label key={key}>
              <span>{label}<output>{value}</output></span>
              <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={value}
                aria-label={label}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set({ [key]: v === neutral ? undefined : v } as Partial<ImageLook>);
                }}
              />
            </label>
          );
        })}
        <div className="frame-flip">
          <button type="button" aria-pressed={!!l.flipX} onClick={() => set({ flipX: l.flipX ? undefined : true })}>左右翻轉</button>
          <button type="button" aria-pressed={!!l.flipY} onClick={() => set({ flipY: l.flipY ? undefined : true })}>上下翻轉</button>
          <button
            type="button"
            onClick={() => set({ brightness: undefined, contrast: undefined, saturation: undefined, opacity: undefined, filter: undefined, flipX: undefined, flipY: undefined, focusX: undefined, focusY: undefined, zoom: undefined })}
          >
            重設照片
          </button>
        </div>
      </fieldset>
    </div>
  );
}
