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
import Preview from "./Preview";
const labels = { text: "文字", button: "按鈕", card: "卡片" };
const effects = {
  "hover-glow": "Hover Glow",
  "fade-in": "Fade In",
  lift: "Hover Lift",
};
type Effect = keyof typeof effects;
const dragType = "application/x-sketch2site";
export default function App() {
  const [mode, setMode] = useState<"draft" | "preview">("draft");
  const [history, setHistory] = useState<History>({
    past: [],
    present: blank(),
    future: [],
  });
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
  const [panel, setPanel] = useState(true),
    [panelWidth, setPanelWidth] = useState(304);
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
      report("草稿已就緒 · 資料僅保存在此瀏覽器");
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
    } catch {
      report("修改超出畫布範圍或資料限制，請調整後重試。", true);
    }
  };
  function patch(id: string, attrs: Partial<CanvasNode>) {
    change({
      ...state.current.present,
      nodes: state.current.present.nodes.map((n) =>
        n.id === id ? { ...n, ...attrs } : n,
      ),
    });
  }
  function add(type: CanvasNode["type"], x = 80, y = 80) {
    if (!ready || loadError) return;
    const next = createNode(type, x, y);
    change({ ...spec, nodes: [...spec.nodes, next] });
    setSelected(next.id);
    report("已新增" + labels[type]);
  }
  function attach(effect: Effect, id: string) {
    const n = state.current.present.nodes.find((n) => n.id === id);
    if (!n) return;
    if (n.effects.includes(effect)) {
      report("此元素已有該動畫標記");
      return;
    }
    patch(id, { effects: [...n.effects, effect] });
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
        (e.target instanceof Element &&
          e.target.closest("input,textarea,select,[contenteditable=true]")) ||
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
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <h1>Sketch2Site</h1>
        </div>
        <input
          className="project-name"
          aria-label="專案名稱"
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
        <div className="toolbar-actions">
          <button
            aria-pressed={mode === "draft"}
            onClick={() => setMode("draft")}
          >
            草稿
          </button>
          <button
            aria-pressed={mode === "preview"}
            onClick={() => setMode("preview")}
          >
            預覽
          </button>
          {mode === "draft" && (
            <>
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
              <button
                disabled={busy || !ready || loadError}
                onClick={() => void save()}
                className="primary"
              >
                {busy ? "儲存中…" : "儲存草稿"}
              </button>
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
            </>
          )}
        </div>
      </header>
      <div className="workspace">
        <div
          className="preview-host"
          style={{ display: mode === "preview" ? "flex" : "none" }}
        >
          <Preview />
        </div>
        {mode === "draft" && (
          <>
            <main className="studio" aria-label="草稿工作區">
              <div className="canvas-tools">
                <div>
                  <strong>網站草稿</strong>
                  <small>1440 × 1200</small>
                </div>
                <div>
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
              <div className="canvas-scroll">
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
                          {n.content}
                          <span className="effect-tags">
                            {n.effects.map((f) => (
                              <span key={f}>{effects[f]}</span>
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
                className="sidebar"
                style={{ width: panelWidth }}
                aria-label="元件與屬性"
              >
                <div className="side-head">
                  <h2>設計工具</h2>
                  <small>{spec.nodes.length} / 100 元件</small>
                </div>
                <div className="tabs" role="tablist" aria-label="工具分類">
                  <button
                    role="tab"
                    aria-selected={tab === "library"}
                    onClick={() => setTab("library")}
                  >
                    元件與動畫
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "properties"}
                    onClick={() => setTab("properties")}
                  >
                    編輯元素
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
                    <button
                      disabled={!target}
                      onClick={() => attach(pending, target)}
                    >
                      附加標記
                    </button>{" "}
                    <button onClick={() => setPending(null)}>取消</button>
                  </div>
                )}
                {tab === "library" ? (
                  <>
                    <input
                      type="search"
                      aria-label="搜尋元件與動畫"
                      placeholder="搜尋元件、動畫…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
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
                      <h2>新增元件</h2>
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
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                dragType,
                                JSON.stringify({ type: "component", value: t }),
                              )
                            }
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
                              {{ text: "T", button: "↗", card: "▤" }[t]}
                            </span>
                            <span>
                              <strong>{labels[t]}</strong>
                              <small>
                                {
                                  {
                                    text: "標題、段落與說明",
                                    button: "網站的行動入口",
                                    card: "相關內容的集合",
                                  }[t]
                                }
                              </small>
                            </span>
                          </button>
                        ))}
                    </div>
                    <h2>動畫效果</h2>
                    <p className="note">拖到元件上附加，草稿僅顯示標記。</p>
                    <div className="library">
                      {(Object.keys(effects) as Effect[])
                        .filter((f) =>
                          effects[f]
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map((f) => (
                          <button
                            key={f}
                            disabled={disabled}
                            draggable={!disabled}
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                dragType,
                                JSON.stringify({ type: "effect", value: f }),
                              )
                            }
                            onClick={() => {
                              if (node) attach(f, node.id);
                              else {
                                setPending(f);
                                setTarget("");
                              }
                            }}
                          >
                            <span className="glyph" aria-hidden="true">
                              ✧
                            </span>
                            <span>
                              <strong>{effects[f]}</strong>
                              <small>
                                {
                                  {
                                    "hover-glow": "游標移入時柔光",
                                    "fade-in": "進入畫面時淡入",
                                    lift: "游標移入時上浮",
                                  }[f]
                                }
                              </small>
                            </span>
                          </button>
                        ))}
                    </div>
                  </>
                ) : node ? (
                  <>
                    <h2>{labels[node.type]}</h2>
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
                        <div className="effect-row" key={f}>
                          <span>{effects[f]}</span>
                          <button
                            aria-label={"移除 " + effects[f]}
                            onClick={() =>
                              patch(node.id, {
                                effects: node.effects.filter((x) => x !== f),
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
                    <small>ID · {node.id}</small>
                  </>
                ) : (
                  <p className="note">
                    先在畫布上選取一個元件，即可編輯內容、位置與動畫標記。
                  </p>
                )}
                <label className="field note">
                  側欄寬度
                  <input
                    className="panel-width"
                    type="range"
                    min={260}
                    max={420}
                    step={8}
                    value={panelWidth}
                    onChange={(e) => setPanelWidth(Number(e.target.value))}
                  />
                </label>
              </aside>
            )}
          </>
        )}
      </div>
      <footer className="footer">
        <span role="status" className={"status" + (error ? " error" : "")}>
          {message}
        </span>
        <span>{dirty ? "尚未儲存" : "已儲存於本機"}</span>
        {mode === "draft" && (
          <span className="shortcuts">
            ⌘ / Ctrl Z 還原 · Delete 刪除 · 方向鍵微調
          </span>
        )}
      </footer>
    </>
  );
}
