import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
for(let i=0;i<6;i++)test('paid saved response case '+i+' geometry, motion interaction, responsive and persistence',async({page})=>{
 const folder='outputs/paid-six-audit/'+i;test.skip(!existsSync(folder+'/page.json'),'Await paid case');
 const canvas=JSON.parse(readFileSync(folder+'/canvas.json','utf8')),result=JSON.parse(readFileSync(folder+'/result.json','utf8')),generated=JSON.parse(readFileSync(folder+'/page.json','utf8'));
 expect(result.status).toBe('PASS');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.getByRole('status')).toContainText('草稿已就緒');
 await page.evaluate(async c=>new Promise<void>(res=>{const r=indexedDB.open('sketch2site',3);r.onsuccess=()=>{const d=r.result,t=d.transaction('drafts','readwrite');t.objectStore('drafts').put(c,'current');t.oncomplete=()=>{d.close();res();};};}),canvas);await page.reload();await expect(page.getByRole('status')).toContainText('草稿已就緒');
 await page.route('**/api/generation',async route=>{const request=route.request().postDataJSON();await route.fulfill({contentType:'application/json',body:JSON.stringify({requestId:request.requestId,page:generated,mode:'live',usage:result.usage})});});
 await page.getByRole('button',{name:'生成網站',exact:true}).click();await expect(page.getByRole('main',{name:'生成候選預覽'})).toBeVisible();
 const scope=page.getByRole('main',{name:'生成候選預覽'});
 for(const n of canvas.nodes){const el=scope.locator('[data-page-id="'+n.id+'"]');await expect(el).toBeVisible();for(const e of n.effects)await expect(el).toHaveAttribute('data-effects',new RegExp(e.presetId));}
 if(generated.draftLayout){const frame=scope.locator('.draft-layout');const box=await frame.boundingBox();expect(box).not.toBeNull();for(const n of canvas.nodes){const b=await scope.locator('[data-page-id="'+n.id+'"]').boundingBox();expect(Math.abs((b!.x-box!.x)/box!.width-n.x/1440)).toBeLessThan(.004);expect(Math.abs((b!.y-box!.y)/box!.height-n.y/1200)).toBeLessThan(.004);expect(Math.abs(b!.width/box!.width-n.width/1440)).toBeLessThan(.004);}}
 for(const n of canvas.nodes){const el=scope.locator('[data-page-id="'+n.id+'"]');const ids=n.effects.map((e:any)=>e.presetId);if(ids.includes('flip-card')){await el.getByRole('button',{name:'查看背面'}).click();await expect(el.getByText('這是我提供的背面資訊。')).toBeVisible();}if(ids.includes('fold-reveal')){await el.getByRole('button',{name:'折頁切換'}).click();await expect(el.getByText('這是我提供的下層內容。')).toBeVisible();}if(ids.includes('disclosure-panel')){await el.getByRole('button',{name:'展開內容'}).click();await expect(el.getByRole('button',{name:'收合內容'})).toBeVisible();}if(ids.includes('physics-tag-field'))await expect(el.getByRole('list')).toBeVisible();}
 for(const button of await scope.locator('a.page-button').all()){const ratio=await button.evaluate(el=>{const c=getComputedStyle(el),rgb=(v:string)=>v.match(/[\d.]+/g)!.slice(0,3).map(Number),lum=(v:number[])=>v.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);const a=lum(rgb(c.color)),b=lum(rgb(c.backgroundColor));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(ratio).toBeGreaterThanOrEqual(4.5);}
 await page.screenshot({path:folder+'/desktop.png',fullPage:true});
 await page.getByRole('button',{name:'使用此版本',exact:true}).click();await expect(page.getByRole('main',{name:'生成候選預覽'})).not.toBeVisible();
 await page.setViewportSize({width:375,height:900});for(const n of canvas.nodes)await expect(page.locator('.preview-frame [data-page-id="'+n.id+'"]')).toBeVisible();
 const frame=page.locator('.preview-frame');expect(await frame.evaluate(e=>e.scrollWidth<=e.clientWidth+2)).toBe(true);
 await page.screenshot({path:folder+'/mobile.png',fullPage:true});expect(errors).toEqual([]);
});
