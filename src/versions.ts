import { z } from "zod";
import { database } from "./storage";
import { PageSchema, type PageSpec } from "./pageSpec";

// Site version timeline: named snapshots of the whole site, kept per project in the existing
// drafts store (key "versions:<project id>"), so no database upgrade is needed. Versions are
// added at the moments people care about (AI generation, a note that rewrote a section, an
// export, a restore, or by hand). Restoring never deletes anything: it is a new version.

export const maxVersions = 40;
export const versionKinds = ["generate", "notes", "export", "manual", "restore"] as const;
export type VersionKind = (typeof versionKinds)[number];
export const versionKindLabels: Record<VersionKind, string> = { generate: "AI 生成", notes: "AI 修改", export: "匯出", manual: "手動存檔", restore: "還原" };

const VersionSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().min(1).max(40),
    kind: z.enum(versionKinds),
    at: z.iso.datetime(),
    page: z.unknown(),
  })
  .strict();
export type SiteVersion = { id: string; label: string; kind: VersionKind; at: string; page: PageSpec };
const ListSchema = z.array(VersionSchema).max(maxVersions);

const keyFor = async (store: IDBObjectStore) => {
  const active = await new Promise<unknown>((resolve, reject) => {
    const r = store.get("projects:active");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return "versions:" + (typeof active === "string" ? active : "default");
};

async function withList<T>(mode: IDBTransactionMode, work: (list: SiteVersion[]) => { list?: SiteVersion[]; result: T }): Promise<T> {
  const db = await database();
  try {
    const tx = db.transaction("drafts", mode);
    const store = tx.objectStore("drafts");
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("版本紀錄已中斷"));
    });
    const key = await keyFor(store);
    const raw = await new Promise<unknown>((resolve, reject) => {
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const parsed = ListSchema.safeParse(raw ?? []);
    // Every stored page is checked again on the way out; a damaged one is dropped, not shown.
    const list = (parsed.success ? parsed.data : []).flatMap((v) => {
      const page = PageSchema.safeParse(v.page);
      return page.success ? [{ ...v, page: page.data } as SiteVersion] : [];
    });
    const out = work(list);
    if (out.list && mode === "readwrite") store.put(out.list, key);
    await done;
    return out.result;
  } finally {
    db.close();
  }
}

/** Newest first. */
export const listVersions = () => withList("readonly", (list) => ({ result: [...list].reverse() }));

/** Adds a version unless it is identical to the newest one. Oldest versions drop off past the limit. */
export function addVersion(label: string, kind: VersionKind, page: PageSpec) {
  const clean = PageSchema.parse(page);
  return withList("readwrite", (list) => {
    const last = list.at(-1);
    if (last && JSON.stringify(last.page) === JSON.stringify(clean)) return { result: null };
    const version: SiteVersion = { id: crypto.randomUUID(), label: label.trim().slice(0, 40) || "未命名版本", kind, at: new Date().toISOString(), page: clean };
    return { list: [...list, version].slice(-maxVersions), result: version };
  });
}

export function renameVersion(id: string, label: string) {
  return withList("readwrite", (list) => ({ list: list.map((v) => (v.id === id ? { ...v, label: label.trim().slice(0, 40) || v.label } : v)), result: true }));
}

/** A label for a version made by notes: the first heading of the first changed section. */
export function sectionLabel(page: PageSpec, sectionIds: readonly string[]) {
  const sections = [...page.sections, ...(page.subpages ?? []).flatMap((p) => p.sections)].filter((s) => sectionIds.includes(s.id));
  const heading = (n: PageSpec["sections"][number]): string | undefined =>
    n.type === "heading" && n.content?.trim() ? n.content.trim() : n.children?.map(heading).find(Boolean);
  const name = sections.map(heading).find(Boolean);
  const short = name ? (name.length > 10 ? name.slice(0, 10) + "…" : name) : "";
  return short ? `修改「${short}」區塊` + (sections.length > 1 ? `等 ${sections.length} 區` : "") : "修改網站";
}
