import { choose } from "./helpers/select";
import {test,expect} from '@playwright/test';
async function setup(page:import('@playwright/test').Page){
 await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');
 const canvas=page.getByTestId('canvas');
 for(const [name,x,y] of [['按鈕',100,100],['卡片',400,100],['文字',100,300]] as const)
  await page.getByRole('button',{name:'新增'+name,exact:true}).dragTo(canvas,{targetPosition:{x,y}});
 await page.getByRole('tab',{name:'動畫',exact:true}).click();
 return canvas;
}
test('draft hover lift attaches through its canonical drag ID and survives Undo and reload',async({page})=>{
 await setup(page);const button=page.locator('.canvas .node.button');
 await page.locator('.sidebar [data-effect-id="hover-lift"] .asset-preview').dragTo(button);
 await expect(button.locator('.effect-tags')).toContainText('懸停浮起');
 await page.getByRole('button',{name:'還原',exact:true}).click();await expect(button.locator('.effect-tags')).toBeEmpty();
 await page.getByRole('button',{name:'重做',exact:true}).click();await expect(button.locator('.effect-tags')).toContainText('懸停浮起');
 await page.getByRole('button',{name:'儲存草稿',exact:true}).click();await expect(page.getByRole('contentinfo').getByRole('status')).toHaveText('已儲存');
 await page.reload();await expect(button.locator('.effect-tags')).toContainText('懸停浮起');
});
test('draft drag explains incompatible button and highlights compatible card without adding a component',async({page})=>{
 await setup(page);const source=page.locator('.sidebar [data-effect-id="scale-in"] .asset-preview'),button=page.locator('.canvas .node.button'),card=page.locator('.canvas .node.card');
 await source.scrollIntoViewIfNeeded();
 const a=(await source.boundingBox())!,b=(await button.boundingBox())!,c=(await card.boundingBox())!;
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x-12,a.y+a.height/2,{steps:4});
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.move(b.x+b.width/2+1,b.y+b.height/2);await expect(button).toHaveAttribute('data-draft-drop','invalid');
 await expect(page.locator('.draft-drop-hint')).toContainText('不適用');await expect(card).toHaveAttribute('data-draft-drop','available');
 await page.screenshot({path:'test-results/draft-incompatible-drop.png'});
 await page.mouse.move(c.x+c.width/2,c.y+c.height/2,{steps:12});await expect(page.locator('.draft-drop-hint')).toContainText('放開');await page.mouse.up();
 await expect(card.locator('.effect-tags')).toContainText('縮放進入');await expect(page.getByTestId('canvas-node')).toHaveCount(3);await expect(button.locator('.effect-tags')).toBeEmpty();
});

test('animation dropped on blank draft asks for an existing target rather than creating sample content',async({page})=>{
 const canvas=await setup(page);await page.locator('.sidebar [data-effect-id="fade-in"] .asset-preview').dragTo(canvas,{targetPosition:{x:700,y:500}});
 await expect(page.getByLabel('動畫附加對象')).toBeVisible();await expect(page.getByTestId('canvas-node')).toHaveCount(3);
 const card=page.locator('.canvas .node.card');await choose(page.getByLabel('動畫附加對象'), (await card.getAttribute('data-node-id'))!);
 await page.getByRole('button',{name:'加上動畫',exact:true}).click();await expect(card.locator('.effect-tags')).toContainText('淡入');
});
