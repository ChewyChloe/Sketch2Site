import "fake-indexeddb/auto";
import { beforeEach,it,expect,vi } from "vitest";
import { deflateSync } from "node:zlib";
import { crc32 } from "./archive";
import { inspectRaster,storeAsset,readAsset,assetLimits } from "./assets";
import { database } from "./storage";
import { imageSource } from "./assetRef";
function png(value=120){
 const chunk=(name:string,content:Uint8Array)=>{const bytes=new Uint8Array(12+content.length),v=new DataView(bytes.buffer);v.setUint32(0,content.length);bytes.set(new TextEncoder().encode(name),4);bytes.set(content,8);v.setUint32(8+content.length,crc32(bytes.subarray(4,8+content.length)));return bytes;};
 const ihdr=new Uint8Array(13),view=new DataView(ihdr.buffer);view.setUint32(0,1);view.setUint32(4,1);ihdr[8]=8;ihdr[9]=6;
 return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr).buffer,chunk('IDAT',deflateSync(new Uint8Array([0,value,0,0,255]))).buffer,chunk('IEND',new Uint8Array()).buffer],{type:'image/png'});
}
beforeEach(async()=>{const db=await database();await new Promise<void>((res,rej)=>{const t=db.transaction('assets','readwrite');t.objectStore('assets').clear();t.oncomplete=()=>res();t.onabort=()=>rej(t.error);});db.close();});
it("validates real PNG structure/CRC, dimensions and exact format instead of trusting extensions",async()=>{
 const bytes=new Uint8Array(await png().arrayBuffer());expect(inspectRaster(bytes,'image/png')).toEqual({width:1,height:1});
 for(const mime of ['image/jpeg','image/svg+xml','text/html'])expect(()=>inspectRaster(bytes,mime)).toThrow();
 const broken=bytes.slice();broken[20]^=1;expect(()=>inspectRaster(broken,'image/png')).toThrow();
 expect(()=>inspectRaster(new TextEncoder().encode('<svg onload="alert(1)"/>'),'image/png')).toThrow();
 expect(()=>inspectRaster(new Uint8Array(assetLimits.rawBytes+1),'image/png')).toThrow();
});
it("deduplicates immutable images, verifies stored content hashes and rejects tampered records",async()=>{
 const first=await storeAsset(png(),1,1),second=await storeAsset(png(),1,1);expect(second.ref).toBe(first.ref);expect((await readAsset(first.ref))?.width).toBe(1);
 expect(imageSource.safeParse(first.ref).success).toBe(true);
 for(const path of ['https://example.com/x.png','blob:arbitrary','/assets/local/../x.png','data:image/png,abc'])expect(imageSource.safeParse(path).success).toBe(false);
 const db=await database();await new Promise<void>(resolve=>{const t=db.transaction('assets','readwrite');t.objectStore('assets').put({...first,blob:png(20)},first.ref);t.oncomplete=()=>resolve();});db.close();
 await expect(readAsset(first.ref)).rejects.toThrow();
 await storeAsset(png(),1,1);expect((await readAsset(first.ref))?.ref).toBe(first.ref);
});
it("enforces the count limit atomically and preserves valid existing images on failure",async()=>{
 for(let i=0;i<10;i++)await storeAsset(png(i),1,1);
 await expect(storeAsset(png(11),1,1)).rejects.toThrow('上限');
 expect((await storeAsset(png(0),1,1)).ref).toMatch(/\.png$/);
 const native=IDBObjectStore.prototype.put,spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if(this.name==='assets')throw new DOMException('simulated','QuotaExceededError');return native.apply(this,args);});
 try{await expect(storeAsset(png(0),1,1)).rejects.toThrow('儲存失敗');}finally{spy.mockRestore();}
});
