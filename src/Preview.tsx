import {MotionControlsFields} from "./MotionControls";
import {motionCatalog,defaultControls,type MotionControls} from "./motionCatalog";
import {motionDuration,createMotion,numericContent,combinationReason,targetReason,type MotionId} from "./motion";
import { tabNavigation } from "./tabNavigation";
import { importImage, assetErrorMessage } from "./assets";
import { useAssetRefs } from "./useAssetUrls";
import { createPortal } from "react-dom";
import { WorkbenchMenu } from "./WorkbenchMenu";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { AnimationLibrary } from "./AnimationLibrary";
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
import { themeIds, themeLabels } from "./pageSpec";
function changeLabel(c: Change) {
  return c.property === "style.align"
    ? "對齊"
    : c.property === "level"
      ? "標題層級"
      : c.property === "content"
        ? "文字"
        : c.property.startsWith("effects.")
          ? "動畫"
          : "屬性";
}
function valueLabel(value: unknown): string {
  if (value === undefined) return "未設定";
  if (typeof value === "boolean") return value ? "啟用" : "停用";
  if(value && typeof value === "object" && "presetId" in value && typeof value.presetId === "string" && value.presetId in motionCatalog) return motionCatalog[value.presetId as MotionId].nameZh;
  if (value && typeof value === "object" && "duration" in value)
    return String((value as {duration:number}).duration) + " 毫秒";
  if (Array.isArray(value))
    return (
      value
        .map((v) => effectLabels[v as keyof typeof effectLabels] ?? String(v))
        .join("、") || "未設定"
    );
  if (typeof value === "string")
    return (
      (
        { start: "靠左", center: "置中", end: "靠右" } as Record<string, string>
      )[value] ??
      effectLabels[value as keyof typeof effectLabels] ??
      value
    );
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
  const pendingEdits = useRef(false);
  const resetProperties = useRef<() => void>(() => {});
  const selectionHead = useRef<string[]>([]);
  function confirmDiscard() {
    if (!pendingEdits.current) return true;
    if (!window.confirm("修改尚未套用。捨棄並繼續？")) return false;
    resetProperties.current();
    pendingEdits.current = false;
    return true;
  }
  const imageInput = useRef<HTMLInputElement>(null);
  const [importingImage, setImportingImage] = useState(false);
  const localImages = useAssetRefs();
  const persistence = usePagePersistence();
  const { session, current, update, ready, loadError, status } = persistence;
  useImperativeHandle(ref, () => ({
    target: () =>
      pendingEdits.current ? null : persistence.generationTarget(),
    accept: async (page, target) => {
      if (pendingEdits.current)
        return { ok: false, error: "請先套用或捨棄屬性修改。" };
      const result = await persistence.acceptGeneration(page, target);
      if (result.ok) {
        setSource("本機頁面");
        setSelected(null);
        setNotice("");
      }
      return result;
    },
  }));
  const [source, setSource] = useState("範例預覽"),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [replay, setReplay] = useState(0);
  const [selectedIds, publishSelection] = useState<string[]>([]);
  selectionHead.current = selectedIds;
  function setSelectedIds(ids: string[]) {
    if (
      ids.length === selectionHead.current.length &&
      ids.every((id, i) => id === selectionHead.current[i])
    )
      return true;
    if (!confirmDiscard()) return false;
    selectionHead.current = ids;
    publishSelection(ids);
    return true;
  }
  const selected = selectedIds.length === 1 ? selectedIds[0] : null;
  function setSelected(id: string | null) {
    if (!setSelectedIds(id ? [id] : [])) return false;
    if (id && (!compact || panelOpen)) {
      setPanelTab("properties");
      setPanelOpen(true);
    }
    return true;
  }
  const [compact, setCompact] = useState(() => window.innerWidth <= 1000);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 1000);
  const [panelTab, setPanelTab] = useState<
    "elements" | "animations" | "properties"
  >("elements");
  const panelButton = useRef<HTMLButtonElement>(null);
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderTarget(document.getElementById("preview-app-actions"));
    const resize = () => {
      const small = window.innerWidth <= 1000;
      setCompact((previous) => {
        if (previous !== small) setPanelOpen(!small);
        return small;
      });
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  function closePanel() {
    setPanelOpen(false);
    panelButton.current?.focus();
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
    [editRevision, setEditRevision] = useState(0);
  const [exporting, setExporting] = useState(false);
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
            (parseFloat(style.paddingLeft) || 0) -
            (parseFloat(style.paddingRight) || 0),
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
    depths = new Map<string, number>(),
    node = selected ? nodes.get(selected) : undefined;
  {
    const walk = (n: PageNode, d: number) => { depths.set(n.id, d); n.children?.forEach((c) => walk(c, d + 1)); };
    page.sections.forEach((n) => walk(n, 0));
  }
  const [effectDurations, setEffectDurations] = useState<
    Record<string, string>
  >({});
  const [compose,setCompose]=useState<{id:MotionId;targetId:string;revision:number;controls:MotionControls}|null>(null);
  const [motionEdits,setMotionEdits]=useState<Record<string,MotionControls>>({});
  const effectSource = useRef<{
    id: string | null;
    values: Record<string, number>;
  }>({ id: null, values: {} });
  useEffect(() => {
    setText(node?.content ?? "");
    setAlign(node?.style.align ?? "start");
    setLevel(String(node?.level ?? 1));
  }, [
    selected,
    session.sessionId,
    node?.content,
    node?.style.align,
    node?.level,
  ]);
  useEffect(() => {
    setEditRevision(session.revision);
  }, [session.sessionId, session.revision]);
  useEffect(() => {
    const previous = effectSource.current;
    const effects = node?.effects ?? [];
    setMotionEdits({});
    setEffectDurations((pending) =>
      Object.fromEntries(
        effects.map((e) => [
          e.presetId,
          previous.id === selected && previous.values[e.presetId] === motionDuration(e)
            ? (pending[e.presetId] ?? String(motionDuration(e)))
            : String(motionDuration(e)),
        ]),
      ),
    );
    effectSource.current = {
      id: selected,
      values: Object.fromEntries(effects.map((e) => [e.presetId, motionDuration(e)])),
    };
  }, [selected, node?.effects]);
  const pendingProperties = Boolean(
    node &&
      effectSource.current.id === selected &&
      (Boolean(compose) || text !== (node.content ?? "") ||
        align !== node.style.align ||
        level !== String(node.level ?? 1) ||
        node.effects.some(
          (effect) =>
            (effectDurations[effect.presetId] ?? String(motionDuration(effect))) !==
            String(motionDuration(effect)),
        ) || node.effects.some(effect=>motionEdits[effect.presetId] && JSON.stringify(motionEdits[effect.presetId])!==JSON.stringify(effect.validatedControls))),
  );
  pendingEdits.current = pendingProperties;
  resetProperties.current = () => {
    setMotionEdits({});
    setCompose(null);
    setText(node?.content ?? "");
    setAlign(node?.style.align ?? "start");
    setLevel(String(node?.level ?? 1));
    setEffectDurations(
      Object.fromEntries(
        (node?.effects ?? []).map((effect) => [
          effect.presetId,
          String(motionDuration(effect)),
        ]),
      ),
    );
    setPatchError(false);
    setNotice("");
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingEdits.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function reportLoadError(message: string) {
    setPatchError(true);
    setNotice(message + " 原頁面與未套用修改已保留。");
  }
  function install(input: unknown) {
    const checked = validatePage(input);
    if (!checked.ok) {
      reportLoadError(checked.error);
      return false;
    }
    if (
      (pendingEdits.current ||
        persistence.isDirty() ||
        status.kind === "saved" ||
        session.revision > 0) &&
      !window.confirm("取代目前頁面並自動儲存？")
    )
      return false;
    resetProperties.current();
    pendingEdits.current = false;
    persistence.replace(checked.page);
    setSelected(null);
    setNotice("");
    setReplay((n) => n + 1);
    return true;
  }
  async function load(file: File | undefined) {
    if (!file) return;
    const sequence = ++loadSequence.current;
    const startedSession = current.current.sessionId,
      startedRevision = current.current.revision;
    if (file.size > 200000) {
      reportLoadError("預覽失敗：檔案超過 200 KB。請縮小檔案後重試。");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (sequence !== loadSequence.current) return;
      if (
        startedSession !== current.current.sessionId ||
        startedRevision !== current.current.revision
      ) {
        reportLoadError("頁面已更新，請重新載入檔案。");
        return;
      }
      if (install(parsed)) setSource("本機檔案預覽");
    } catch {
      if (sequence !== loadSequence.current) return;
      reportLoadError("預覽失敗：檔案格式無效。請修正檔案後重試。");
    }
  }
  useEffect(() => {
    selectionHead.current = [];
    publishSelection([]);
    setAnnotations({ past: [], present: [], future: [] });
  }, [session.sessionId]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        if (!setSelectedIds([])) return;
        const inspector = document.getElementById("preview-inspector");
        if (inspector && !inspector.hidden) panelButton.current?.focus();
        setPanelOpen(false);
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
    if (!setSelected(id)) return;
    setNotice("");
  }
  function patch(
    patches: unknown[],
    targetId: string,
    baseRevision = current.current.revision,
  ) {
    if (!ready || loadError) return;
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
    setNotice(result.changed ? "已套用。" : "沒有需要套用的變更。");
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
      setNotice(targetReason(target,effectId)??"此效果不適用於目前元件。");
      return;
    }
    const conflict=combinationReason([...target.effects,{presetId:effectId}]);if(conflict){setPatchError(true);setNotice(conflict);return;}
    if (!setSelectedIds([id])) return;
    if(Object.values(motionCatalog[effectId].controls).some(c=>c.required)){
      setCompose({id:effectId,targetId:id,revision:current.current.revision,controls:{...defaultControls(effectId),...(effectId==="count-up"?(numericContent(target.content??"")??{}):{})}});
      setPanelTab("properties");setPanelOpen(true);return;
    }
    patch(
      [{ operation: "attach-effect", targetId: id, payload: createMotion(effectId,id) }],
      id,
    );
  }
  async function replaceImage(file: File | undefined) {
    if (!file || !node || node.type !== "image" || importingImage) return;
    const id = node.id,
      revision = current.current.revision;
    setImportingImage(true);
    try {
      const asset = await importImage(file);
      patch(
        [
          {
            operation: "set-property",
            targetId: id,
            payload: { property: "src", value: asset.ref },
          },
        ],
        id,
        revision,
      );
    } catch (e) {
      setPatchError(true);
      setNotice(assetErrorMessage(e));
    } finally {
      setImportingImage(false);
    }
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
    for (const effect of node.effects) {
      if(effect.presetVersion===1){
        if(motionEdits[effect.presetId])patches.push({operation:"update-effect",targetId:node.id,payload:{effectId:effect.presetId,validatedControls:motionEdits[effect.presetId]}});
        continue;
      }
      const value = Number(effectDurations[effect.presetId] ?? motionDuration(effect));
      if (value !== motionDuration(effect))
        patches.push({
          operation: "update-effect",
          targetId: node.id,
          payload: {
            effectId: effect.presetId,
            parameters: { duration: value },
          },
        });
    }
    patch(patches, node.id, editRevision);
  }

  function travel(direction: "undo" | "redo") {
    if (!ready || loadError || !confirmDiscard()) return;
    update(travelPage(current.current, direction));
    setPatchError(false);
    setNotice(direction === "undo" ? "已撤銷修改。" : "已重做修改。");
  }

  const pageActions = (
    <>
      <span className="preview-source">{source}</span>
      <span
        className="page-status"
        data-save-state={
          loadError ? "failed" : pendingProperties ? "dirty" : status.kind
        }
        title={
          pendingProperties
            ? "屬性修改尚未套用"
            : status.kind === "saved"
              ? "已儲存"
              : "本機頁面保存狀態"
        }
        aria-live="polite"
      >
        <WorkbenchIcon
          name={status.kind === "saved" && !pendingProperties ? "check" : "pen"}
        />
        <span data-testid="page-save-status">
          {!ready
            ? "正在載入頁面"
            : loadError
              ? "載入失敗"
              : pendingProperties
                ? "尚未套用"
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
      </span>
      <WorkbenchMenu label="頁面">
        <button
          disabled={
            pendingProperties || exporting || !ready || Boolean(loadError)
          }
          title={pendingProperties ? "請先套用或捨棄屬性修改" : undefined}
          onClick={async () => {
            setExporting(true);
            try {
              const snapshot=current.current.history.present;
              const {downloadProject}=await import("./exportProject");
              await downloadProject(snapshot);
              setPatchError(false);
              setNotice("已匯出 React 專案。");
            } catch {
              setPatchError(true);
              setNotice("匯出失敗，請檢查頁面與素材後重試。");
            } finally {
              setExporting(false);
            }
          }}
        >
          {exporting ? "正在匯出…" : "匯出 React 專案"}
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
        <button
          disabled={!ready}
          onClick={() => {
            if (
              (pendingEdits.current || persistence.isDirty()) &&
              !window.confirm("重新載入會捨棄本頁尚未儲存的修改，是否繼續？")
            )
              return;
            resetProperties.current();
            pendingEdits.current = false;
            loadSequence.current++;
            setSelected(null);
            setNotice("");
            void persistence.read();
          }}
        >
          重新載入頁面
        </button>
      </WorkbenchMenu>
    </>
  );
  return (
    <main className="preview-workspace" aria-label="網頁預覽">
      {headerTarget ? (
        createPortal(pageActions, headerTarget)
      ) : (
        <div className="preview-local-actions">{pageActions}</div>
      )}
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

      <input
        hidden
        type="file"
        accept="image/png,image/jpeg"
        ref={imageInput}
        aria-label="替換頁面圖片檔案"
        onChange={(e) => {
          void replaceImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
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
              className="mode-button"
              aria-label={label}
              title={label}
              aria-pressed={mode === value}
              disabled={!ready || Boolean(loadError)}
              onClick={() => setMode(value)}
            >
              <WorkbenchIcon name={value} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="history-tools">
          {mode === "pen" ? (
            <>
              <button
                aria-label="撤銷註記"
                title="撤銷註記"
                disabled={!annotations.past.length}
                onClick={() => setAnnotations(undoHistory)}
              >
                <WorkbenchIcon name="undo" />
              </button>
              <button
                aria-label="清除註記"
                title="清除註記"
                disabled={!annotations.present.length}
                onClick={() => setAnnotations((h) => commitHistory(h, []))}
              >
                <WorkbenchIcon name="clear" />
              </button>
            </>
          ) : (
            <>
              <button
                aria-label="撤銷修改"
                title="撤銷修改"
                disabled={
                  !ready || Boolean(loadError) || !session.history.past.length
                }
                onClick={() => travel("undo")}
              >
                <WorkbenchIcon name="undo" />
              </button>
              <button
                aria-label="重做修改"
                title="重做修改"
                disabled={
                  !ready || Boolean(loadError) || !session.history.future.length
                }
                onClick={() => travel("redo")}
              >
                <WorkbenchIcon name="redo" />
              </button>
            </>
          )}
        </div>
        <select
          aria-label="預覽縮放"
          value={zoom}
          onChange={(e) => setZoom(e.target.value)}
        >
          <option value="1">100%</option>
          <option value="0.75">75%</option>
          <option value="0.5">50%</option>
        </select>
        <WorkbenchMenu label="檢視">
          <div className="device-controls">
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
          </div>
          <button
            disabled={!ready || Boolean(loadError)}
            onClick={() => setReplay((n) => n + 1)}
          >
            重播動畫
          </button>
        </WorkbenchMenu>
        <WorkbenchMenu label="主題">
          {themeIds.map((id) => {
            const page = current.current.history.present;
            return (
              <button
                key={id}
                aria-pressed={(page.theme ?? "classic") === id}
                className={"theme-swatch theme-swatch-" + id}
                disabled={!ready || Boolean(loadError) || !page.sections[0]}
                onClick={() =>
                  patch(
                    [{ operation: "set-theme", targetId: page.sections[0].id, payload: { theme: id } }],
                    page.sections[0].id,
                  )
                }
              >
                <i aria-hidden="true" />
                {themeLabels[id]}
              </button>
            );
          })}
        </WorkbenchMenu>
        <span className="canvas-context">
          {mode === "pen"
            ? `註記 ${annotations.present.length}/80`
            : mode === "select"
              ? "完全包含框選"
              : device === "mobile"
                ? "手機預覽"
                : "桌面預覽"}
        </span>
        <button
          className="panel-toggle"
          ref={panelButton}
          aria-expanded={panelOpen}
          aria-controls="preview-inspector"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          工具
        </button>
      </div>
      {ready && !loadError && status.error && (
        <div className="persistence-problem" role="alert">
          <span>{status.error.message}</span>
          {status.kind === "failed" && (
            <button onClick={() => persistence.retry()}>重試儲存</button>
          )}
        </div>
      )}
      {ready &&
        loadError &&
        ["CORRUPT", "UNSUPPORTED"].includes(loadError.code) && (
          <button
            className="recovery-action"
            onClick={() => {
              if (
                window.confirm(
                  "將保留原始紀錄備份，並以範例重新開始，是否繼續？",
                )
              ) {
                loadSequence.current++;
                setSelected(null);
                void persistence.restart();
              }
            }}
          >
            以範例重新開始
          </button>
        )}
      {notice && (
        <p
          className={
            patchError ? "workbench-feedback error" : "workbench-feedback"
          }
          role={patchError ? "alert" : "status"}
        >
          {notice}
        </p>
      )}
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
              ) : (
                <VisualSurface
                  mode={mode}
                  selected={selectedIds}
                  onSelect={(ids) => {
                    const valid = ids.filter((id) => nodes.has(id));
                    if (valid.length === 1) {
                      if (!setSelected(valid[0])) return;
                    } else {
                      if (!setSelectedIds(valid)) return;
                      if (!compact && valid.length) {
                        setPanelOpen(true);
                        setPanelTab("properties");
                      }
                    }
                    setNotice("");
                  }}
                  onDropEffect={(id, effect) => {
                    setDraggedEffect(null);
                    attach(id, effect);
                  }}
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
                        !n.effects.some((e) => e.presetId === draggedEffect),
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
        <aside
          id="preview-inspector"
          data-panel={panelTab}
          hidden={!panelOpen}
          className={
            "preview-inspector" + (draggedEffect ? " dragging-effect" : "")
          }
          aria-label="設計工具"
        >
          <div className="inspector-heading">
            <strong>設計工具</strong>
            <button aria-label="關閉工具面板" onClick={closePanel}>
              關閉
            </button>
          </div>
          <div
            className="inspector-tabs"
            role="tablist"
            onKeyDown={tabNavigation}
            aria-label="預覽工具分類"
          >
            {(
              [
                ["elements", "元件"],
                ["animations", "動畫"],
                ["properties", "屬性"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={panelTab === value}
                tabIndex={panelTab === value ? 0 : -1}
                onClick={() => setPanelTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="inspector-content"
            key={panelTab + (panelTab === "properties" ? selected : "")}
          >
            {panelTab === "elements" && (
              <section className="element-browser">
                <h2>頁面元件</h2>
                <ul>
                  {[...nodes.values()].map((n) => (
                    <li
                      key={n.id}
                      // Layout wrappers stay selectable (columns, spacing) but read as structure.
                      className={["section", "container", "grid", "stack"].includes(n.type) ? "structural" : undefined}
                      style={{ "--depth": depths.get(n.id) ?? 0 } as React.CSSProperties}
                    >
                      <button
                        data-component-id={n.id}
                        aria-pressed={selectedIds.includes(n.id)}
                        onClick={() => setSelected(n.id)}
                      >
                        <small>{nodeLabels[n.type]}</small>
                        {(n.content || n.alt) && <span>{(n.content || n.alt)!.slice(0, 36)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {panelTab === "animations" && (
              <AnimationLibrary
                selectedLabel={
                  node
                    ? node.content?.slice(0, 18) || nodeLabels[node.type]
                    : undefined
                }
                compatibility={(id) =>
                  !node
                    ? null
                    : !effectCompatible(node, id)
                      ? targetReason(node,id)
                      : node.effects.some((e) => e.presetId === id)
                        ? "已附加"
                        : null
                }
                onChoose={(id) => {
                  if (selected) attach(selected, id);
                  else {
                    setPatchError(false);
                    setNotice("請先選取元件，或將動畫拖至目標。");
                  }
                }}
                onDragStart={(id, data) => {
                  setDraggedEffect(id);
                  data.setData(effectMime, id);
                  data.effectAllowed = "copy";
                }}
                onDragEnd={() => setDraggedEffect(null)}
              />
            )}
            {panelTab === "animations" && node && (
              <button
                className="edit-selection"
                onClick={() => setPanelTab("properties")}
              >
                編輯屬性
              </button>
            )}
            {panelTab === "properties" && !selectedIds.length && (
              <p className="panel-empty">點選預覽上的元件以編輯屬性。</p>
            )}
            {panelTab === "properties" &&
              ready &&
              !loadError &&
              selectedIds.length > 1 && (
                <section className="patch-panel" aria-label="選取摘要">
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
                </section>
              )}
            {panelTab === "properties" && ready && !loadError && node && (
              <section
                key={selected}
                className="patch-panel"
                aria-label="頁面元素編輯"
              >
                <>
                  <div className="side-head">
                    <div className="selected-component">
                      <span className="component-icon">
                        <WorkbenchIcon
                          name={
                            node.type === "heading"
                              ? "heading"
                              : node.type === "image"
                                ? "image"
                                : node.type === "button"
                                  ? "button"
                                  : node.type === "card"
                                    ? "card"
                                    : "text"
                          }
                        />
                      </span>
                      <h2>
                        {node.type === "heading" ? "編輯標題" : "編輯元件"}
                      </h2>
                    </div>
                    <button onClick={() => setSelected(null)}>取消選取</button>
                  </div>
                  <form
                    id="properties-form"
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
                          aria-label={
                            node.type === "heading" ? "標題文字" : "文字"
                          }
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
                          <option value="1">主標題（大）</option>
                          <option value="2">章節標題（中）</option>
                          <option value="3">小標題</option>
                        </select>
                      </label>
                    )}
                    <label className="field">
                      對齊
                      <select
                        aria-label="元素對齊"
                        value={align}
                        onChange={(e) =>
                          setAlign(e.target.value as typeof align)
                        }
                      >
                        <option value="start">靠左</option>
                        <option value="center">置中</option>
                        <option value="end">靠右</option>
                      </select>
                    </label>
                  </form>
                </>
                {node.type === "image" && (
                  <div className="image-controls">
                    <label className="field">
                      圖片素材
                      <select
                        aria-label="頁面圖片素材"
                        value={node.src}
                        onChange={(e) =>
                          patch(
                            [
                              {
                                operation: "set-property",
                                targetId: node.id,
                                payload: {
                                  property: "src",
                                  value: e.target.value,
                                },
                              },
                            ],
                            node.id,
                          )
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
                      onClick={() => imageInput.current?.click()}
                    >
                      {importingImage ? "正在匯入圖片…" : "替換圖片"}
                    </button>
                    <label className="field">
                      圖片說明
                      <input
                        aria-label="圖片說明"
                        key={node.alt}
                        maxLength={200}
                        defaultValue={node.alt}
                        onBlur={(e) => {
                          if (e.target.value !== node.alt)
                            patch(
                              [
                                {
                                  operation: "set-property",
                                  targetId: node.id,
                                  payload: {
                                    property: "alt",
                                    value: e.target.value,
                                  },
                                },
                              ],
                              node.id,
                            );
                        }}
                      />
                    </label>
                    <p className="note">
                      PNG／JPEG，原圖最多 5 MB，圖片只保存在此瀏覽器。
                    </p>
                  </div>
                )}
                <div className="effect-editor">
                  <h2>已附加動畫</h2>
                  {!node.effects.length && (
                    <p className="note">從動畫效果庫拖入，或單擊效果套用。</p>
                  )}
                  {compose && compose.targetId===node.id && <div className="effect-edit-row">
                    <h3>{effectLabels[compose.id]}</h3><p className="note">請提供實際內容，確認後才會套用。</p>
                    <MotionControlsFields id={compose.id} values={compose.controls} onChange={controls=>setCompose({...compose,controls})}/>
                    <button type="button" onClick={()=>{try{const effect=createMotion(compose.id,compose.targetId,compose.controls);if(patch([{operation:"attach-effect",targetId:compose.targetId,payload:effect}],compose.targetId,compose.revision))setCompose(null);}catch{setPatchError(true);setNotice("請檢查動畫的必填內容與數值範圍。");}}}>確認附加動畫</button>
                    <button type="button" onClick={()=>setCompose(null)}>取消附加</button>
                  </div>}
                  {node.effects.map((effect) => (
                    <div className="effect-edit-row" key={effect.presetId}>
                      <label className="field">
                        {effectLabels[effect.presetId]}
                        <select
                          aria-label={"更換" + effectLabels[effect.presetId]}
                          value={effect.presetId}
                          onChange={(e) => {
                            const effectId = e.target
                              .value as (typeof effectIds)[number];
                            if (!effectCompatible(node, effectId)) {
                              setPatchError(true);
                              setNotice(targetReason(node,effectId)??"此效果不適用於目前元件。");
                              return;
                            }
                            if(Object.values(motionCatalog[effectId].controls).some(c=>c.required)){setPatchError(true);setNotice("請先移除原效果，再從素材庫填寫新效果的內容。");return;}
                            patch(
                              [
                                {
                                  operation: "remove-effect",
                                  targetId: node.id,
                                  payload: { effectId: effect.presetId },
                                },
                                {
                                  operation: "attach-effect",
                                  targetId: node.id,
                                  payload: createMotion(effectId,node.id),
                                },
                              ],
                              node.id,
                            );
                          }}
                        >
                          {effectIds.filter(id=>motionCatalog[id].status==="DONE").map((id) => (
                            <option key={id} value={id} disabled={!effectCompatible(node,id)}>
                              {effectLabels[id]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {effect.presetVersion===1 ? <MotionControlsFields id={effect.presetId} values={motionEdits[effect.presetId]??effect.validatedControls} onChange={values=>setMotionEdits(previous=>({...previous,[effect.presetId]:values}))}/> :
                        <label className="field">
                          時長（毫秒）
                          <input
                            aria-label={
                              effect.presetId === "fade-in"
                                ? "動畫時長（毫秒）"
                                : effectLabels[effect.presetId] + "時長"
                            }
                            type="number"
                            min={120}
                            max={1200}
                            value={
                              effectDurations[effect.presetId] ??
                              String(motionDuration(effect))
                            }
                            onChange={(e) =>
                              setEffectDurations((values) => ({
                                ...values,
                                [effect.presetId]: e.target.value,
                              }))
                            }
                          />
                        </label>
                      }
                      <button
                        onClick={() =>
                          patch(
                            [
                              {
                                operation: "remove-effect",
                                targetId: node.id,
                                payload: { effectId: effect.presetId },
                              },
                            ],
                            node.id,
                          )
                        }
                      >
                        移除{effectLabels[effect.presetId]}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="inspector-form-actions">
                  {pendingProperties && (
                    <small className="pending-property-hint">
                      修改尚未套用
                    </small>
                  )}
                  <button
                    className="primary inspector-apply"
                    type="submit"
                    form="properties-form"
                  >
                    套用
                  </button>
                  {pendingProperties && (
                    <button
                      className="discard-properties"
                      onClick={() => resetProperties.current()}
                    >
                      捨棄修改
                    </button>
                  )}
                </div>
                {session.diff?.changes.some((c) => c.targetId === node.id) && (
                  <details className="patch-diff">
                    <summary>最近修改</summary>
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
                  </details>
                )}
              </section>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
