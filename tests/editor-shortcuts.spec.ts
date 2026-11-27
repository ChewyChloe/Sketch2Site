import {test,expect} from '@playwright/test';
import {generationFixtures} from './fixtures/generation';
test('draft supports copy/paste/select-all/cut/group/ungroup and native text editing',async({page})=>{
 await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');
 const c=generationFixtures()[0];await page.evaluate(async c=>new Promise<void>((res,rej)=>{const r=indexedDB.open('sketch2site',3);r.onsuccess=()=>{const d=r.result,t=d.transaction('drafts','readwrite');t.objectStore('drafts').put(c,'current');t.oncomplete=()=>{d.close();res();};t.onabort=()=>rej(t.error);};}),c);await page.reload();await expect(page.getByRole('status')).toContainText('草稿已就緒');
 const nodes=page.getByTestId('canvas-node');await expect(nodes).toHaveCount(6);await page.screenshot({path:'test-results/studio-clean.png',fullPage:true});
 await nodes.first().click();await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');await expect(nodes).toHaveCount(7);
 await page.keyboard.press('Control+a');await expect(page.locator('[data-testid="canvas-node"][aria-pressed="true"]')).toHaveCount(7);
 await page.keyboard.press('Control+g');const groups=await nodes.evaluateAll(ns=>ns.map(n=>n.getAttribute('data-group-id')));expect(groups.every(Boolean)).toBe(true);expect(new Set(groups).size).toBe(1);const b=await nodes.first().boundingBox();await page.keyboard.press('ArrowRight');const a=await nodes.first().boundingBox();const scale=await page.locator('.canvas-scroll').evaluate(e=>Number(getComputedStyle(e).getPropertyValue('--draft-scale')));expect(a!.x-b!.x).toBeCloseTo(scale,1);await page.keyboard.press('Control+Shift+g');
 await page.keyboard.press('Control+x');await expect(nodes).toHaveCount(0);await page.keyboard.press('Control+v');await expect(nodes).toHaveCount(7);
 await page.keyboard.press('Control+z');await expect(nodes).toHaveCount(0);await page.keyboard.press('Control+z');await expect(nodes).toHaveCount(7);
 const title=page.getByRole('textbox',{name:'專案名稱'});await title.fill('原生文字');await title.press('Control+a');await title.press('x');await expect(title).toHaveValue('x');await expect(nodes).toHaveCount(7);
 await page.screenshot({path:'test-results/editor-keyboard-refresh.png',fullPage:true});
});
