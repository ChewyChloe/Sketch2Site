// Small ZIP/STORE writer: fixed application paths, no dependencies or executable archive metadata.
const encoder = new TextEncoder();
export type ProjectFile = { path: string; content: string | Uint8Array };
const crcTable = Uint32Array.from({length:256},(_,i)=>{let value=i;for(let n=0;n<8;n++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0;});
export function crc32(bytes: Uint8Array) { let crc=0xffffffff;for(const byte of bytes)crc=(crc>>>8)^crcTable[(crc^byte)&255];return (crc^0xffffffff)>>>0; }
export function zipProject(files: readonly ProjectFile[]): ArrayBuffer {
  if (!files.length || files.length > 100)
    throw new Error("匯出檔案數量無效。");
  const seen = new Set<string>();
  let offset = 0;
  const local: Uint8Array[] = [],
    central: Uint8Array[] = [];
  for (const file of files) {
    if (
      !/^[A-Za-z0-9_./-]{1,160}$/.test(file.path) ||
      file.path.startsWith("/") ||
      file.path.split("/").some((p) => !p || p === "." || p === "..") ||
      seen.has(file.path)
    )
      throw new Error("匯出路徑無效。");
    seen.add(file.path);
    const name = encoder.encode(file.path),
      data =
        typeof file.content === "string"
          ? encoder.encode(file.content)
          : file.content,
      crc = crc32(data);
    if (
      data.length > 24 * 1024 * 1024 ||
      offset + data.length > 32 * 1024 * 1024
    )
      throw new Error("匯出檔案超過容量限制。");
    const header = new Uint8Array(30 + name.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint16(12, 33, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true);
    header.set(name, 30);
    local.push(header, data);
    const entry = new Uint8Array(46 + name.length),
      e = new DataView(entry.buffer);
    e.setUint32(0, 0x02014b50, true);
    e.setUint16(4, 20, true);
    e.setUint16(6, 20, true);
    e.setUint16(8, 0x800, true);
    e.setUint16(14, 33, true);
    e.setUint32(16, crc, true);
    e.setUint32(20, data.length, true);
    e.setUint32(24, data.length, true);
    e.setUint16(28, name.length, true);
    e.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += header.length + data.length;
  }
  const centralSize = central.reduce((sum, b) => sum + b.length, 0),
    end = new Uint8Array(22),
    v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, files.length, true);
  v.setUint16(10, files.length, true);
  v.setUint32(12, centralSize, true);
  v.setUint32(16, offset, true);
  const result = new Uint8Array(offset + centralSize + end.length);
  let at = 0;
  for (const part of [...local, ...central, end]) {
    result.set(part, at);
    at += part.length;
  }
  return result.buffer;
}
