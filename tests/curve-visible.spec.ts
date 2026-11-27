import { choose } from "./helpers/select";
import {test,expect} from '@playwright/test';
import {PageSchema} from '../src/pageSpec';
import {createMotion} from '../src/motion';
const text='在這裡寫下想法'.repeat(6),id='83000000-0000-4000-8000-000000000002';
for(const width of [1002,375])test(`long Chinese text actually follows visible curves at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');await page.getByRole('button',{name:'預覽',exact:true}).click();
 const input=PageSchema.parse({schemaVersion:2,metadata:{title:'曲線驗證（非AI）',language:'zh-Hant'},typography:'sans',styles:'neutral',responsive:{mobileColumns:1,desktopColumns:1},sections:[{id:'83000000-0000-4000-8000-000000000001',type:'section',children:[{id,type:'paragraph',content:text,effects:[createMotion('curved-path-text',id)]}]}]});
 await page.getByLabel('載入頁面檔案').setInputFiles({name:'curve-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
 await page.emulateMedia({reducedMotion:'reduce'});
 const curve=page.locator('.preview-frame .motion-curve');await expect(curve).toHaveAttribute('data-curve-layout','curved');await expect(curve.locator('.motion-sr')).toHaveText(text);
 await expect.poll(async()=> (await curve.locator('textPath').allTextContents()).join('')).toBe(text);
 const metrics=await curve.locator('svg').evaluateAll(elements=>elements.map(svg=>{const path=svg.querySelector('path')!,length=path.getTotalLength(),a=path.getPointAtLength(0),b=path.getPointAtLength(length/2),c=path.getPointAtLength(length),t=svg.querySelector('text')!;const ys=Array.from({length:t.getNumberOfChars()},(_,i)=>t.getExtentOfChar(i).y);return{rise:Math.abs(b.y-(a.y+c.y)/2),glyphSpread:Math.max(...ys)-Math.min(...ys),width:svg.getBoundingClientRect().width,parentWidth:svg.parentElement!.getBoundingClientRect().width};}));
 expect(metrics.length).toBeGreaterThanOrEqual(width===375?2:1);for(const m of metrics){expect(m.rise).toBeGreaterThan(12);expect(m.glyphSpread).toBeGreaterThan(5);expect(m.width).toBeLessThanOrEqual(m.parentWidth+1);}
 for(const svg of await curve.locator('svg').all()){await expect.poll(()=>svg.evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);await expect(svg).toHaveCSS('opacity','1');}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/curve-fixed-${width}.png`});
 const rows=await curve.locator('textPath').count();for(const scale of ['0.75','0.5','1']){await choose(page.getByLabel('預覽縮放'), scale);await expect(curve.locator('textPath')).toHaveCount(rows);expect((await curve.locator('textPath').allTextContents()).join('')).toBe(text);}
});
