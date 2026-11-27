import {openWebsiteWorkspace} from "./helpers/workbench";
import {test,expect} from '@playwright/test';
import {openPanel} from './helpers/workbench';
for(const width of [1440,768,375])test(`native library review: readable, directly interactive, isolated replay ${width}`,async({page})=>{
 const errors:string[]=[],external:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/generation'))external.push(r.url());});
 await page.setViewportSize({width,height:1000});await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');await openWebsiteWorkspace(page);await openPanel(page,'動畫');
 const library=page.locator('#preview-inspector .animation-library');await expect(library.locator('[data-effect-id]')).toHaveCount(80);await expect(library.locator('.preview-error')).toHaveCount(0);
 for(const sample of await library.locator('.rendered-page').all()){
  expect(await sample.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);await expect(sample).toHaveCSS('transform','none');
 }
 // Effects are grouped into family lists; each list uses the same column layout.
 const gallery=library.locator('.animation-assets').first();
 const columns=await gallery.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);expect(columns).toBe(width===1440?2:1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const panelWidth=(await page.locator('#preview-inspector').boundingBox())!.width;
 if(width===1440){expect(panelWidth).toBe(560);expect((await page.locator('.preview-scroll').boundingBox())!.width).toBeGreaterThan(panelWidth);}
 const fade=library.locator('[data-effect-id="fade-in"]'),slide=library.locator('[data-effect-id="slide-up"]');
 const before=await slide.locator('[data-page-id]').first().getAttribute('data-page-id');
 const size=await fade.boundingBox();await fade.getByRole('button',{name:'重播淡入示意'}).click();expect((await fade.boundingBox())!.height).toBe(size!.height);
 expect(await slide.locator('[data-page-id]').first().getAttribute('data-page-id')).toBe(before);
 for(const button of await library.locator('.asset-actions button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:`test-results/library-readable-${width}.png`});
 const flip=library.locator('[data-effect-id="flip-card"]');await flip.scrollIntoViewIfNeeded();await flip.getByRole('button',{name:'查看背面'}).click();await expect(flip.getByText('把細節，說清楚')).toBeVisible();
 await flip.getByRole('button',{name:'查看正面'}).focus();await page.keyboard.press('Space');await expect(flip.getByText('從想法到作品')).toBeVisible();
 const fold=library.locator('[data-effect-id="fold-reveal"]');await fold.scrollIntoViewIfNeeded();await fold.getByRole('button',{name:'折頁切換'}).click();await expect(fold.getByText('下一層，藏著新想法')).toBeVisible();
 const physics=library.locator('[data-effect-id="physics-tag-field"]');await physics.scrollIntoViewIfNeeded();const canvas=physics.locator('canvas');await expect(canvas).toBeVisible();expect((await canvas.boundingBox())!.height).toBeCloseTo(180, 1);
 await physics.getByRole('button',{name:'拖曳標籤',exact:true}).click();await expect(canvas).toHaveCSS('touch-action','none');
 await expect.poll(()=>canvas.evaluate((el:HTMLCanvasElement)=>el.getContext('2d')!.getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0))).toBe(true);
 const metrics=await physics.evaluate(el=>{const c=el.querySelector('canvas')!,button=el.querySelector('.motion-toggle')!,container=el.querySelector('.asset-preview')!,cr=c.getBoundingClientRect(),br=button.getBoundingClientRect(),r=container.getBoundingClientRect();return{canvasHeight:cr.height,buttonHeight:br.height,buttonInside:br.top>=r.top&&br.bottom<=r.bottom,canvasInside:cr.top>=r.top&&cr.bottom<=r.bottom};});
 expect(metrics.buttonInside&&metrics.canvasInside).toBe(true);expect(metrics.buttonHeight).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:`test-results/library-interaction-${width}.png`});await physics.getByRole('button',{name:'退出標籤拖曳'}).click();await expect(canvas).toHaveCSS('touch-action','pan-y');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(physics.locator('canvas')).toHaveCount(0);await expect(physics.getByRole('list')).toBeVisible();
 await openPanel(page,'屬性');if(width===1440)expect((await page.locator('#preview-inspector').boundingBox())!.width).toBe(288);
 await page.getByRole('button',{name:'關閉工具面板'}).click();await expect(page.locator('#preview-inspector')).toBeHidden();
 expect(errors).toEqual([]);expect(external).toEqual([]);
 const {writeFileSync}=await import('node:fs');writeFileSync(`test-results/library-metrics-${width}.json`,JSON.stringify(metrics,null,2));
});
test('hover demos respond to keyboard trials and previews never navigate away',async({page})=>{
 await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');await openWebsiteWorkspace(page);await openPanel(page,'動畫');
 const library=page.locator('#preview-inspector .animation-library'),lift=library.locator('[data-effect-id="hover-lift"]'),glow=library.locator('[data-effect-id="hover-glow"]');
 await lift.getByRole('button',{name:'體驗懸停浮起示意'}).click();await expect(lift.locator('.effect-lift')).toBeFocused();await expect.poll(()=>lift.locator('.effect-lift').evaluate(el=>getComputedStyle(el).transform)).not.toBe('none');
 await glow.getByRole('button',{name:'體驗懸停光暈示意'}).click();await expect(glow.locator('.effect-glow')).toBeFocused();await expect.poll(()=>glow.locator('.effect-glow').evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
 const popups:string[]=[];page.on('popup',p=>popups.push(p.url()));const url=page.url();await glow.getByRole('link').click();expect(page.url()).toBe(url);expect(popups).toEqual([]);
 await page.emulateMedia({reducedMotion:'reduce'});await lift.getByRole('button',{name:'體驗懸停浮起示意'}).click();await expect(lift.locator('.effect-lift')).toHaveCSS('transform','none');
});
