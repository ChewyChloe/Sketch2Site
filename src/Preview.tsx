import { useRef, useState } from "react";
import { demoPage } from "./pageFixtures";
import { PageRenderer } from "./PageRenderer";
export default function Preview() {
  const [input, setInput] = useState<unknown>(demoPage),
    [source, setSource] = useState("範例預覽"),
    [error, setError] = useState(""),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [revision, setRevision] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadSequence = useRef(0);
  async function load(file: File | undefined) {
    if (!file) return;
    const sequence = ++loadSequence.current;
    setSource("本機檔案預覽");
    if (file.size > 200000) {
      setError("預覽失敗：檔案超過 200 KB。請縮小檔案後重試。");
      setInput(null);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (sequence !== loadSequence.current) return;
      setInput(parsed);
      setSource("本機檔案預覽");
      setError("");
      setRevision((n) => n + 1);
    } catch {
      if (sequence !== loadSequence.current) return;
      setError("預覽失敗：檔案格式無效。請修正檔案後重試。");
      setInput(null);
    }
  }
  return (
    <main className="preview-workspace" aria-label="網頁預覽">
      <div className="preview-tools">
        <div>
          <strong>{source}</strong>
          <small>未使用 AI</small>
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
          <button onClick={() => setRevision((n) => n + 1)}>重播動畫</button>
          <button onClick={() => fileRef.current?.click()}>載入頁面</button>
          <button
            onClick={() => {
              loadSequence.current++;
              setInput(demoPage);
              setSource("範例預覽");
              setError("");
              setRevision((n) => n + 1);
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
      <div className="preview-scroll">
        <div className={"preview-frame " + device} data-testid="preview-frame">
          {error ? (
            <p role="alert" className="preview-error">
              {error}
            </p>
          ) : (
            <PageRenderer key={revision} input={input} />
          )}
        </div>
      </div>
    </main>
  );
}
