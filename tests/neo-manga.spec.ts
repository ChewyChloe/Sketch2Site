import {test,expect} from '@playwright/test';
for(const width of [1440,768,375])test(`neo manga workspace ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});let paid=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/generation')paid++;});
 await page.goto('/');await expect(page.getByRole('status')).toContainText('草稿已就緒');
 await expect(page.getByRole('group',{name:'工作區模式'})).toBeVisible();// The side rail duplicated these step tabs and was removed.
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/neo-canvas-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'動畫素材庫',exact:true}).click();await expect(page.locator('.sidebar [data-effect-id]')).toHaveCount(68);
 await page.screenshot({path:`test-results/neo-motion-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'草稿',exact:true}).click();
 if(!await page.getByRole('button',{name:'新增文字',exact:true}).isVisible())await page.getByRole('tab',{name:'元件',exact:true}).click();
 await page.getByRole('button',{name:'新增文字',exact:true}).click();await expect(page.getByTestId('canvas-node')).toHaveCount(1);
 await page.getByRole('tab',{name:'編輯元素',exact:true}).click();await expect(page.getByRole('complementary',{name:'物件檢查器'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(paid).toBe(0);
});
