import { crc32 } from "./archive";
import { database } from "./storage";
import { isLocalAsset } from "./assetRef";
export const assetLimits = {
  rawBytes: 5 * 1024 * 1024,
  bytes: 2 * 1024 * 1024,
  count: 10,
  totalBytes: 20 * 1024 * 1024,
  pixels: 12000000,
  edge: 4096,
  normalizedEdge: 1600,
};
export type LocalAsset = {
  schemaVersion: 1;
  ref: string;
  blob: Blob;
  width: number;
  height: number;
};
export class AssetError extends Error {}
export function assetErrorMessage(error: unknown) {
  return error instanceof AssetError
    ? error.message
    : "照片處理失敗，請再試一次";
}
const failure = () =>
  new AssetError("圖片無效：請使用 5 MB 以內的 PNG 或 JPEG");
export function inspectRaster(bytes: Uint8Array, mime: string) {
  if (bytes.length > assetLimits.rawBytes) throw failure();
  let width = 0,
    height = 0;
  if (mime === "image/png") {
    if (
      bytes.length < 45 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
    )
      throw failure();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (
      view.getUint32(8) !== 13 ||
      String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
    )
      throw failure();
    width = view.getUint32(16);
    height = view.getUint32(20);
    const end = [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];
    if (!end.every((v, i) => bytes[bytes.length - 12 + i] === v))
      throw failure();
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset),
        kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (length > bytes.length - offset - 12 || kind === "acTL")
        throw failure();
      if (
        crc32(bytes.subarray(offset + 4, offset + 8 + length)) !==
        view.getUint32(offset + 8 + length)
      )
        throw failure();
      offset += length + 12;
      if (kind === "IEND") {
        if (offset !== bytes.length) throw failure();
        break;
      }
    }
  } else if (mime === "image/jpeg") {
    if (
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes.at(-2) !== 255 ||
      bytes.at(-1) !== 217
    )
      throw failure();
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) throw failure();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      const length = bytes[offset] * 256 + bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) throw failure();
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8 || width) throw failure();
        height = bytes[offset + 3] * 256 + bytes[offset + 4];
        width = bytes[offset + 5] * 256 + bytes[offset + 6];
      }
      offset += length;
    }
  } else throw failure();
  if (
    !width ||
    !height ||
    width > assetLimits.edge ||
    height > assetLimits.edge ||
    width * height > assetLimits.pixels
  )
    throw failure();
  return { width, height };
}
async function fingerprint(blob: Blob) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function validateAsset(
  input: unknown,
  ref?: string,
): Promise<LocalAsset> {
  const v = input as LocalAsset;
  if (
    !v ||
    typeof v !== "object" ||
    Object.keys(v).some(
      (k) => !["schemaVersion", "ref", "blob", "width", "height"].includes(k),
    ) ||
    v.schemaVersion !== 1 ||
    !isLocalAsset(v.ref ?? "") ||
    (ref && ref !== v.ref) ||
    !(v.blob instanceof Blob) ||
    !(v.blob.type === "image/png" || v.blob.type === "image/jpeg") ||
    v.blob.size > assetLimits.bytes ||
    !v.blob.size ||
    !Number.isInteger(v.width) ||
    !Number.isInteger(v.height) ||
    v.width < 1 ||
    v.height < 1 ||
    v.width > 1600 ||
    v.height > 1600
  )
    throw failure();
  const size = inspectRaster(
    new Uint8Array(await v.blob.arrayBuffer()),
    v.blob.type,
  );
  if (
    size.width !== v.width ||
    size.height !== v.height ||
    v.ref !== `/assets/local/${await fingerprint(v.blob)}.${v.blob.type === "image/png" ? "png" : "jpg"}`
  )
    throw failure();
  return v;
}
export async function storeAsset(blob: Blob, width: number, height: number) {
  if (blob.size > assetLimits.bytes || !(blob.type === "image/png" || blob.type === "image/jpeg"))
    throw failure();
  const ref = `/assets/local/${await fingerprint(blob)}.${blob.type === "image/png" ? "png" : "jpg"}`,
    value = await validateAsset({ schemaVersion: 1, ref, blob, width, height });
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("assets", "readwrite"),
        store = t.objectStore("assets"),
        r = store.getAll();
      let error: Error | undefined;
      r.onsuccess = () => {
        try {
          const records = r.result as LocalAsset[];
          if (
            records.some(
              (v) =>
                !v ||
                !(v.blob instanceof Blob) ||
                v.blob.size > assetLimits.bytes,
            )
          ) {
            error = new AssetError("照片資料讀不到，請重新整理頁面");
            t.abort();
            return;
          }
          if (records.some((v) => v.ref === ref)) {
            store.put(value, ref);
            return;
          }
          if (
            records.length >= assetLimits.count ||
            records.reduce((sum, v) => sum + v.blob.size, 0) + blob.size >
              assetLimits.totalBytes
          ) {
            error = new AssetError(
              "照片已經放滿 10 張，請用已經放進來的照片",
            );
            t.abort();
            return;
          }
          store.put(value, ref);
        } catch {
          error = new AssetError("照片沒存成功，可能是瀏覽器空間不夠");
          t.abort();
        }
      };
      t.oncomplete = () => resolve();
      t.onabort = () =>
        reject(error ?? new AssetError("照片沒存成功，請再試一次"));
      t.onerror = () =>
        reject(new AssetError("照片沒存成功，可能是瀏覽器空間不夠"));
    });
  } finally {
    db.close();
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("sketch-assets-changed"));
  return value;
}
export async function readAsset(ref: string) {
  if (!isLocalAsset(ref)) return null;
  const db = await database();
  let value: unknown;
  try {
    value = await new Promise((resolve, reject) => {
      const r = db.transaction("assets").objectStore("assets").get(ref);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new AssetError("無法讀取本機圖片"));
    });
  } finally {
    db.close();
  }
  return value == null ? null : validateAsset(value, ref);
}
export async function listAssetRefs(): Promise<string[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("assets").objectStore("assets").getAllKeys();
      r.onsuccess = () =>
        resolve(
          r.result.filter(
            (v): v is string => typeof v === "string" && isLocalAsset(v),
          ),
        );
      r.onerror = () => reject(new AssetError("無法讀取本機素材"));
    });
  } finally {
    db.close();
  }
}
export async function importImage(file: File) {
  if (!file.size || file.size > assetLimits.rawBytes) throw failure();
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Native file pickers may omit MIME or report legacy PNG/JPEG aliases.
  // Only the missing MIME case uses the signature; explicit other formats fail.
  const mime = file.type === ""
    ? (bytes[0] === 137 ? "image/png" : "image/jpeg")
    : ({ "image/x-png": "image/png", "image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg" }[file.type] ?? file.type);
  inspectRaster(bytes, mime);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw failure();
  }
  try {
    if (
      bitmap.width * bitmap.height > assetLimits.pixels ||
      bitmap.width > assetLimits.edge ||
      bitmap.height > assetLimits.edge
    )
      throw failure();
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw failure();
    const encode = (type: string, quality?: number) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b && b.type === type ? resolve(b) : reject(failure())), type, quality),
      );
    // Photos stay JPEG; PNG keeps transparency. A PNG that is too large becomes a JPEG
    // on a white background. Re-encoding always drops metadata.
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = mime === "image/jpeg" ? await encode("image/jpeg", 0.9) : await encode("image/png");
    if (blob.size > assetLimits.bytes) {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = "source-over";
      for (const quality of [0.88, 0.8, 0.7]) {
        blob = await encode("image/jpeg", quality);
        if (blob.size <= assetLimits.bytes) break;
      }
    }
    if (blob.size > assetLimits.bytes)
      throw new AssetError("圖片轉換後超過 2 MB，請縮小後重試");
    return await storeAsset(blob, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
}
