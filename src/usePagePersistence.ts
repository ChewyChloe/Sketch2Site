import { useCallback, useEffect, useRef, useState } from "react";
import { createPageSession, type PageSession } from "./patch";
import { demoPage } from "./pageFixtures";
import { commitHistory } from "./history";
import {
  loadPage,
  tokenOf,
  restartDamagedPage,
  recordOf,
  savePage,
  storageError,
  type PageStorageError,
} from "./pageStorage";
import { createPageSaver, type SaveStatus } from "./pageSaver";
import type { PageSpec } from "./pageSpec";
export function usePagePersistence() {
  const [session, setSession] = useState(() => createPageSession(demoPage));
  const current = useRef(session);
  const [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState<PageStorageError | null>(null);
  const [status, setStatus] = useState<SaveStatus>({
    kind: "unsaved",
    revision: 0,
  });
  const [restored, setRestored] = useState(false);
  const saver = useRef<ReturnType<typeof createPageSaver> | null>(null),
    epoch = useRef(0);
  const dirty = useRef(false);
  const publish = (s: PageSession) => {
    current.current = s;
    setSession(s);
  };
  const read = useCallback(async () => {
    const generation = ++epoch.current;
    saver.current?.close();
    saver.current = null;
    setReady(false);
    setLoadError(null);
    try {
      const saved = await loadPage();
      if (generation !== epoch.current) return;
      const next = {
        ...createPageSession(saved?.pageSpec ?? demoPage),
        revision: saved?.revision ?? 0,
      };
      publish(next);
      setRestored(Boolean(saved));
      dirty.current = false;
      const nextStatus: SaveStatus = {
        kind: saved ? "saved" : "unsaved",
        revision: next.revision,
      };
      setStatus(nextStatus);
      saver.current = createPageSaver(saved ? tokenOf(saved) : null, (s) => {
        if (generation !== epoch.current) return;
        dirty.current =
          s.kind !== "saved" || s.revision !== current.current.revision;
        setStatus(s);
      });
    } catch (e) {
      if (generation === epoch.current) {
        setLoadError(storageError(e));
        dirty.current = false;
      }
    } finally {
      if (generation === epoch.current) setReady(true);
    }
  }, []);
  useEffect(() => {
    void read();
    return () => {
      epoch.current++;
      saver.current?.close();
    };
  }, [read]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function update(next: PageSession) {
    if (!ready || loadError || next === current.current) return;
    publish(next);
    dirty.current = true;
    saver.current?.enqueue(next);
  }
  function replace(page: PageSpec) {
    if (!ready || loadError) return;
    // Replacing content is also a new editing session, with a newer document revision.
    update({
      ...createPageSession(page),
      revision: current.current.revision + 1,
    });
  }
  async function restart() {
    const generation = ++epoch.current;
    saver.current?.close();
    saver.current = null;
    setReady(false);
    const next = createPageSession(demoPage);
    try {
      const saved = await restartDamagedPage(recordOf(next));
      if (generation !== epoch.current) return;
      publish(next);
      setLoadError(null);
      setRestored(false);
      dirty.current = false;
      setStatus({ kind: "saved", revision: saved.revision });
      saver.current = createPageSaver(tokenOf(saved), (s) => {
        if (generation === epoch.current) {
          dirty.current =
            s.kind !== "saved" || s.revision !== current.current.revision;
          setStatus(s);
        }
      });
    } catch (e) {
      if (generation === epoch.current) setLoadError(storageError(e));
    } finally {
      if (generation === epoch.current) setReady(true);
    }
  }
  function generationTarget() {
    if (
      !ready ||
      loadError ||
      dirty.current ||
      !["saved", "unsaved"].includes(status.kind)
    )
      return null;
    return {
      sessionId: current.current.sessionId,
      revision: current.current.revision,
    };
  }
  async function acceptGeneration(
    page: PageSpec,
    target: { sessionId: string; revision: number },
  ) {
    const now = generationTarget();
    if (
      !now ||
      now.sessionId !== target.sessionId ||
      now.revision !== target.revision
    )
      return { ok: false as const, error: "頁面已更新，請重新生成" };
    const oldStatus = status,
      token = saver.current?.token() ?? null;
    const generation = ++epoch.current;
    saver.current?.close();
    const generated = createPageSession(page);
    const next = {
      ...generated,
      history: commitHistory(
        current.current.history,
        generated.history.present,
      ),
      revision: current.current.revision + 1,
    };
    setStatus({ kind: "saving", revision: next.revision });
    dirty.current = true;
    try {
      const saved = await savePage(recordOf(next), token);
      if (generation !== epoch.current)
        return { ok: false as const, error: "頁面已更新，請重新載入" };
      publish(next);
      dirty.current = false;
      setStatus({ kind: "saved", revision: next.revision });
      saver.current = createPageSaver(tokenOf(saved), (s) => {
        if (generation === epoch.current) {
          dirty.current =
            s.kind !== "saved" || s.revision !== current.current.revision;
          setStatus(s);
        }
      });
      return { ok: true as const };
    } catch (e) {
      const problem = storageError(e);
      if (generation === epoch.current) {
        dirty.current = false;
        setStatus(
          problem.code === "CONFLICT"
            ? {
                kind: "conflict",
                revision: current.current.revision,
                error: problem,
              }
            : oldStatus,
        );
        saver.current = createPageSaver(token, (s) => {
          if (generation === epoch.current) {
            dirty.current =
              s.kind !== "saved" || s.revision !== current.current.revision;
            setStatus(s);
          }
        });
      }
      return { ok: false as const, error: problem.message };
    }
  }
  return {
    generationTarget,
    acceptGeneration,
    session,
    current,
    ready,
    loadError,
    status,
    restored,
    update,
    replace,
    read,
    restart,
    retry: () => saver.current?.retry(),
    isDirty: () => dirty.current,
  };
}
