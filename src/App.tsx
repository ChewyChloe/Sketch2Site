import {encodeNodes,decodeNodes,cloneNodes,deleteNodes,groupSelection,translateSelection,formatOf,applyFormat,type NodeFormat} from "./canvasEditing";
import {MotionControlsFields} from "./MotionControls";
import type {MotionControls} from "./motionCatalog";
import {motionCatalog,motionIds,createMotion,numericContent,combinationReason,targetReason,type MotionId,defaultControls} from "./motion";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { importImage, assetErrorMessage } from "./assets";
import { isLocalAsset } from "./assetRef";
import { useAssetUrls, useAssetRefs } from "./useAssetUrls";
import { AnimationLibrary } from "./AnimationLibrary";
import { WorkbenchMenu } from "./WorkbenchMenu";
import { enlivenDraft, stillDraft } from "./motionRecipes";
import { applySiteOverrides, draftFingerprint, markSiteBuilt, overrideCount, siteOutdated, syncSiteChange } from "./siteSync";
import { indexNodes } from "./patch";
import { FrameBox } from "./PageRuntime";
import { FrameControls, FrameThumb } from "./FrameControls";
import { ArrangePanel } from "./ArrangePanel";
import { TextToolbar, defaultSize, stepSize } from "./TextToolbar";
import { NavPanel } from "./NavPanel";
import { DesignedTooltips } from "./Tooltips";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { AccountButton } from "./AccountButton";
import { InspectorSection } from "./InspectorSection";
import { PanelResizer } from "./PanelResizer";
import { Select } from "./Select";
import { BrandPanel } from "./BrandPanel";
import { smartFocus } from "./smartCrop";
import { CopySuggest } from "./CopySuggest";
import { textCss, mediaKinds, mediaKindLabels, mediaAssetRefs, type MediaKind, type TextStyle } from "./pageSpec";
import { MediaView } from "./MediaRuntime";
import { MediaControls } from "./MediaControls";
import { alignSelection, distribute, fitHeights, reorder, snapBox, toggleLock, type AlignMode, type Guide, type LayerMove } from "./layoutTools";
import { frameIds, frameLabels, frameRatios, type FrameId, type ImageLook } from "./pageSpec";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  blank,
  canvasMaxHeight,
  pageDraft,
  pageOfNode,
  CanvasSchema,
  createNode,
  createMediaNode,
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
import HomePage from "./HomePage";
import { BriefPanel } from "./BriefPanel";
import { briefSentence, emptyBrief, hasBrief, type Brief } from "./brief";
import { listProjects, openProject, createProject, renameProject, duplicateProject, deleteProject, projectSwitch, type ProjectSummary } from "./projects";
import type { PageSpec } from "./pageSpec";
import { localAssets } from "./pageSpec";
import { blockTemplateIds, blockTemplateInfo, createBlock, type BlockTemplateId } from "./blockTemplates";
import { type CandidateResult } from "./demo";
import { createSiteCandidate } from "./siteGeneration";
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
  form: "表單",
  media: "媒體",
};
const effects = Object.fromEntries(motionIds.map(id=>[id,motionCatalog[id].nameZh])) as Record<MotionId,string>;
type Effect = keyof typeof effects;
const dragType = "application/x-sketch2site";
const demoFixtures = generationFixtures();
// Example drafts offered on the home page (the product fixture is reserved for generation checks).
const homeDemos = demoFixtures.filter((_, index) => index !== 2);
// New drafts start in smart layout; stored drafts keep whatever mode they had.
const freshDraft = (): CanvasSpec => {
  const draft = blank();
  return { ...draft, metadata: { ...draft.metadata, layoutMode: "reflow" } };
};
// Menu shortcut hints in this computer's own keys (⌘ on Mac, Ctrl elsewhere).
const phoneQuery = () => (typeof matchMedia === "function" ? matchMedia("(max-width: 760px)") : null);
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
function keyHint(key: string, shift = false) { return isMac ? (shift ? "⇧" : "") + "⌘" + key : "Ctrl+" + (shift ? "Shift+" : "") + key; }
export default function App() {
  const imageInput = useRef<HTMLInputElement>(null),
    imageTarget = useRef<string | null>(null);
  const [importingImage, setImportingImage] = useState(false);
  const [imageFeedback,setImageFeedback]=useState(""),[imageError,setImageError]=useState(false),[linkError,setLinkError]=useState("");
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
    previewOnly?:boolean;
    aiFallback?:boolean;
    canvasVersion: number;
    target: { sessionId: string; revision: number };
  } | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [mode, setMode] = useState<"draft" | "preview" | "home">("draft");
  const [motionFull,setMotionFull]=useState(false);
  const [history, setHistory] = useState<History>({
    past: [],
    present: freshDraft(),
    future: [],
  });
  const [linkDraft, setLinkDraft] = useState("");
  const [brokenImages, setBrokenImages] = useState<ReadonlySet<string>>(new Set());
  // Inline text editing on the canvas (double-click a node).
  const [editing, setEditing] = useState<string | null>(null),
    [editDraft, setEditDraft] = useState(""),
    editCancelled = useRef(false);
  const [selected,setPrimarySelected]=useState<string|null>(null);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const clipboard=useRef('');
  function setSelected(id:string|null){setPrimarySelected(id);setSelectedIds(id?[id]:[]);}
  function selectNode(id:string,additive=false){
    const n=state.current.present.nodes.find(n=>n.id===id);
    const ids=n?.groupId?state.current.present.nodes.filter(v=>v.groupId===n.groupId).map(v=>v.id):[id];
    setPrimarySelected(id);setSelectedIds(prev=>additive?(prev.includes(id)?prev.filter(v=>!ids.includes(v)):[...new Set([...prev,...ids])]):ids);
  }
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("正在打開你的草稿…"),
    [error, setError] = useState(false);
  const [saved, setSaved] = useState(""),
    [zoom, setScale] = useState<number | "fit">("fit"),
    [fitScale, setFitScale] = useState(0.6),
    canvasScroll = useRef<HTMLDivElement>(null),
    [tab, setTab] = useState("library"),
    [search, setSearch] = useState("");
  const [panel, setPanel] = useState(() => window.innerWidth > 1000),
    [panelWidth, setPanelWidthRaw] = useState(() => { try { return Number(localStorage.getItem("sketch2site:left-width")) || 260; } catch { return 260; } }),
    [inspectorWidth, setInspectorWidthRaw] = useState(() => { try { return Number(localStorage.getItem("sketch2site:right-width")) || 300; } catch { return 300; } });
  const setPanelWidth = (w: number) => { setPanelWidthRaw(w); try { localStorage.setItem("sketch2site:left-width", String(w)); } catch { /* convenience only */ } };
  const setInspectorWidth = (w: number) => { setInspectorWidthRaw(w); try { localStorage.setItem("sketch2site:right-width", String(w)); } catch { /* convenience only */ } };
  // Phone-only controls are rendered only on phones (not just hidden), so each action has one button.
  const [isPhone, setIsPhone] = useState(() => !!phoneQuery()?.matches);
  useEffect(() => { const q = phoneQuery(); if (!q) return; const on = () => setIsPhone(q.matches); q.addEventListener("change", on); return () => q.removeEventListener("change", on); }, []);
  const scale = zoom === "fit" ? fitScale : zoom;
  // "Fit" tracks the visible canvas width (panels, window resizes).
  useEffect(() => {
    const el = canvasScroll.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = el.clientWidth - 48;
      if (width > 0) setFitScale(Math.round(Math.max(0.2, Math.min(1, width / 1440)) * 1000) / 1000);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);
  // Touch: two fingers pinch-zoom the canvas around the fingers; a double tap on empty canvas
  // toggles between "fit" and a readable 60%.
  useEffect(() => {
    const el = canvasScroll.current;
    if (!el) return;
    let pinch: { d: number; s: number; fx: number; fy: number } | null = null, lastTap = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const current = () => Number(getComputedStyle(el).getPropertyValue("--draft-scale")) || 1;
    const zoomAround = (next: number, cx: number, cy: number, from: number) => {
      const r = el.getBoundingClientRect(), ox = cx - r.left + el.scrollLeft, oy = cy - r.top + el.scrollTop;
      setScale(next);
      requestAnimationFrame(() => { el.scrollLeft = (ox * next) / from - (cx - r.left); el.scrollTop = (oy * next) / from - (cy - r.top); });
    };
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        drag.current = null; setMoving(null);
        pinch = { d: dist(e.touches), s: current(), fx: (e.touches[0].clientX + e.touches[1].clientX) / 2, fy: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      } else if (e.touches.length === 1 && !(e.target as Element).closest("[data-node-id], button, input, textarea, select")) {
        const now = Date.now();
        if (now - lastTap < 300) {
          e.preventDefault();
          const from = current(), next = from < 0.55 ? 0.6 : 0;
          if (next) zoomAround(next, e.touches[0].clientX, e.touches[0].clientY, from); else setScale("fit");
          lastTap = 0;
        } else lastTap = now;
      }
    };
    const moveTouch = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const next = Math.round(Math.min(1.5, Math.max(0.2, (pinch.s * dist(e.touches)) / pinch.d)) * 100) / 100;
      zoomAround(next, pinch.fx, pinch.fy, current());
    };
    const end = (e: TouchEvent) => { if (e.touches.length < 2) pinch = null; };
    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchmove", moveTouch, { passive: false });
    el.addEventListener("touchend", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", moveTouch); el.removeEventListener("touchend", end); };
  }, [mode]);
  const [draftDragging, setDraftDragging] = useState(false);
  const [draftEffect,setDraftEffect]=useState<Effect|null>(null),[draftHover,setDraftHover]=useState<string|null>(null);
  useEffect(() => {
    const end = () => {setDraftDragging(false);setDraftEffect(null);setDraftHover(null);};
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
  // Smart guides shown while dragging (hold Alt to move freely).
  const [guides, setGuides] = useState<Guide[]>([]);
  // Dragging a framed photo onto another frame swaps their photos.
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    node: CanvasNode;
    ids:string[];
    // Alt + drag: copies that only join the draft when the drag ends (one undo step).
    copies?: CanvasNode[];
    startX: number;
    startY: number;
    scale: number;
    // A plain click (no drag) inside a multi-selection narrows it to this element's group.
    collapseTo?: string[];
  } | null>(null);
  // Box selection on the empty canvas, in canvas coordinates.
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; additive: boolean } | null>(null);
  const state = useRef(history);
  state.current = history;
  const saveActive = useRef(false), savePending = useRef<CanvasSpec | null>(null);
  const spec = history.present,
    node = spec.nodes.find((n) => n.id === selected),
    dirty = JSON.stringify(spec) !== saved;
  // ---- Pages of a multi-page draft ----
  const [activePage, setActivePage] = useState<string | null>(null);
  const pagesList = spec.metadata.pages ?? null;
  const currentPage = pagesList ? (pagesList.find((p) => p.id === activePage)?.id ?? pagesList[0].id) : null;
  const onCurrentPage = (n: CanvasNode, s: CanvasSpec = state.current.present) => !s.metadata.pages || pageOfNode(s, n) === currentPage;
  const withPage = <T extends CanvasNode>(n: T): T => (state.current.present.metadata.pages && currentPage ? { ...n, pageId: currentPage } : n);
  const [brandOpen, setBrandOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const imageUrls = useAssetUrls(
    // Canvas images, the brand logo, and (only while the brand kit is open) the other local images.
    [...spec.nodes.flatMap((n) => [...(n.assetId ? [n.assetId] : []), ...mediaAssetRefs(n.media)]), ...(brandOpen || spec.nodes.find((n) => n.id === selected)?.media ? localImages : []), ...[spec.metadata.brand?.logo, spec.metadata.brand?.logoAlt, spec.metadata.brand?.icon].filter((r): r is string => Boolean(r))],
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
  async function generate(demo = false, previewOnly = false) {
    if (generating || abortRef.current || !ready || loadError) return;
    const target = previewRef.current?.target();
    if (!target) {
      setGenerationError("網站那邊還有沒套用的修改，請先套用或取消");
      return;
    }
    const version = canvasVersion.current,
      run = ++generationRun.current,
      controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setGenerationError("");
    try {
      const multiPage = (spec.metadata.pages?.length ?? 0) > 1;
      let usedLocal = demo || multiPage;
      let result;
      // Multi-page sites are laid out page by page locally; AI generation handles one page per request.
      if (demo || multiPage || aiOff.current) { result = createSiteCandidate(spec); usedLocal = true; }
      else
        try {
          result = await requestGeneration(pageDraft(spec, null), controller.signal);
        } catch (e) {
          // Without a configured or reachable AI service, use the labelled local
          // layout instead of a dead end. Other failures still surface as errors.
          if (!(e instanceof GenerationError) || !["NOT_CONFIGURED", "UNAVAILABLE"].includes(e.code)) throw e;
          result = createSiteCandidate(spec);
          usedLocal = true;
        }
      // Layout tweaks made earlier on the site come back on the new version.
      result = { ...result, page: applySiteOverrides(result.page, spec) };
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
          ? multiPage && !demo
            ? `網站做好了，共 ${spec.metadata.pages!.length} 頁`
            : usedLocal && !demo
            ? "網站做好了！"
            : "網站做好了！"
          : "AI 排好了，看看喜不喜歡",
      );
      setCandidate({ result, canvasVersion: version, target, previewOnly, aiFallback: usedLocal && !demo });
      setMode("preview");
    } catch (e) {
      if (run === generationRun.current)
        setGenerationError(
          e instanceof GenerationError ? e.message : "生成失敗，原版本已保留",
        );
    } finally {
      if (run === generationRun.current) {
        setGenerating(false);
        abortRef.current = null;
      }
    }
  }
  // ---- Draft ↔ site sync (siteSync.ts) ----
  const [syncSaves, setSyncSaves] = useState(0);
  useEffect(() => {
    if (syncSaves) void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSaves]);
  function syncFromSite(before: PageSpec, after: PageSpec) {
    const draft = state.current.present;
    const ids = new Set(draft.nodes.map((n) => n.id));
    // Only a site generated from this draft writes back (not a loaded file or sample).
    if (![...indexNodes(after).keys()].some((id) => ids.has(id))) return;
    const next = syncSiteChange(draft, before, after);
    if (!next) return;
    // Edits made on the site don't make the site outdated.
    const inSync = draft.metadata.siteBuiltFrom === draftFingerprint(draft);
    setHistory((h) => commit(h, inSync ? markSiteBuilt(next) : next));
    setSyncSaves((n) => n + 1);
  }
  async function acceptCandidate(page: PageSpec = candidate!.result.page) {
    if (!candidate || candidate.canvasVersion !== canvasVersion.current) return;
    setAccepting(true);
    setGenerationError("");
    try {
      const result = await previewRef.current!.accept(
        page,
        candidate.target,
        Boolean(state.current.present.metadata.siteBuiltFrom),
      );
      if (result.ok) {
        // Remember which draft the site was built from (no undo step for this bookkeeping).
        setHistory((h) => ({ ...h, present: markSiteBuilt(h.present) }));
        setSyncSaves((n) => n + 1);
        setCandidate(null);
      } else
        setGenerationError((result.error ?? "儲存失敗") + " 剛做好的網站還在，可以再按一次「使用此版本」");
    } finally {
      setAccepting(false);
    }
  }
  useEffect(() => {
    setLinkDraft(node?.href ?? "");
    setLinkError("");
  }, [node?.id, node?.href]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (candidate && !projectSwitch.reloading) {
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
      const data = (await loadDraft()) ?? freshDraft();
      setHistory({ past: [], present: data, future: [] });
      setSaved(JSON.stringify(data));
      setSelected(null);
      setMoving(null);
      drag.current = null;
      report("草稿已就緒");
    } catch {
      setLoadError(true);
      report("無法讀取草稿，請允許網站儲存資料後，按「重新載入」重試", true);
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
      report("這樣會超出畫布，請調整後再試", true);
      return false;
    }
  };
  // Page height: dragged from the bottom edge of the page frame. Never shorter than the
  // lowest element (or 1200), never taller than the canvas limit; one undo step per drag.
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const minPageHeight = () => Math.max(1200, ...state.current.present.nodes.map((n) => Math.ceil((n.y + n.height) / 10) * 10));
  const clampPageHeight = (h: number) => Math.min(canvasMaxHeight, Math.max(minPageHeight(), Math.round(h / 10) * 10));
  const setPageHeight = (h: number) => {
    const cur = state.current.present, next = clampPageHeight(h);
    if (next !== cur.metadata.height && change({ ...cur, metadata: { ...cur.metadata, height: next } })) report("網頁高度改成 " + next);
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
    setImageFeedback("正在處理圖片…");setImageError(false);
    const originalVersion = canvasVersion.current;
    const id = imageTarget.current,
      previous = id
        ? state.current.present.nodes.find((n) => n.id === id)
        : undefined;
    try {
      const asset = await importImage(file);
      if (canvasVersion.current !== originalVersion) {
        setImageFeedback("草稿剛剛變了，請再選一次照片");setImageError(true);
        report("草稿剛剛變了，請再選一次照片", true);
        return;
      }
      if (id) {
        const now = state.current.present.nodes.find((n) => n.id === id);
        if (!now || now.assetId !== previous?.assetId) {
          setImageFeedback("照片存好了，但原本的位置變了，請再選一次");setImageError(true);
          report("照片存好了，但原本的位置變了，請再選一次", true);
          return;
        }
        if(!patch(id, { assetId: asset.ref }))throw new Error("image patch rejected");
        setSelected(id);
      } else {
        if (state.current.present.nodes.length >= 100) {
          setImageFeedback("畫布上的東西已經滿了，照片先幫你存起來");setImageError(true);
          report("畫布上的東西已經滿了，照片先幫你存起來", true);
          return;
        }
        let position={x:80,y:80};
        outer:for(let y=80;y<=1000;y+=220)for(let x=80;x<=1120;x+=320){
          if(state.current.present.nodes.filter(n=>onCurrentPage(n)).every(n=>x+280<=n.x||x>=n.x+n.width||y+180<=n.y||y>=n.y+n.height)){position={x,y};break outer;}
        }
        const next = {
          ...withPage(createNode("image", position.x, position.y)),
          assetId: asset.ref,
          content: "匯入的圖片",
        };
        if(!change({
          ...state.current.present,
          nodes: [...state.current.present.nodes, next],
        }))throw new Error("image insertion rejected");
        setSelected(next.id);
      }
      setTab("properties");
      setImageFeedback("照片放好了！");
      report("照片放好了！");
      requestAnimationFrame(()=>{const selectedId=id??state.current.present.nodes.at(-1)?.id;if(selectedId)board.current?.querySelector<HTMLElement>('[data-node-id="'+selectedId+'"]')?.scrollIntoView({block:'nearest',inline:'nearest'});});
    } catch (e) {
      setImageFeedback(assetErrorMessage(e));setImageError(true);
      report(assetErrorMessage(e), true);
      requestAnimationFrame(()=>document.querySelector('.image-feedback')?.scrollIntoView({block:'nearest'}));
    } finally {
      setImportingImage(false);
    }
  }
  /** Adds an empty frame (like a photo placeholder in a shape); drop or pick a photo into it. */
  function addFrame(frame: FrameId, at?: { x: number; y: number }) {
    if (!ready || loadError) return;
    const ratio = frameRatios[frame];
    const width = Math.round(Math.min(420, Math.max(200, 300 * Math.sqrt(ratio))));
    const height = Math.round(Math.min(640, Math.max(120, width / ratio)));
    let position = at ?? { x: 80, y: 80 };
    if (!at)
      outer: for (let y = 80; y <= spec.metadata.height - height; y += 120)
        for (let x = 80; x <= 1440 - width - 40; x += 160)
          if (spec.nodes.filter((n) => onCurrentPage(n, spec)).every((n) => x + width <= n.x || x >= n.x + n.width || y + height <= n.y || y >= n.y + n.height)) {
            position = { x, y };
            break outer;
          }
    const base = createNode("image", Math.min(position.x, 1440 - width), Math.min(position.y, spec.metadata.height - height), spec.metadata.height);
    const next = withPage({ ...base, width, height, content: "照片", look: { frame } });
    if (change({ ...spec, nodes: [...spec.nodes, next] })) {
      setSelected(next.id);
      setTab("properties");
      report(`已新增${frameLabels[frame]}相框：拖入照片，或按「放入照片」`);
    }
  }
  // Crop mode (double-click a framed photo): drag to move the photo, wheel or slider to zoom.
  const [cropping, setCropping] = useState<{ id: string; look: ImageLook } | null>(null);
  const cropDrag = useRef<{ x: number; y: number; fx: number; fy: number; w: number; h: number } | null>(null);
  function finishCrop(keep: boolean) {
    if (!cropping) return;
    const { id, look } = cropping;
    setCropping(null);
    if (keep) patch(id, { look });
  }
  const isPhoto = (n: CanvasNode) => n.type === "image" && !!n.assetId && n.assetId !== localAssets[0] && !brokenImages.has(n.id + n.assetId);
  const framed = (n: CanvasNode, content: React.ReactNode) => {
    const look = cropping?.id === n.id ? cropping.look : n.look;
    if (!look) return content;
    const ratio = look.frame ? frameRatios[look.frame] : n.width / n.height;
    return (
      <span className="draft-frame-fit" style={{ width: `min(100%, ${Math.round(n.height * ratio)}px)` }}>
        <FrameBox look={look} ratio={ratio}>{content}</FrameBox>
      </span>
    );
  };
  function add(type: CanvasNode["type"], x = 80, y = 80) {
    if (!ready || loadError) return;
    const next = withPage(createNode(type, x, y, spec.metadata.height));
    change({ ...spec, nodes: [...spec.nodes, next] });
    setSelected(next.id);
    report("已新增" + labels[type]);
  }
  // 預覽: once a site was built from this draft it opens that site (with an update banner if needed);
  // otherwise it builds a preview from the draft first.
  const [phoneView, setPhoneView] = useState(false);
  function openPreview() {
    if(mode==="draft"&&spec.nodes.length&&!generating&&!spec.metadata.siteBuiltFrom){
      if(!previewRef.current?.target()){setMode("preview");return;}
      const missing=spec.nodes.find(n=>n.type==="button"&&!n.href);
      if(missing){setSelected(missing.id);setTab("properties");setPanel(true);setGenerationError("請先為「"+missing.content+"」設定按鈕連結，再預覽");return;}
      void generate(true,true);
    }else setMode("preview");
  }
  // Media (video, carousel, flipbook, character, 3D object): dropped at a point, or below the content when clicked.
  function addMedia(kind: MediaKind, at?: { x: number; y: number }) {
    if (!ready || loadError) return;
    const cur = state.current.present;
    let height = cur.metadata.height, x = at?.x ?? 80, y = at?.y ?? 80;
    if (!at) {
      const bottom = cur.nodes.filter((n) => onCurrentPage(n, cur)).reduce((m, n) => Math.max(m, n.y + n.height), 0);
      y = bottom ? bottom + 24 : 80;
      const needed = y + createMediaNode(kind, 0, 0, canvasMaxHeight).height;
      if (needed > height) { if (needed <= canvasMaxHeight) height = Math.ceil(needed / 600) * 600; else y = 80; }
    }
    const next = withPage(createMediaNode(kind, x, y, height));
    if (change({ ...cur, metadata: { ...cur.metadata, height }, nodes: [...cur.nodes, next] })) {
      setSelected(next.id);
      setTab("properties");
      report("已新增" + mediaKindLabels[kind] + (kind === "video" ? "，貼上 YouTube 或 Vimeo 網址就能播放" : ""));
    }
  }
  // ---- Projects (home workspace) ----
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const refreshProjects = async () => {
    try { setProjects(await listProjects()); } catch { setProjects([]); report("無法讀取專案清單，請重新整理", true); }
  };
  useEffect(() => { if (mode === "home" && ready) void refreshProjects(); }, [mode, ready]);
  // Save the open draft (if changed) before any switch, then reload into the target project.
  async function switchProjects(work: () => Promise<unknown>) {
    try {
      if (dirty) await saveDraft(state.current.present);
      await work();
      projectSwitch.reloading = true;
      location.reload();
    } catch (e) {
      report(e instanceof Error ? e.message : "專案操作失敗，目前草稿已保留", true);
      void refreshProjects();
    }
  }
  const projectActions = {
    open: (id: string) => {
      if (projects?.find((p) => p.id === id)?.active) { setMotionFull(false); setMode("draft"); return; }
      void switchProjects(() => openProject(id));
    },
    create: (from?: CanvasSpec) => void switchProjects(() => createProject(from ? from.metadata.name : "未命名草稿", from)),
    rename: async (id: string, name: string) => {
      try {
        await renameProject(id, name);
        if (projects?.find((p) => p.id === id)?.active && name.trim()) change({ ...state.current.present, metadata: { ...state.current.present.metadata, name: name.trim().slice(0, 80) } });
        await refreshProjects();
      } catch (e) { report(e instanceof Error ? e.message : "改名失敗", true); }
    },
    duplicate: async (id: string) => {
      try {
        if (dirty && projects?.find((p) => p.id === id)?.active) await save();
        await duplicateProject(id);
        await refreshProjects();
        report("已建立副本");
      } catch (e) { report(e instanceof Error ? e.message : "複製失敗", true); }
    },
    remove: async (id: string) => {
      try {
        const wasActive = await deleteProject(id);
        if (wasActive) { projectSwitch.reloading = true; location.reload(); return; }
        await refreshProjects();
        report("已刪除專案");
      } catch (e) { report(e instanceof Error ? e.message : "刪除失敗", true); }
    },
  };
  function loadDemo(fixture: CanvasSpec) {
    if (dirty && !window.confirm("載入範例會取代目前的草稿（可以按還原回來），要繼續嗎？")) return false;
    if (!change(fixture.metadata.layoutMode ? fixture : { ...fixture, metadata: { ...fixture.metadata, layoutMode: "reflow" } })) return false;
    setSelected(null);
    setPending(null);
    setMoving(null);
    drag.current = null;
    setCandidate(null);
    report("已載入範例草稿，可以按還原回來");
    return true;
  }
  // ---- Generation brief (fill-in description) ----
  const [briefOpen, setBriefOpen] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  // True once the start-up probe has answered "not set up": generation then goes straight to
  // the local layout instead of knocking on the AI service first.
  const aiOff = useRef(import.meta.env.VITE_SITES_FRONTEND_ONLY === "true");
  const [pendingGenerate, setPendingGenerate] = useState(false);
  // Checked on start and whenever the brief opens: AI features show only when AI is set up.
  useEffect(() => {
    if (import.meta.env.VITE_SITES_FRONTEND_ONLY === "true") return;
    let live = true;
    fetch("/api/generation/ready", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((s: { configured?: boolean }) => { if (live) { setAiReady(Boolean(s?.configured)); aiOff.current = !s?.configured; } })
      .catch(() => { if (live) { setAiReady(false); aiOff.current = true; } });
    return () => { live = false; };
  }, [briefOpen]);
  // Generate after the brief has been written into the draft (next render sees it).
  useEffect(() => {
    if (!pendingGenerate) return;
    setPendingGenerate(false);
    void generate();
  }, [pendingGenerate]);
  function saveBrief(brief: Brief) {
    const s = state.current.present;
    const clean = { ...brief, details: brief.details?.trim() || undefined };
    const next = hasBrief(clean) ? clean : undefined;
    if (JSON.stringify(next) === JSON.stringify(s.metadata.brief)) return true;
    const { brief: _old, ...metadata } = s.metadata;
    return change({ ...s, metadata: next ? { ...metadata, brief: next } : metadata });
  }
  // ---- Page management ----
  const [renamingPage, setRenamingPage] = useState<{ id: string; name: string } | null>(null);
  const [deletingPage, setDeletingPage] = useState<string | null>(null);
  function addPage() {
    const s = state.current.present;
    const pages = s.metadata.pages ?? [{ id: crypto.randomUUID(), name: "首頁" }];
    if (pages.length >= 10) { report("一個網站最多 10 頁", true); return; }
    const id = crypto.randomUUID();
    if (change({ ...s, metadata: { ...s.metadata, pages: [...pages, { id, name: `第 ${pages.length + 1} 頁` }] } })) {
      setActivePage(id); setSelected(null);
      report("已新增頁面，雙擊分頁名稱可以改名");
    }
  }
  function renamePage(id: string, name: string) {
    const s = state.current.present, clean = name.trim().slice(0, 30);
    setRenamingPage(null);
    if (!clean || !s.metadata.pages) return;
    change({ ...s, metadata: { ...s.metadata, pages: s.metadata.pages.map((p) => (p.id === id ? { ...p, name: clean } : p)) } });
  }
  function removePage(id: string) {
    const s = state.current.present, pages = s.metadata.pages;
    setDeletingPage(null);
    if (!pages || pages.length < 2) return;
    const gone = new Set([id, ...s.nodes.filter((n) => pageOfNode(s, n) === id).map((n) => n.id)]);
    const rest = pages.filter((p) => p.id !== id);
    const single = rest.length === 1;
    const nodes = s.nodes
      .filter((n) => !gone.has(n.id))
      .map((n) => {
        const href = n.href?.startsWith("#") && gone.has(n.href.slice(1)) ? null : n.href;
        const moved = { ...n, ...(n.href !== undefined ? { href } : {}) };
        if (single) delete moved.pageId;
        else if (!moved.pageId) moved.pageId = pageOfNode(s, n) ?? undefined;
        return moved;
      });
    const { pages: _old, ...metadata } = s.metadata;
    if (change({ ...s, metadata: single ? metadata : { ...metadata, pages: rest }, nodes })) {
      setActivePage(null); setSelected(null);
      report("已刪除頁面與上面的元件，可還原");
    }
  }
  function addBlock(id: BlockTemplateId) {
    if (!ready || loadError) return;
    const block = createBlock({ ...spec, nodes: spec.nodes.filter((n) => onCurrentPage(n, spec)) }, id);
    if (!block) {
      report("畫布已達上限，請先刪除部分元件", true);
      return;
    }
    const { height } = block;
    let nodes = block.nodes.map(withPage);
    // New blocks arrive with recipe motion picked for the section they form.
    const page = { ...spec, nodes: [...spec.nodes.filter((n) => onCurrentPage(n, spec)), ...nodes] };
    const lively = enlivenDraft(page, undefined, new Set(nodes.map((n) => n.id)));
    nodes = nodes.map((n) => lively.nodes.find((m) => m.id === n.id) ?? n);
    if (change({ ...spec, metadata: { ...spec.metadata, height }, nodes: [...spec.nodes, ...nodes] })) {
      setSelected(nodes[0].id);
      report("已新增區塊：" + blockTemplateInfo(id).label + "，點選文字即可修改");
      requestAnimationFrame(() => document.querySelector(`[data-node-id="${nodes[0].id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  }
  /** Recipe motion for the selection (or the whole current page); one undo step. */
  function autoMotion(remove = false) {
    const ids = new Set(selectedIds.length ? selectedIds : spec.nodes.filter((n) => onCurrentPage(n, spec)).map((n) => n.id));
    const page = { ...spec, nodes: spec.nodes.filter((n) => onCurrentPage(n, spec)) };
    const next = remove ? stillDraft(page, ids) : enlivenDraft(page, undefined, ids);
    const touched = next.nodes.filter((n, i) => n !== page.nodes[i]).length;
    if (!touched) return report(remove ? "沒有可移除的動態" : "選到的東西都已經有動畫，或沒有適合的動畫");
    const byId = new Map(next.nodes.map((n) => [n.id, n]));
    if (change({ ...spec, nodes: spec.nodes.map((n) => byId.get(n.id) ?? n) }))
      report(remove ? `已移除 ${touched} 個元件的動態` : `已替 ${touched} 個元件加上動態，可在右側個別調整`);
  }
  function attach(effect: Effect, id: string, controls?:MotionControls) {
    const n = state.current.present.nodes.find((n) => n.id === id);
    if (!n) return;
    if (effect === "stagger-reveal" && n.type !== "card") {
      report("依序顯示只能用在卡片上", true);
      return;
    }
    if (n.effects.some(e=>e.presetId===effect)) {
      report("這個元件已經有這個動畫了");
      return;
    }
    if(targetReason(n,effect)){report(targetReason(n,effect)!,true);return;}
    const conflict=combinationReason([...n.effects,{presetId:effect}]);if(conflict){report(conflict,true);return;}
    let motion; try {motion=createMotion(effect,id,controls??{});}catch{if(controls){report("動畫設定有地方沒填好，或數字超出範圍",true);return;}setPending(effect);setTarget(id);setPendingControls({...defaultControls(effect),...(effect==="count-up"?(numericContent(n.content)??{}):{})});report("先填好動畫需要的內容，再按「加上動畫」",true);return;}
    patch(id, { effects: [...n.effects, motion] });
    setSelected(id);
    setPending(null);
    report("已加上「" + effects[effect] + "」，到「預覽」就能看到它動");
  }
  async function save() {
    if (!ready || loadError) return;
    savePending.current = state.current.present;
    if (saveActive.current) return;
    saveActive.current = true;
    setBusy(true);
    report("正在儲存草稿…");
    try {
      while (savePending.current) {
        const snapshot = savePending.current;
        savePending.current = null;
        await saveDraft(snapshot);
        setSaved(JSON.stringify(snapshot));
      }
      report("已儲存");
    } catch {
      savePending.current = null;
      report(
        "沒存成功，可能是瀏覽器空間不夠，草稿還在，請再試一次",
        true,
      );
    } finally {
      saveActive.current = false;
      setBusy(false);
    }
  }
  function remove() {
    const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(!ids.length)return;
    const free=ids.filter(id=>!spec.nodes.find(n=>n.id===id)?.locked);
    if(!free.length){report('元件已鎖定，先解鎖才能刪除',true);return;}
    if(change(deleteNodes(spec,free))){setSelected(null);report(free.length<ids.length?'已刪除，鎖定的元件留著':'已刪除選取元件，可還原');}
  }
  const selection = () => (selectedIds.length ? selectedIds : selected ? [selected] : []);
  const layerWords: Record<LayerMove, string> = { front: "移到最上層", forward: "上移一層", backward: "下移一層", back: "移到最下層" };
  function layer(move: LayerMove) {
    const ids = selection();
    if (ids.length && change(reorder(spec, ids, move))) report("已" + layerWords[move] + "，可還原");
  }
  function align(mode: AlignMode) {
    const ids = selection();
    if (ids.length && change(alignSelection(spec, ids, mode))) report(ids.length > 1 ? "已對齊選取的元件" : "已對齊畫布");
  }
  function spread(axis: "h" | "v") {
    const ids = selection();
    if (ids.length >= 3 && change(distribute(spec, ids, axis))) report(axis === "h" ? "已左右平均分配" : "已上下平均分配");
  }
  // ---- Text styling (text toolbar and shortcuts) ----
  const textTypes = ["heading", "text", "button", "card"];
  const textTargets = () => spec.nodes.filter((n) => selection().includes(n.id) && textTypes.includes(n.type) && !n.locked);
  /** Height the element needs for its text (measured off-screen with the real canvas styles). */
  function neededHeight(n: CanvasNode, style: TextStyle | undefined, content = n.content): number | null {
    const el = document.querySelector<HTMLElement>(`[data-node-id="${n.id}"]`);
    if (!el?.parentElement) return null;
    const probe = el.cloneNode(false) as HTMLElement;
    for (const a of ["data-node-id", "data-testid", "id", "aria-label", "tabindex"]) probe.removeAttribute(a);
    probe.setAttribute("aria-hidden", "true");
    probe.textContent = content;
    probe.style.cssText = "";
    Object.assign(probe.style, { position: "absolute", left: "-20000px", top: "0", width: n.width + "px", height: "auto", minHeight: "0", maxHeight: "none", visibility: "hidden" });
    for (const [k, v] of Object.entries(textCss(style, false) ?? {})) k.startsWith("--") ? probe.style.setProperty(k, String(v)) : ((probe.style as unknown as Record<string, string>)[k] = String(v));
    el.parentElement.appendChild(probe);
    const h = probe.scrollHeight;
    probe.remove();
    return h;
  }
  /** Width a button needs to keep its label on one line. */
  function neededWidth(n: CanvasNode, style: TextStyle | undefined, content = n.content): number | null {
    const el = document.querySelector<HTMLElement>(`[data-node-id="${n.id}"]`);
    if (!el?.parentElement) return null;
    const probe = el.cloneNode(false) as HTMLElement;
    for (const a of ["data-node-id", "data-testid", "id", "aria-label", "tabindex"]) probe.removeAttribute(a);
    probe.textContent = content;
    probe.style.cssText = "";
    Object.assign(probe.style, { position: "absolute", left: "-20000px", top: "0", width: "auto", height: "auto", whiteSpace: "nowrap", visibility: "hidden" });
    for (const [k, v] of Object.entries(textCss(style, false) ?? {})) k.startsWith("--") ? probe.style.setProperty(k, String(v)) : ((probe.style as unknown as Record<string, string>)[k] = String(v));
    el.parentElement.appendChild(probe);
    const w = probe.scrollWidth;
    probe.remove();
    return w;
  }
  /** Grows text boxes that no longer fit and moves what is below them down (same undo step). */
  function withFittedText(input: CanvasSpec, ids: readonly string[], contents: Record<string, string> = {}): CanvasSpec {
    const heights = new Map<string, number>();
    // Buttons widen first so their label stays on one line (up to the canvas edge).
    let next = input;
    for (const id of ids) {
      const n = next.nodes.find((v) => v.id === id);
      if (n?.type !== "button") continue;
      const w = neededWidth(n, n.textStyle, contents[id] ?? n.content);
      const extra = n.textStyle?.highlight ? (n.textStyle.size ?? 16) * 0.3 : 0;
      if (w && w + extra > n.width + 1) {
        // The highlighter adds a little padding around the label.
        const mark = n.textStyle?.highlight ? (n.textStyle.size ?? 16) * 0.3 : 0;
        const width = Math.min(1440 - n.x, Math.ceil(w + 8 + mark));
        next = { ...next, nodes: next.nodes.map((v) => (v.id === id ? { ...v, width } : v)) };
      }
    }
    for (const id of ids) {
      const n = next.nodes.find((v) => v.id === id);
      if (!n || !textTypes.includes(n.type)) continue;
      const h = neededHeight(n, n.textStyle, contents[id] ?? n.content);
      if (h && h > n.height + 1) heights.set(id, h + 4);
    }
    return heights.size ? fitHeights(next, heights, canvasMaxHeight, (a, b) => pageOfNode(next, a) === pageOfNode(next, b)) : next;
  }
  // Keeps text from spilling out of its box when the font loads late or a saved draft was
  // measured with another font: grows boxes that overflow (never shrinks), without adding
  // an undo step.
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => live && setFontsReady((v) => v + 1));
    const done = () => live && setFontsReady((v) => v + 1);
    document.fonts?.addEventListener?.("loadingdone", done);
    return () => { live = false; document.fonts?.removeEventListener?.("loadingdone", done); };
  }, []);
  // The floating text toolbar sits right above the selected text (below it when there is no
  // room), inside the visible canvas, so it never covers what you are editing.
  const ttSlot = useRef<HTMLDivElement>(null);
  const [ttPos, setTtPos] = useState<{ top: number; left: number; max: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const slot = ttSlot.current, bar = slot?.querySelector<HTMLElement>(".text-toolbar:not(.is-idle)");
      const picked = [...document.querySelectorAll<HTMLElement>('[data-testid="canvas-node"].selected')];
      if (!slot || !bar || !picked.length || window.innerWidth <= 760) { setTtPos((p) => (p ? null : p)); return; }
      const s = slot.getBoundingClientRect(), view = canvasScroll.current?.getBoundingClientRect() ?? s;
      const rects = picked.map((e) => e.getBoundingClientRect());
      const top = Math.min(...rects.map((r) => r.top)), bottom = Math.max(...rects.map((r) => r.bottom));
      const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
      const h = bar.offsetHeight, w = bar.offsetWidth;
      let y = top - h - 14;
      if (y < view.top + 6) y = Math.min(bottom + 14, view.bottom - h - 6);
      const x = Math.min(Math.max((left + right) / 2 - w / 2, view.left + 8), Math.max(view.left + 8, view.right - w - 8));
      const next = { top: Math.round(y - s.top), left: Math.round(x - s.left), max: Math.round(view.width - 16) };
      setTtPos((p) => (p && p.top === next.top && p.left === next.left && p.max === next.max ? p : next));
    };
    place();
    const el = canvasScroll.current;
    el?.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => { el?.removeEventListener("scroll", place); window.removeEventListener("resize", place); };
  });
  const textFitKey = spec.nodes.filter((n) => textTypes.includes(n.type)).map((n) => `${n.id}:${n.width}:${n.height}:${n.content.length}:${JSON.stringify(n.textStyle ?? "")}`).join("|");
  useEffect(() => {
    if (!ready || !fontsReady || editing || moving || generating || accepting) return;
    const t = window.setTimeout(() => {
      const present = state.current.present;
      const fitted = withFittedText(present, present.nodes.filter((n) => textTypes.includes(n.type) && n.type !== "button").map((n) => n.id));
      if (fitted !== present && CanvasSchema.safeParse(fitted).success) setHistory((h) => (h.present === present ? { ...h, present: fitted } : h));
    }, 250);
    return () => window.clearTimeout(t);
  }, [textFitKey, ready, fontsReady, editing, moving, currentPage, generating, accepting]);
  /** Applies a style change (or null = clear) to every selected text element, as one undo step. */
  function styleText(patch: Partial<TextStyle> | null, ids?: string[]) {
    const targets = ids ? spec.nodes.filter((n) => ids.includes(n.id)) : textTargets();
    if (!targets.length) return;
    const next = new Map(
      targets.map((n) => {
        const merged: Record<string, unknown> = patch ? { ...n.textStyle, ...patch } : {};
        for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
        const { textStyle: _old, ...rest } = n;
        void _old;
        return [n.id, Object.keys(merged).length ? { ...rest, textStyle: merged as TextStyle } : rest];
      }),
    );
    const styled = { ...spec, nodes: spec.nodes.map((n) => next.get(n.id) ?? n) };
    const fitted = withFittedText(styled, [...next.keys()]);
    if (change(fitted)) report((patch ? "已套用文字樣式" : "已清除文字樣式") + (fitted !== styled ? "，文字框已自動變高並把下方元件往下移" : "") + "，可還原");
  }
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Single-key shortcuts only act on the canvas, so Tab still moves through buttons elsewhere.
  const onCanvasFocus = (e: KeyboardEvent) => e.target === document.body || (e.target instanceof Element && Boolean(e.target.closest("[data-node-id], [data-testid='canvas']")));
  const zoomLevels = [0.4, 0.5, 0.6, 0.75, 1];
  function lock() {
    const ids = selection();
    if (!ids.length) return;
    const r = toggleLock(spec, ids);
    if (change(r.canvas)) report(r.locked ? "已鎖定，不能拖動、改大小或刪除" : "已解鎖");
  }
  // Resize handles (like a slide editor): corners and edges, Shift on a corner keeps the ratio.
  type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  const resizeStart = useRef<{ id: string; dir: Dir; px: number; py: number; x: number; y: number; width: number; height: number; scale: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; x: number; y: number; width: number; height: number } | null>(null);
  function resizeTo(e: React.PointerEvent) {
    const r = resizeStart.current;
    if (!r) return;
    const dx = (e.clientX - r.px) / r.scale, dy = (e.clientY - r.py) / r.scale, H = state.current.present.metadata.height;
    let { x, y, width, height } = r;
    if (r.dir.includes("e")) width = r.width + dx;
    if (r.dir.includes("s")) height = r.height + dy;
    if (r.dir.includes("w")) width = r.width - dx;
    if (r.dir.includes("n")) height = r.height - dy;
    if (e.shiftKey && r.dir.length === 2) {
      const ratio = r.width / r.height;
      if (Math.abs(width / r.width) > Math.abs(height / r.height)) height = width / ratio; else width = height * ratio;
    }
    width = Math.max(80, width); height = Math.max(40, height);
    if (r.dir.includes("w")) x = r.x + r.width - width;
    if (r.dir.includes("n")) y = r.y + r.height - height;
    // Keep the element on the canvas.
    if (x < 0) { width += x; x = 0; }
    if (y < 0) { height += y; y = 0; }
    width = Math.max(80, Math.min(width, 1440 - x)); height = Math.max(40, Math.min(height, H - y));
    setResizing({ id: r.id, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
  }
  function endResize() {
    const r = resizing;
    resizeStart.current = null;
    setResizing(null);
    if (r && patch(r.id, { x: r.x, y: r.y, width: r.width, height: r.height })) report(`尺寸 ${r.width} × ${r.height}`);
  }
  // Format painter (size + animations), like a slide editor.
  const formatClip = useRef<NodeFormat | null>(null);
  const [brush, setBrush] = useState(false);
  function copyFormat() {
    const n = state.current.present.nodes.find((v) => v.id === (selected ?? selectedIds[0]));
    if (!n) { report("請先選取要複製格式的元件", true); return false; }
    formatClip.current = formatOf(n);
    report(`已複製格式：${Math.round(n.width)} × ${Math.round(n.height)}${n.effects.length ? `、${n.effects.length} 個動畫` : ""}`);
    return true;
  }
  function pasteFormat(ids: readonly string[]) {
    if (!formatClip.current) { report("還沒有複製格式，先選取元件按 Ctrl/⌘＋Shift＋C", true); return; }
    if (!ids.length) { report("請先選取要套用格式的元件", true); return; }
    try {
      const result = applyFormat(state.current.present, ids, formatClip.current);
      if (change(result.canvas)) report(`已套用格式到 ${ids.length} 個元件${result.skippedEffects ? `，${result.skippedEffects} 個動畫不適用此類型已略過` : ""}`);
    } catch { report("格式無法套用到這個元件", true); }
  }
  function copySelection(cut=false){
    const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(!ids.length)return;
    clipboard.current=encodeNodes(spec,ids);void navigator.clipboard?.writeText(clipboard.current).catch(()=>{});
    if(cut)remove();else report(`已複製 ${ids.length} 個元件`);
  }
  async function pasteSelection(){
    let value=clipboard.current;try{const text=await navigator.clipboard?.readText();if(text?.startsWith('Sketch2Site/CanvasNodes/v1:'))value=text;}catch{/* Internal clipboard remains available. */}
    const nodes=decodeNodes(value);if(!nodes.length)return;
    const copies=cloneNodes(nodes,24,24,state.current.present.metadata.height);const available=new Set([...state.current.present.nodes,...copies].map(n=>n.id).concat((state.current.present.metadata.pages??[]).map(p=>p.id)));copies.forEach(n=>{if(n.href?.startsWith('#')&&!available.has(n.href.slice(1)))n.href=null;if(state.current.present.metadata.pages&&currentPage)n.pageId=currentPage;else delete n.pageId;});if(change({...state.current.present,nodes:[...state.current.present.nodes,...copies]})){setPrimarySelected(copies[0].id);setSelectedIds(copies.map(n=>n.id));report(`已貼上 ${copies.length} 個元件，可還原`);}
  }
  function duplicate(){const ids=selectedIds.length?selectedIds:selected?[selected]:[];const copies=cloneNodes(spec.nodes.filter(n=>ids.includes(n.id)),24,24,spec.metadata.height);if(!copies.length)return;if(change({...spec,nodes:[...spec.nodes,...copies]})){setPrimarySelected(copies[0].id);setSelectedIds(copies.map(n=>n.id));}}
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        (e.target instanceof Element && Boolean(e.target.closest(".animation-library"))) ||
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
      } else if (mod && e.shiftKey && ["c", "v"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key.toLowerCase() === "c") copyFormat();
        else pasteFormat(selectedIds.length ? selectedIds : selected ? [selected] : []);
      } else if(mod&&['a','c','v','x','g'].includes(e.key.toLowerCase())){
        e.preventDefault();const k=e.key.toLowerCase();
        if(k==='a'){const current=state.current.present.nodes.filter(n=>onCurrentPage(n));setSelectedIds(current.map(n=>n.id));setPrimarySelected(current[0]?.id??null);report(`已選取 ${current.length} 個元件`);}
        if(k==='c')copySelection();if(k==='x')copySelection(true);if(k==='v')void pasteSelection();
        if(k==='g'){const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(ids.length>=2||e.shiftKey){change(groupSelection(spec,ids,e.shiftKey));report(e.shiftKey?'已取消群組，可還原':'已組成群組，可以一起移動');}}
      } else if (mod && !e.shiftKey && ["b", "i", "u"].includes(e.key.toLowerCase()) && textTargets().length) {
        e.preventDefault();
        const key = ({ b: "bold", i: "italic", u: "underline" } as const)[e.key.toLowerCase() as "b" | "i" | "u"];
        styleText({ [key]: textTargets().every((n) => n.textStyle?.[key]) ? undefined : true });
      } else if (mod && e.shiftKey && ["KeyL", "KeyE", "KeyR"].includes(e.code) && textTargets().length) {
        e.preventDefault();
        styleText({ align: ({ KeyL: "start", KeyE: "center", KeyR: "end" } as const)[e.code as "KeyL" | "KeyE" | "KeyR"] });
      } else if (mod && e.shiftKey && (e.code === "Period" || e.code === "Comma") && textTargets().length) {
        e.preventDefault();
        const first = textTargets()[0];
        styleText({ size: stepSize(first.textStyle?.size ?? defaultSize[first.type] ?? 18, e.code === "Period") });
      } else if (mod && (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "0")) {
        e.preventDefault();
        if (e.key === "0") setScale("fit");
        else {
          const i = zoomLevels.findIndex((z) => z >= scale - 0.001);
          setScale(e.key === "-" ? zoomLevels[Math.max(0, (i < 0 ? zoomLevels.length : i) - 1)] : zoomLevels[Math.min(zoomLevels.length - 1, (zoomLevels[i] > scale + 0.001 ? i : i + 1))]);
        }
      } else if (!mod && !e.altKey && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (!mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "t" && onCanvasFocus(e)) {
        e.preventDefault();
        add("text", 160, 160);
      } else if (e.key === "Tab" && !mod && onCanvasFocus(e)) {
        // Tab moves the selection through the elements on this page.
        const list = state.current.present.nodes.filter((n) => onCurrentPage(n));
        if (!list.length) return;
        e.preventDefault();
        const at = list.findIndex((n) => n.id === selected);
        const next = list[(at + (e.shiftKey ? list.length - 1 : 1) + (at < 0 && e.shiftKey ? 1 : 0)) % list.length];
        setSelected(next.id);
        document.querySelector<HTMLElement>(`[data-node-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
      } else if (mod && (e.code === "BracketRight" || e.code === "BracketLeft")) {
        e.preventDefault();
        layer(e.code === "BracketRight" ? (e.altKey ? "front" : "forward") : e.altKey ? "back" : "backward");
      } else if (e.altKey && e.shiftKey && e.code === "KeyL") {
        e.preventDefault();
        lock();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") {
        if (brush) { setBrush(false); report("已取消格式刷"); return; }
        setSelected(null);
        setPending(null);
      } else if (
        node &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step=e.shiftKey?10:1;
        const movable=(selectedIds.length?selectedIds:[node.id]).filter(id=>!spec.nodes.find(n=>n.id===id)?.locked);
        if(!movable.length){report('元件已鎖定，先解鎖才能移動',true);return;}
        change(translateSelection(spec,movable,e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0,e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !projectSwitch.reloading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function draftDropReason(n:CanvasNode,id:Effect) {
    return targetReason(n,id) ?? (n.effects.some(e=>e.presetId===id)?"已附加此動畫":combinationReason([...n.effects,{presetId:id}]));
  }
  function drop(e: React.DragEvent) {
    setDraftDragging(false);
    e.preventDefault();
    if (!ready || loadError) return;
    // A photo file dropped on a frame or image fills it; elsewhere it becomes a new image.
    const file = [...(e.dataTransfer.files ?? [])].find((f) => /^image\/(png|jpeg)$/.test(f.type));
    if (file) {
      const id = (e.target as HTMLElement).closest("[data-node-id]")?.getAttribute("data-node-id");
      const hit = spec.nodes.find((n) => n.id === id && n.type === "image");
      imageTarget.current = hit?.id ?? null;
      void importPicture(file);
      return;
    }
    try {
      const data = JSON.parse(e.dataTransfer.getData(dragType));
      if(data.value==="lift")data.value="hover-lift";
      if (data.type === "frame" && (frameIds as readonly string[]).includes(data.value)) {
        const rect = board.current!.getBoundingClientRect();
        addFrame(data.value as FrameId, { x: Math.max(0, (e.clientX - rect.left) / scale - 100), y: Math.max(0, (e.clientY - rect.top) / scale - 100) });
      } else if (data.type === "media" && ["video", "carousel", "flipbook"].includes(data.value)) {
        const rect = board.current!.getBoundingClientRect();
        addMedia(data.value as MediaKind, { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
      } else if (
        data.type === "component" &&
        data.value !== "media" &&
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
      report("這個拖不進來，請從左邊的素材再拖一次", true);
    }
  }
  function startEditing(n: CanvasNode) {
    if (!ready || loadError || disabled) return;
    if (n.locked) { report("元件已鎖定，在右側「位置」解鎖後才能修改"); return; }
    if (n.type === "image") {
      // Double-click a framed photo to adjust its crop; an empty frame asks for a photo.
      if (isPhoto(n)) {
        setPrimarySelected(n.id);
        setSelectedIds([n.id]);
        setCropping({ id: n.id, look: { ...(n.look ?? {}) } });
        report("拖曳照片調位置，用滾輪或滑桿縮放，按「完成」或 Enter 確定，Esc 取消");
        return;
      }
      imageTarget.current = n.id;
      imageInput.current?.click();
      return;
    }
    setPrimarySelected(n.id);
    setSelectedIds([n.id]);
    setEditing(n.id);
    setEditDraft(n.content);
    // Phones: text at "fit" size is a few pixels tall, so zoom to a readable size around it.
    if (phoneQuery()?.matches && scale < 0.5) {
      setScale(0.6);
      const id = n.id;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = canvasScroll.current, node = el?.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
        if (!el || !node) return;
        const v = el.getBoundingClientRect(), r = node.getBoundingClientRect();
        el.scrollLeft += r.left + r.width / 2 - (v.left + v.width / 2);
        el.scrollTop += r.top - v.top - 60;
      }));
    }
  }
  function stopEditing(commit: boolean) {
    const id = editing;
    setEditing(null);
    if (!commit || !id) return;
    const n = state.current.present.nodes.find((v) => v.id === id);
    if (!n || n.content === editDraft) return;
    const single = n.type === "heading" || n.type === "button";
    const value = single ? editDraft.replace(/\n+/g, " ").trim() : editDraft;
    if ((single || n.type === "form") && !value.trim()) {
      report(labels[n.type] + "不能是空白，已保留原文字", true);
      return;
    }
    const content = n.type === "button" ? value.slice(0, 120) : value.slice(0, 2000);
    const current = state.current.present;
    const typed = { ...current, nodes: current.nodes.map((v) => (v.id === id ? { ...v, content } : v)) };
    if (!change(withFittedText(typed, [id], { [id]: content })))
      report("內容無法套用，已保留原文字", true);
  }
  function begin(e: React.PointerEvent, n: CanvasNode) {
    if (e.button !== 0 || !ready || loadError || editing === n.id) return;
    e.stopPropagation();
    e.preventDefault();
    if (brush) {
      // Format brush: one click applies the copied format, then the brush turns off.
      e.stopPropagation(); setBrush(false); setSelected(n.id); pasteFormat([n.id]); return;
    }
    if(e.shiftKey){selectNode(n.id,true);return;}
    const groupIds=n.groupId?spec.nodes.filter(v=>v.groupId===n.groupId).map(v=>v.id):[n.id];
    // Like slide editors: the first press picks the whole group; once the group (or this one
    // element) is already selected, pressing it again picks and drags just this element.
    const alone=selectedIds.length===1&&selectedIds[0]===n.id;
    const groupAlready=groupIds.length>1&&groupIds.every(id=>selectedIds.includes(id))&&selectedIds.length===groupIds.length;
    const own=alone||groupAlready?[n.id]:groupIds;
    const multi=selectedIds.includes(n.id)&&selectedIds.some(id=>!own.includes(id))&&!groupAlready;
    let ids=multi?selectedIds:own;
    setPrimarySelected(n.id);setSelectedIds(ids);
    if(groupAlready)report('只選了這一個，可以單獨移動或修改');
    // Locked elements can be selected but not dragged.
    if(n.locked){report('元件已鎖定，在右側「位置」解鎖後才能移動');return;}
    ids=ids.filter(id=>!spec.nodes.find(v=>v.id===id)?.locked);
    let anchor=n;
    let copies:CanvasNode[]|undefined;
    // Alt + drag drags a copy, like in slide editors.
    if(e.altKey){
      const sources=spec.nodes.filter(v=>ids.includes(v.id));
      copies=cloneNodes(sources,0,0,spec.metadata.height);
      if(copies.length){
        anchor=copies[sources.findIndex(v=>v.id===n.id)]??copies[0];ids=copies.map(c=>c.id);
        report('放開滑鼠就會放下複製的元件');
      }else copies=undefined;
    }
    drag.current = { ids,node: anchor, copies, startX: e.clientX, startY: e.clientY, scale, collapseTo: e.altKey?undefined:multi?own:undefined };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const raw = {
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
            state.current.present.metadata.height - d.node.height,
            d.node.y + (e.clientY - d.startY) / d.scale,
          ),
        ),
      ),
    };
    // Over another frame with a photo-holding image: offer a swap instead of a move.
    const dragged = state.current.present.nodes.find((v) => v.id === d.node.id);
    if (dragged?.type === "image" && !d.copies && d.ids.length === 1) {
      const under = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest("[data-node-id]")?.getAttribute("data-node-id")).find((id) => id && id !== d.node.id);
      const target = state.current.present.nodes.find((v) => v.id === under);
      setSwapTarget(target?.type === "image" && target.look?.frame && !target.locked ? target.id : null);
    }
    if (e.altKey) {
      setGuides([]);
      setMoving(raw);
      return;
    }
    // Snap to the canvas and to other elements on this page.
    const others = state.current.present.nodes.filter((v) => !d.ids.includes(v.id) && onCurrentPage(v));
    const snap = snapBox(raw, others, { width: 1440, height: state.current.present.metadata.height }, 6 / d.scale);
    setGuides(snap.guides);
    setMoving({ ...raw, x: Math.round(Math.max(0, Math.min(1440 - raw.width, snap.x))), y: Math.round(Math.max(0, snap.y)) });
  }
  function finish() {
    if (swapTarget && drag.current && moving) {
      const a = spec.nodes.find((v) => v.id === drag.current!.node.id), b = spec.nodes.find((v) => v.id === swapTarget);
      setSwapTarget(null);
      if (a && b) {
        // Photos (and their crop) trade places; frames, sizes and positions stay.
        const crop = (n: CanvasNode) => ({ focusX: n.look?.focusX, focusY: n.look?.focusY, zoom: n.look?.zoom });
        const clean = (l: Record<string, unknown>) => Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined));
        const lookA = clean({ ...a.look, ...crop(b) }), lookB = clean({ ...b.look, ...crop(a) });
        const swapped = spec.nodes.map((n) =>
          n.id === a.id ? { ...n, assetId: b.assetId, content: b.content, ...(Object.keys(lookA).length ? { look: lookA } : {}) } :
          n.id === b.id ? { ...n, assetId: a.assetId, content: a.content, ...(Object.keys(lookB).length ? { look: lookB } : {}) } : n);
        if (change({ ...spec, nodes: swapped })) report("已交換兩個相框的照片，可還原");
      }
      drag.current = null;
      setMoving(null);
      setGuides([]);
      return;
    }
    setSwapTarget(null);
    const copies=drag.current?.copies;
    if(moving&&drag.current&&copies){
      if(change(translateSelection({...spec,nodes:[...spec.nodes,...copies]},drag.current.ids,moving.x-drag.current.node.x,moving.y-drag.current.node.y))){
        setPrimarySelected(drag.current.node.id);setSelectedIds(drag.current.ids);report(`已複製 ${copies.length} 個元件，可還原`);
      }
    }
    else if(moving&&drag.current)change(translateSelection(spec,drag.current.ids,moving.x-drag.current.node.x,moving.y-drag.current.node.y));
    else if(drag.current?.collapseTo)setSelectedIds(drag.current.collapseTo);
    drag.current = null;
    setMoving(null);
    setGuides([]);
  }
  const selectedNodes = spec.nodes.filter((n) => selectedIds.includes(n.id));
  const arrange = selectedNodes.length > 0 && (
    <ArrangePanel
      count={selectedNodes.length}
      locked={selectedNodes.every((n) => n.locked)}
      onLayer={layer}
      onAlign={align}
      onDistribute={spread}
      onLock={lock}
    />
  );
  const contentLabel: Record<string, string> = { heading: "標題文字", text: "文字", button: "按鈕上的字", card: "卡片內容（每行一段）", image: "圖片說明（看不到圖的人會聽到）", form: "表單欄位（每行一個）", media: "說明文字（看不到的人會聽到）" };
  const inspectorContent=(
node ? (
                  <>
                    <div className="insp-head">
                      <span className="component-icon"><WorkbenchIcon name={node.media ? node.media.kind : node.type} /></span>
                      <h2>{node.media ? mediaKindLabels[node.media.kind] : labels[node.type]}</h2>
                      <div className="insp-actions">
                        <button type="button" aria-label="複製元件" title="複製" onClick={duplicate}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h12v12H8zM4 16V4h12" /></svg></button>
                        <button type="button" aria-label="刪除元件" title="刪除" onClick={remove}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg></button>
                      </div>
                    </div>
                    {node.type === "image" && (
                      <InspectorSection id="photo" title="照片">
                      <FrameControls
                          look={node.look}
                          hasPhoto={isPhoto(node)}
                          onChange={(look) => patch(node.id, { look })}
                          onPickPhoto={() => { imageTarget.current = node.id; imageInput.current?.click(); }}
                          onClearPhoto={() => { patch(node.id, { assetId: localAssets[0], look: node.look ? { ...node.look, focusX: undefined, focusY: undefined, zoom: undefined } : undefined }); report("已清空相框，形狀保留"); }}
                          onCrop={() => setCropping({ id: node.id, look: { ...(node.look ?? {}) } })}
                          onSmartCrop={async () => {
                            const id = node.id, ref = node.assetId!;
                            try {
                              const f = await smartFocus(imageUrls[ref] || import.meta.env.BASE_URL + ref.slice(1));
                              const now = state.current.present.nodes.find((v) => v.id === id);
                              if (!now || now.assetId !== ref) return;
                              if (patch(id, { look: { ...now.look, ...f, zoom: Math.max(now.look?.zoom ?? 1, 1.15) } })) report("已對準照片重點，不滿意就雙擊照片自己調");
                            } catch {
                              report("這張照片無法自動分析，請雙擊手動調整", true);
                            }
                          }}
                        />
                      <label className="field insp-inline">
                        用哪張照片
                        <Select label="草稿圖片素材" value={node.assetId ?? "/assets/workspace.svg"} onChange={(v) => patch(node.id, { assetId: v })} options={[{ value: "/assets/workspace.svg", label: "示意圖" }, ...localImages.map((ref, index) => ({ value: ref, label: "我的照片 " + (index + 1) }))]} />
                      </label>
                      <p className="note">PNG 或 JPEG，每張最多 5 MB，也可以直接把照片拖到相框上</p>
                      </InspectorSection>
                    )}
                    {node.media && (
                      <InspectorSection id="media" title={mediaKindLabels[node.media.kind]}>
                        <MediaControls
                          media={node.media}
                          urlFor={(r) => imageUrls[r] || import.meta.env.BASE_URL + r.slice(1)}
                          library={localImages}
                          onImport={async (file) => {
                            try { return (await importImage(file)).ref; } catch (e) { report(assetErrorMessage(e), true); return null; }
                          }}
                          onChange={(media) => { if (patch(node.id, { media })) report("已更新" + mediaKindLabels[media.kind] + "，可還原"); }}
                        />
                      </InspectorSection>
                    )}
                    <InspectorSection id="content" title="內容">
                    <label className="field">
                      {contentLabel[node.type] ?? "內容"}
                      <textarea
                        aria-label="元素內容"
                        maxLength={node.type === "media" ? 200 : 2000}
                        value={node.content}
                        onChange={(e) =>
                          patch(node.id, { content: e.target.value })
                        }
                      />
                    </label>
                    {aiReady && !node.locked && ["heading", "text", "button", "card"].includes(node.type) && (
                      <CopySuggest
                        kind={node.type === "heading" ? "heading" : node.type === "button" ? "button" : "paragraph"}
                        text={node.content}
                        brief={spec.metadata.brief}
                        onPick={(value) => {
                          const current = state.current.present;
                          const typed = { ...current, nodes: current.nodes.map((v) => (v.id === node.id ? { ...v, content: value } : v)) };
                          if (change(withFittedText(typed, [node.id], { [node.id]: value }))) report("已換成 AI 建議的說法，不喜歡可以還原");
                        }}
                      />
                    )}
                    {node.type === "button" && (
                      <label className="field">
                        按鈕連結
                        <input
                          aria-label="按鈕連結"
                          placeholder="尚未設定連結"
                          value={linkDraft}
                          onChange={(e) => {setLinkDraft(e.target.value);setLinkError("");}}
                          onBlur={() => {
                            if (!patch(node.id, { href: linkDraft.trim() || null })) {
                              setLinkError("這個網址不能用，請貼 https:// 開頭的網址，或選頁面裡的位置");
                              report("連結尚未套用，請修正網址", true);
                            } else {setLinkError("");if(linkError)report("連結已更新，草稿尚未儲存");}
                          }}
                          aria-invalid={Boolean(linkError)}
                          aria-describedby={linkError?"draft-link-error":undefined}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                        {linkError && <small id="draft-link-error" role="alert">{linkError}</small>}
                        <small>可以貼 https:// 開頭的網址，或連到頁面裡的位置</small>
                      </label>
                    )}
                    {node.type === "button" && pagesList && (
                      <label className="field">
                        連到頁面
                        <Select
                          label="連到頁面"
                          value={pagesList.some((p) => "#" + p.id === node.href) ? node.href! : ""}
                          onChange={(v) => {
                            if (!v) return;
                            if (patch(node.id, { href: v })) { setLinkDraft(v); setLinkError(""); report("按鈕會切換到「" + pagesList.find((p) => "#" + p.id === v)?.name + "」"); }
                          }}
                          options={[{ value: "", label: "選擇網站中的頁面…" }, ...pagesList.map((p) => ({ value: "#" + p.id, label: p.name }))]}
                        />
                      </label>
                    )}
                    {node.type === "form" && (
                      <label className="field">
                        表單接收網址
                        <input
                          aria-label="表單接收網址"
                          placeholder="https://formspree.io/f/…"
                          value={linkDraft}
                          onChange={(e) => {setLinkDraft(e.target.value);setLinkError("");}}
                          onBlur={() => {
                            if (!patch(node.id, { href: linkDraft.trim() || null })) {
                              setLinkError("這個網址不能用，請貼 https:// 開頭的收件網址");
                              report("接收網址尚未套用，請修正", true);
                            } else {setLinkError("");if(linkError)report("接收網址已更新，草稿尚未儲存");}
                          }}
                          aria-invalid={Boolean(linkError)}
                          aria-describedby={linkError?"draft-form-error":undefined}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                        {linkError && <small id="draft-form-error" role="alert">{linkError}</small>}
                        <small>在 Formspree 等服務建立表單後，貼上它提供的網址，內容欄每行是一個欄位</small>
                      </label>
                    )}
                    </InspectorSection>
                    <InspectorSection id="size" title="位置與大小">
                    <div className="insp-size">
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
                    </InspectorSection>
                    <InspectorSection id="arrange" title="排列與對齊" defaultOpen={false}>
                      {arrange}
                    </InspectorSection>
                    <InspectorSection id="motion" title="動畫">
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
                      <p className="note">還沒有動畫</p>
                    )}
                    <button type="button" className="insp-add-motion" onClick={() => { setTab("animations"); setPanel(true); setMotionFull(false); }}>＋ 加入動畫</button>
                    </InspectorSection>
                  </>
                ) : selectedNodes.length ? (
                  <>
                    <div className="insp-head"><h2>已選 {selectedNodes.length} 個</h2></div>
                    <InspectorSection id="arrange-multi" title="排列與對齊">{arrange}</InspectorSection>
                  </>
                ) : (
                  <p className="note">
                    點一下畫布上的東西，就能在這裡改內容、位置和動畫
                  </p>
                )
  );
  const disabled = !ready || loadError;
  const dragBase=drag.current?.copies&&moving?{...spec,nodes:[...spec.nodes,...drag.current.copies]}:spec;
  const displayedNodesAll=resizing?spec.nodes.map(n=>n.id===resizing.id?{...n,...resizing}:n):moving&&drag.current?translateSelection(dragBase,drag.current.ids,moving.x-drag.current.node.x,moving.y-drag.current.node.y).nodes:spec.nodes;
  const displayedNodes=displayedNodesAll.filter(n=>onCurrentPage(n,spec));
  return (
    <>
      <header className={"topbar " + mode}>
        <button
          className="brand home-link"
          aria-label="Sketch2Site 首頁"
          aria-current={mode === "home" ? "page" : undefined}
          disabled={accepting}
          onClick={() => { setCandidate(null); setMotionFull(false); setMode("home"); }}
        >
          <span className="brand-mark" aria-hidden="true">S2</span>
          <span className="brand-name">Sketch2Site</span>
        </button>
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
              aria-label="草稿"
              aria-pressed={mode === "draft"&&!motionFull}
              disabled={accepting}
              onClick={() => {
                setCandidate(null);
                setMode("draft");setMotionFull(false);
              }}
            >
              <span className="neo-step">1.</span> 視覺畫布
            </button>
            <button aria-label="動畫素材庫" aria-pressed={mode==='draft'&&motionFull} disabled={accepting} onClick={()=>{setMode('draft');setMotionFull(true);setPanel(true);setTab('animations');}}><span className="neo-step">2.</span> 動畫素材庫</button>
            <button
              aria-label="預覽"
              aria-pressed={mode === "preview"}
              disabled={accepting}
              onClick={() => openPreview()}
            >
              <span className="neo-step">3.</span> 預覽
            </button>
          </div>
          {mode === "draft" && (
            <button
              className="primary topbar-generate"
              disabled={disabled || generating || !spec.nodes.length}
              aria-label={generating?"生成中…":"生成網站"}
              title={aiReady ? "生成時會把草稿的內容和版面傳給 OpenAI 排版" : "把草稿變成完整的網站"}
              onClick={() => void generate()}
            >
              <span aria-hidden="true">ϟ</span> {generating ? "生成中…" : "生成網站"}
            </button>
          )}
          {/* Secondary actions: inline on desktop, one swipeable row on phones. */}
          <div className="secondary-actions">
          {mode === "draft" && (
            <div className="layout-choice">
              <WorkbenchMenu label={(spec.metadata.layoutMode ?? "preserve") === "reflow" ? "智慧排版" : "保留草稿位置"}>
                {([["reflow", "智慧排版", "自動排成首屏、特色、價目表"], ["preserve", "保留草稿位置", "照你擺的位置排"]] as const).map(([value, name, hint]) => (
                  <button key={value} type="button" className="layout-option" aria-pressed={(spec.metadata.layoutMode ?? "preserve") === value} disabled={generating} onClick={(e) => { change({ ...spec, metadata: { ...spec.metadata, layoutMode: value } }); e.currentTarget.closest("details")?.removeAttribute("open"); }}>
                    <strong>{name}</strong><small>{hint}</small>
                  </button>
                ))}
              </WorkbenchMenu>
            </div>
          )}
          {mode === "draft" && (
            <button
              className={"describe-site brand-button" + (spec.metadata.brand ? " has-brief" : "")}
              aria-expanded={brandOpen}
              title="品牌色、字型和標誌，套用到整個網站"
              disabled={disabled || generating}
              onClick={() => { setNavOpen(false); setBriefOpen(false); setShortcutsOpen(false); setBrandOpen((v) => !v); }}
            >
              <span className="brand-dot" style={spec.metadata.brand?.primary ? { background: spec.metadata.brand.primary } : undefined} aria-hidden="true" />
              品牌
            </button>
          )}
          {mode === "draft" && (
            <button
              className={"describe-site" + (spec.metadata.brief ? " has-brief" : "")}
              aria-expanded={briefOpen}
              title={spec.metadata.brief ? briefSentence({ ...emptyBrief, ...spec.metadata.brief }) : "用幾個選項描述你想要的網站"}
              disabled={disabled || generating}
              onClick={() => { setNavOpen(false); setBrandOpen(false); setShortcutsOpen(false); setBriefOpen((v) => !v); }}
            >
              描述網站{spec.metadata.brief ? " ✓" : ""}
            </button>
          )}
          {mode === "draft" && (
            <>
              {isPhone && <span className="phone-history">
                <button type="button" aria-label="還原" title="還原" disabled={disabled || !history.past.length} onClick={() => setHistory(undo)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" /></svg></button>
                <button type="button" aria-label="重做" title="重做" disabled={disabled || !history.future.length} onClick={() => setHistory(redo)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" /></svg></button>
              </span>}
              <button
                disabled={busy || !ready || loadError}
                title={"儲存草稿（" + keyHint("S") + "）"}
                aria-label={busy?"儲存中…":"儲存草稿"}
                onClick={() => void save()}
              >
                {busy ? "儲存中…" : saved&&!dirty ? "已儲存" : <>儲存<span className="hide-phone">草稿</span></>}
              </button>
              <WorkbenchMenu label="編輯">
                <button disabled={!selectedIds.length} onClick={()=>copySelection()}><span>複製</span><kbd>{keyHint("C")}</kbd></button>
                <button disabled={!selectedIds.length} onClick={()=>copySelection(true)}><span>剪下</span><kbd>{keyHint("X")}</kbd></button>
                <button onClick={()=>void pasteSelection()}><span>貼上</span><kbd>{keyHint("V")}</kbd></button>
                <button onClick={()=>{setSelectedIds(spec.nodes.map(n=>n.id));setPrimarySelected(spec.nodes[0]?.id??null);}}><span>全選</span><kbd>{keyHint("A")}</kbd></button>
                <hr className="menu-divider" /><button disabled={selectedIds.length<2} onClick={()=>change(groupSelection(spec,selectedIds))}><span>群組</span><kbd>{keyHint("G")}</kbd></button><button disabled={!selectedIds.length} onClick={()=>change(groupSelection(spec,selectedIds,true))}><span>解組</span><kbd>{keyHint("G", true)}</kbd></button><hr className="menu-divider" />
                <button disabled={!selectedIds.length} onClick={()=>copyFormat()}><span>複製格式</span><kbd>{keyHint("C", true)}</kbd></button>
                <button disabled={!selectedIds.length} onClick={()=>pasteFormat(selectedIds)}><span>貼上格式</span><kbd>{keyHint("V", true)}</kbd></button><hr className="menu-divider" />
                
                <button disabled={!spec.nodes.length} onClick={()=>autoMotion()}>自動加上動態{selectedIds.length?"（選取的元件）":"（整頁）"}</button>
                <button disabled={!spec.nodes.some(n=>n.effects.length)} onClick={()=>autoMotion(true)}>移除動態{selectedIds.length?"（選取的元件）":"（整頁）"}</button>
              </WorkbenchMenu>

            </>
          )}
          </div>
        </div>
        <AccountButton />
      </header>
      <DesignedTooltips />
      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}
      {navOpen && mode === "draft" && (
        <NavPanel
          spec={spec}
          onClose={() => setNavOpen(false)}
          onChange={(nav) => {
            const { nav: _old, ...meta } = state.current.present.metadata;
            void _old;
            if (change({ ...state.current.present, metadata: nav ? { ...meta, nav } : meta })) report(nav ? "已更新導覽列，生成網站時會套用，可還原" : "導覽列已恢復預設，可還原");
          }}
        />
      )}
      {brandOpen && mode === "draft" && (
        <BrandPanel
          brand={spec.metadata.brand}
          logos={localImages}
          urlFor={(ref) => imageUrls[ref] || (ref.startsWith("/assets/local/") ? null : import.meta.env.BASE_URL + ref.slice(1))}
          onChange={(brand) => {
            const { brand: _old, ...meta } = state.current.present.metadata;
            void _old;
            if (change({ ...state.current.present, metadata: brand ? { ...meta, brand } : meta })) report("已更新品牌設定，生成網站時會套用，可還原");
          }}
          onImportLogo={async (file) => {
            try {
              return (await importImage(file)).ref;
            } catch (e) {
              report(assetErrorMessage(e), true);
              return null;
            }
          }}
          onClose={() => setBrandOpen(false)}
        />
      )}
      {briefOpen && mode === "draft" && (
        <BriefPanel
          initial={spec.metadata.brief}
          aiReady={aiReady}
          onClose={(brief) => { saveBrief(brief); setBriefOpen(false); }}
          onGenerate={(brief) => {
            setBriefOpen(false);
            if (!spec.nodes.length) { saveBrief(brief); report("先在畫布放一些內容，再生成網站", true); return; }
            saveBrief(brief);
            setPendingGenerate(true);
          }}
        />
      )}
      {generationError && (
        <p role="alert" className="generation-notice">
          {generationError}
        </p>
      )}
      {generating && (
        <p className="generation-notice" role="status">
          正在生成，可繼續編輯；變更草稿後需重新生成
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
      <div style={{"--neo-library-width":`${panelWidth}px`,"--neo-inspector-width":`${inspectorWidth}px`} as CSSProperties} className={'workspace neo-workspace'+(mode==='draft'&&motionFull?' neo-motion-full':'')}>{mode === "draft" && panel && !motionFull && <div className="panel-resizer-left" style={{ left: panelWidth - 5 }}><PanelResizer side="left" label="拖曳調整左側欄寬度" width={panelWidth} min={220} max={460} onChange={setPanelWidth} /></div>}
        <div
          className="preview-host"
          style={{
            display: mode === "preview" && !candidate ? "flex" : "none",
          }}
        >
          {siteOutdated(spec) && !generating && (
            <div className="site-update-bar" role="status">
              <span>草稿有新的變更，網站還沒更新</span>
              <button type="button" className="primary" onClick={() => void generate()}>更新網站</button>
              <small>你在網站上的修改會保留</small>
            </div>
          )}
          <Preview ref={previewRef} onSiteChange={syncFromSite} device={phoneView ? "mobile" : "desktop"} onDeviceChange={(d) => setPhoneView(d === "mobile")} />
        </div>
        {mode === "home" && (
          <HomePage
            draft={spec}
            savedState={!spec.nodes.length && !dirty ? "empty" : dirty ? "unsaved" : "saved"}
            motionCount={motionIds.length}
            demos={homeDemos}
            onOpenDraft={() => { setMotionFull(false); setMode("draft"); }}
            onOpenSite={() => setMode("preview")}
            onOpenLibrary={() => { setMode("draft"); setMotionFull(true); setPanel(true); setTab("animations"); }}
            onLoadDemo={(demo) => projectActions.create(demo)}
            projects={projects}
            actions={projectActions}
          />
        )}
        {mode === "preview" && candidate && (
          <CandidatePreview
            replacing={Boolean(spec.metadata.siteBuiltFrom)}
            mobile={phoneView}
            onMobile={setPhoneView}
            candidate={candidate.result}
            previewOnly={candidate.previewOnly}
            aiFallback={candidate.aiFallback}
            kept={overrideCount(spec.metadata.siteOverrides)}
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
                  <small>1440 × {dragHeight ?? spec.metadata.height}</small>{selectedIds.length>1&&<small className="selection-count">已選取 {selectedIds.length} 個 · {keyHint("G")} 群組</small>}
                </div>
                <div>
                  <button
                    className="tools-history"
                    disabled={disabled || !history.past.length}
                    onClick={() => setHistory(undo)}
                  >
                    還原
                  </button>
                  <button
                    className="tools-history"
                    disabled={disabled || !history.future.length}
                    onClick={() => setHistory(redo)}
                  >
                    重做
                  </button>
                  <label>
                    縮放{" "}
                    <Select
                      label="畫布縮放"
                      className="zoom-select"
                      value={String(zoom)}
                      onChange={(v) => setScale(v === "fit" ? "fit" : Number(v))}
                      options={[{ value: "fit", label: "符合寬度" }, ...(typeof zoom === "number" && ![0.4, 0.5, 0.6, 0.75, 1].includes(zoom) ? [{ value: String(zoom), label: Math.round(zoom * 100) + "%" }] : []), ...[0.4, 0.5, 0.6, 0.75, 1].map((z) => ({ value: String(z), label: z * 100 + "%" }))]}
                    />
                  </label>
                  
                  <button
                    className="format-brush"
                    aria-pressed={brush}
                    title="格式刷：複製選取元件的尺寸與動畫，再點一下要套用的元件（Esc 取消）"
                    onClick={() => {
                      if (brush) { setBrush(false); return; }
                      if (copyFormat()) { setBrush(true); report("格式刷已開啟：點一下要套用格式的元件"); }
                    }}
                  >
                    格式刷
                  </button>
                  <button
                    type="button"
                    className="see-phone"
                    disabled={disabled || generating || !spec.nodes.length}
                    onClick={() => { setPhoneView(true); openPreview(); }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
                    看手機版
                  </button>
                  <button
                    onClick={() => setPanel(!panel)}
                    aria-expanded={panel}
                  >
                    {panel ? "收合側欄" : "展開側欄"}
                  </button>
                </div>
              </div>
              <div ref={ttSlot} className={"text-toolbar-slot" + (ttPos ? " is-placed" : "") + (moving ? " is-moving" : "")} style={ttPos ? ({ "--tt-top": ttPos.top + "px", "--tt-left": ttPos.left + "px", "--tt-max": ttPos.max + "px" } as CSSProperties) : undefined}>{(() => {
                const targets = textTargets();
                // Floats over the canvas only while text is selected (or a photo is being cropped).
                if (cropping) return <div className="text-toolbar is-idle" role="note">拖曳移動照片、滾輪縮放，按「完成」套用</div>;
                if (!targets.length) return null;
                const first = targets[0];
                return (
                  <TextToolbar
                    style={first.textStyle ?? {}}
                    type={first.type}
                    count={targets.length}
                    themeColors={[...(spec.metadata.brand?.primary ? [spec.metadata.brand.primary] : []), ...(spec.metadata.brand?.colors ?? [])]}
                    onChange={(patch) => styleText(patch)}
                  />
                );
              })()}</div>
              <div className="page-tabs" role="tablist" aria-label="網站頁面">
                {(pagesList ?? [{ id: "single", name: "首頁" }]).map((p) => {
                  const active = (currentPage ?? "single") === p.id;
                  if (renamingPage?.id === p.id)
                    return (
                      <form key={p.id} className="page-tab-rename" onSubmit={(e) => { e.preventDefault(); renamePage(p.id, renamingPage.name); }}>
                        <input aria-label="頁面名稱" autoFocus maxLength={30} value={renamingPage.name} onChange={(e) => setRenamingPage({ id: p.id, name: e.target.value })} onBlur={() => renamePage(p.id, renamingPage.name)} onKeyDown={(e) => { if (e.key === "Escape") setRenamingPage(null); }} />
                      </form>
                    );
                  return (
                    <span key={p.id} className={"page-tab" + (active ? " active" : "")}>
                      <button role="tab" aria-selected={active} title={pagesList ? "雙擊改名" : "新增頁面後即可改名"} onClick={() => { if (pagesList) { setActivePage(p.id); setSelected(null); setDeletingPage(null); } }} onDoubleClick={() => pagesList && setRenamingPage({ id: p.id, name: p.name })}>
                        {p.name}
                      </button>
                      {pagesList && pagesList.length > 1 && active && (deletingPage === p.id ? (
                        <span className="page-tab-confirm">
                          <button className="danger" onClick={() => removePage(p.id)}>刪除此頁</button>
                          <button onClick={() => setDeletingPage(null)}>取消</button>
                        </span>
                      ) : (
                        <button className="page-tab-close" aria-label={"刪除頁面：" + p.name} onClick={() => setDeletingPage(p.id)}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
                      ))}
                    </span>
                  );
                })}
                <button className="page-tab-add" onClick={addPage} disabled={(pagesList?.length ?? 1) >= 10}>＋ 新增頁面</button>
                <button type="button" className={"page-nav-settings" + (spec.metadata.nav ? " is-set" : "")} aria-haspopup="dialog" aria-expanded={navOpen} title="網站選單的樣式和項目" disabled={disabled || generating} onClick={() => { setBrandOpen(false); setBriefOpen(false); setShortcutsOpen(false); setNavOpen((v) => !v); }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13" /></svg>
                  導覽列
                </button>
              </div>
              <div
                ref={canvasScroll}
                className="canvas-scroll"
                style={{ "--draft-scale": scale } as React.CSSProperties}
                onPointerDown={(e) => {
                  // Pressing the empty area around the page clears the selection (and the floating toolbar).
                  const t = e.target as HTMLElement;
                  if (!e.shiftKey && (t === e.currentTarget || t.classList.contains("canvas-wrap"))) { setSelected(null); setEditing(null); if (phoneQuery()?.matches) setPanel(false); }
                }}
              >
                {draftEffect && <span className="draft-drop-hint" role="status">{draftHover && spec.nodes.find(n=>n.id===draftHover) ? (draftDropReason(spec.nodes.find(n=>n.id===draftHover)!,draftEffect) ?? "放開以附加動畫") : "拖到有綠框的東西上就能加動畫"}</span>}
                <div
                  className="canvas-wrap"
                  style={{ width: 1440 * scale, height: (dragHeight ?? spec.metadata.height) * scale }}
                >
                  <span className="page-frame-label" aria-hidden="true">網頁範圍</span>
                  <div
                    className={"page-height-handle" + (dragHeight !== null ? " is-dragging" : "")}
                    role="slider"
                    tabIndex={0}
                    aria-label="網頁高度"
                    aria-valuemin={1200}
                    aria-valuemax={canvasMaxHeight}
                    aria-valuenow={dragHeight ?? spec.metadata.height}
                    aria-valuetext={(dragHeight ?? spec.metadata.height) + " 像素"}
                    title="往下拖拉長網頁，往上拖縮短"
                    onPointerDown={(e) => {
                      if (disabled) return;
                      e.preventDefault(); e.stopPropagation();
                      const el = e.currentTarget, startY = e.clientY, startH = spec.metadata.height;
                      el.setPointerCapture(e.pointerId);
                      let last = startH;
                      const move = (ev: PointerEvent) => { last = clampPageHeight(startH + (ev.clientY - startY) / scale); setDragHeight(last); };
                      const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); setDragHeight(null); setPageHeight(last); };
                      el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
                    }}
                    onKeyDown={(e) => {
                      const step = e.shiftKey ? 400 : 100;
                      if (e.key === "ArrowDown") { e.preventDefault(); setPageHeight(spec.metadata.height + step); }
                      else if (e.key === "ArrowUp") { e.preventDefault(); setPageHeight(spec.metadata.height - step); }
                    }}
                  >
                    <span aria-hidden="true" />
                    {dragHeight !== null && <b>高度 {dragHeight}</b>}
                  </div>
                  <div
                    ref={board}
                    className={"canvas" + (brush ? " brush-active" : "") + (scale < 0.45 ? " is-tiny" : "")}
                    data-testid="canvas"
                    aria-label="草稿畫布"
                    style={{
                      width: 1440,
                      height: dragHeight ?? spec.metadata.height,
                      transform: "scale(" + scale + ")",
                      "--s": scale,
                    } as CSSProperties}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const id=(e.target as HTMLElement).closest('[data-node-id]')?.getAttribute('data-node-id')??null;
                      setDraftHover(id);
                      if(draftEffect){const target=spec.nodes.find(n=>n.id===id);e.dataTransfer.dropEffect=target&&draftDropReason(target,draftEffect)?'none':'copy';}
                    }}
                    onDrop={drop}
                    onPointerDown={(e) => {
                      if (e.target !== e.currentTarget || e.button !== 0) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
                      if (!e.shiftKey) setSelected(null);
                      setMarquee({ x0: x, y0: y, x1: x, y1: y, additive: e.shiftKey });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!marquee) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      setMarquee({ ...marquee, x1: (e.clientX - r.left) / scale, y1: (e.clientY - r.top) / scale });
                    }}
                    onPointerUp={() => {
                      if (!marquee) return;
                      const left = Math.min(marquee.x0, marquee.x1), right = Math.max(marquee.x0, marquee.x1), top = Math.min(marquee.y0, marquee.y1), bottom = Math.max(marquee.y0, marquee.y1);
                      setMarquee(null);
                      if (right - left < 4 && bottom - top < 4) return;
                      // Anything the box touches is selected, with its whole group.
                      const hit = spec.nodes.filter((n) => onCurrentPage(n, spec) && n.x < right && n.x + n.width > left && n.y < bottom && n.y + n.height > top);
                      const groups = new Set(hit.map((n) => n.groupId).filter(Boolean));
                      const ids = spec.nodes.filter((n) => hit.includes(n) || (n.groupId && groups.has(n.groupId))).map((n) => n.id);
                      if (!ids.length) return;
                      setSelectedIds((prev) => (marquee.additive ? [...new Set([...prev, ...ids])] : ids));
                      setPrimarySelected(ids[0]);
                      report(ids.length > 1 ? `已選取 ${ids.length} 個元件，按 Ctrl/⌘＋G 建立群組` : "已選取 1 個元件");
                    }}
                    onPointerCancel={() => setMarquee(null)}
                  >
                    {guides.map((g, i) => (
                      <div
                        key={i}
                        className={"smart-guide " + g.axis}
                        aria-hidden="true"
                        style={g.axis === "v" ? { left: g.pos, top: g.from, height: g.to - g.from } : { top: g.pos, left: g.from, width: g.to - g.from }}
                      />
                    ))}
                    {marquee && (
                      <div
                        className="canvas-marquee"
                        aria-hidden="true"
                        style={{ left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1), width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }}
                      />
                    )}
                    {!displayedNodes.length && (
                      <div className="empty empty-start" style={{ "--s": scale } as CSSProperties} onPointerDown={(e) => e.stopPropagation()}>
                        <h2>從一個想法開始</h2>
                        <p>選一個開始，之後都可以改：</p>
                        <div className="empty-actions">
                          <button type="button" disabled={disabled} onClick={() => addBlock("hero")}>
                            <span className="kao" aria-hidden="true">(・ω・)ノ</span>加一段開場介紹
                          </button>
                          <button type="button" disabled={disabled} onClick={() => addBlock("collage")}>
                            <span className="kao" aria-hidden="true">[◉¯]</span>放幾張照片
                          </button>
                          <button type="button" disabled={disabled} onClick={() => { setBrandOpen(false); setNavOpen(false); setBriefOpen(true); }}>
                            <span className="kao" aria-hidden="true">( ˘▽˘)っ</span>告訴我想做什麼網站
                          </button>
                          <button type="button" onClick={() => setMode("home")}>
                            <span className="kao" aria-hidden="true">٩(ˊᗜˋ)و</span>從範本開始
                          </button>
                        </div>
                        <small>也可以從左邊把東西拖進來</small>
                      </div>
                    )}
                    {displayedNodes.map((n) => {
                      return (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          aria-label={labels[n.type] + "：" + n.content}
                          aria-pressed={selectedIds.includes(n.id)}
                          data-node-id={n.id}
                          data-group-id={n.groupId}
                          data-draft-drop={draftEffect ? (draftDropReason(n,draftEffect) ? (draftHover===n.id?'invalid':undefined) : 'available') : undefined}
                          data-testid="canvas-node"
                          data-swap-target={swapTarget === n.id ? "" : undefined}
                          className={
                            "node " +
                            n.type +
                            (selectedIds.includes(n.id) ? " selected" : "")
                          }
                          style={{
                            left: n.x,
                            top: n.y,
                            width: n.width,
                            height: n.height,
                            ...textCss(n.textStyle, false),
                          }}
                          onFocus={() => {if(!selectedIds.includes(n.id))selectNode(n.id);}}
                          onDoubleClick={(e) => { e.stopPropagation(); startEditing(n); }}

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
                          {cropping?.id === n.id && (
                            <div
                              className="crop-overlay"
                              role="group"
                              aria-label="調整照片裁切"
                              tabIndex={-1}
                              ref={(el) => el?.focus({ preventScroll: true })}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                if (e.button !== 0) return;
                                const r = e.currentTarget.getBoundingClientRect();
                                cropDrag.current = { x: e.clientX, y: e.clientY, fx: cropping.look.focusX ?? 50, fy: cropping.look.focusY ?? 50, w: r.width, h: r.height };
                                e.currentTarget.setPointerCapture(e.pointerId);
                              }}
                              onPointerMove={(e) => {
                                const d = cropDrag.current;
                                if (!d) return;
                                const z = cropping.look.zoom ?? 1;
                                // Dragging right reveals more of the left side, like moving the photo itself.
                                const fx = Math.min(100, Math.max(0, d.fx - ((e.clientX - d.x) / d.w) * 100 / z));
                                const fy = Math.min(100, Math.max(0, d.fy - ((e.clientY - d.y) / d.h) * 100 / z));
                                setCropping({ id: n.id, look: { ...cropping.look, focusX: Math.round(fx * 10) / 10, focusY: Math.round(fy * 10) / 10 } });
                              }}
                              onPointerUp={() => (cropDrag.current = null)}
                              onDoubleClick={(e) => { e.stopPropagation(); finishCrop(true); }}
                              onWheel={(e) => {
                                const z = Math.min(4, Math.max(1, (cropping.look.zoom ?? 1) - e.deltaY * 0.0015));
                                setCropping({ id: n.id, look: { ...cropping.look, zoom: Math.round(z * 100) / 100 } });
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                const step = e.shiftKey ? 10 : 2, l = cropping.look;
                                if (e.key === "Escape") finishCrop(false);
                                else if (e.key === "Enter") finishCrop(true);
                                else if (e.key.startsWith("Arrow")) {
                                  e.preventDefault();
                                  const fx = Math.min(100, Math.max(0, (l.focusX ?? 50) + (e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0)));
                                  const fy = Math.min(100, Math.max(0, (l.focusY ?? 50) + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0)));
                                  setCropping({ id: n.id, look: { ...l, focusX: fx, focusY: fy } });
                                }
                              }}
                            >
                              <div className="crop-bar" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                                <label>
                                  縮放
                                  <input type="range" aria-label="照片縮放" min={1} max={4} step={0.05} value={cropping.look.zoom ?? 1} onChange={(e) => setCropping({ id: n.id, look: { ...cropping.look, zoom: Number(e.target.value) } })} />
                                </label>
                                <button type="button" onClick={() => setCropping({ id: n.id, look: { ...cropping.look, focusX: undefined, focusY: undefined, zoom: undefined } })}>置中</button>
                                <button type="button" onClick={() => finishCrop(false)}>取消</button>
                                <button type="button" className="primary" onClick={() => finishCrop(true)}>完成</button>
                              </div>
                            </div>
                          )}
                          {selected === n.id && selectedIds.length === 1 && editing !== n.id && !brush && cropping?.id !== n.id && !n.locked &&
                            (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const).map((dir) => (
                              <span
                                key={dir}
                                className={"resize-handle h-" + dir}
                                aria-hidden="true"
                                onPointerDown={(e) => {
                                  if (e.button !== 0) return;
                                  e.stopPropagation();
                                  e.preventDefault();
                                  resizeStart.current = { id: n.id, dir, px: e.clientX, py: e.clientY, x: n.x, y: n.y, width: n.width, height: n.height, scale };
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                }}
                                onPointerMove={resizeTo}
                                onPointerUp={endResize}
                                onPointerCancel={() => { resizeStart.current = null; setResizing(null); }}
                              />
                            ))}
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
                                ? "找不到本機圖片，請重新匯入"
                                : "正在載入圖片…"}
                            </span>
                          ) : n.type === "image" && (n.assetId === localAssets[0] || brokenImages.has(n.id + n.assetId)) ? (
                            // The built-in sample (and any image that fails to load) shows as an empty frame to fill.
                            framed(n, <span className="image-placeholder" role="img" aria-label={n.content + "（尚未放入圖片）"}>
                              <WorkbenchIcon name="image" />
                              <strong>{n.content}</strong>
                              <small>{n.look?.frame ? "拖入照片或雙擊選擇" : "雙擊替換圖片"}</small>
                            </span>)
                          ) : n.type === "image" ? (
                            framed(n, <img
                              src={imageUrls[n.assetId!] || import.meta.env.BASE_URL + n.assetId!.slice(1)}
                              loading="lazy"
                              decoding="async"
                              alt={n.content}
                              draggable={false}
                              onError={() => setBrokenImages((prev) => new Set(prev).add(n.id + n.assetId))}
                            />)
                          ) : editing === n.id ? (
                            <textarea
                              className="inline-editor"
                              aria-label={"編輯" + labels[n.type] + "文字"}
                              autoFocus
                              value={editDraft}
                              maxLength={n.type === "button" ? 120 : 2000}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              onBlur={() => { stopEditing(!editCancelled.current); editCancelled.current = false; }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Escape") { e.preventDefault(); editCancelled.current = true; (e.currentTarget.parentElement as HTMLElement)?.focus(); }
                                if ((e.ctrlKey || e.metaKey) && ["b", "i", "u"].includes(e.key.toLowerCase())) {
                                  e.preventDefault();
                                  const key = ({ b: "bold", i: "italic", u: "underline" } as const)[e.key.toLowerCase() as "b" | "i" | "u"];
                                  styleText({ [key]: n.textStyle?.[key] ? undefined : true }, [n.id]);
                                  return;
                                }
                                // Headings and buttons are one line: Enter saves. Longer text: Ctrl/Cmd+Enter saves.
                                else if (e.key === "Enter" && !e.nativeEvent.isComposing && ((n.type === "heading" || n.type === "button") ? !e.shiftKey : e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.blur(); }
                              }}
                            />
                          ) : n.type === "media" && n.media ? (
                            <span className="media-sketch">
                              <MediaView media={n.media} caption={n.content} still={n.media.kind !== "character"} resolve={(r) => imageUrls[r] || import.meta.env.BASE_URL + r.slice(1)} />
                            </span>
                          ) : n.type === "form" ? (
                            <span className="form-sketch">
                              {n.content.split("\n").map((field, i) => (
                                <span key={i}><small>{field}</small><i /></span>
                              ))}
                              <b>送出</b>
                            </span>
                          ) : n.textStyle?.highlight ? (
                            <span className="text-mark">{n.content}</span>
                          ) : (
                            n.content
                          )}
                          {n.locked && <span className="lock-badge" title="已鎖定" aria-label="已鎖定"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" /></svg></span>}
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
                  <h2>{motionFull?'動態素材庫':'圖元素材'}</h2>
                  <button
                    className="draft-panel-close sheet-close"
                    aria-label="關閉草稿工具"
                    onClick={() => setPanel(false)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
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
                    onClick={() => {setTab("library");setMotionFull(false);}}
                  >
                    元件
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "animations"}
                    tabIndex={tab === "animations" ? 0 : -1}
                    onClick={() => {setTab("animations");setMotionFull(false);}}
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
                {imageFeedback && <p className="image-feedback" role={imageError?"alert":undefined}>{imageFeedback}</p>}
                {pending && (
                  <div className="pending">
                    <strong>{effects[pending]} · 選擇附加對象</strong>
                    <Select
                      label="動畫附加對象"
                      value={target}
                      onChange={setTarget}
                      options={[{ value: "", label: "選擇元件" }, ...spec.nodes.map((n) => ({ value: n.id, label: labels[n.type] + " · " + n.content.slice(0, 20) }))]}
                    />
                    {Object.values(motionCatalog[pending].controls).some(c=>c.required)&&<MotionControlsFields id={pending} values={pendingControls} onChange={setPendingControls}/>}
                    <button
                      disabled={!target}
                      onClick={() => attach(pending, target, Object.values(motionCatalog[pending].controls).some(c=>c.required)?pendingControls:undefined)}
                    >
                      加上動畫
                    </button>{" "}
                    <button onClick={() => setPending(null)}>取消</button>
                  </div>
                )}
                {(tab === "library" || tab === "animations" || tab === "properties") && (
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
                {tab !== "animations" ? (
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
                          找不到符合的元件或動畫，請換個關鍵字
                        </p>
                      )}
                    <div className="library">
                      <p className="library-intro">
                        拖曳到畫布，或點一下新增
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
                      <div className="frame-library" role="group" aria-label="相框">
                        <p className="library-subhead">相框</p>
                        {frameIds
                          .filter((f) => !search || frameLabels[f].includes(search) || "相框".includes(search))
                          .map((f) => (
                            <button
                              key={f}
                              type="button"
                              disabled={disabled}
                              draggable={!disabled}
                              aria-label={"新增相框：" + frameLabels[f]}
                              title={"新增相框：" + frameLabels[f]}
                              onDragStart={(e) => e.dataTransfer.setData(dragType, JSON.stringify({ type: "frame", value: f }))}
                              onClick={() => addFrame(f)}
                            >
                              <FrameThumb frame={f} />
                              <small>{frameLabels[f]}</small>
                            </button>
                          ))}
                      </div>
                      <div className="block-templates" role="group" aria-label="區塊範本">
                        <p className="library-subhead">區塊範本</p>
                        {blockTemplateIds
                          .filter((id) => blockTemplateInfo(id).label.includes(search))
                          .map((id) => (
                            <button
                              key={id}
                              className={"block-template block-template-" + id}
                              disabled={disabled}
                              aria-label={"新增區塊：" + blockTemplateInfo(id).label}
                              onClick={() => addBlock(id)}
                            >
                              <span className="block-thumb" aria-hidden="true"><i /><i /><i /><i /></span>
                              <span>
                                <strong>{blockTemplateInfo(id).label}</strong>
                                <small>{blockTemplateInfo(id).hint}</small>
                              </span>
                            </button>
                          ))}
                        <p className="library-subhead">單一元件</p>
                      </div>
                      {(Object.keys(labels) as CanvasNode["type"][])
                        .filter(
                          (t) =>
                            t !== "media" && (labels[t].includes(search) ||
                            t.includes(search.toLowerCase())),
                        )
                        .map((t) => (
                          <button
                            key={t}
                            draggable={!disabled}
                            disabled={disabled || spec.nodes.length >= 100}
                            onDragEnd={() => {setDraftDragging(false);setDraftEffect(null);setDraftHover(null);}}
                            onDragStart={(e) => {
                              setTimeout(() => setDraftDragging(true), 0);
                              e.dataTransfer.setData(
                                dragType,
                                JSON.stringify({ type: "component", value: t }),
                              );
                            }}
                            onClick={() => {
                              // Clicked elements go below existing content instead of piling up.
                              const bottom = spec.nodes.filter((n) => onCurrentPage(n, spec)).reduce((m, n) => Math.max(m, n.y + n.height), 0);
                              const y = bottom ? bottom + 24 : 80;
                              const probe = createNode(t, 80, 0, canvasMaxHeight);
                              const needed = y + probe.height;
                              if (needed > spec.metadata.height && needed <= canvasMaxHeight) {
                                const height = Math.ceil(needed / 600) * 600;
                                const next = withPage(createNode(t, 80, y, height));
                                if (change({ ...spec, metadata: { ...spec.metadata, height }, nodes: [...spec.nodes, next] })) { setSelected(next.id); report("已新增" + labels[t]); }
                              } else add(t, 80, needed > spec.metadata.height ? 80 : y);
                            }}
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
                                    form: "收集訪客留言",
                                    media: "",
                                  }[t]
                                }
                              </small>
                            </span>
                            <WorkbenchIcon name="grip" />
                          </button>
                        ))}
                      {mediaKinds.some((k) => mediaKindLabels[k].includes(search)) && <p className="library-subhead media-subhead">媒體與互動</p>}
                      {mediaKinds.filter((k) => mediaKindLabels[k].includes(search)).map((k) => {
                        // Characters and 3D objects are still being built: shown, but greyed out and not usable yet.
                        const soon = k === "character" || k === "object3d";
                        return (
                        <button
                          key={k}
                          className={soon ? "is-coming" : undefined}
                          draggable={!disabled && !soon}
                          disabled={soon || disabled || spec.nodes.length >= 100}
                          aria-label={soon ? mediaKindLabels[k] + "（開發中）" : "新增" + mediaKindLabels[k]}
                          onDragEnd={() => { setDraftDragging(false); }}
                          onDragStart={(e) => { if (soon) { e.preventDefault(); return; } setTimeout(() => setDraftDragging(true), 0); e.dataTransfer.setData(dragType, JSON.stringify({ type: "media", value: k })); }}
                          onClick={() => { if (!soon) addMedia(k); }}
                        >
                          <span className="glyph" aria-hidden="true"><WorkbenchIcon name={k} /></span>
                          <span>
                            <strong>{mediaKindLabels[k]}</strong>
                            <small>{{ video: "貼上 YouTube／Vimeo 網址", carousel: "多張照片左右滑動", flipbook: "照片當書頁，點一下翻頁", character: "會動的小角色", object3d: "可拖曳轉動的立體相簿" }[k]}</small>
                          </span>
                          {soon ? <span className="coming-badge" aria-hidden="true">開發中</span> : <WorkbenchIcon name="grip" />}
                        </button>
                        );
                      })}
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
                        ? "已經加過這個動畫了"
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
                    onDragEnd={() => {setDraftDragging(false);setDraftEffect(null);setDraftHover(null);}}
                    onDragStart={(id, data) => {
                      setMotionFull(false);
                      setTimeout(() => setDraftDragging(true), 0);
                      setDraftEffect(id);
                      data.setData(
                        dragType,
                        JSON.stringify({
                          type: "effect",
                          value: id,
                        }),
                      );
                    }}
                  />
                ) : null}
              </aside>
            )}
            {panel&&<aside className="neo-inspector" data-active={tab==='properties'} aria-label="物件檢查器"><PanelResizer side="right" label="拖曳調整右側欄寬度" width={inspectorWidth} min={260} max={480} onChange={setInspectorWidth} /><div className="neo-inspector-head"><span>物件檢查器</span><span className="sheet-actions"><button type="button" className="sheet-switch" onClick={()=>setTab("library")}>元件素材</button><button type="button" className="sheet-close" aria-label="收起面板" onClick={()=>setPanel(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button></span></div><div className="neo-inspector-body">{inspectorContent}</div></aside>}
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
            <button type="button" className="footer-shortcuts" aria-haspopup="dialog" onClick={() => { setNavOpen(false); setBrandOpen(false); setBriefOpen(false); setShortcutsOpen(true); }}>快捷鍵</button>
          )}
        </footer>
      )}
    </>
  );
}
