import {test,expect} from '@playwright/test';
test('public HTTPS remains after blur; invalid URL stays visible with a reason; save shows completion',async({page})=>{
 await page.goto('/');await expect(page.getByRole('status')).toContainText('草稿已就緒');await page.getByRole('button',{name:'新增按鈕',exact:true}).click();await page.getByRole('tab',{name:'編輯元素'}).click();
 const url=page.getByLabel('按鈕連結');await url.fill('https://discord.com/channels/123456789012345678/987654321098765432');await url.press('Tab');await expect(url).toHaveValue(/discord/);
 await page.getByRole('button',{name:'儲存草稿',exact:true}).click();await expect(page.getByRole('button',{name:'儲存草稿',exact:true})).toHaveText('已儲存');
 await url.fill('javascript:alert(1)');await url.press('Tab');await expect(url).toHaveValue('javascript:alert(1)');await expect(page.getByRole('alert')).toContainText('尚未套用');
 page.once('dialog',d=>d.accept());await page.reload();await page.getByTestId('canvas-node').click();await page.getByRole('tab',{name:'編輯元素'}).click();await expect(page.getByLabel('按鈕連結')).toHaveValue(/discord/);
});
for(const width of [1440,768,375])test(`preview reflects the current draft without a model call and updates after editing ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const calls:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/generation'))calls.push(r.url());});
 await page.goto('/');await expect(page.getByRole('status')).toContainText('草稿已就緒');if(await page.getByRole('button',{name:'展開側欄',exact:true}).isVisible())await page.getByRole('button',{name:'展開側欄',exact:true}).click();await page.getByRole('button',{name:'新增標題',exact:true}).click();await page.getByRole('tab',{name:'編輯元素'}).click();
 await page.getByLabel('元素內容').fill('這是我的草稿預覽');await page.getByRole('button',{name:'預覽',exact:true}).click();await expect(page.getByRole('heading',{name:'這是我的草稿預覽',exact:true})).toBeVisible();await expect(page.locator('[data-candidate-mode="preview"]')).toBeVisible();
 await page.getByRole('button',{name:'返回草稿',exact:true}).click();await page.getByLabel('元素內容').fill('修改後的新預覽');await page.getByRole('button',{name:'預覽',exact:true}).click();await expect(page.getByRole('heading',{name:'修改後的新預覽',exact:true})).toBeVisible();expect(calls).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/repair-current-preview-${width}.png`});
});
