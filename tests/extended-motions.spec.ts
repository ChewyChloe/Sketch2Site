import { choose } from "./helpers/select";
import {openWebsiteWorkspace} from "./helpers/workbench";
import { test, expect, type Page, type Locator } from '@playwright/test';
import { extendedMotionFixture, extendedMotionId, extendedMotionNames, extendedMotionNodeIds, extendedMotionText } from './fixtures/extendedMotions';
import { openPanel, editSelection, viewAction } from './helpers/workbench';

type Effect = keyof typeof extendedMotionNames;
const effects = Object.keys(extendedMotionNames) as Effect[];
const node = (page: Page, id: number | Effect) => page.locator(`.preview-frame [data-page-id="${typeof id === 'number' ? extendedMotionId(id) : extendedMotionNodeIds[id]}"]`);
async function load(page: Page, bare = false) {
    const errors: string[] = [], generation: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/generation')) generation.push(request.url()); });
    await page.goto('/?draft');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await openWebsiteWorkspace(page);
    const fixture = extendedMotionFixture();
    if (bare) fixture.sections[0].children!.forEach(child => { child.effects = []; });
    await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'extended-motions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await expect(node(page, 2)).toContainText(extendedMotionText);
    await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
    return () => { expect(errors).toEqual([]); expect(generation).toEqual([]); };
}
const running = (target: Locator) => target.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
const transform = (target: Locator) => target.evaluate(el => {
    const style = getComputedStyle(el), matrix = new DOMMatrixReadOnly(style.transform);
    const translate = style.translate === 'none' ? [0, 0] : style.translate.split(' ').map(Number.parseFloat);
    return { x: matrix.m41 + translate[0], y: matrix.m42 + (translate[1] ?? 0), scale: style.scale === 'none' ? matrix.a : Number.parseFloat(style.scale) };
});

test('library exposes sixty effects and filters by name, identifier and category', async ({ page }) => {
    const check = await load(page);
    await openPanel(page, '動畫');
    const library = page.locator('#preview-inspector .animation-library'), assets = library.locator('[data-effect-id]');
    await expect(assets).toHaveCount(90);
    for (const id of effects) {
        await page.getByLabel('搜尋動畫').fill(id);
        await expect(assets).toHaveCount(1);
        await expect(assets).toHaveAttribute('data-effect-id', id);
        await page.getByLabel('搜尋動畫').fill(extendedMotionNames[id]);
        await expect(assets).toHaveCount(1);
    }
    await page.getByLabel('搜尋動畫').fill('no-such-effect');await expect(assets).toHaveCount(0);await expect(library.getByRole('status')).toContainText('找不到符合');
    await page.getByLabel('搜尋動畫').fill('Letter Assembly');await expect(assets).toHaveCount(1);
    await page.getByLabel('搜尋動畫').fill('');
    // Filters: same dimension is OR, different dimensions AND; the count follows.
    const triggers = library.getByRole('group', { name: '什麼時候動' });
    await triggers.getByRole('button', { name: /^滑過時/ }).click();
    const hover = await assets.count();
    expect(hover).toBeGreaterThan(0);
    await expect(library.getByRole('status').first()).toContainText(`符合 ${hover} 種`);
    await triggers.getByRole('button', { name: /^點擊時/ }).click();
    expect(await assets.count()).toBeGreaterThanOrEqual(hover);
    await library.getByRole('group', { name: '用在' }).getByRole('button', { name: /^圖片/ }).click();
    expect(await assets.count()).toBeLessThan(hover + 1);
    await library.getByRole('button', { name: '清除條件' }).click();
    await expect(assets).toHaveCount(90);
    check();
});

test('shared runtime preserves graphemes and original accessible text; reduced motion cancels entrances', async ({ page }) => {
    const check = await load(page);
    const letters = node(page, 2);
    await expect(letters.locator('.motion-sr')).toHaveText(extendedMotionText);
    const expected = await page.evaluate(text => Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), part => part.segment), extendedMotionText);
    expect(await letters.locator('.extended-letter').allTextContents()).toEqual(expected);
    await expect(letters.locator('.extended-letter').first().locator('..')).toHaveAttribute('aria-hidden', 'true');
    for (const id of ['accent-stroke', 'image-reveal'] as const) {
        await node(page, id).scrollIntoViewIfNeeded();
        await viewAction(page, '重播動畫');
        await expect.poll(() => running(node(page, id))).toBeGreaterThan(0);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => running(node(page, id))).toBe(0);
        await expect(node(page, id)).toBeVisible();
        if (id === 'image-reveal') {
            const image = node(page, id).locator('img');
            await expect(image).toHaveAttribute('src', '/assets/workspace.svg');
            await expect(image).toHaveAttribute('alt', '工作空間插圖');
            expect(await image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    check();
});

test('magnet follows real pointer within bounds, resets on leave, and press changes the held visual', async ({ page }) => {
    const check = await load(page), magnet = node(page, 5), press = node(page, 6);
    await magnet.scrollIntoViewIfNeeded();
    const box = (await magnet.boundingBox())!;
    await page.mouse.move(box.x + box.width - 3, box.y + box.height - 3);
    await expect.poll(async () => Math.abs((await transform(magnet)).x)).toBeGreaterThan(.1);
    const moved = await transform(magnet);
    expect(Math.abs(moved.x)).toBeLessThanOrEqual(6.1);
    expect(Math.abs(moved.y)).toBeLessThanOrEqual(6.1);
    await page.mouse.move(0, 0);
    await expect.poll(async () => Math.abs((await transform(magnet)).x) + Math.abs((await transform(magnet)).y)).toBeLessThan(.01);
    await press.scrollIntoViewIfNeeded();
    const pressedBox = (await press.boundingBox())!;
    await page.mouse.move(pressedBox.x + pressedBox.width / 2, pressedBox.y + pressedBox.height / 2);
    await page.mouse.down();
    try { await expect.poll(async () => (await transform(press)).scale).toBeLessThan(.995); }
    finally { await page.mouse.move(0, 0); await page.mouse.up(); }
    await expect.poll(async () => (await transform(press)).scale).toBeCloseTo(1, 2);
    await press.focus();await page.keyboard.down('Space');await expect(press).toHaveAttribute('data-extended-pressed','true');await expect.poll(async()=>(await transform(press)).scale).toBeLessThan(.995);
    await page.keyboard.up('Space');await expect(press).not.toHaveAttribute('data-extended-pressed');await expect.poll(async()=>(await transform(press)).scale).toBeCloseTo(1,2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await magnet.focus();
    await expect(magnet).toBeFocused();
    await expect.poll(async () => (await transform(magnet)).x).toBe(0);
    check();
});

test('focus transfer follows keyboard order and disclosure interrupts and toggles under reduced motion', async ({ page }) => {
    const check = await load(page), first = node(page, 8), second = node(page, 9);
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await expect(first).toBeFocused();
    await expect.poll(() => second.evaluate(el => Number(getComputedStyle(el).opacity))).toBeCloseTo(.5, 2);
    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    await expect.poll(() => first.evaluate(el => Number(getComputedStyle(el).opacity))).toBeCloseTo(.5, 2);
    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>second.evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(1);await expect(first).toHaveAttribute('tabindex','0');await first.focus();await page.keyboard.press('ArrowRight');await expect(second).toBeFocused();await expect.poll(()=>first.evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(1);
    await page.emulateMedia({reducedMotion:'no-preference'});
    const card = node(page, 14), toggle = card.getByRole('button'), content = card.locator('.extended-disclosure-content');
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(node(page, 16)).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => running(content)).toBeGreaterThan(0);
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => running(content)).toBe(0);
    await expect(content).toHaveAttribute('inert', '');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Enter');
    await expect(node(page, 16)).toBeVisible();
    await expect.poll(() => running(content)).toBe(0);
    expect(await toggle.getAttribute('aria-controls')).toBe(await content.getAttribute('id'));
    await page.keyboard.press('Enter');
    await expect(node(page, 16)).toBeHidden();
    await expect(node(page, 15)).toBeVisible();
    check();
});

test('reading progress is bounded and monotonic in the local preview scroller', async ({ page }) => {
    const check = await load(page), card = node(page, 10), bar = card.getByRole('progressbar');
    const scroller = page.locator('.preview-scroll');
    await card.scrollIntoViewIfNeeded();
    const start = await scroller.evaluate(el => el.scrollTop);
    const values: number[] = [];
    for (const delta of [-200, 0, 100, 200]) {
        await scroller.evaluate((el, value) => { el.scrollTop = value; }, start + delta);
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        values.push(Number(await bar.getAttribute('aria-valuenow')));
    }
    expect(values.every(value => value >= 0 && value <= 100)).toBe(true);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values.at(-1)).toBeGreaterThan(values[0]);
    check();
});

const parameters: Record<Effect, [string, string, string]> = {
    'letter-assembly': ['位移（像素）', '20', '12'],
    'accent-stroke': ['線寬（像素）', '4', '2'],
    'image-reveal': ['展開方向', 'vertical', 'horizontal'],
    'magnetic-control': ['吸附幅度（像素）', '10', '6'],
    'press-feedback': ['按壓比例', '0.94', '0.97'],
    'focus-transfer': ['非作用項透明度', '0.7', '0.5'],
    'scroll-progress': ['線寬（像素）', '5', '3'],
    'disclosure-panel': ['詳情收合時長', '500', '240'],
};
for (const id of effects) test(`${id}: actual drag patch, parameter apply, undo, redo and reload`, async ({ page }) => {
    const check = await load(page, true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPanel(page, '動畫');
    const target = node(page, id);
    await target.scrollIntoViewIfNeeded();
    await page.locator(`#preview-inspector [data-effect-id="${id}"] .asset-choose`).dragTo(target, { targetPosition: { x: 4, y: 4 } });
    await expect(target).toHaveAttribute('data-effects', id);
    await page.getByRole('button', { name: '撤銷修改' }).click();
    await expect(target).toHaveAttribute('data-effects', '');
    await page.getByRole('button', { name: '重做修改' }).click();
    await expect(target).toHaveAttribute('data-effects', id);
    await page.getByRole('button', { name: '選取', exact: true }).click();
    await target.click({ position: { x: 4, y: 4 } });
    await editSelection(page);
    const [label, value, original] = parameters[id], input = page.getByLabel(label, { exact: true });
    if (id === 'image-reveal') await choose(input, value); else await input.fill(value);
    await page.getByRole('button', { name: '套用', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已套用');
    await page.getByRole('button', { name: '撤銷修改' }).click();
    if (id === 'image-reveal') await expect(input).toHaveAttribute('data-value', original); else await expect(input).toHaveValue(original);
    await page.getByRole('button', { name: '重做修改' }).click();
    if (id === 'image-reveal') await expect(input).toHaveAttribute('data-value', value); else await expect(input).toHaveValue(value);
    await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
    await page.reload();
    await openWebsiteWorkspace(page);
    await expect(node(page, id)).toHaveAttribute('data-effects', id);
    await page.getByRole('button', { name: '選取', exact: true }).click();
    await node(page, id).click({ position: { x: 4, y: 4 } });
    await editSelection(page);
    if (id === 'image-reveal') await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('data-value', value); else await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    check();
});

for (const round of [1, 2]) for (const width of [1440, 768, 375]) test(`review ${round}: interactions and upper/lower gallery at ${width}`, async ({ page }) => {
    const check = await load(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const toggle = node(page, 14).getByRole('button');
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(node(page, 16)).toBeVisible();
    await toggle.click();
    await expect(node(page, 16)).toBeHidden();
    expect(await page.locator('.preview-frame').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/extended-review${round}-page-${width}.png` });
    await page.keyboard.press('Escape');
    await page.locator('.preview-scroll').evaluate(el=>{el.scrollTop=0;});
    await openPanel(page, '動畫');
    const library = page.locator('#preview-inspector .animation-library');
    await expect(library.locator('[data-effect-id]')).toHaveCount(90);
    await library.locator('[data-effect-id="fade-in"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/extended-review${round}-gallery-upper-${width}.png` });
    const disclosure = library.locator('[data-effect-id="disclosure-panel"]');
    await disclosure.scrollIntoViewIfNeeded();
    await disclosure.getByRole('button', { name: '展開內容', exact: true }).click();
    await expect(disclosure.getByText('實作', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/extended-review${round}-gallery-lower-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    check();
});

test('gallery self-scrolling indicator stays visible and letters fall back safely for long source text',async({page})=>{
 const check=await load(page);await openPanel(page,'動畫');
 const asset=page.locator('#preview-inspector [data-effect-id="scroll-progress"]');await asset.scrollIntoViewIfNeeded();
 const sample=asset.locator('.page-card'),bar=sample.getByRole('progressbar');await expect(bar).toBeVisible();
 const before=(await bar.boundingBox())!;await sample.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect(bar).toHaveAttribute('aria-valuenow','100');const after=(await bar.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThan(1);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(bar).toHaveCount(0);
 await page.getByRole('button',{name:'關閉工具面板'}).click();
 const fixture=extendedMotionFixture();fixture.sections[0].children![0].content='長內容'.repeat(50);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByLabel('載入頁面檔案').setInputFiles({name:'long-original-text.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await expect(node(page,2)).toHaveText('長內容'.repeat(50));await expect(node(page,2).locator('.extended-letter')).toHaveCount(0);check();
});
