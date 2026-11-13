import {MotionControlsFields} from "./MotionControls";
import type {MotionControls} from "./motionCatalog";
import {motionCatalog,motionIds,createMotion,numericContent,combinationReason,targetReason,type MotionId,defaultControls} from "./motion";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { importImage, assetErrorMessage } from "./assets";
import { isLocalAsset } from "./assetRef";
import { useAssetUrls, useAssetRefs } from "./useAssetUrls";
import { AnimationLibrary } from "./AnimationLibrary";
import { WorkbenchMenu } from "./WorkbenchMenu";
import { useEffect, useRef, useState } from "react";
import {
  blank,
  CanvasSchema,
  createNode,
  commit,
  undo,
  redo,
  type CanvasNode,
  type CanvasSpec,
  type History,
} from "./spec";
import { loadDraft, saveDraft } from "./storage";
import Preview, { type PreviewHandle } from "./Preview";
import CandidatePreview from "./CandidatePreview";
import { createDemoCandidate, type CandidateResult } from "./demo";
import { generationFixtures } from "./demoFixtures";
import { tabNavigation } from "./tabNavigation";
import { requestGeneration } from "./generationClient";
import { GenerationError } from "./generation";
const labels = {
  text: "文字",
  button: "按鈕",
  card: "卡片",
  heading: "標題",
  image: "圖片",
};
const effects = Object.fromEntries(motionIds.map(id=>[id,motionCatalog[id].nameEn])) as Record<MotionId,string>;
type Effect = keyof typeof effects;
const dragType = "application/x-sketch2site";
const demoFixtures = generationFixtures();
export default function App() {
  const imageInput = useRef<HTMLInputElement>(null),
    imageTarget = useRef<string | null>(null);
  const [importingImage, setImportingImage] = useState(false);
  const localImages = useAssetRefs();
  const previewRef = useRef<PreviewHandle>(null);
  const canvasVersion = useRef(0),
    canvasHead = useRef<CanvasSpec | null>(null);
  const [generating, setGenerating] = useState(false),
    [accepting, setAccepting] = useState(false);
  const generationRun = useRef(0),
    abortRef = useRef<AbortController | null>(null);
  const [candidate, setCandidate] = useState<{
    result: CandidateResult;
    canvasVersion: number;
    target: { sessionId: string; revision: number };
  } | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [mode, setMode] = useState<"draft" | "preview">("draft");
  const [history, setHistory] = useState<History>({
    past: [],
    present: blank(),
    future: [],
  });
  const [linkDraft, setLinkDraft] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("正在讀取本機草稿…"),
    [error, setError] = useState(false);
  const [saved, setSaved] = useState(""),
    [scale, setScale] = useState(0.6),
    [tab, setTab] = useState("library"),
    [search, setSearch] = useState("");
  const [panel, setPanel] = useState(() => window.innerWidth > 1000),
    [panelWidth, setPanelWidth] = useState(304);
  const [draftDragging, setDraftDragging] = useState(false);
  useEffect(() => {
    const end = () => setDraftDragging(false);
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
    };
    window.addEventListener("drop", end, true);
    window.addEventListener("dragend", end, true);
    window.addEventListener("blur", end);
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("drop", end, true);
      window.removeEventListener("dragend", end, true);
      window.removeEventListener("blur", end);
      window.removeEventListener("keydown", cancel);
    };
  }, []);
  const [pendingControls,setPendingControls]=useState<MotionControls>({});
  const [pending, setPending] = useState<Effect | null>(null),
    [target, setTarget] = useState("");
  const [moving, setMoving] = useState<CanvasNode | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    node: CanvasNode;
    startX: number;
    startY: number;
    scale: number;
  } | null>(null);
  const state = useRef(history);
  state.current = history;
  const spec = history.present,
    node = spec.nodes.find((n) => n.id === selected),
    dirty = JSON.stringify(spec) !== saved;
  const imageUrls = useAssetUrls(
    spec.nodes.flatMap((n) => (n.assetId ? [n.assetId] : [])),
  );
  if (canvasHead.current !== spec) {
    canvasVersion.current++;
    canvasHead.current = spec;
  }
  useEffect(
    () => () => {
      generationRun.current++;
      abortRef.current?.abort();
    },
    [],
  );
  async function generate(demo = false) {
    if (generating || abortRef.current || !ready || loadError) return;
    const target = previewRef.current?.target();
    if (!target) {
      setGenerationError("請先套用或捨棄預覽中的修改，並完成頁面保存。");
      return;
    }
    const version = canvasVersion.current,
      run = ++generationRun.current,
      controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setGenerationError("");
    try {
      const result = demo
        ? createDemoCandidate(spec)
        : await requestGeneration(spec, controller.signal);
      const latest = previewRef.current?.target();
      if (
        run !== generationRun.current ||
        version !== canvasVersion.current ||
        !latest ||
        latest.sessionId !== target.sessionId ||
        latest.revision !== target.revision
      )
        throw new GenerationError("STALE");
      report(
        result.mode !== "live"
          ? "示範排版完成，未呼叫 AI。"
          : "草稿已送至 OpenAI，候選尚未儲存。",
      );
      setCandidate({ result, canvasVersion: version, target });
      setMode("preview");
    } catch (e) {
      if (run === generationRun.current)
        setGenerationError(
          e instanceof GenerationError ? e.message : "生成失敗，原版本已保留。",
        );
    } finally {
      if (run === generationRun.current) {
        setGenerating(false);
        abortRef.current = null;
      }
    }
  }
  async function acceptCandidate() {
    if (!candidate || candidate.canvasVersion !== canvasVersion.current) return;
    setAccepting(true);
    setGenerationError("");
    try {
      const result = await previewRef.current!.accept(
        candidate.result.page,
        candidate.target,
      );
      if (result.ok) setCandidate(null);
      else
        setGenerationError((result.error ?? "儲存失敗") + " 候選結果仍保留。");
    } finally {
      setAccepting(false);
    }
  }
  useEffect(() => {
    setLinkDraft(node?.href ?? "");
  }, [node?.id, node?.href]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (candidate) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [candidate]);
  const report = (s: string, bad = false) => {
    setMessage(s);
    setError(bad);
  };
  async function restore() {
    setReady(false);
    setLoadError(false);
    try {
      const data = (await loadDraft()) ?? blank();
      setHistory({ past: [], present: data, future: [] });
      setSaved(JSON.stringify(data));
      setSelected(null);
      setMoving(null);
      drag.current = null;
      report("草稿已就緒");
    } catch {
      setLoadError(true);
      report("無法讀取草稿。請允許網站儲存資料後，按「重新載入」重試。", true);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void restore();
  }, []);
  const change = (next: CanvasSpec) => {
    try {
      CanvasSchema.parse(next);
      setHistory((h) => commit(h, next));
      return true;
    } catch {
      report("修改超出畫布範圍或資料限制，請調整後重試。", true);
      return false;
    }
  };
  function patch(id: string, attrs: Partial<CanvasNode>) {
    return change({
      ...state.current.present,
      nodes: state.current.present.nodes.map((n) =>
        n.id === id ? { ...n, ...attrs } : n,
      ),
    });
  }
  async function importPicture(file: File | undefined) {
    if (!file || importingImage) return;
    setImportingImage(true);
    const originalDraft = state.current.present;
    const id = imageTarget.current,
      previous = id
        ? state.current.present.nodes.find((n) => n.id === id)
        : undefined;
    try {
      const asset = await importImage(file);
      if (state.current.present !== originalDraft) {
        report("草稿已變更，圖片保留於本機素材，請重新選取。", true);
        return;
      }
      if (id) {
        const now = state.current.present.nodes.find((n) => n.id === id);
        if (!now || now.assetId !== previous?.assetId) {
          report("圖片已存於本機，但原元素已變更，請重新選取素材。", true);
          return;
        }
        patch(id, { assetId: asset.ref });
        setSelected(id);
      } else {
        if (state.current.present.nodes.length >= 100) {
          report("草稿已達元素上限，圖片保留於本機素材。", true);
          return;
        }
        const next = {
          ...createNode("image", 80, 80),
          assetId: asset.ref,
          content: "匯入的圖片",
        };
        change({
          ...state.current.present,
          nodes: [...state.current.present.nodes, next],
        });
        setSelected(next.id);
      }
      setTab("properties");
      report("圖片已匯入，僅存於本機。");
    } catch (e) {
      report(assetErrorMessage(e), true);
    } finally {
      setImportingImage(false);
    }
  }
  function add(type: CanvasNode["type"], x = 80, y = 80) {
    if (!ready || loadError) return;
    const next = createNode(type, x, y);
    change({ ...spec, nodes: [...spec.nodes, next] });
    setSelected(next.id);
    report("已新增" + labels[type]);
  }
  function attach(effect: Effect, id: string, controls?:MotionControls) {
    const n = state.current.present.nodes.find((n) => n.id === id);
    if (!n) return;
    if (effect === "stagger-reveal" && n.type !== "card") {
      report("依序顯示僅適用於卡片。", true);
      return;
    }
    if (n.effects.some(e=>e.presetId===effect)) {
      report("此元素已有該動畫標記");
      return;
    }
    if(targetReason(n,effect)){report(targetReason(n,effect)!,true);return;}
    const conflict=combinationReason([...n.effects,{presetId:effect}]);if(conflict){report(conflict,true);return;}
    let motion; try {motion=createMotion(effect,id,controls??{});}catch{if(controls){report("請檢查動畫必填內容與數值範圍。",true);return;}setPending(effect);setTarget(id);setPendingControls({...defaultControls(effect),...(effect==="count-up"?(numericContent(n.content)??{}):{})});report("請填寫動畫內容與設定，再確認附加。",true);return;}
    patch(id, { effects: [...n.effects, motion] });
    setSelected(id);
    setPending(null);
    report("已附加 " + effects[effect] + " · 草稿不播放動畫");
  }
  async function save() {
    if (!ready || busy || loadError) return;
    const snapshot = state.current.present;
    setBusy(true);
    try {
      await saveDraft(snapshot);
      setSaved(JSON.stringify(snapshot));
      report("已儲存至本機");
    } catch {
      report(
        "儲存失敗，可能空間不足或被瀏覽器封鎖。草稿仍保留於工作區，請檢查後重試。",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  function remove() {
    if (!selected) return;
    change({ ...spec, nodes: spec.nodes.filter((n) => n.id !== selected) });
    setSelected(null);
    report("已刪除元件，可使用還原復原");
  }
  function duplicate() {
    if (!node) return;
    const copy = {
      ...node,
      id: crypto.randomUUID(),
      x: Math.min(1440 - node.width, node.x + 24),
      y: Math.min(1200 - node.height, node.y + 24),
    };
    change({ ...spec, nodes: [...spec.nodes, copy] });
    setSelected(copy.id);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        !ready ||
        loadError ||
        drag.current ||
        mode === "preview"
      )
        return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (
        e.target instanceof Element &&
        e.target.closest("input,textarea,select,[contenteditable=true]")
      ) {
        return;
      } else if (
        mod &&
        (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        setHistory((h) =>
          e.shiftKey || e.key.toLowerCase() === "y" ? redo(h) : undo(h),
        );
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") {
        setSelected(null);
        setPending(null);
      } else if (
        node &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        patch(node.id, {
          x: Math.max(
            0,
            Math.min(
              1440 - node.width,
              node.x +
                (e.key === "ArrowRight"
                  ? step
                  : e.key === "ArrowLeft"
                    ? -step
                    : 0),
            ),
          ),
          y: Math.max(
            0,
            Math.min(
              1200 - node.height,
              node.y +
                (e.key === "ArrowDown"
                  ? step
                  : e.key === "ArrowUp"
                    ? -step
                    : 0),
            ),
          ),
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function drop(e: React.DragEvent) {
    setDraftDragging(false);
    e.preventDefault();
    if (!ready || loadError) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData(dragType));
      if (
        data.type === "component" &&
        Object.keys(labels).includes(data.value)
      ) {
        const rect = board.current!.getBoundingClientRect();
        add(
          data.value,
          (e.clientX - rect.left) / scale,
          (e.clientY - rect.top) / scale,
        );
      } else if (
        data.type === "effect" &&
        Object.keys(effects).includes(data.value)
      ) {
        const element = (e.target as HTMLElement).closest("[data-node-id]");
        if (element) attach(data.value, element.getAttribute("data-node-id")!);
        else {
          setPending(data.value);
          setTarget("");
          report("請選擇要附加動畫的元件");
        }
      }
    } catch {
      report("無法辨識拖曳內容，請從元件庫重試。", true);
    }
  }
  function begin(e: React.PointerEvent, n: CanvasNode) {
    if (e.button !== 0 || !ready || loadError) return;
    e.stopPropagation();
    setSelected(n.id);
    drag.current = { node: n, startX: e.clientX, startY: e.clientY, scale };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setMoving({
      ...d.node,
      x: Math.round(
        Math.max(
          0,
          Math.min(
            1440 - d.node.width,
            d.node.x + (e.clientX - d.startX) / d.scale,
          ),
        ),
      ),
      y: Math.round(
        Math.max(
          0,
          Math.min(
            1200 - d.node.height,
            d.node.y + (e.clientY - d.startY) / d.scale,
          ),
        ),
      ),
    });
  }
  function finish() {
    if (moving) patch(moving.id, { x: moving.x, y: moving.y });
    drag.current = null;
    setMoving(null);
  }
  const disabled = !ready || loadError;
  return (
    <>
      <header className={"topbar " + mode}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <h1>Sketch2Site</h1>
        </div>
        <span className="project-divider" aria-hidden="true">
          /
        </span>
        <input
          className="project-name"
          aria-label="專案名稱"
          title={spec.metadata.name}
          value={spec.metadata.name}
          maxLength={80}
          disabled={disabled || mode === "preview"}
          onChange={(e) => {
            if (e.target.value.trim())
              change({
                ...spec,
                metadata: { ...spec.metadata, name: e.target.value },
              });
          }}
        />
        <div
          id="preview-app-actions"
          className="preview-app-actions"
          hidden={mode !== "preview" || Boolean(candidate)}
        />
        <div className="toolbar-actions">
          <div className="workspace-modes" role="group" aria-label="工作區模式">
            <button
              aria-pressed={mode === "draft"}
              disabled={accepting}
              onClick={() => {
                setCandidate(null);
                setMode("draft");
              }}
            >
              草稿
            </button>
            <button
              aria-pressed={mode === "preview"}
              disabled={accepting}
              onClick={() => setMode("preview")}
            >
              預覽
            </button>
          </div>
          {mode === "draft" && (
            <button
              className="primary"
              disabled={disabled || generating || !spec.nodes.length}
              title="生成時會將這份草稿的內容與布局傳送至 OpenAI"
              onClick={() => void generate()}
            >
              {generating ? "生成中…" : "生成網站"}
            </button>
          )}
          {mode === "draft" && (
            <>
              <button
                disabled={busy || !ready || loadError}
                title="儲存草稿（⌘ / Ctrl S）"
                onClick={() => void save()}
              >
                {busy ? "儲存中…" : "儲存草稿"}
              </button>
              <WorkbenchMenu label="草稿選單">
                <button
                  disabled={disabled || generating || !spec.nodes.length}
                  onClick={() => void generate(true)}
                >
                  示範排版（非 AI）
                </button>
                <div className="menu-label">示範草稿（非 AI）</div>
                {demoFixtures
                  .filter((_, index) => index !== 2)
                  .map((fixture) => (
                    <button
                      key={fixture.metadata.name}
                      disabled={disabled || generating}
                      onClick={() => {
                        if (
                          dirty &&
                          !window.confirm(
                            "載入示範會取代目前草稿，可使用還原復原。是否繼續？",
                          )
                        )
                          return;
                        if (change(fixture)) {
                          setSelected(null);
                          setPending(null);
                          setMoving(null);
                          drag.current = null;
                          setCandidate(null);
                          report("已載入示範草稿（非 AI），可還原。");
                        }
                      }}
                    >
                      載入{fixture.metadata.name}
                    </button>
                  ))}
                <button
                  disabled={!ready}
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm(
                        "尚有未儲存的修改，重新載入會捨棄這些修改。是否繼續？",
                      )
                    )
                      void restore();
                  }}
                >
                  重新載入
                </button>
              </WorkbenchMenu>
            </>
          )}
        </div>
      </header>
      {generationError && (
        <p role="alert" className="generation-notice">
          {generationError}
        </p>
      )}
      {generating && (
        <p className="generation-notice" role="status">
          正在生成，可繼續編輯；變更草稿後需重新生成。
        </p>
      )}
      <input
        hidden
        type="file"
        ref={imageInput}
        accept="image/png,image/jpeg"
        aria-label="匯入圖片檔案"
        onChange={(e) => {
          void importPicture(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="workspace">
        <div
          className="preview-host"
          style={{
            display: mode === "preview" && !candidate ? "flex" : "none",
          }}
        >
          <Preview ref={previewRef} />
        </div>
        {mode === "preview" && candidate && (
          <CandidatePreview
            candidate={candidate.result}
            stale={candidate.canvasVersion !== canvasVersion.current}
            onAccept={acceptCandidate}
            onBack={() => {
              setCandidate(null);
              setMode("draft");
            }}
          />
        )}
        {mode === "draft" && (
          <>
            <main className="studio" aria-label="草稿工作區">
              <div className="canvas-tools">
                <div>
                  <strong>網站草稿</strong>
                  <small>1440 × 1200</small>
                </div>
                <div>
                  <button
                    disabled={disabled || !history.past.length}
                    onClick={() => setHistory(undo)}
                  >
                    還原
                  </button>
                  <button
                    disabled={disabled || !history.future.length}
                    onClick={() => setHistory(redo)}
                  >
                    重做
                  </button>
                  <label>
                    縮放{" "}
                    <select
                      aria-label="畫布縮放"
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                    >
                      {[0.4, 0.5, 0.6, 0.75, 1].map((s) => (
                        <option key={s} value={s}>
                          {s * 100}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() => setPanel(!panel)}
                    aria-expanded={panel}
                  >
                    {panel ? "收合側欄" : "展開側欄"}
                  </button>
                </div>
              </div>
              <div
                className="canvas-scroll"
                style={{ "--draft-scale": scale } as React.CSSProperties}
              >
                <div
                  className="canvas-wrap"
                  style={{ width: 1440 * scale, height: 1200 * scale }}
                >
                  <div
                    ref={board}
                    className="canvas"
                    data-testid="canvas"
                    aria-label="草稿畫布"
                    style={{
                      width: 1440,
                      height: 1200,
                      transform: "scale(" + scale + ")",
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={drop}
                    onPointerDown={(e) => {
                      if (e.target === e.currentTarget) setSelected(null);
                    }}
                  >
                    {!spec.nodes.length && (
                      <div className="empty">
                        <span className="empty-mark" aria-hidden="true">
                          ＋
                        </span>
                        <h2>從一個想法開始</h2>
                        <p>把右側元件拖進畫布，安排內容與位置。</p>
                        <p>也可以點選元件新增，再拖曳調整。</p>
                        <p>草稿選單提供示範草稿與非 AI 排版。</p>
                      </div>
                    )}
                    {spec.nodes.map((original) => {
                      const n = moving?.id === original.id ? moving : original;
                      return (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          aria-label={labels[n.type] + "：" + n.content}
                          aria-pressed={selected === n.id}
                          data-node-id={n.id}
                          data-testid="canvas-node"
                          className={
                            "node " +
                            n.type +
                            (selected === n.id ? " selected" : "")
                          }
                          style={{
                            left: n.x,
                            top: n.y,
                            width: n.width,
                            height: n.height,
                          }}
                          onFocus={() => setSelected(n.id)}
                          onClick={() => setSelected(n.id)}
                          onPointerDown={(e) => begin(e, n)}
                          onPointerMove={move}
                          onPointerUp={finish}
                          onPointerCancel={() => {
                            drag.current = null;
                            setMoving(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected(n.id);
                              setTab("properties");
                            }
                          }}
                        >
                          {selected === n.id && (
                            <span className="node-label">
                              {labels[n.type]} · {Math.round(n.x)},{" "}
                              {Math.round(n.y)}
                            </span>
                          )}
                          {n.type === "image" &&
                          isLocalAsset(n.assetId!) &&
                          !imageUrls[n.assetId!] ? (
                            <span>
                              {imageUrls[n.assetId!] === null
                                ? "找不到本機圖片，請重新匯入。"
                                : "正在載入圖片…"}
                            </span>
                          ) : n.type === "image" ? (
                            <img
                              src={imageUrls[n.assetId!] || n.assetId!}
                              loading="lazy"
                              decoding="async"
                              alt={n.content}
                              draggable={false}
                            />
                          ) : (
                            n.content
                          )}
                          <span className="effect-tags">
                            {n.effects.map((f) => (
                              <span key={f.presetId}>{effects[f.presetId]}</span>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </main>
            {panel && (
              <aside
                className={
                  "sidebar" + (draftDragging ? " dragging-effect" : "")
                }
                style={{ width: panelWidth }}
                aria-label="元件與屬性"
                data-panel={tab}
              >
                <div className="side-head">
                  <h2>設計工具</h2>
                  <button
                    className="draft-panel-close"
                    aria-label="關閉草稿工具"
                    onClick={() => setPanel(false)}
                  >
                    關閉
                  </button>
                  <small>{spec.nodes.length} / 100 元件</small>
                </div>
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="工具分類"
                  onKeyDown={tabNavigation}
                >
                  <button
                    role="tab"
                    aria-selected={tab === "library"}
                    tabIndex={tab === "library" ? 0 : -1}
                    onClick={() => setTab("library")}
                  >
                    元件
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "animations"}
                    tabIndex={tab === "animations" ? 0 : -1}
                    onClick={() => setTab("animations")}
                  >
                    動畫
                  </button>
                  <button
                    role="tab"
                    aria-label="編輯元素"
                    aria-selected={tab === "properties"}
                    tabIndex={tab === "properties" ? 0 : -1}
                    onClick={() => setTab("properties")}
                  >
                    屬性
                  </button>
                </div>
                {pending && (
                  <div className="pending">
                    <strong>{effects[pending]} · 選擇附加對象</strong>
                    <select
                      aria-label="動畫附加對象"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">選擇元件</option>
                      {spec.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {labels[n.type]} · {n.content.slice(0, 20)}
                        </option>
                      ))}
                    </select>
                    {Object.values(motionCatalog[pending].controls).some(c=>c.required)&&<MotionControlsFields id={pending} values={pendingControls} onChange={setPendingControls}/>}
                    <button
                      disabled={!target}
                      onClick={() => attach(pending, target, Object.values(motionCatalog[pending].controls).some(c=>c.required)?pendingControls:undefined)}
                    >
                      附加標記
                    </button>{" "}
                    <button onClick={() => setPending(null)}>取消</button>
                  </div>
                )}
                {(tab === "library" || tab === "animations") && (
                  <>
                    <input
                      type="search"
                      aria-label="搜尋元件與動畫"
                      placeholder={
                        tab === "animations" ? "搜尋動畫…" : "搜尋元件…"
                      }
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </>
                )}
                {tab === "library" ? (
                  <>
                    {search &&
                      !Object.values(labels).some((t) => t.includes(search)) &&
                      !Object.keys(labels).some((t) =>
                        t.includes(search.toLowerCase()),
                      ) &&
                      !Object.values(effects).some((t) =>
                        t.toLowerCase().includes(search.toLowerCase()),
                      ) && (
                        <p className="note">
                          找不到符合的元件或動畫，請換個關鍵字。
                        </p>
                      )}
                    <div className="library">
                      <p className="library-intro">
                        拖曳到畫布，或點一下新增。
                      </p>
                      <button
                        className="import-image"
                        disabled={disabled || importingImage}
                        onClick={() => {
                          imageTarget.current = null;
                          imageInput.current?.click();
                        }}
                      >
                        <WorkbenchIcon name="image" />
                        {importingImage ? "正在匯入圖片…" : "匯入圖片"}
                      </button>
                      {(Object.keys(labels) as CanvasNode["type"][])
                        .filter(
                          (t) =>
                            labels[t].includes(search) ||
                            t.includes(search.toLowerCase()),
                        )
                        .map((t) => (
                          <button
                            key={t}
                            draggable={!disabled}
                            disabled={disabled || spec.nodes.length >= 100}
                            onDragEnd={() => setDraftDragging(false)}
                            onDragStart={(e) => {
                              setDraftDragging(true);
                              e.dataTransfer.setData(
                                dragType,
                                JSON.stringify({ type: "component", value: t }),
                              );
                            }}
                            onClick={() =>
                              add(
                                t,
                                80 + (spec.nodes.length % 4) * 32,
                                80 + (spec.nodes.length % 5) * 48,
                              )
                            }
                            aria-label={"新增" + labels[t]}
                          >
                            <span className="glyph" aria-hidden="true">
                              <WorkbenchIcon name={t} />
                            </span>
                            <span>
                              <strong>{labels[t]}</strong>
                              <small>
                                {
                                  {
                                    text: "段落與文字說明",
                                    button: "網站的行動入口",
                                    card: "相關內容的集合",
                                    heading: "頁面的主要標題",
                                    image: "圖片與視覺素材",
                                  }[t]
                                }
                              </small>
                            </span>
                            <WorkbenchIcon name="grip" />
                          </button>
                        ))}
                    </div>
                  </>
                ) : tab === "animations" ? (
                  <AnimationLibrary
                    draft
                    filter={search}
                    disabled={disabled}
                    selectedLabel={node ? labels[node.type] : undefined}
                    compatibility={(id) =>
                      node?.effects.some(
                        (e) => e.presetId === id,
                      )
                        ? "已附加標記"
                        : node ? targetReason(node,id) : null
                    }
                    onChoose={(id) => {
                      const effect = id;
                      if (node) attach(effect, node.id);
                      else {
                        setPending(effect);
                        setTarget("");
                      }
                    }}
                    onDragEnd={() => setDraftDragging(false)}
                    onDragStart={(id, data) => {
                      setDraftDragging(true);
                      data.setData(
                        dragType,
                        JSON.stringify({
                          type: "effect",
                          value: id === "hover-lift" ? "lift" : id,
                        }),
                      );
                    }}
                  />
                ) : node ? (
                  <>
                    <div className="selected-component">
                      <span className="component-icon">
                        <WorkbenchIcon name={node.type} />
                      </span>
                      <h2>{labels[node.type]}</h2>
                    </div>
                    <label className="field">
                      內容
                      <textarea
                        aria-label="元素內容"
                        maxLength={2000}
                        value={node.content}
                        onChange={(e) =>
                          patch(node.id, { content: e.target.value })
                        }
                      />
                    </label>
                    {node.type === "image" && (
                      <div className="image-controls">
                        <label className="field">
                          圖片素材
                          <select
                            aria-label="草稿圖片素材"
                            value={node.assetId ?? "/assets/workspace.svg"}
                            onChange={(e) =>
                              patch(node.id, { assetId: e.target.value })
                            }
                          >
                            <option value="/assets/workspace.svg">
                              內建示意圖
                            </option>
                            {localImages.map((ref, index) => (
                              <option key={ref} value={ref}>
                                本機圖片 {index + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          disabled={importingImage}
                          onClick={() => {
                            imageTarget.current = node.id;
                            imageInput.current?.click();
                          }}
                        >
                          {importingImage ? "正在匯入圖片…" : "替換圖片"}
                        </button>
                        <p className="note">
                          PNG／JPEG，每張原圖最多 5 MB，僅存於本機。
                        </p>
                      </div>
                    )}
                    {node.type === "button" && (
                      <label className="field">
                        按鈕連結
                        <input
                          aria-label="按鈕連結"
                          placeholder="尚未設定連結"
                          value={linkDraft}
                          onChange={(e) => setLinkDraft(e.target.value)}
                          onBlur={() => {
                            if (!patch(node.id, { href: linkDraft || null })) {
                              setLinkDraft(node.href ?? "");
                              report("連結無效，原連結未變更。", true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                        <small>
                          支援文件、example.com 或頁面中的元素連結。
                        </small>
                      </label>
                    )}
                    <h3 className="property-section-title">位置與尺寸</h3>
                    <div className="pair">
                      {(["x", "y", "width", "height"] as const).map((k) => (
                        <label className="field" key={k}>
                          {
                            {
                              x: "X 位置",
                              y: "Y 位置",
                              width: "寬度",
                              height: "高度",
                            }[k]
                          }
                          <input
                            type="number"
                            aria-label={
                              {
                                x: "X 位置",
                                y: "Y 位置",
                                width: "寬度",
                                height: "高度",
                              }[k]
                            }
                            value={node[k]}
                            onChange={(e) => {
                              if (e.target.value !== "")
                                patch(node.id, { [k]: Number(e.target.value) });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <h2>動畫標記</h2>
                    {node.effects.length ? (
                      node.effects.map((f) => (
                        <div className="effect-row" key={f.presetId}>
                          <span>{effects[f.presetId]}</span>
                          <button
                            aria-label={"移除 " + effects[f.presetId]}
                            onClick={() =>
                              patch(node.id, {
                                effects: node.effects.filter((x) => x.presetId !== f.presetId),
                              })
                            }
                          >
                            移除
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="note">尚未附加動畫效果。</p>
                    )}
                    <div className="field">
                      <button onClick={duplicate}>複製元件</button>
                      <button onClick={remove}>刪除元件</button>
                    </div>
                  </>
                ) : (
                  <p className="note">
                    先在畫布上選取一個元件，即可編輯內容、位置與動畫標記。
                  </p>
                )}
                <details className="panel-preferences">
                  <summary>側欄寬度</summary>
                  <label className="field note">
                    調整側欄寬度
                    <input
                      className="panel-width"
                      aria-label="側欄寬度"
                      type="range"
                      min={260}
                      max={420}
                      step={8}
                      value={panelWidth}
                      onChange={(e) => setPanelWidth(Number(e.target.value))}
                    />
                  </label>
                </details>
              </aside>
            )}
          </>
        )}
      </div>
      {mode === "draft" && (
        <footer className="footer">
          <span role="status" className={"status" + (error ? " error" : "")}>
            {dirty && !message.includes("儲存")
              ? message + " · 尚未儲存"
              : message}
          </span>

          {mode === "draft" && (
            <span className="shortcuts">
              <span>⌘ / Ctrl Z 還原</span>
              <span>Delete 刪除</span>
              <span>方向鍵微調</span>
            </span>
          )}
        </footer>
      )}
    </>
  );
}
