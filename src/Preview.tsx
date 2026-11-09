import { useEffect, useRef, useState } from "react";
import { demoPage } from "./pageFixtures";
import { PageRenderer } from "./PageRenderer";
import { validatePage } from "./pageSpec";
import {
  applyPatchBatch,
  createPageSession,
  indexNodes,
  travelPage,
  type Change,
} from "./patch";
function changeLabel(c: Change) {
  return c.property === "content"
    ? "文字"
    : c.property.startsWith("effects.")
      ? "淡入動畫"
      : "屬性";
}
function valueLabel(value: unknown): string {
  if (value === undefined) return "未設定";
  if (value && typeof value === "object" && "duration" in value)
    return String(value.duration) + " 毫秒";
  return String(value);
}
export default function Preview() {
  const [session, setSession] = useState(() => createPageSession(demoPage));
  const current = useRef(session);
  current.current = session;
  const [source, setSource] = useState("範例預覽"),
    [error, setError] = useState(""),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [replay, setReplay] = useState(0);
  const [selected, setSelected] = useState<string | null>(null),
    [text, setText] = useState(""),
    [fade, setFade] = useState(false),
    [duration, setDuration] = useState("450"),
    [editRevision, setEditRevision] = useState(0);
  const [notice, setNotice] = useState(""),
    [patchError, setPatchError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    loadSequence = useRef(0);
  const page = session.history.present,
    nodes = indexNodes(page),
    node = selected ? nodes.get(selected) : undefined;
  useEffect(() => {
    const n = selected
      ? indexNodes(session.history.present).get(selected)
      : undefined;
    setText(n?.content ?? "");
    const effect = n?.effects.find((e) => e.effectId === "fade-in");
    setFade(Boolean(effect));
    setDuration(String(effect?.duration ?? 450));
    setEditRevision(session.revision);
  }, [selected, session]);
  const update = (next: typeof session) => {
    current.current = next;
    setSession(next);
  };
  function install(input: unknown) {
    const checked = validatePage(input);
    setSelected(null);
    setNotice("");
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    update(createPageSession(checked.page));
    setError("");
    setReplay((n) => n + 1);
  }
  async function load(file: File | undefined) {
    if (!file) return;
    const sequence = ++loadSequence.current;
    setSource("本機檔案預覽");
    if (file.size > 200000) {
      setError("預覽失敗：檔案超過 200 KB。請縮小檔案後重試。");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (sequence !== loadSequence.current) return;
      install(parsed);
    } catch {
      if (sequence !== loadSequence.current) return;
      setError("預覽失敗：檔案格式無效。請修正檔案後重試。");
    }
  }
  function select(id: string) {
    if (
      indexNodes(current.current.history.present).get(id)?.type === "heading"
    ) {
      setSelected(id);
      setNotice("");
    }
  }
  function apply() {
    if (!node) return;
    const patches: unknown[] = [
      { operation: "set-text", targetId: node.id, payload: { content: text } },
    ];
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
    const result = applyPatchBatch(
      current.current,
      {
        schemaVersion: 1,
        sessionId: session.sessionId,
        baseRevision: editRevision,
        patches,
      },
      [node.id],
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
  }
  function travel(direction: "undo" | "redo") {
    update(travelPage(current.current, direction));
    setPatchError(false);
    setNotice(direction === "undo" ? "已撤銷修改。" : "已重做修改。");
  }
  return (
    <main className="preview-workspace" aria-label="網頁預覽">
      <div className="preview-tools">
        <div>
          <strong>{source}</strong>
          <small>未使用 AI</small>
          {!node && !error && (
            <select
              className="heading-picker"
              aria-label="選取標題"
              value=""
              onChange={(e) => {
                setSelected(e.target.value || null);
                setNotice("");
              }}
            >
              <option value="">選取標題</option>
              {Array.from(nodes.values())
                .filter((n) => n.type === "heading")
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.content?.slice(0, 32)}
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
            disabled={Boolean(error) || !session.history.past.length}
            onClick={() => travel("undo")}
          >
            撤銷修改
          </button>
          <button
            disabled={Boolean(error) || !session.history.future.length}
            onClick={() => travel("redo")}
          >
            重做修改
          </button>
          <button onClick={() => setReplay((n) => n + 1)}>重播動畫</button>
          <button onClick={() => fileRef.current?.click()}>載入頁面</button>
          <button
            onClick={() => {
              loadSequence.current++;
              setSource("範例預覽");
              install(demoPage);
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
      <div className="preview-body">
        <div className="preview-scroll">
          <div
            className={"preview-frame " + device}
            data-testid="preview-frame"
          >
            {error ? (
              <p role="alert" className="preview-error">
                {error}
              </p>
            ) : (
              <PageRenderer
                key={replay}
                input={page}
                selectedId={selected}
                onSelect={select}
              />
            )}
          </div>
        </div>
        {!error && node && (
          <aside className="patch-panel" aria-label="頁面元素編輯">
            <label className="field">
              選取標題
              <select
                aria-label="選取標題"
                value={selected ?? ""}
                onChange={(e) => {
                  setSelected(e.target.value || null);
                  setNotice("");
                }}
              >
                <option value="">選擇要修改的標題</option>
                {Array.from(nodes.values())
                  .filter((n) => n.type === "heading")
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.content?.slice(0, 32)}
                    </option>
                  ))}
              </select>
            </label>
            <>
              <div className="side-head">
                <h2>編輯標題</h2>
                <button onClick={() => setSelected(null)}>取消選取</button>
              </div>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  apply();
                }}
              >
                <label className="field">
                  標題文字
                  <textarea
                    aria-label="標題文字"
                    value={text}
                    maxLength={2000}
                    onChange={(e) => setText(e.target.value)}
                  />
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
            {notice && (
              <p
                role={patchError ? "alert" : "status"}
                className={patchError ? "error patch-notice" : "patch-notice"}
              >
                {notice}
              </p>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
