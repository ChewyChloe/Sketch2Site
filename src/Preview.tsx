import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  type Ref,
} from "react";
import { demoPage } from "./pageFixtures";
import { usePagePersistence } from "./usePagePersistence";
import { VisualSurface, type VisualMode } from "./VisualSurface";
import { animationRegistry } from "./PageRenderer";
import { commitHistory, undoHistory, type History } from "./history";
import {
  effectLabels,
  effectMime,
  nodeLabels,
  type Annotation,
} from "./visualEditing";
import { effectCompatible, effectIds, type PageNode } from "./pageSpec";
import { PageRenderer } from "./PageRenderer";
import { validatePage } from "./pageSpec";
import { applyPatchBatch, indexNodes, travelPage, type Change } from "./patch";
function changeLabel(c: Change) {
  return c.property === "content"
    ? "文字"
    : c.property.startsWith("effects.")
      ? "動畫"
      : "屬性";
}
function valueLabel(value: unknown): string {
  if (value === undefined) return "未設定";
  if (value && typeof value === "object" && "duration" in value)
    return String(value.duration) + " 毫秒";
  return String(value);
}
export type PreviewHandle = {
  target(): { sessionId: string; revision: number } | null;
  accept(
    page: import("./pageSpec").PageSpec,
    target: { sessionId: string; revision: number },
  ): Promise<{ ok: boolean; error?: string }>;
};
export default function Preview({ ref }: { ref?: Ref<PreviewHandle> }) {
  const persistence = usePagePersistence();
  const { session, current, update, ready, loadError, status } = persistence;
  useImperativeHandle(ref, () => ({
    target: persistence.generationTarget,
    accept: async (page, target) => {
      const result = await persistence.acceptGeneration(page, target);
      if (result.ok) {
        setSource("本機頁面");
        setSelected(null);
        setError("");
        setNotice("");
      }
      return result;
    },
  }));
  const [source, setSource] = useState("範例預覽"),
    [error, setError] = useState(""),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [replay, setReplay] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = selectedIds.length === 1 ? selectedIds[0] : null;
  function setSelected(id: string | null) {
    setSelectedIds(id ? [id] : []);
  }
  const [mode, setMode] = useState<VisualMode>("browse");
  const [draggedEffect, setDraggedEffect] = useState<string | null>(null);
  const [zoom, setZoom] = useState("1");
  const [annotations, setAnnotations] = useState<History<Annotation[]>>({
    past: [],
    present: [],
    future: [],
  });
  const [align, setAlign] = useState<PageNode["style"]["align"]>("start");
  const [level, setLevel] = useState("1");
  const [text, setText] = useState(""),
    [fade, setFade] = useState(false),
    [duration, setDuration] = useState("450"),
    [editRevision, setEditRevision] = useState(0);
  const [notice, setNotice] = useState(""),
    [patchError, setPatchError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(1000);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState(200);
  useEffect(() => {
    const el = frameRef.current!;
    const measure = () => setFrameHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = scrollRef.current!;
    const measure = () => {
      const style = getComputedStyle(el);
      setFrameWidth(
        Math.max(
          1,
          el.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight),
        ),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fileRef = useRef<HTMLInputElement>(null),
    loadSequence = useRef(0);
  useEffect(() => {
    if (ready) setSource(persistence.restored ? "本機頁面" : "範例預覽");
  }, [ready, persistence.restored]);
  const page = session.history.present,
    nodes = indexNodes(page),
    node = selected ? nodes.get(selected) : undefined;
  useEffect(() => {
    const n = selected
      ? indexNodes(session.history.present).get(selected)
      : undefined;
    setText(n?.content ?? "");
    setAlign(n?.style.align ?? "start");
    setLevel(String(n?.level ?? 1));
    const effect = n?.effects.find((e) => e.effectId === "fade-in");
    setFade(Boolean(effect));
    setDuration(String(effect?.duration ?? 450));
    setEditRevision(session.revision);
  }, [selected, session]);
  function install(input: unknown) {
    const checked = validatePage(input);
    if (!checked.ok) {
      setError(checked.error);
      return false;
    }
    if (
      (persistence.isDirty() ||
        status.kind === "saved" ||
        session.revision > 0) &&
      !window.confirm("取代目前頁面並自動儲存？")
    )
      return false;
    persistence.replace(checked.page);
    setSelected(null);
    setNotice("");
    setError("");
    setReplay((n) => n + 1);
    return true;
  }
  async function load(file: File | undefined) {
    if (!file) return;
    const sequence = ++loadSequence.current;
    const startedSession = current.current.sessionId,
      startedRevision = current.current.revision;
    if (file.size > 200000) {
      setError("預覽失敗：檔案超過 200 KB。請縮小檔案後重試。");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (sequence !== loadSequence.current) return;
      if (
        startedSession !== current.current.sessionId ||
        startedRevision !== current.current.revision
      ) {
        setError("頁面已更新，請重新載入檔案。");
        return;
      }
      if (install(parsed)) setSource("本機檔案預覽");
    } catch {
      if (sequence !== loadSequence.current) return;
      setError("預覽失敗：檔案格式無效。請修正檔案後重試。");
    }
  }
  useEffect(() => {
    setSelectedIds([]);
    setAnnotations({ past: [], present: [], future: [] });
  }, [session.sessionId]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIds([]);
        setMode("browse");
        setNotice("");
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  function select(id: string) {
    if (
      !ready ||
      loadError ||
      !indexNodes(current.current.history.present).has(id)
    )
      return;
    setSelected(id);
    setNotice("");
  }
  function patch(
    patches: unknown[],
    targetId: string,
    baseRevision = current.current.revision,
  ) {
    if (!ready || loadError || error) return;
    const result = applyPatchBatch(
      current.current,
      {
        schemaVersion: 1,
        sessionId: session.sessionId,
        baseRevision,
        patches,
      },
      [targetId],
    );
    setPatchError(!result.ok);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    update(result.state);
    setNotice(
      result.changed ? "已套用，其他元素資料未變更。" : "沒有需要套用的變更。",
    );
    return result.ok;
  }
  function attach(id: string, value: string) {
    const target = indexNodes(current.current.history.present).get(id);
    if (!target || !effectIds.includes(value as (typeof effectIds)[number])) {
      setPatchError(true);
      setNotice("不支援的動畫。");
      return;
    }
    const effectId = value as (typeof effectIds)[number];
    if (!effectCompatible(target, effectId)) {
      setPatchError(true);
      setNotice("依序顯示僅適用於有子元件的容器。");
      return;
    }
    setSelected(id);
    patch(
      [{ operation: "attach-effect", targetId: id, payload: { effectId } }],
      id,
    );
  }
  function apply() {
    if (!node || !ready || loadError) return;
    const patches: unknown[] = [
      { operation: "set-style", targetId: node.id, payload: { align } },
    ];
    if (["heading", "paragraph", "button"].includes(node.type))
      patches.push({
        operation: "set-text",
        targetId: node.id,
        payload: { content: text },
      });
    if (node.type === "heading")
      patches.push({
        operation: "set-property",
        targetId: node.id,
        payload: { property: "level", value: Number(level) },
      });
    const previous = node.effects.find((e) => e.effectId === "fade-in");
    if (fade)
      patches.push(
        previous
          ? {
              operation: "update-effect",
              targetId: node.id,
              payload: {
                effectId: "fade-in",
                parameters: { duration: Number(duration) },
              },
            }
          : {
              operation: "attach-effect",
              targetId: node.id,
              payload: { effectId: "fade-in", duration: Number(duration) },
            },
      );
    else if (previous)
      patches.push({
        operation: "remove-effect",
        targetId: node.id,
        payload: { effectId: "fade-in" },
      });
    patch(patches, node.id, editRevision);
  }

  function travel(direction: "undo" | "redo") {
    if (!ready || loadError) return;
    update(travelPage(current.current, direction));
    setPatchError(false);
    setNotice(direction === "undo" ? "已撤銷修改。" : "已重做修改。");
  }
  return (
    <main className="preview-workspace" aria-label="網頁預覽">
      <div className="preview-tools">
        <div>
          <strong>{source}</strong>
          <small>{source === "範例預覽" ? "固定範例" : "本機預覽"}</small>
          {!error && ready && !loadError && (
            <select
              className="heading-picker"
              aria-label="選取元件"
              value={selected ?? ""}
              onChange={(e) => {
                setSelected(e.target.value || null);
                setNotice("");
              }}
            >
              <option value="">選取元件</option>
              {Array.from(nodes.values()).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.content?.slice(0, 32) || nodeLabels[n.type]}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="preview-actions">
          <button
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
          >
            桌面
          </button>
          <button
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
          >
            手機
          </button>
          <button
            disabled={
              !ready ||
              Boolean(loadError) ||
              Boolean(error) ||
              !session.history.past.length
            }
            onClick={() => travel("undo")}
          >
            撤銷修改
          </button>
          <button
            disabled={
              !ready ||
              Boolean(loadError) ||
              Boolean(error) ||
              !session.history.future.length
            }
            onClick={() => travel("redo")}
          >
            重做修改
          </button>
          <button
            disabled={!ready || Boolean(loadError)}
            onClick={() => setReplay((n) => n + 1)}
          >
            重播動畫
          </button>
          <button
            disabled={!ready || Boolean(loadError)}
            onClick={() => fileRef.current?.click()}
          >
            載入頁面
          </button>
          <button
            disabled={!ready || Boolean(loadError)}
            onClick={() => {
              loadSequence.current++;
              if (install(demoPage)) setSource("範例預覽");
            }}
          >
            還原範例
          </button>
          <input
            hidden
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            aria-label="載入頁面檔案"
            onChange={(e) => {
              void load(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="visual-tools" aria-label="視覺編輯工具">
        <div className="mode-switch" role="group" aria-label="預覽工具模式">
          {(
            [
              ["browse", "瀏覽"],
              ["select", "選取"],
              ["pen", "畫筆"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={mode === value}
              disabled={!ready || Boolean(loadError) || Boolean(error)}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          縮放{" "}
          <select
            aria-label="預覽縮放"
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
          >
            <option value="1">100%</option>
            <option value="0.75">75%</option>
            <option value="0.5">50%</option>
          </select>
        </label>
        {mode === "select" && <small>拖曳空白處，完全框住元件</small>}
        {mode === "pen" && (
          <>
            <button
              disabled={!annotations.past.length}
              onClick={() => setAnnotations(undoHistory)}
            >
              撤銷註記
            </button>
            <button
              disabled={!annotations.present.length}
              onClick={() => setAnnotations((h) => commitHistory(h, []))}
            >
              清除註記
            </button>
            <small>僅保留於本次預覽 · {annotations.present.length}/80 筆</small>
          </>
        )}
        <details className="effect-library">
          <summary>動畫效果庫</summary>
          <div role="group" aria-label="預覽動畫效果庫">
            {(
              Object.keys(animationRegistry) as (typeof effectIds)[number][]
            ).map((id) => (
              <button
                key={id}
                draggable
                data-effect-id={id}
                onDragEnd={() => setDraggedEffect(null)}
                onDragStart={(e) => {
                  setDraggedEffect(id);
                  e.dataTransfer.setData(effectMime, id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  if (selected) attach(selected, id);
                  else {
                    setPatchError(false);
                    setNotice("請先選取一個元件，或將動畫拖至目標。");
                  }
                }}
              >
                {effectLabels[id]}
              </button>
            ))}
          </div>
        </details>
      </div>
      {notice && (
        <p
          className={patchError ? "visual-notice error" : "visual-notice"}
          role={patchError ? "alert" : "status"}
        >
          {notice}
        </p>
      )}
      <div className="page-save-bar" aria-live="polite">
        <span data-testid="page-save-status">
          {!ready
            ? "正在載入頁面"
            : loadError
              ? "載入失敗"
              : status.kind === "saved"
                ? "已儲存"
                : status.kind === "saving"
                  ? "儲存中"
                  : status.kind === "failed"
                    ? "儲存失敗"
                    : status.kind === "conflict"
                      ? "版本衝突"
                      : "尚未儲存"}
        </span>
        {ready && !loadError && status.error && (
          <span>{status.error.message}</span>
        )}
        {ready && !loadError && status.kind === "failed" && (
          <button onClick={() => persistence.retry()}>重試儲存</button>
        )}
        <button
          disabled={!ready}
          onClick={() => {
            if (
              persistence.isDirty() &&
              !window.confirm("重新載入會捨棄本頁尚未儲存的修改，是否繼續？")
            )
              return;
            loadSequence.current++;
            setError("");
            setSelected(null);
            setNotice("");
            void persistence.read();
          }}
        >
          重新載入頁面
        </button>
        {ready &&
          loadError &&
          ["CORRUPT", "UNSUPPORTED"].includes(loadError.code) && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "將保留原始紀錄備份，並以範例重新開始，是否繼續？",
                  )
                ) {
                  loadSequence.current++;
                  setError("");
                  setSelected(null);
                  void persistence.restart();
                }
              }}
            >
              以範例重新開始
            </button>
          )}
      </div>
      <div className="preview-body">
        <div
          ref={scrollRef}
          className="preview-scroll"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedIds([]);
          }}
        >
          <div
            className="preview-zoom"
            style={{
              width:
                (device === "mobile" ? Math.min(375, frameWidth) : frameWidth) *
                Number(zoom),
              height: frameHeight * Number(zoom),
            }}
          >
            <div
              ref={frameRef}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width:
                  device === "mobile" ? Math.min(375, frameWidth) : frameWidth,
                maxWidth: "none",
                minHeight: 0,
              }}
              className={"preview-frame " + device}
              data-testid="preview-frame"
            >
              {!ready ? (
                <p className="preview-error">正在載入頁面…</p>
              ) : loadError ? (
                <p role="alert" className="preview-error">
                  {loadError.message}{" "}
                  {["CORRUPT", "UNSUPPORTED"].includes(loadError.code)
                    ? "請重試載入，或確認後重新開始。"
                    : "請檢查瀏覽器儲存權限後重試。"}
                </p>
              ) : error ? (
                <p role="alert" className="preview-error">
                  {error}
                </p>
              ) : (
                <VisualSurface
                  mode={mode}
                  selected={selectedIds}
                  onSelect={(ids) => {
                    setSelectedIds(ids.filter((id) => nodes.has(id)));
                    setNotice("");
                  }}
                  onDropEffect={attach}
                  dragging={Boolean(draggedEffect)}
                  canDrop={(id) => {
                    const n = nodes.get(id);
                    return Boolean(
                      n &&
                        draggedEffect &&
                        effectIds.includes(
                          draggedEffect as (typeof effectIds)[number],
                        ) &&
                        effectCompatible(
                          n,
                          draggedEffect as (typeof effectIds)[number],
                        ) &&
                        !n.effects.some((e) => e.effectId === draggedEffect),
                    );
                  }}
                  sessionId={session.sessionId}
                  revision={session.revision}
                  annotations={annotations.present}
                  onAnnotation={(a) => {
                    if (annotations.present.length >= 80) {
                      setPatchError(true);
                      setNotice("註記已達 80 筆，請先清除。");
                      return;
                    }
                    setAnnotations((h) => commitHistory(h, [...h.present, a]));
                  }}
                >
                  <PageRenderer
                    key={replay}
                    input={page}
                    selectedId={selected}
                    onSelect={mode === "browse" ? select : undefined}
                  />
                </VisualSurface>
              )}
            </div>
          </div>
        </div>
        {ready && !loadError && !error && selectedIds.length > 1 && (
          <aside className="patch-panel" aria-label="選取摘要">
            <div className="side-head">
              <h2>已選取 {selectedIds.length} 個元件</h2>
              <button onClick={() => setSelectedIds([])}>取消選取</button>
            </div>
            <p className="note">請單選一個元件以編輯屬性。</p>
            <ul className="selection-summary">
              {selectedIds.map((id) => (
                <li key={id}>
                  <button onClick={() => setSelected(id)}>
                    {nodes.get(id)?.content?.slice(0, 24) ||
                      (nodes.get(id)
                        ? nodeLabels[nodes.get(id)!.type]
                        : "元件")}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        {ready && !loadError && !error && node && (
          <aside
            key={selected}
            className="patch-panel"
            aria-label="頁面元素編輯"
          >
            <>
              <div className="side-head">
                <h2>{node.type === "heading" ? "編輯標題" : "編輯元件"}</h2>
                <button onClick={() => setSelected(null)}>取消選取</button>
              </div>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  apply();
                }}
              >
                {["heading", "paragraph", "button"].includes(node.type) && (
                  <label className="field">
                    {node.type === "heading" ? "標題文字" : "文字"}
                    <textarea
                      aria-label={node.type === "heading" ? "標題文字" : "文字"}
                      value={text}
                      maxLength={
                        node.type === "button"
                          ? 120
                          : node.type === "paragraph"
                            ? 4000
                            : 2000
                      }
                      onChange={(e) => setText(e.target.value)}
                    />
                  </label>
                )}
                {node.type === "heading" && (
                  <label className="field">
                    標題層級
                    <select
                      aria-label="標題層級"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="1">主標題 · 大</option>
                      <option value="2">章節標題 · 中</option>
                      <option value="3">小標題</option>
                    </select>
                  </label>
                )}
                <label className="field">
                  對齊
                  <select
                    aria-label="元素對齊"
                    value={align}
                    onChange={(e) => setAlign(e.target.value as typeof align)}
                  >
                    <option value="start">靠左</option>
                    <option value="center">置中</option>
                    <option value="end">靠右</option>
                  </select>
                </label>
                <label className="effect-row">
                  <span>淡入動畫</span>
                  <input
                    type="checkbox"
                    checked={fade}
                    onChange={(e) => setFade(e.target.checked)}
                  />
                </label>
                {fade && (
                  <label className="field">
                    動畫時長（毫秒）
                    <input
                      aria-label="動畫時長（毫秒）"
                      type="number"
                      min={120}
                      max={1200}
                      step={10}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </label>
                )}
                <button className="primary" type="submit">
                  套用
                </button>
              </form>
              {session.diff?.changes.some((c) => c.targetId === node.id) && (
                <div className="patch-diff">
                  <h2>最近修改</h2>
                  {session.diff.changes
                    .filter((c) => c.targetId === node.id)
                    .map((c) => (
                      <div key={c.property}>
                        <small>{changeLabel(c)}</small>
                        <p>
                          <del>{valueLabel(c.before)}</del> →{" "}
                          <ins>{valueLabel(c.after)}</ins>
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </>
            <div className="effect-editor">
              <h2>已附加動畫</h2>
              {!node.effects.length && (
                <p className="note">從動畫效果庫拖入，或單擊效果套用。</p>
              )}
              {node.effects.map((effect) => (
                <div className="effect-edit-row" key={effect.effectId}>
                  <label className="field">
                    {effectLabels[effect.effectId]}
                    <select
                      aria-label={"更換" + effectLabels[effect.effectId]}
                      value={effect.effectId}
                      onChange={(e) => {
                        const effectId = e.target
                          .value as (typeof effectIds)[number];
                        if (!effectCompatible(node, effectId)) {
                          setPatchError(true);
                          setNotice("依序顯示僅適用於有子元件的容器。");
                          return;
                        }
                        patch(
                          [
                            {
                              operation: "remove-effect",
                              targetId: node.id,
                              payload: { effectId: effect.effectId },
                            },
                            {
                              operation: "attach-effect",
                              targetId: node.id,
                              payload: { ...effect, effectId },
                            },
                          ],
                          node.id,
                        );
                      }}
                    >
                      {effectIds.map((id) => (
                        <option key={id} value={id}>
                          {effectLabels[id]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {effect.effectId !== "fade-in" && (
                    <label className="field">
                      時長（毫秒）
                      <input
                        key={session.revision}
                        aria-label={effectLabels[effect.effectId] + "時長"}
                        type="number"
                        min={120}
                        max={1200}
                        defaultValue={effect.duration}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== effect.duration)
                            patch(
                              [
                                {
                                  operation: "update-effect",
                                  targetId: node.id,
                                  payload: {
                                    effectId: effect.effectId,
                                    parameters: {
                                      duration: Number(e.target.value),
                                    },
                                  },
                                },
                              ],
                              node.id,
                            );
                        }}
                      />
                    </label>
                  )}
                  <button
                    onClick={() =>
                      patch(
                        [
                          {
                            operation: "remove-effect",
                            targetId: node.id,
                            payload: { effectId: effect.effectId },
                          },
                        ],
                        node.id,
                      )
                    }
                  >
                    移除{effectLabels[effect.effectId]}
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
