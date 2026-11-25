import {openWebsiteWorkspace} from "./helpers/workbench";
import { test, expect, type Page } from '@playwright/test';
import { motionFixture, motionId } from './fixtures/motions';
import { openPanel, editSelection, viewAction } from './helpers/workbench';
const node = (page: Page, id: number) => page.locator(`.preview-frame [data-page-id="${motionId(id)}"]`);
async function load(page: Page) {
    const calls: string[] = [];
    page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/generation'))
        calls.push(r.url()); });
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await openWebsiteWorkspace(page);
    await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'original-motions-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(motionFixture())) });
    await expect(node(page, 2)).toHaveText('原創動畫驗證示例');
    await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
    return calls;
}
for (const width of [1440, 768, 375])
    test(`original motions review 1: interaction, reduced motion and layout ${width}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.setViewportSize({ width, height: 1000 });
        const calls = await load(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(node(page, 3)).toContainText('1,234.50');
        await expect(node(page, 4).locator('textPath')).toHaveCount(1);
        await node(page, 6).scrollIntoViewIfNeeded();
        await node(page, 6).getByRole('button', { name: '查看背面' }).click();
        await expect(node(page, 6).getByText('使用者提供的背面內容')).toBeVisible();
        await expect(node(page, 6).locator('.motion-flip-front')).toHaveAttribute('inert', '');
        await node(page, 6).getByRole('button', { name: '查看正面' }).focus();
        await page.keyboard.press('Space');
        await expect(node(page, 6).getByText('使用者提供的正面內容')).toBeVisible();
        await node(page, 8).scrollIntoViewIfNeeded();
        await node(page, 8).getByRole('button', { name: '折頁切換' }).click();
        await expect(node(page, 8).getByText('使用者提供的下層內容')).toBeVisible();
        await expect(node(page, 10).locator('canvas')).toHaveCount(0);
        await expect(node(page, 10).getByRole('list')).toBeVisible();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await node(page, 3).scrollIntoViewIfNeeded();
        await viewAction(page, '重播動畫');
        await expect(node(page, 3)).toContainText('1,234.50');
        const frame = page.locator('.preview-frame');
        expect(await frame.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await page.screenshot({ path: `test-results/motions-review1-${width}.png`, fullPage: true });
        await page.reload();
        await openWebsiteWorkspace(page);
        await expect(node(page, 3)).toContainText('1,234.50');
        expect(calls).toEqual([]);
        expect(errors).toEqual([]);
    });
test('review 2: controlled parameters, incompatible combinations, undo, reload and actual tag/fold drag', async ({ page }) => {
    const calls = await load(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: '選取', exact: true }).click();
    await node(page, 2).click();
    await editSelection(page);
    await page.getByLabel('位移（像素）').fill('64');
    await page.getByRole('button', { name: '套用', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已套用');
    await page.getByRole('button', { name: '撤銷修改' }).click();
    await expect(page.getByLabel('位移（像素）')).toHaveValue('32');
    await page.getByRole('button', { name: '重做修改' }).click();
    await expect(page.getByLabel('位移（像素）')).toHaveValue('64');
    await openPanel(page, '動畫');
    await expect(page.locator('#preview-inspector [data-effect-id]')).toHaveCount(68);
    await expect(page.getByRole('button', { name: '懸停光暈', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: '工具', exact: true }).click();
    await page.getByRole('button', { name: '瀏覽', exact: true }).click();
    const fold = node(page, 8), handle = fold.getByRole('button', { name: '折頁切換' });
    await handle.scrollIntoViewIfNeeded();
    for (let i = 0; i < 4; i++) {
        const box = (await handle.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x - 600, box.y + box.height / 2, { steps: 12 });
        await page.mouse.up();
        await expect(handle).toHaveAttribute('aria-pressed', 'true');
        await handle.click();
        await expect(handle).toHaveAttribute('aria-pressed', 'false');
    }
    const tags = node(page, 10);
    await tags.scrollIntoViewIfNeeded();
    await tags.getByRole('button', { name: '拖曳標籤', exact: true }).click();
    const canvas = tags.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    for (let i = 0; i < 4; i++) {
        await page.mouse.move(box.x + 12, box.y + 16);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 110, { steps: 10 });
        await page.mouse.up();
    }
    await tags.getByRole('button', { name: '退出標籤拖曳' }).click();
    await page.setViewportSize({ width: 768, height: 1000 });
    await expect(tags.locator('canvas')).toBeVisible();
    await page.screenshot({ path: 'test-results/motions-review2-interaction.png', fullPage: true });
    expect(calls).toEqual([]);
});
test('required user content is composed locally and committed through Undo/Redo without invented defaults', async ({ page }) => {
    const calls = await load(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: '選取', exact: true }).click();
    await node(page, 12).scrollIntoViewIfNeeded();
    await node(page, 12).click({ position: { x: 4, y: 4 } });
    await openPanel(page, '動畫');
    await page.getByRole('button', { name: '雙面卡片', exact: true }).click();
    await expect(page.getByLabel('背面內容')).toHaveValue('');
    await expect(node(page, 12)).not.toHaveAttribute('data-effects', /flip-card/);
    await page.getByLabel('背面內容').fill('這是使用者明確輸入的背面');
    await page.getByRole('button', { name: '確認附加動畫' }).click();
    await expect(node(page, 12)).toHaveAttribute('data-effects', /flip-card/);
    await page.getByRole('button', { name: '撤銷修改' }).click();
    await expect(node(page, 12)).not.toHaveAttribute('data-effects', /flip-card/);
    await page.getByRole('button', { name: '重做修改' }).click();
    await expect(node(page, 12)).toHaveAttribute('data-effects', /flip-card/);
    await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
    await page.reload();
    await openWebsiteWorkspace(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await node(page, 12).scrollIntoViewIfNeeded();
    await node(page, 12).getByRole('button', { name: '查看背面' }).click();
    await expect(node(page, 12).getByText('這是使用者明確輸入的背面')).toBeVisible();
    expect(calls).toEqual([]);
});
test('24-tag Chromium performance, offscreen pause, resize and touch exit', async ({ page }) => {
    test.setTimeout(45000);
    await page.addInitScript(() => {
        const request = window.requestAnimationFrame.bind(window);
        (window as any).__motionCallbacks = 0;
        window.requestAnimationFrame = callback => request(time => { (window as any).__motionCallbacks++; callback(time); });
    });
    await load(page);
    const fixture = motionFixture(), physics = fixture.sections[0].children!.find(n => n.id === motionId(10))!.effects[0];
    physics.validatedControls = { ...physics.validatedControls, labels: Array.from({ length: 24 }, (_, i) => '標籤' + i), maxTags: 24, gravity: .5, spawnIntervalMs: 60 };
    await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'physics-performance-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await node(page, 10).scrollIntoViewIfNeeded();
    await expect(node(page, 10).locator('canvas')).toBeVisible();
    const metrics = await page.evaluate(() => new Promise<{
        frames: number;
        averageMs: number;
        maxMs: number;
    }>(resolve => {
        const intervals: number[] = [];
        let last = performance.now();
        const step = (now: number) => { intervals.push(now - last); last = now; if (intervals.length < 360)
            requestAnimationFrame(step);
        else
            resolve({ frames: intervals.length, averageMs: intervals.reduce((a, b) => a + b, 0) / intervals.length, maxMs: Math.max(...intervals) }); };
        requestAnimationFrame(step);
    }));
    expect(metrics.averageMs).toBeLessThan(50);
    await node(page, 2).scrollIntoViewIfNeeded();
    const hidden = await page.evaluate(() => new Promise<number>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { const first = (window as any).__motionCallbacks; requestAnimationFrame(() => requestAnimationFrame(() => resolve((window as any).__motionCallbacks - first))); }))); }));
    expect(hidden).toBeLessThanOrEqual(3);
    await page.setViewportSize({ width: 375, height: 900 });
    await node(page, 10).scrollIntoViewIfNeeded();
    if (await node(page, 10).locator('canvas').count()) {
        await node(page, 10).getByRole('button', { name: '拖曳標籤', exact: true }).click();
        await expect(node(page, 10).locator('canvas')).toHaveCSS('touch-action', 'none');
        await node(page, 10).getByRole('button', { name: '退出標籤拖曳' }).click();
        await expect(node(page, 10).locator('canvas')).toHaveCSS('touch-action', 'pan-y');
    }
    const { writeFileSync } = await import('node:fs');
    writeFileSync('test-results/motion-performance.json', JSON.stringify({ ...metrics, offscreenCallbackDelta: hidden, limitations: 'Chromium headless; not a physical mobile-device benchmark' }, null, 2));
});
for (const width of [1440, 768, 375])
    test(`review 2 gallery: native-size readable samples and direct interaction ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await load(page);
        await openPanel(page, '動畫');
        await expect(page.locator('#preview-inspector [data-effect-id]')).toHaveCount(68);
        await page.screenshot({ path: `test-results/motions-gallery-${width}.png` });
        await page.getByRole('button', { name: '重播物理標籤場示意' }).click();
        const asset = page.locator('#preview-inspector [data-effect-id="physics-tag-field"]');
        await expect(asset.locator(".rendered-page")).toHaveCSS("transform","none");
        await expect(asset.locator('canvas')).toBeVisible();
        await asset.getByRole('button', { name: '拖曳標籤', exact: true }).click();
        await expect(asset.getByRole('button', { name: '退出標籤拖曳' })).toBeVisible();
        await expect.poll(() => asset.locator("canvas").evaluate((el: HTMLCanvasElement) => el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(true);
        await asset.getByRole("button", { name: "退出標籤拖曳" }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/motions-gallery-expanded-${width}.png` });
        const exit=asset.getByRole('button', { name: '退出標籤拖曳' });
        expect((await exit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await exit.click();
        await expect(asset.getByRole('button',{name:'拖曳標籤',exact:true})).toBeVisible();
        await expect(page.getByRole('button',{name:'收合示意',exact:true})).toHaveCount(0);
    });
test('draft markers retain user-supplied faces and labels without running them on the canvas', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/generation'))
        calls.push(r.url()); });
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await page.getByRole('button', { name: '新增卡片', exact: true }).click();
    await page.getByRole('tab', { name: '動畫', exact: true }).click();
    await page.getByRole('button', { name: '雙面卡片 · Flip Card', exact: true }).click();
    await page.getByLabel('背面內容').fill('使用者的真實背面');
    await page.getByRole('button', { name: '加上動畫', exact: true }).click();
    await expect(page.getByTestId('canvas-node')).toContainText('雙面卡片');
    await expect(page.getByTestId('canvas-node').locator('.motion-flip')).toHaveCount(0);
    await page.getByRole('button', { name: '儲存草稿', exact: true }).click();
    await page.reload();
    await expect(page.getByTestId('canvas-node')).toContainText('雙面卡片');
    expect(calls).toEqual([]);
});
test('fold transitions can be interrupted and reversed without resetting progress', async ({ page }) => {
    await load(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const fold = node(page, 8), handle = fold.getByRole('button', { name: '折頁切換' });
    await handle.scrollIntoViewIfNeeded();
    await handle.click();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const before = await fold.locator('.motion-fold').evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--fold-progress'))), box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const grabbed = await fold.locator('.motion-fold').evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--fold-progress')));
    expect(grabbed).toBeGreaterThanOrEqual(before);
    expect(grabbed).toBeLessThan(1);
    await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => fold.locator('.motion-fold').evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--fold-progress')))).toBe(0);
});
test('touch context has equivalent fold and flip operations and can exit tag dragging', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true }), page = await context.newPage();
    try {
        await load(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const flip = node(page, 6).getByRole('button', { name: '查看背面' });
        await flip.scrollIntoViewIfNeeded();
        await flip.tap();
        await expect(node(page, 6).getByText('使用者提供的背面內容')).toBeVisible();
        const fold = node(page, 8).getByRole('button', { name: '折頁切換' });
        await fold.scrollIntoViewIfNeeded();
        await fold.tap();
        await expect(fold).toHaveAttribute('aria-pressed', 'true');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await node(page, 10).scrollIntoViewIfNeeded();
        if (await node(page, 10).locator('canvas').count()) {
            await node(page, 10).getByRole('button', { name: '拖曳標籤', exact: true }).tap();
            await node(page, 10).getByRole('button', { name: '退出標籤拖曳' }).tap();
            await expect(node(page, 10).locator('canvas')).toHaveCSS('touch-action', 'pan-y');
        }
    }
    finally {
        await context.close();
    }
});
