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
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  blank,
  canvasMaxHeight,
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
import HomePage from "./HomePage";
import { listProjects, openProject, createProject, renameProject, duplicateProject, deleteProject, projectSwitch, type ProjectSummary } from "./projects";
import type { PageSpec } from "./pageSpec";
import { localAssets } from "./pageSpec";
import { blockTemplateIds, blockTemplateInfo, createBlock, type BlockTemplateId } from "./blockTemplates";
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
  form: "表單",
};
const effects = Object.fromEntries(motionIds.map(id=>[id,motionCatalog[id].nameEn])) as Record<MotionId,string>;
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
  const [message, setMessage] = useState("正在讀取本機草稿…"),
    [error, setError] = useState(false);
  const [saved, setSaved] = useState(""),
    [zoom, setScale] = useState<number | "fit">("fit"),
    [fitScale, setFitScale] = useState(0.6),
    canvasScroll = useRef<HTMLDivElement>(null),
    [tab, setTab] = useState("library"),
    [search, setSearch] = useState("");
  const [panel, setPanel] = useState(() => window.innerWidth > 1000),
    [panelWidth, setPanelWidth] = useState(304);
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
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    node: CanvasNode;
    ids:string[];
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
  async function generate(demo = false, previewOnly = false) {
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
      let usedLocal = demo;
      let result;
      if (demo) result = createDemoCandidate(spec);
      else
        try {
          result = await requestGeneration(spec, controller.signal);
        } catch (e) {
          // Without a configured or reachable AI service, use the labelled local
          // layout instead of a dead end. Other failures still surface as errors.
          if (!(e instanceof GenerationError) || !["NOT_CONFIGURED", "UNAVAILABLE"].includes(e.code)) throw e;
          result = createDemoCandidate(spec);
          usedLocal = true;
        }
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
          ? usedLocal && !demo
            ? "AI 尚未設定，已改用本機智慧排版（未呼叫 AI）。"
            : "智慧排版完成，未呼叫 AI。"
          : "草稿已送至 OpenAI，候選尚未儲存。",
      );
      setCandidate({ result, canvasVersion: version, target, previewOnly, aiFallback: usedLocal && !demo });
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
  async function acceptCandidate(page: PageSpec = candidate!.result.page) {
    if (!candidate || candidate.canvasVersion !== canvasVersion.current) return;
    setAccepting(true);
    setGenerationError("");
    try {
      const result = await previewRef.current!.accept(
        page,
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
    setImageFeedback("正在處理圖片…");setImageError(false);
    const originalVersion = canvasVersion.current;
    const id = imageTarget.current,
      previous = id
        ? state.current.present.nodes.find((n) => n.id === id)
        : undefined;
    try {
      const asset = await importImage(file);
      if (canvasVersion.current !== originalVersion) {
        setImageFeedback("草稿已變更，圖片保留於本機素材，請重新選取。");setImageError(true);
        report("草稿已變更，圖片保留於本機素材，請重新選取。", true);
        return;
      }
      if (id) {
        const now = state.current.present.nodes.find((n) => n.id === id);
        if (!now || now.assetId !== previous?.assetId) {
          setImageFeedback("圖片已存於本機，但原元素已變更，請重新選取素材。");setImageError(true);
          report("圖片已存於本機，但原元素已變更，請重新選取素材。", true);
          return;
        }
        if(!patch(id, { assetId: asset.ref }))throw new Error("image patch rejected");
        setSelected(id);
      } else {
        if (state.current.present.nodes.length >= 100) {
          setImageFeedback("草稿已達元素上限，圖片保留於本機素材。");setImageError(true);
          report("草稿已達元素上限，圖片保留於本機素材。", true);
          return;
        }
        let position={x:80,y:80};
        outer:for(let y=80;y<=1000;y+=220)for(let x=80;x<=1120;x+=320){
          if(state.current.present.nodes.every(n=>x+280<=n.x||x>=n.x+n.width||y+180<=n.y||y>=n.y+n.height)){position={x,y};break outer;}
        }
        const next = {
          ...createNode("image", position.x, position.y),
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
      setImageFeedback("圖片已匯入，僅存於本機。");
      report("圖片已匯入，僅存於本機。");
      requestAnimationFrame(()=>{const selectedId=id??state.current.present.nodes.at(-1)?.id;if(selectedId)board.current?.querySelector<HTMLElement>('[data-node-id="'+selectedId+'"]')?.scrollIntoView({block:'nearest',inline:'nearest'});});
    } catch (e) {
      setImageFeedback(assetErrorMessage(e));setImageError(true);
      report(assetErrorMessage(e), true);
      requestAnimationFrame(()=>document.querySelector('.image-feedback')?.scrollIntoView({block:'nearest'}));
    } finally {
      setImportingImage(false);
    }
  }
  function add(type: CanvasNode["type"], x = 80, y = 80) {
    if (!ready || loadError) return;
    const next = createNode(type, x, y, spec.metadata.height);
    change({ ...spec, nodes: [...spec.nodes, next] });
    setSelected(next.id);
    report("已新增" + labels[type]);
  }
  // ---- Projects (home workspace) ----
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const refreshProjects = async () => {
    try { setProjects(await listProjects()); } catch { setProjects([]); report("無法讀取專案清單，請重新整理。", true); }
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
      report(e instanceof Error ? e.message : "專案操作失敗，目前草稿已保留。", true);
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
      } catch (e) { report(e instanceof Error ? e.message : "改名失敗。", true); }
    },
    duplicate: async (id: string) => {
      try {
        if (dirty && projects?.find((p) => p.id === id)?.active) await save();
        await duplicateProject(id);
        await refreshProjects();
        report("已建立副本。");
      } catch (e) { report(e instanceof Error ? e.message : "複製失敗。", true); }
    },
    remove: async (id: string) => {
      try {
        const wasActive = await deleteProject(id);
        if (wasActive) { projectSwitch.reloading = true; location.reload(); return; }
        await refreshProjects();
        report("已刪除專案。");
      } catch (e) { report(e instanceof Error ? e.message : "刪除失敗。", true); }
    },
  };
  function loadDemo(fixture: CanvasSpec) {
    if (dirty && !window.confirm("載入示範會取代目前草稿，可使用還原復原。是否繼續？")) return false;
    if (!change(fixture.metadata.layoutMode ? fixture : { ...fixture, metadata: { ...fixture.metadata, layoutMode: "reflow" } })) return false;
    setSelected(null);
    setPending(null);
    setMoving(null);
    drag.current = null;
    setCandidate(null);
    report("已載入示範草稿（非 AI），可還原。");
    return true;
  }
  function addBlock(id: BlockTemplateId) {
    if (!ready || loadError) return;
    const block = createBlock(spec, id);
    if (!block) {
      report("畫布已達上限，請先刪除部分元件。", true);
      return;
    }
    const { nodes, height } = block;
    if (change({ ...spec, metadata: { ...spec.metadata, height }, nodes: [...spec.nodes, ...nodes] })) {
      setSelected(nodes[0].id);
      report("已新增區塊：" + blockTemplateInfo(id).label + "，點選文字即可修改。");
      requestAnimationFrame(() => document.querySelector(`[data-node-id="${nodes[0].id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
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
      report("已儲存至本機");
    } catch {
      savePending.current = null;
      report(
        "儲存失敗，可能空間不足或被瀏覽器封鎖。草稿仍保留於工作區，請檢查後重試。",
        true,
      );
    } finally {
      saveActive.current = false;
      setBusy(false);
    }
  }
  function remove() {
    const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(!ids.length)return;
    if(change(deleteNodes(spec,ids))){setSelected(null);report('已刪除選取元件，可還原。');}
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
    if (!n) { report("請先選取要複製格式的元件。", true); return false; }
    formatClip.current = formatOf(n);
    report(`已複製格式：${Math.round(n.width)} × ${Math.round(n.height)}${n.effects.length ? `、${n.effects.length} 個動畫` : ""}。`);
    return true;
  }
  function pasteFormat(ids: readonly string[]) {
    if (!formatClip.current) { report("還沒有複製格式，先選取元件按 Ctrl/⌘＋Shift＋C。", true); return; }
    if (!ids.length) { report("請先選取要套用格式的元件。", true); return; }
    try {
      const result = applyFormat(state.current.present, ids, formatClip.current);
      if (change(result.canvas)) report(`已套用格式到 ${ids.length} 個元件${result.skippedEffects ? `，${result.skippedEffects} 個動畫不適用此類型已略過` : ""}。`);
    } catch { report("格式無法套用到這個元件。", true); }
  }
  function copySelection(cut=false){
    const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(!ids.length)return;
    clipboard.current=encodeNodes(spec,ids);void navigator.clipboard?.writeText(clipboard.current).catch(()=>{});
    if(cut)remove();else report(`已複製 ${ids.length} 個元件。`);
  }
  async function pasteSelection(){
    let value=clipboard.current;try{const text=await navigator.clipboard?.readText();if(text?.startsWith('Sketch2Site/CanvasNodes/v1:'))value=text;}catch{/* Internal clipboard remains available. */}
    const nodes=decodeNodes(value);if(!nodes.length)return;
    const copies=cloneNodes(nodes,24,24,state.current.present.metadata.height);const available=new Set([...state.current.present.nodes,...copies].map(n=>n.id));copies.forEach(n=>{if(n.href?.startsWith('#')&&!available.has(n.href.slice(1)))n.href=null;});if(change({...state.current.present,nodes:[...state.current.present.nodes,...copies]})){setPrimarySelected(copies[0].id);setSelectedIds(copies.map(n=>n.id));report(`已貼上 ${copies.length} 個元件，可還原。`);}
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
        if(k==='a'){const current=state.current.present;setSelectedIds(current.nodes.map(n=>n.id));setPrimarySelected(current.nodes[0]?.id??null);report(`已選取 ${current.nodes.length} 個元件。`);}
        if(k==='c')copySelection();if(k==='x')copySelection(true);if(k==='v')void pasteSelection();
        if(k==='g'){const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(ids.length>=2||e.shiftKey){change(groupSelection(spec,ids,e.shiftKey));report(e.shiftKey?'已取消群組，可還原。':'已建立群組，可一起移動；Shift＋點選可多選。');}}
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") {
        if (brush) { setBrush(false); report("已取消格式刷。"); return; }
        setSelected(null);
        setPending(null);
      } else if (
        node &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step=e.shiftKey?10:1;
        change(translateSelection(spec,selectedIds.length?selectedIds:[node.id],e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0,e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));
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
    try {
      const data = JSON.parse(e.dataTransfer.getData(dragType));
      if(data.value==="lift")data.value="hover-lift";
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
  function startEditing(n: CanvasNode) {
    if (!ready || loadError || disabled) return;
    if (n.type === "image") {
      // Double-clicking a picture opens the replace-image picker instead.
      imageTarget.current = n.id;
      imageInput.current?.click();
      return;
    }
    setPrimarySelected(n.id);
    setSelectedIds([n.id]);
    setEditing(n.id);
    setEditDraft(n.content);
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
      report(labels[n.type] + "不能是空白，已保留原文字。", true);
      return;
    }
    if (!patch(id, { content: n.type === "button" ? value.slice(0, 120) : value.slice(0, 2000) }))
      report("內容無法套用，已保留原文字。", true);
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
    const own=n.groupId?spec.nodes.filter(v=>v.groupId===n.groupId).map(v=>v.id):[n.id];
    const multi=selectedIds.includes(n.id)&&selectedIds.some(id=>!own.includes(id));
    const ids=multi?selectedIds:own;
    setPrimarySelected(n.id);setSelectedIds(ids);
    drag.current = { ids,node: n, startX: e.clientX, startY: e.clientY, scale, collapseTo: multi?own:undefined };
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
            state.current.present.metadata.height - d.node.height,
            d.node.y + (e.clientY - d.startY) / d.scale,
          ),
        ),
      ),
    });
  }
  function finish() {
    if(moving&&drag.current)change(translateSelection(spec,drag.current.ids,moving.x-drag.current.node.x,moving.y-drag.current.node.y));
    else if(drag.current?.collapseTo)setSelectedIds(drag.current.collapseTo);
    drag.current = null;
    setMoving(null);
  }
  const inspectorContent=(
node ? (
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
                          onChange={(e) => {setLinkDraft(e.target.value);setLinkError("");}}
                          onBlur={() => {
                            if (!patch(node.id, { href: linkDraft.trim() || null })) {
                              setLinkError("請使用有效的公開 HTTPS 網址或本頁元素連結。輸入已保留，尚未套用。");
                              report("連結尚未套用，請修正網址。", true);
                            } else {setLinkError("");if(linkError)report("連結已更新，草稿尚未儲存。");}
                          }}
                          aria-invalid={Boolean(linkError)}
                          aria-describedby={linkError?"draft-link-error":undefined}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                        {linkError && <small id="draft-link-error" role="alert">{linkError}</small>}
                        <small>支援公開 HTTPS 網址或頁面中的元素連結。</small>
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
                              setLinkError("請貼上有效的公開 HTTPS 接收網址。輸入已保留，尚未套用。");
                              report("接收網址尚未套用，請修正。", true);
                            } else {setLinkError("");if(linkError)report("接收網址已更新，草稿尚未儲存。");}
                          }}
                          aria-invalid={Boolean(linkError)}
                          aria-describedby={linkError?"draft-form-error":undefined}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                        {linkError && <small id="draft-form-error" role="alert">{linkError}</small>}
                        <small>在 Formspree 等服務建立表單後，貼上它提供的網址。內容欄每行是一個欄位。</small>
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
                )
  );
  const disabled = !ready || loadError;
  const displayedNodes=resizing?spec.nodes.map(n=>n.id===resizing.id?{...n,...resizing}:n):moving&&drag.current?translateSelection(spec,drag.current.ids,moving.x-drag.current.node.x,moving.y-drag.current.node.y).nodes:spec.nodes;
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
              onClick={() => {
                if(mode==="draft"&&spec.nodes.length&&!generating){
                  if(!previewRef.current?.target()){setMode("preview");return;}
                  const missing=spec.nodes.find(n=>n.type==="button"&&!n.href);
                  if(missing){setSelected(missing.id);setTab("properties");setPanel(true);setGenerationError("請先為「"+missing.content+"」設定按鈕連結，再預覽。");return;}
                  void generate(true,true);
                }else setMode("preview");
              }}
            >
              <span className="neo-step">3.</span> 預覽
            </button>
          </div>
          {mode === "draft" && <label className="layout-choice" title="智慧排版：自動整理成首屏、特色、價目表等區塊；保留草稿位置：維持相對位置，手機單欄"><select aria-label="生成布局" value={spec.metadata.layoutMode??'preserve'} disabled={generating} onChange={e=>change({...spec,metadata:{...spec.metadata,layoutMode:e.target.value as 'preserve'|'reflow'}})}><option value="reflow">智慧排版</option><option value="preserve">保留草稿位置</option></select></label>}
          {mode === "draft" && (
            <button
              className="primary"
              disabled={disabled || generating || !spec.nodes.length}
              aria-label={generating?"生成中…":"生成網站"}
              title="生成時會將這份草稿的內容與布局傳送至 OpenAI"
              onClick={() => void generate()}
            >
              <span aria-hidden="true">ϟ</span> {generating ? "生成中…" : "生成網站"}
            </button>
          )}
          {mode === "draft" && (
            <>
              <button
                disabled={busy || !ready || loadError}
                title="儲存草稿（⌘ / Ctrl S）"
                aria-label={busy?"儲存中…":"儲存草稿"}
                onClick={() => void save()}
              >
                {busy ? "儲存中…" : saved&&!dirty ? "已儲存" : "儲存草稿"}
              </button>
              <WorkbenchMenu label="編輯">
                <button disabled={!selectedIds.length} onClick={()=>copySelection()}>複製 · Ctrl/Cmd＋C</button>
                <button disabled={!selectedIds.length} onClick={()=>copySelection(true)}>剪下 · Ctrl/Cmd＋X</button>
                <button onClick={()=>void pasteSelection()}>貼上 · Ctrl/Cmd＋V</button>
                <button onClick={()=>{setSelectedIds(spec.nodes.map(n=>n.id));setPrimarySelected(spec.nodes[0]?.id??null);}}>全選 · Ctrl/Cmd＋A</button>
                <button disabled={selectedIds.length<2} onClick={()=>change(groupSelection(spec,selectedIds))}>群組 · Ctrl/Cmd＋G</button>
                <button disabled={!selectedIds.length} onClick={()=>copyFormat()}>複製格式 · Ctrl/Cmd＋Shift＋C</button>
                <button disabled={!selectedIds.length} onClick={()=>pasteFormat(selectedIds)}>貼上格式 · Ctrl/Cmd＋Shift＋V</button>
                <button disabled={!selectedIds.length} onClick={()=>change(groupSelection(spec,selectedIds,true))}>解組 · Ctrl/Cmd＋Shift＋G</button>
              </WorkbenchMenu>
              <WorkbenchMenu label="草稿選單">
                <button onClick={()=>{setCandidate(null);setMode("preview");}}>開啟網站工作區</button>
                <button
                  disabled={disabled || generating || !spec.nodes.length}
                  onClick={() => void generate(true)}
                >
                  智慧排版（非 AI）
                </button>
                <div className="menu-label">示範草稿（非 AI）</div>
                {demoFixtures
                  .filter((_, index) => index !== 2)
                  .map((fixture) => (
                    <button
                      key={fixture.metadata.name}
                      disabled={disabled || generating}
                      onClick={() => void loadDemo(fixture)}
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
      <div style={{"--neo-library-width":`${panelWidth}px`} as CSSProperties} className={'workspace neo-workspace'+(mode==='draft'&&motionFull?' neo-motion-full':'')}>
        <div
          className="preview-host"
          style={{
            display: mode === "preview" && !candidate ? "flex" : "none",
          }}
        >
          <Preview ref={previewRef} />
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
            candidate={candidate.result}
            previewOnly={candidate.previewOnly}
            aiFallback={candidate.aiFallback}
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
                  <small>1440 × {spec.metadata.height}</small>{selectedIds.length>1&&<small className="selection-count">已選取 {selectedIds.length} 個 · Ctrl/Cmd＋G 群組</small>}
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
                      value={zoom}
                      onChange={(e) => setScale(e.target.value === "fit" ? "fit" : Number(e.target.value))}
                    >
                      <option value="fit">符合寬度</option>
                      {[0.4, 0.5, 0.6, 0.75, 1].map((s) => (
                        <option key={s} value={s}>
                          {s * 100}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="format-brush"
                    aria-pressed={brush}
                    title="格式刷：複製選取元件的尺寸與動畫，再點一下要套用的元件（Esc 取消）"
                    onClick={() => {
                      if (brush) { setBrush(false); return; }
                      if (copyFormat()) { setBrush(true); report("格式刷已開啟：點一下要套用格式的元件。"); }
                    }}
                  >
                    格式刷
                  </button>
                  <button
                    onClick={() => setPanel(!panel)}
                    aria-expanded={panel}
                  >
                    {panel ? "收合側欄" : "展開側欄"}
                  </button>
                </div>
              </div>
              <div
                ref={canvasScroll}
                className="canvas-scroll"
                style={{ "--draft-scale": scale } as React.CSSProperties}
              >
                {draftEffect && <span className="draft-drop-hint" role="status">{draftHover && spec.nodes.find(n=>n.id===draftHover) ? (draftDropReason(spec.nodes.find(n=>n.id===draftHover)!,draftEffect) ?? "放開以附加動畫") : "拖到綠框元件以附加動畫；不會新增元件"}</span>}
                <div
                  className="canvas-wrap"
                  style={{ width: 1440 * scale, height: spec.metadata.height * scale }}
                >
                  <div
                    ref={board}
                    className={"canvas" + (brush ? " brush-active" : "")}
                    data-testid="canvas"
                    aria-label="草稿畫布"
                    style={{
                      width: 1440,
                      height: spec.metadata.height,
                      transform: "scale(" + scale + ")",
                    }}
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
                      const hit = spec.nodes.filter((n) => n.x < right && n.x + n.width > left && n.y < bottom && n.y + n.height > top);
                      const groups = new Set(hit.map((n) => n.groupId).filter(Boolean));
                      const ids = spec.nodes.filter((n) => hit.includes(n) || (n.groupId && groups.has(n.groupId))).map((n) => n.id);
                      if (!ids.length) return;
                      setSelectedIds((prev) => (marquee.additive ? [...new Set([...prev, ...ids])] : ids));
                      setPrimarySelected(ids[0]);
                      report(ids.length > 1 ? `已選取 ${ids.length} 個元件，按 Ctrl/⌘＋G 建立群組。` : "已選取 1 個元件。");
                    }}
                    onPointerCancel={() => setMarquee(null)}
                  >
                    {marquee && (
                      <div
                        className="canvas-marquee"
                        aria-hidden="true"
                        style={{ left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1), width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }}
                      />
                    )}
                    {!spec.nodes.length && (
                      <div className="empty">
                        <span className="empty-mark" aria-hidden="true">
                          ＋
                        </span>
                        <h2>從一個想法開始</h2>
                        <p>點左側「區塊範本」快速搭出頁面，或拖入單一元件。</p>
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
                          {selected === n.id && selectedIds.length === 1 && editing !== n.id && !brush &&
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
                                ? "找不到本機圖片，請重新匯入。"
                                : "正在載入圖片…"}
                            </span>
                          ) : n.type === "image" && (n.assetId === localAssets[0] || brokenImages.has(n.id + n.assetId)) ? (
                            // The built-in sample (and any image that fails to load) shows as an empty frame to fill.
                            <span className="image-placeholder" role="img" aria-label={n.content + "（尚未放入圖片）"}>
                              <WorkbenchIcon name="image" />
                              <strong>{n.content}</strong>
                              <small>雙擊替換圖片</small>
                            </span>
                          ) : n.type === "image" ? (
                            <img
                              src={imageUrls[n.assetId!] || import.meta.env.BASE_URL + n.assetId!.slice(1)}
                              loading="lazy"
                              decoding="async"
                              alt={n.content}
                              draggable={false}
                              onError={() => setBrokenImages((prev) => new Set(prev).add(n.id + n.assetId))}
                            />
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
                                // Headings and buttons are one line: Enter saves. Longer text: Ctrl/Cmd+Enter saves.
                                else if (e.key === "Enter" && !e.nativeEvent.isComposing && ((n.type === "heading" || n.type === "button") ? !e.shiftKey : e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.blur(); }
                              }}
                            />
                          ) : n.type === "form" ? (
                            <span className="form-sketch">
                              {n.content.split("\n").map((field, i) => (
                                <span key={i}><small>{field}</small><i /></span>
                              ))}
                              <b>送出</b>
                            </span>
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
                  <h2>{motionFull?'動態素材庫':'圖元素材'}</h2>
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
                            labels[t].includes(search) ||
                            t.includes(search.toLowerCase()),
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
                              const bottom = spec.nodes.reduce((m, n) => Math.max(m, n.y + n.height), 0);
                              const y = spec.nodes.length ? bottom + 24 : 80;
                              const probe = createNode(t, 80, 0, canvasMaxHeight);
                              const needed = y + probe.height;
                              if (needed > spec.metadata.height && needed <= canvasMaxHeight) {
                                const height = Math.ceil(needed / 600) * 600;
                                const next = { ...createNode(t, 80, y, height) };
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
            {panel&&<aside className="neo-inspector" data-active={tab==='properties'} aria-label="物件檢查器"><div className="neo-inspector-head"><span>物件檢查器</span></div><div className="neo-inspector-tabs"><button onClick={()=>{setTab('animations');setPanel(true);setMotionFull(false);}}>加入動畫</button></div><div className="neo-inspector-body">{inspectorContent}</div></aside>}
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
              <span>雙擊編輯文字</span>
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
