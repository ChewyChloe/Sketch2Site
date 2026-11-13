import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { database, saveDraft, loadDraft } from "./storage";
import { blank } from "./spec";
import { demoPage } from "./pageFixtures";
import {
  createPageSession,
  applyPatchBatch,
  indexNodes,
  travelPage,
} from "./patch";
import {
  loadPage,
  savePage,
  recordOf,
  tokenOf,
  restartDamagedPage,
  PageRecordSchema,
  projectId,
} from "./pageStorage";
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => vi.restoreAllMocks());
async function rawPut(value: unknown) {
  const db = await database();
  await new Promise<void>((res, rej) => {
    const t = db.transaction("pages", "readwrite");
    t.objectStore("pages").put(value, projectId);
    t.oncomplete = () => res();
    t.onabort = () => rej(t.error);
  });
  db.close();
}
async function rawGet(store = "pages", key: IDBValidKey = projectId) {
  const db = await database();
  const value = await new Promise<unknown>((res, rej) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  db.close();
  return value;
}
it("saves and loads valid records only after transaction commit without changing CanvasSpec", async () => {
  const canvas = blank();
  await saveDraft(canvas);
  const record = recordOf(createPageSession(demoPage));
  const saved = await savePage(record, null);
  expect(await loadPage()).toEqual(saved);
  expect(await loadDraft()).toEqual(canvas);
  expect(PageRecordSchema.safeParse(saved).success).toBe(true);
});
it("returns absent data without initializing or saving the fixture", async () => {
  expect(await loadPage()).toBeNull();
  expect(await rawGet()).toBeUndefined();
});
it.each([
  null,
  "{broken",
  {},
  { ...recordOf(createPageSession(demoPage)), schemaVersion: 9 },
  { ...recordOf(createPageSession(demoPage)), revision: -1 },
  { ...recordOf(createPageSession(demoPage)), revision: 1.2 },
  { ...recordOf(createPageSession(demoPage)), writerSessionId: "bad" },
  {
    ...recordOf(createPageSession(demoPage)),
    pageSpec: { ...demoPage, schemaVersion: 99 },
  },
  {
    ...recordOf(createPageSession(demoPage)),
    pageSpec: { ...demoPage, sections: [{ id: "x", type: "script" }] },
  },
])(
  "rejects damaged/version-incompatible records and retains the original",
  async (raw) => {
    await rawPut(raw);
    await expect(loadPage()).rejects.toBeTruthy();
    expect(await rawGet()).toEqual(raw);
    await expect(
      savePage(recordOf(createPageSession(demoPage)), null),
    ).rejects.toBeTruthy();
    expect(await rawGet()).toEqual(raw);
  },
);
it("rejects dangerous URLs and invalid effects from local storage", async () => {
  for (const mutate of [
    (p: typeof demoPage) => {
      Array.from(indexNodes(p).values()).find(
        (n) => n.type === "button",
      )!.href = "javascript:alert(1)";
    },
    (p: typeof demoPage) => {
      p.sections[0].effects[0].validatedControls.durationMs = 99999;
    },
  ]) {
    const record = recordOf(createPageSession(demoPage));
    mutate(record.pageSpec);
    await rawPut(record);
    await expect(loadPage()).rejects.toMatchObject({ code: "CORRUPT" });
    expect(await rawGet()).toEqual(record);
  }
});
it("CAS rejects old revision and writer tokens, even when a delayed snapshot has a higher revision", async () => {
  const base = await savePage(recordOf(createPageSession(demoPage)), null);
  const fresh = { ...base, writerSessionId: crypto.randomUUID(), revision: 1 };
  await savePage(fresh, tokenOf(base));
  await expect(
    savePage({ ...base, revision: 2 }, tokenOf(base)),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await loadPage()).toEqual(fresh);
  await expect(
    savePage({ ...fresh, revision: 1 }, tokenOf(fresh)),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("simultaneous tabs cannot both write from the same base", async () => {
  const base = await savePage(recordOf(createPageSession(demoPage)), null);
  const a = { ...base, revision: 1, writerSessionId: crypto.randomUUID() },
    b = { ...base, revision: 2, writerSessionId: crypto.randomUUID() };
  const results = await Promise.allSettled([
    savePage(a, tokenOf(base)),
    savePage(b, tokenOf(base)),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
});
it("restores monotonic revisions into a new session without old history or old patches", async () => {
  const old = createPageSession(demoPage),
    target = Array.from(indexNodes(old.history.present).values()).find(
      (n) => n.type === "heading",
    )!.id;
  const patch = {
    schemaVersion: 1,
    sessionId: old.sessionId,
    baseRevision: 0,
    patches: [
      {
        operation: "set-text",
        targetId: target,
        payload: { content: "保存後" },
      },
    ],
  };
  const applied = applyPatchBatch(old, patch, [target]);
  if (!applied.ok) throw Error("setup");
  const saved = await savePage(recordOf(applied.state), null);
  const next = {
    ...createPageSession(saved.pageSpec),
    revision: saved.revision,
  };
  expect(next.history.past).toEqual([]);
  expect(travelPage(next, "undo")).toBe(next);
  expect(
    applyPatchBatch(next, { ...patch, baseRevision: next.revision }, [target])
      .ok,
  ).toBe(false);
  const normal = applyPatchBatch(
    next,
    {
      ...patch,
      sessionId: next.sessionId,
      baseRevision: next.revision,
      patches: [
        {
          operation: "set-text",
          targetId: target,
          payload: { content: "新工作階段" },
        },
      ],
    },
    [target],
  );
  expect(normal.ok).toBe(true);
  if (normal.ok) expect(normal.state.revision).toBe(saved.revision + 1);
});
it("explicit recovery archives damaged data atomically; refuses to replace valid data", async () => {
  const raw = { schemaVersion: 99, originalContent: "保留這份資料" };
  await rawPut(raw);
  const restarted = await restartDamagedPage(
    recordOf(createPageSession(demoPage)),
  );
  expect(await loadPage()).toEqual(restarted);
  const db = await database();
  const archives = await new Promise<unknown[]>((res, rej) => {
    const r = db.transaction("pageBackups").objectStore("pageBackups").getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  db.close();
  expect(archives).toEqual([expect.objectContaining({ original: raw })]);
  await expect(
    restartDamagedPage(recordOf(createPageSession(demoPage))),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("quota failure aborts without losing damaged raw data or claiming success", async () => {
  const raw = { bad: "preserve" };
  await rawPut(raw);
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
  await expect(
    restartDamagedPage(recordOf(createPageSession(demoPage))),
  ).rejects.toMatchObject({ code: "QUOTA" });
  expect(await rawGet()).toEqual(raw);
});
it("open denial and aborted transactions produce recoverable errors", async () => {
  const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
  await expect(loadPage()).rejects.toMatchObject({ code: "UNAVAILABLE" });
  open.mockRestore();
  const put = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(() => {
      throw new DOMException("abort", "AbortError");
    });
  await expect(
    savePage(recordOf(createPageSession(demoPage)), null),
  ).rejects.toMatchObject({ code: "ABORTED" });
  put.mockRestore();
  expect(await loadPage()).toBeNull();
});
it("upgrades existing Canvas-only v1 databases without deleting drafts", async () => {
  const canvas = blank();
  await new Promise<void>((res, rej) => {
    const r = indexedDB.open("sketch2site", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onsuccess = () => {
      const db = r.result;
      const t = db.transaction("drafts", "readwrite");
      t.objectStore("drafts").put(canvas, "current");
      t.oncomplete = () => {
        db.close();
        res();
      };
    };
    r.onerror = () => rej(r.error);
  });
  expect(await loadPage()).toBeNull();
  expect(await loadDraft()).toEqual(canvas);
});
