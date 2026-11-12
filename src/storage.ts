import { CanvasSchema, type CanvasSpec } from "./spec";
export async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("sketch2site", 3);
    r.onupgradeneeded = () => {
      for (const name of ["drafts", "pages", "pageBackups", "assets"])
        if (!r.result.objectStoreNames.contains(name))
          r.result.createObjectStore(name);
    };
    let blocked = false;
    r.onsuccess = () => {
      if (blocked) {
        r.result.close();
        return;
      }
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
    r.onblocked = () => {
      blocked = true;
      reject(new Error("請關閉其他工作台分頁後重試"));
    };
  });
}
export async function saveDraft(value: CanvasSpec) {
  const parsed = CanvasSchema.parse(value);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("drafts", "readwrite");
      t.objectStore("drafts").put(parsed, "current");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
export async function loadDraft(): Promise<CanvasSpec | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("drafts").objectStore("drafts").get("current");
      r.onsuccess = () => {
        try {
          resolve(r.result ? CanvasSchema.parse(r.result) : null);
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
