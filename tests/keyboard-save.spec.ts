import { test, expect } from "@playwright/test";
test("draft save shortcuts work while typing without stealing native text editing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增標題", exact: true }).click();
  await page.getByRole("tab", { name: "編輯元素" }).click();
  const content = page.getByLabel("元素內容");
  await content.fill("從文字欄位保存草稿");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toHaveText("已儲存");
  await expect(content).toBeFocused();
  await page.getByLabel("專案名稱").fill("鍵盤保存測試");
  await page.keyboard.press("Meta+s");
  await expect(page.getByRole("status")).toHaveText("已儲存");
  await content.focus();
  await page.keyboard.press("End");
  await page.keyboard.type("X");
  await page.keyboard.press("Control+z");
  await expect(content).toHaveValue("從文字欄位保存草稿");
  await expect(page.getByRole("button", {name:"重做",exact:true})).toBeDisabled();
  await page.keyboard.press("Home");
  await page.keyboard.press("Delete");
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toHaveText("已儲存");
  const expected = await content.inputValue();
  await page.reload();
  await expect(page.getByLabel("專案名稱")).toHaveValue("鍵盤保存測試");
  await expect(page.getByTestId("canvas-node")).toHaveText(expected);
});

test('a second explicit save during a pending draft write persists the latest snapshot',async({page})=>{
 // Test-only delay of the completion notification; real IndexedDB writes still run.
 await page.addInitScript(()=>{
  const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;
  Object.defineProperty(IDBTransaction.prototype,'oncomplete',{
   ...descriptor,set(this:IDBTransaction,callback:((event:Event)=>void)|null){
    if(!callback){descriptor.set!.call(this,callback);return;}
    descriptor.set!.call(this,(event:Event)=>{
     if(this.mode==='readwrite'&&this.objectStoreNames.contains('drafts'))setTimeout(()=>callback.call(this,event),600);
     else callback.call(this,event);
    });
   },
  });
 });
 await page.goto('/');await expect(page.getByRole('status')).toContainText('草稿已就緒');
 await page.getByRole('button',{name:'新增標題',exact:true}).click();await page.getByRole('tab',{name:'編輯元素'}).click();
 const input=page.getByLabel('元素內容');await input.fill('第一份明確保存內容');await page.keyboard.press('Control+s');
 await expect(page.getByRole('button',{name:'儲存中…',exact:true})).toBeVisible();
 await input.fill('寫入期間修改後再次保存的內容');await page.keyboard.press('Control+s');
 await expect(page.getByRole('status')).toHaveText('已儲存');
 await page.reload();await expect(page.getByTestId('canvas-node')).toHaveText('寫入期間修改後再次保存的內容');
});
