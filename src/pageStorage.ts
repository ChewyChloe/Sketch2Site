import { z } from "zod";
import { database } from "./storage";
import { PageSchema } from "./pageSpec";
import type { PageSession } from "./patch";
export const projectId = "local-project";
export const PageRecordSchema = z
  .object({
    projectId: z.literal(projectId),
    schemaVersion: z.literal(1),
    pageSpec: PageSchema,
    revision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 2),
    writerSessionId: z.string().uuid(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type PageRecord = z.infer<typeof PageRecordSchema>;
export type Token = { revision: number; writerSessionId: string } | null;
export type StorageCode =
  | "UNAVAILABLE"
  | "CORRUPT"
  | "UNSUPPORTED"
  | "CONFLICT"
  | "QUOTA"
  | "ABORTED"
  | "INVALID";
export class PageStorageError extends Error {
  constructor(public code: StorageCode) {
    super(
      {
        UNAVAILABLE: "瀏覽器不讓網站存資料，請在設定裡允許後再試",
        CORRUPT: "頁面資料讀不到，請重新整理",
        UNSUPPORTED: "這份頁面版本太舊，請重新開始",
        CONFLICT: "這份專案已在其他分頁更新，請重新載入",
        QUOTA: "儲存空間不足，修改仍保留在本頁",
        ABORTED: "儲存已中斷，修改仍保留在本頁",
        INVALID: "頁面資料有問題，沒有存下來",
      }[code],
    );
  }
}
export function storageError(error: unknown): PageStorageError {
  if (error instanceof PageStorageError) return error;
  const name = error instanceof Error ? error.name : "";
  return new PageStorageError(
    name === "QuotaExceededError"
      ? "QUOTA"
      : name === "AbortError"
        ? "ABORTED"
        : "UNAVAILABLE",
  );
}
function checked(raw: unknown): PageRecord {
  const result = PageRecordSchema.safeParse(raw);
  if (result.success) return result.data;
  const old = raw as Partial<PageRecord> | null;
  throw new PageStorageError(
    old &&
      typeof old === "object" &&
      ((old.schemaVersion !== undefined && old.schemaVersion !== 1) ||
        (old.pageSpec &&
          old.pageSpec.schemaVersion !== undefined &&
          old.pageSpec.schemaVersion !== 2))
      ? "UNSUPPORTED"
      : "CORRUPT",
  );
}
export function tokenOf(record: PageRecord): Token {
  return { revision: record.revision, writerSessionId: record.writerSessionId };
}
export async function loadPage(): Promise<PageRecord | null> {
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    return await new Promise((resolve, reject) => {
      const tx = db!.transaction("pages", "readonly");
      let value: PageRecord | null = null,
        problem: unknown;
      const request = tx.objectStore("pages").get(projectId);
      request.onsuccess = () => {
        try {
          value = request.result === undefined ? null : checked(request.result);
        } catch (e) {
          problem = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(problem ?? tx.error);
      tx.onerror = () => {
        problem ??= tx.error;
      };
    });
  } catch (e) {
    throw storageError(e);
  } finally {
    db?.close();
  }
}
export function recordOf(session: PageSession): PageRecord {
  return PageRecordSchema.parse({
    projectId,
    schemaVersion: 1,
    pageSpec: session.history.present,
    revision: session.revision,
    writerSessionId: session.sessionId,
    updatedAt: new Date().toISOString(),
  });
}
export async function savePage(
  input: unknown,
  expected: Token,
): Promise<PageRecord> {
  const parsed = PageRecordSchema.safeParse(input);
  if (!parsed.success) throw new PageStorageError("INVALID");
  const record = parsed.data;
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    return await new Promise((resolve, reject) => {
      const tx = db!.transaction("pages", "readwrite");
      const store = tx.objectStore("pages");
      let problem: unknown;
      const request = store.get(projectId);
      request.onsuccess = () => {
        try {
          const actual =
            request.result === undefined ? null : checked(request.result);
          if (
            actual === null
              ? expected !== null
              : expected === null ||
                actual.revision !== expected.revision ||
                actual.writerSessionId !== expected.writerSessionId
          )
            throw new PageStorageError("CONFLICT");
          if (actual && record.revision <= actual.revision)
            throw new PageStorageError("CONFLICT");
          store.put(record, projectId);
        } catch (e) {
          problem = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(record);
      tx.onabort = () => reject(problem ?? tx.error);
      tx.onerror = () => {
        problem ??= tx.error;
      };
    });
  } catch (e) {
    throw storageError(e);
  } finally {
    db?.close();
  }
}
// Only called following explicit user confirmation. Archive + replacement are one transaction.
export async function restartDamagedPage(input: unknown): Promise<PageRecord> {
  const parsed = PageRecordSchema.safeParse(input);
  if (!parsed.success) throw new PageStorageError("INVALID");
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    return await new Promise((resolve, reject) => {
      const tx = db!.transaction(["pages", "pageBackups"], "readwrite");
      let problem: unknown;
      const store = tx.objectStore("pages");
      const request = store.get(projectId);
      request.onsuccess = () => {
        try {
          if (
            request.result === undefined ||
            PageRecordSchema.safeParse(request.result).success
          )
            throw new PageStorageError("CONFLICT");
          tx.objectStore("pageBackups").put(
            {
              projectId,
              original: request.result,
              archivedAt: new Date().toISOString(),
            },
            crypto.randomUUID(),
          );
          store.put(parsed.data, projectId);
        } catch (e) {
          problem = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(parsed.data);
      tx.onabort = () => reject(problem ?? tx.error);
      tx.onerror = () => {
        problem ??= tx.error;
      };
    });
  } catch (e) {
    throw storageError(e);
  } finally {
    db?.close();
  }
}
