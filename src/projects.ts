import { z } from "zod";
import { database } from "./storage";
import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { projectId as activePageKey } from "./pageStorage";

// Multiple local projects without a schema-version bump: the open project keeps
// using the existing keys ("current" draft, "local-project" page) so every
// existing reader/writer is unchanged. Other projects are parked as records in
// the drafts store and swapped in atomically when opened.

const INDEX_KEY = "projects:index";
const ACTIVE_KEY = "projects:active";
const recordKey = (id: string) => "project:" + id;
export const maxProjects = 30;
// Set right before a deliberate reload after a project switch; the draft was already saved.
export const projectSwitch = { reloading: false };

const MetaSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
const IndexSchema = z.array(MetaSchema).max(maxProjects);
// Parked page records are validated by pageStorage when they become active again.
const ParkedSchema = z
  .object({ draft: CanvasSchema, page: z.unknown().nullable() })
  .strict();

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  active: boolean;
  draft: CanvasSpec;
  hasPage: boolean;
};

type Stores = { drafts: IDBObjectStore; pages: IDBObjectStore };
const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

async function withStores<T>(mode: IDBTransactionMode, work: (s: Stores) => Promise<T>): Promise<T> {
  const db = await database();
  try {
    const tx = db.transaction(["drafts", "pages"], mode);
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("專案操作已中斷"));
    });
    const result = await work({ drafts: tx.objectStore("drafts"), pages: tx.objectStore("pages") });
    await done;
    return result;
  } finally {
    db.close();
  }
}

const now = () => new Date().toISOString();
const freshDraft = (name: string): CanvasSpec => {
  const d = blank();
  return { ...d, metadata: { ...d.metadata, name, layoutMode: "reflow" } };
};

// First use: the existing single draft becomes the first project.
async function ensureIndex(s: Stores) {
  const index = IndexSchema.safeParse(await req(s.drafts.get(INDEX_KEY)));
  const active = await req(s.drafts.get(ACTIVE_KEY));
  if (index.success && index.data.length && typeof active === "string" && index.data.some((p) => p.id === active))
    return { index: index.data, active };
  const id = crypto.randomUUID(), at = now();
  const list = [{ id, createdAt: at, updatedAt: at }];
  s.drafts.put(list, INDEX_KEY);
  s.drafts.put(id, ACTIVE_KEY);
  return { index: list, active: id };
}

async function activeSnapshot(s: Stores) {
  const draft = CanvasSchema.safeParse(await req(s.drafts.get("current")));
  const page = (await req(s.pages.get(activePageKey))) ?? null;
  return { draft: draft.success ? draft.data : freshDraft("未命名草稿"), page };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return withStores("readwrite", async (s) => {
    const { index, active } = await ensureIndex(s);
    const out: ProjectSummary[] = [];
    for (const meta of index) {
      let draft: CanvasSpec, hasPage: boolean;
      if (meta.id === active) {
        const snap = await activeSnapshot(s);
        draft = snap.draft;
        hasPage = snap.page != null;
      } else {
        const parked = ParkedSchema.safeParse(await req(s.drafts.get(recordKey(meta.id))));
        if (!parked.success) continue; // damaged records stay stored but are not offered
        draft = parked.data.draft;
        hasPage = parked.data.page != null;
      }
      out.push({ id: meta.id, name: draft.metadata.name, updatedAt: meta.updatedAt, active: meta.id === active, draft, hasPage });
    }
    return out.sort((a, b) => Number(b.active) - Number(a.active) || b.updatedAt.localeCompare(a.updatedAt));
  });
}

// Park the open project and make `id` the open one. Caller reloads the app.
async function activate(s: Stores, index: z.infer<typeof IndexSchema>, from: string, to: string, incoming?: { draft: CanvasSpec; page: unknown }) {
  const snap = await activeSnapshot(s);
  if (index.some((p) => p.id === from)) s.drafts.put({ draft: snap.draft, page: snap.page }, recordKey(from));
  const target = incoming ?? ParkedSchema.parse(await req(s.drafts.get(recordKey(to))));
  s.drafts.put(target.draft, "current");
  if (target.page == null) s.pages.delete(activePageKey);
  else s.pages.put(target.page, activePageKey);
  s.drafts.delete(recordKey(to));
  s.drafts.put(to, ACTIVE_KEY);
}

const touch = (index: z.infer<typeof IndexSchema>, id: string) =>
  index.map((p) => (p.id === id ? { ...p, updatedAt: now() } : p));

export async function openProject(id: string) {
  return withStores("readwrite", async (s) => {
    const { index, active } = await ensureIndex(s);
    if (id === active) return;
    if (!index.some((p) => p.id === id)) throw new Error("找不到這個專案");
    await activate(s, index, active, id);
    s.drafts.put(touch(touch(index, active), id), INDEX_KEY);
  });
}

export async function createProject(name = "未命名草稿", from?: CanvasSpec) {
  return withStores("readwrite", async (s) => {
    const { index, active } = await ensureIndex(s);
    if (index.length >= maxProjects) throw new Error(`最多 ${maxProjects} 個專案，請先刪除不需要的專案`);
    const id = crypto.randomUUID(), at = now();
    const draft = CanvasSchema.parse(from ? { ...from, metadata: { ...from.metadata, name: name.slice(0, 80), layoutMode: from.metadata.layoutMode ?? "reflow" } } : freshDraft(name.slice(0, 80)));
    await activate(s, index, active, id, { draft, page: null });
    s.drafts.put([...touch(index, active), { id, createdAt: at, updatedAt: at }], INDEX_KEY);
    return id;
  });
}

export async function duplicateProject(id: string) {
  return withStores("readwrite", async (s) => {
    const { index, active } = await ensureIndex(s);
    if (index.length >= maxProjects) throw new Error(`最多 ${maxProjects} 個專案，請先刪除不需要的專案`);
    const source = id === active ? await activeSnapshot(s) : ParkedSchema.parse(await req(s.drafts.get(recordKey(id))));
    const copy = crypto.randomUUID(), at = now();
    const name = (source.draft.metadata.name + " 副本").slice(0, 80);
    s.drafts.put({ draft: { ...source.draft, metadata: { ...source.draft.metadata, name } }, page: source.page }, recordKey(copy));
    s.drafts.put([...index, { id: copy, createdAt: at, updatedAt: at }], INDEX_KEY);
    return copy;
  });
}

export async function renameProject(id: string, name: string) {
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new Error("專案名稱不能空白");
  return withStores("readwrite", async (s) => {
    const { index, active } = await ensureIndex(s);
    if (id === active) {
      const snap = await activeSnapshot(s);
      s.drafts.put({ ...snap.draft, metadata: { ...snap.draft.metadata, name: clean } }, "current");
    } else {
      const parked = ParkedSchema.parse(await req(s.drafts.get(recordKey(id))));
      s.drafts.put({ ...parked, draft: { ...parked.draft, metadata: { ...parked.draft.metadata, name: clean } } }, recordKey(id));
    }
    s.drafts.put(touch(index, id), INDEX_KEY);
  });
}

/** Deletes a project. Deleting the open one opens the most recent other project. */
export async function deleteProject(id: string): Promise<boolean> {
  return withStores("readwrite", async (s) => {
    const { index, active } = await ensureIndex(s);
    if (index.length <= 1) throw new Error("至少要保留一個專案");
    const rest = index.filter((p) => p.id !== id);
    if (id === active) {
      const next = [...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const target = ParkedSchema.parse(await req(s.drafts.get(recordKey(next.id))));
      s.drafts.put(target.draft, "current");
      if (target.page == null) s.pages.delete(activePageKey);
      else s.pages.put(target.page, activePageKey);
      s.drafts.delete(recordKey(next.id));
      s.drafts.put(next.id, ACTIVE_KEY);
    } else s.drafts.delete(recordKey(id));
    // The project's site versions go with it (versions.ts).
    s.drafts.delete("versions:" + id);
    s.drafts.put(rest, INDEX_KEY);
    return id === active;
  });
}
