import { choose } from "./helpers/select";
import { test, expect, type Page } from '@playwright/test';
import { cinematicMotionIds, motionCatalog } from '../src/motionCatalog';
import { cinematicSampleControls } from '../src/cinematicSamples';
import { thirdFixture, thirdId, thirdCanvas } from './fixtures/cinematicMotions';
import { openWebsiteWorkspace, openPanel, editSelection } from './helpers/workbench';
async function load(page: Page, id?: string, bare = false) { const errors: string[] = [], paid: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/generation')
    paid.push(r.url()); }); await page.goto('/?draft'); await expect(page.getByRole('status')).toContainText('草稿已就緒'); await openWebsiteWorkspace(page); await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'cinematic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(thirdFixture(id, bare))) }); await expect(page.getByTestId('page-save-status')).toHaveText('已儲存'); return () => { expect(errors).toEqual([]); expect(paid).toEqual([]); }; }
const target = (page: Page, id: typeof cinematicMotionIds[number]) => page.locator(`.preview-frame [data-page-id="${thirdId(cinematicMotionIds.indexOf(id) * 20 + 2)}"]`);
const running = (el: ReturnType<typeof target>) => el.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
for (const id of cinematicMotionIds)
    test(`${id}: distinct live runtime and reduced-motion fallback`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const check = await load(page, id), el = target(page, id);
        await el.scrollIntoViewIfNeeded();
        await el.evaluate(e => e.addEventListener('click', event => event.preventDefault()));
        if (id === 'text-morph-transition') {
            await el.getByRole('button', { name: '切換文字' }).click();
            await expect(el.locator('.cin-text-source')).toHaveText('設計成真');
            await expect(el.locator('[data-matched=true]')).toHaveCount(2);
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await expect(el.locator('.cin-text-overlay')).toHaveCount(0);
            await el.getByRole('button', { name: '切換文字' }).click();
            await expect(el.locator('.cin-text-source')).toHaveText('原始設計');
        }
        else if (id === 'elastic-word-bounce') {
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            const frames = await el.evaluate(e => e.getAnimations({ subtree: true }).map(a => (a.effect as KeyframeEffect).getKeyframes()));
            expect(JSON.stringify(frames)).toContain('scale(');
            await expect(el.locator('.cin-text-overlay')).toHaveCount(0);
            await expect(el.locator('.cin-text-source')).toHaveText('Build ideas 讓想法跳動');
        }
        else if (id === 'text-spotlight-reveal') {
            await expect.poll(() => el.locator('.cin-text-source').evaluate(e => getComputedStyle(e).maskImage)).toContain('radial-gradient');
            await expect(el.locator('.cin-text-source')).toHaveCSS('mask-image', 'none');
        }
        else if (id === 'typographic-stretch') {
            const b = (await el.boundingBox())!;
            await page.mouse.move(b.x + 12, b.y + 12);
            await expect(el.locator('.cin-text-overlay')).toBeVisible();
            await expect.poll(() => el.locator('.cin-glyph').first().evaluate(e => new DOMMatrix(getComputedStyle(e).transform).a)).toBeGreaterThan(1);
            await page.mouse.move(0, 0);
            await expect(el.locator('.cin-text-overlay')).toHaveCount(0);
        }
        else if (id === 'cursor-trail-particles' || id === 'particle-constellation') {
            const canvas = el.locator('.cin-particles'), b = (await el.boundingBox())!;
            for (let i = 0; i < 12; i++)
                await page.mouse.move(b.x + 15 + i * Math.min(12, (b.width - 30) / 12), b.y + b.height / 2);
            await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(true);
            if (id === 'particle-constellation') {
                const first = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
                await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(first);
            }
            else {
                await page.mouse.move(0, 0);
                await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(false);
            }
        }
        else if (id === 'cursor-image-follower') {
            await el.focus();
            await expect(el.locator('.cin-follower')).toHaveAttribute('data-visible', 'true');
            await expect(el.locator('.cin-follower')).toHaveAttribute('src', /assets\/workspace.svg$/);
            await el.blur();
            await page.mouse.move(0, 0);
            await expect(el.locator('.cin-follower')).toHaveAttribute('data-visible', 'false');
        }
        else if (id === 'gooey-blob-merge') {
            await expect(el.locator('circle')).toHaveCount(3);
            await el.getByRole('button', { name: '融合圓球' }).click();
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await expect.poll(() => running(el)).toBe(0);
        }
        else if (id === 'directional-hover-wipe') {
            const b = (await el.boundingBox())!;
            await page.mouse.move(b.x - 5, b.y + b.height / 2);
            await page.mouse.move(b.x + 1, b.y + b.height / 2);
            await expect(el.locator('.cin-wipe')).toHaveAttribute('data-direction', 'left');
            await page.mouse.move(b.x + b.width + 5, b.y + b.height / 2);
            await expect(el.locator('.cin-wipe')).toHaveAttribute('data-exit', 'right');
            await page.mouse.move(b.x + b.width - 1, b.y + b.height / 2);
            await expect(el.locator('.cin-wipe')).toHaveAttribute('data-direction', 'right');
            await page.mouse.move(0, 0);
            await el.focus();
            await expect(el.locator('.cin-wipe')).toHaveAttribute('data-direction', 'left');
        }
        else if (id === 'spring-drag-snap') {
            const handle = el.getByRole('button', { name: /拖曳把手/ }), b = (await handle.boundingBox())!;
            await page.mouse.move(b.x + 8, b.y + 8);
            await page.mouse.down();
            await page.mouse.move(b.x + 100, b.y + 40, { steps: 8 });
            const delta = await el.evaluate(e => getComputedStyle(e).translate.split(' ').map(Number.parseFloat));
            expect(Math.abs(delta[0])).toBeLessThanOrEqual(32);
            await page.mouse.up();
            await expect(el).toHaveCSS('translate', '0px');
            await handle.focus();
            await handle.press('ArrowRight');
            await expect(el).toHaveAttribute('data-snap-x', '8');
            await handle.press('Home');
            await expect(el).toHaveAttribute('data-snap-x', '0');
        }
        else if (id === 'pixel-dissolve' || id === 'glitch-slice-reveal') {
            await expect(el.locator('.cin-image-layer')).toBeVisible();
            await expect(el.locator('img')).toHaveCSS('opacity', '0');
            await expect.poll(() => el.locator('canvas').evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(true);
            await expect(el.locator('canvas')).toHaveCount(0);
            await expect(el.locator('img')).toHaveCSS('opacity', '1');
        }
        else if (id === 'shutter-lens-transition') {
            await expect(el.locator('polygon')).toHaveCount(6);
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await expect(el.locator('.cin-shutter')).toHaveCount(0);
        }
        else if (id === 'liquid-distortion-reveal') {
            await expect.poll(() => el.evaluate(e => getComputedStyle(e).filter)).toContain('url(');
            await expect(el).toHaveCSS('filter', 'none');
            await expect(el.locator('feDisplacementMap')).toHaveCount(0);
        }
        else if (id === 'card-stack-shuffle') {
            const before = await el.locator('.shuffle-item [data-page-type=card]').evaluateAll(es => es.map(e => e.getAttribute('data-page-id')));
            await el.getByRole('button', { name: /洗牌/ }).click();
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await expect(el.getByRole('button', { name: /第2\/3張/ })).toBeEnabled();
            expect(await el.locator('.shuffle-item [data-page-type=card]').evaluateAll(es => es.map(e => e.getAttribute('data-page-id')))).toEqual(before);
        }
        else if (id === 'horizontal-scroll-gallery' || id === 'sticky-section-morph' || id === 'pinned-story-panels') {
            const slider = el.getByLabel('敘事捲動進度');
            await slider.fill('100');
            await slider.dispatchEvent('input');
            if (id === 'horizontal-scroll-gallery')
                await expect.poll(() => el.locator('.story-track').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m41)).toBeLessThan(0);
            else if (id === 'sticky-section-morph')
                await expect.poll(() => el.locator('.story-track').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).a)).toBeLessThan(1);
            else
                await expect(el.locator('.story-step')).toHaveText('分鏡 3 / 3');
        }
        else if (id === 'scroll-image-sequence') {
            await el.getByLabel('序列影格進度').fill('100');
            await el.getByLabel('序列影格進度').dispatchEvent('input');
            await expect(el.locator('img')).toHaveAttribute('src', /frame-03.svg$/);
            await expect(el).toContainText('影格 3 / 3');
        }
        else if (id === 'elastic-svg-morph') {
            const path = el.locator('.cin-shape path'), before = await path.getAttribute('d');
            await el.getByRole('button', { name: '變換圖形' }).click();
            await expect.poll(() => path.getAttribute('d')).not.toBe(before);
            await expect.poll(() => path.getAttribute('d')).toContain('Q');
            await el.getByRole('button', { name: '變換圖形' }).click();
            await expect(path).toHaveAttribute('d', before!);
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => running(el)).toBe(0);
        await expect(el).toBeVisible();
        check();
    });
for (const id of cinematicMotionIds)
    test(`${id}: apply, edit, remove, history and IndexedDB`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const check = await load(page, id, true), el = target(page, id);
        await page.getByRole('button', { name: '選取', exact: true }).click();
        await el.click({ position: { x: 4, y: 4 } });
        await openPanel(page, '動畫');
        await page.getByLabel('搜尋動畫').fill(id);
        await page.locator(`#preview-inspector [data-effect-id="${id}"] .asset-choose`).click();
        if (id === 'text-morph-transition')
            await page.getByLabel('目標文字', { exact: true }).fill('設計成真');
        if (id === 'cursor-image-follower')
            await choose(page.getByLabel('預覽圖片', { exact: true }), '/assets/workspace.svg');
        if (id === 'scroll-image-sequence')
            for (const frame of ['/assets/sequence/frame-01.svg', '/assets/sequence/frame-02.svg', '/assets/sequence/frame-03.svg'])
                await choose(page.getByLabel('序列影格新增影格', { exact: true }), frame);
        if (Object.values(motionCatalog[id].controls).some(c => c.required))
            await page.getByRole('button', { name: '確認附加動畫', exact: true }).click();
        await expect(el).toHaveAttribute('data-effects', id);
        await editSelection(page);
        const [key, c] = Object.entries(motionCatalog[id].controls).find(([, c]) => c.kind === 'number')!, label = key === 'durationMs' ? motionCatalog[id].nameZh + '時長' : c.label, input = page.getByLabel(label, { exact: true }), original = String(c.default), value = String(c.default === c.min ? c.max : c.min);
        await input.fill(value);
        await page.getByRole('button', { name: '套用', exact: true }).click();
        await expect(page.getByRole('status')).toContainText('已套用');
        await page.getByRole('button', { name: '撤銷修改', exact: true }).click();
        await expect(input).toHaveValue(original);
        await page.getByRole('button', { name: '重做修改', exact: true }).click();
        await expect(input).toHaveValue(value);
        await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
        await page.reload();
        await openWebsiteWorkspace(page);
        await expect(target(page, id)).toHaveAttribute('data-effects', id);
        await page.getByRole('button', { name: '選取', exact: true }).click();
        await openPanel(page,'圖層');
        await page.locator(`.element-browser [data-component-id="${thirdId(cinematicMotionIds.indexOf(id)*20+2)}"]`).click();
        await editSelection(page);
        await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
        await page.getByRole('button', { name: '移除' + motionCatalog[id].nameZh, exact: true }).click();
        await expect(target(page, id)).toHaveAttribute('data-effects', '');
        check();
    });
for (const width of [1440, 768, 375])
    test(`third gallery ${width}: sixty real presets, replay, focus and local scroll previews`, async ({ page }) => { await page.setViewportSize({ width, height: 1000 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('/?draft'); await expect(page.getByRole('status')).toContainText('草稿已就緒'); await page.getByRole('button', { name: '動畫素材庫', exact: true }).click(); await expect(page.locator('.sidebar [data-effect-id]')).toHaveCount(80); for (const id of cinematicMotionIds) {
        const asset = page.locator(`.sidebar [data-effect-id="${id}"]`);
        await asset.scrollIntoViewIfNeeded();
        await asset.locator('.motion-replay').click();
        await expect(asset.locator('.preview-error')).toHaveCount(0);
    } await expect(page.locator('.sidebar [data-effect-id=elastic-svg-morph] .cin-shape path')).toHaveAttribute('d',/Q 154 70/);
    await page.screenshot({ path: `test-results/third-gallery-${width}.png`, fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]); });
test('third-batch Mock generation preserves all twenty and actual card groups through confirmation and reload', async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/?draft'); await expect(page.getByRole('status')).toContainText('草稿已就緒'); const c = thirdCanvas(); await page.evaluate(async (c) => new Promise<void>((resolve, reject) => { const q = indexedDB.open('sketch2site', 3); q.onsuccess = () => { const db = q.result, t = db.transaction('drafts', 'readwrite'); t.objectStore('drafts').put(c, 'current'); t.oncomplete = () => { db.close(); resolve(); }; t.onabort = () => reject(t.error); }; }), c); await page.reload(); await expect(page.getByRole('status')).toContainText('草稿已就緒'); await page.getByRole('button', { name: '生成網站', exact: true }).click(); await expect(page.locator('[data-candidate-mode="mock"]')).toBeVisible(); for (const n of c.nodes)
    await expect(page.locator(`[aria-label="生成候選預覽"] [data-page-id="${n.id}"]`)).toHaveAttribute('data-effects', n.effects[0].presetId); await page.screenshot({ path: 'test-results/third-mock-generation.png', fullPage: true }); await page.getByRole('button', { name: '使用此版本', exact: true }).click(); await expect(page.getByTestId('page-save-status')).toHaveText('已儲存'); await page.reload(); await openWebsiteWorkspace(page); for (const n of c.nodes)
    await expect(page.locator(`.preview-frame [data-page-id="${n.id}"]`)).toHaveAttribute('data-effects', n.effects[0].presetId); });
test('image-frame failure falls back to the original and frame reordering remains editable', async ({ page }) => { await page.route('**/assets/sequence/frame-02.svg', route => route.abort()); await load(page, 'scroll-image-sequence'); const el = target(page, 'scroll-image-sequence'); await el.getByLabel('序列影格進度').fill('50'); await el.getByLabel('序列影格進度').dispatchEvent('input'); await expect(el.getByRole('status')).toHaveText('此影格無法載入，顯示原始圖片'); await expect(el.locator('img')).toHaveAttribute('src', /workspace.svg$/); await page.getByRole('button', { name: '選取', exact: true }).click(); await el.click({ position: { x: 4, y: 4 } }); await editSelection(page); await page.getByRole('button', { name: '上移影格3', exact: true }).click(); await page.getByRole('button', { name: '套用', exact: true }).click(); await expect(page.getByTestId('page-save-status')).toHaveText('已儲存'); await expect(el.locator('img')).toHaveAttribute('src', /frame-03.svg$/); });
test('pinned story panels move keyboard focus out before hiding a scene', async ({ page }) => { await load(page, 'pinned-story-panels'); const el = target(page, 'pinned-story-panels'); const child = el.locator('.story-panel').first().locator('[data-page-type=heading]'); await child.evaluate(e => (e as HTMLElement).tabIndex = 0); await child.focus(); await el.locator('.story-viewport').evaluate(e => e.scrollTop = e.scrollHeight); await expect(el.locator('.story-step')).toHaveText('分鏡 3 / 3'); await expect(el.locator('.story-viewport')).toBeFocused(); await expect(el.locator('.story-panel').first()).toHaveAttribute('inert', ''); });
test('particles pause offscreen and resume without leaking their drawing loop', async ({ page }) => { await load(page, 'particle-constellation'); const el = target(page, 'particle-constellation'), canvas = el.locator('canvas'); await expect(canvas).toHaveAttribute('data-paused', 'false'); await page.getByRole('button', { name: '草稿', exact: true }).click(); await expect(canvas).toHaveAttribute('data-paused', 'true'); const before = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()); await page.waitForTimeout(100); expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(before); await openWebsiteWorkspace(page); await expect(canvas).toHaveAttribute('data-paused', 'false'); await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before); });
test('Replay starts click-based scenes and scoped scroll previews rather than resetting a static card', async ({ page }) => { await page.goto('/?draft'); await expect(page.getByRole('status')).toContainText('草稿已就緒'); await page.getByRole('button', { name: '動畫素材庫', exact: true }).click(); const morph = page.locator('.sidebar [data-effect-id=text-morph-transition]'); await morph.locator('.motion-replay').click(); await expect(morph.locator('.cin-text-source')).toHaveText('設計成真'); const story = page.locator('.sidebar [data-effect-id=pinned-story-panels]'); await story.locator('.motion-replay').click(); await expect(story.locator('.story-step')).toHaveText('分鏡 3 / 3'); await page.screenshot({ path: 'test-results/third-replay-story.png', fullPage: true }); });
for (const width of [768, 375])
    test(`third scenes at ${width}: readable content and native mobile fallback`, async ({ page }) => { page.on('dialog', d => d.accept()); await page.setViewportSize({ width, height: 1000 }); for (const id of ['horizontal-scroll-gallery', 'pinned-story-panels', 'card-stack-shuffle'] as const) {
        await load(page, id);
        const el = target(page, id);
        if (width === 375 && id !== 'card-stack-shuffle') {
            await expect(el.locator('.story-simple')).toBeVisible();
            await expect(el.getByLabel('敘事捲動進度')).toHaveCount(0);
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        for (const text of ['構思', '設計', '實作'])
            await expect(el.getByRole('heading', { name: text, exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } await page.screenshot({ path: `test-results/third-scenes-${width}.png`, fullPage: true }); });
test('real touch input has a bounded drag handle and a fixed follower preview without navigating', async ({ browser }) => { const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 1000 }, hasTouch: true, isMobile: true }); const page = await context.newPage(); try {
    page.on('dialog', d => d.accept());
    await load(page, 'spring-drag-snap');
    const el = target(page, 'spring-drag-snap'), handle = el.getByRole('button', { name: /拖曳把手/ }), b = (await handle.boundingBox())!, cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 12, y: b.y + 12, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + 92, y: b.y + 32, id: 1 }] });
    const delta = await el.evaluate(e => Number.parseFloat(getComputedStyle(e).translate));
    expect(Math.abs(delta)).toBeLessThanOrEqual(32);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(el).toHaveCSS('translate', '0px');
    await load(page, 'cursor-image-follower');
    const follower = target(page, 'cursor-image-follower');
    await follower.evaluate(e => e.addEventListener('click', ev => ev.preventDefault()));
    const f = (await follower.boundingBox())!;
    await page.touchscreen.tap(f.x + f.width / 2, f.y + f.height / 2);
    await expect(follower.locator('.cin-follower')).toHaveAttribute('data-visible', 'true');
    expect(new URL(page.url()).origin).toBe('http://127.0.0.1:5173');
}
finally {
    await context.close();
} });
test('desktop mobile-preview width uses the same vertical story fallback as an exported phone viewport',async({page})=>{await page.setViewportSize({width:1440,height:1000});await load(page,'pinned-story-panels');const el=target(page,'pinned-story-panels');await expect(el.locator('.story-simple')).toHaveCount(0);const menu=page.locator('.workbench-menu>summary').filter({hasText:'檢視'});if(!await page.getByRole('button',{name:'手機',exact:true}).isVisible())await menu.click();await page.getByRole('button',{name:'手機',exact:true}).click();await expect(el.locator('.story-simple')).toBeVisible();await expect(el.getByLabel('敘事捲動進度')).toHaveCount(0);});
test('keyboard scrolling a library demo never moves the selected draft element',async({page})=>{await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');await page.getByRole('button',{name:'新增文字',exact:true}).click();const node=page.getByTestId('canvas-node');const before=await node.evaluate(e=>({left:(e as HTMLElement).style.left,top:(e as HTMLElement).style.top}));await page.getByRole('button',{name:'動畫素材庫',exact:true}).click();const viewport=page.locator('.sidebar [data-effect-id=pinned-story-panels] .story-viewport');await viewport.focus();await viewport.press('ArrowDown');await viewport.press('ArrowRight');await page.getByRole('button',{name:'草稿',exact:true}).click();expect(await node.evaluate(e=>({left:(e as HTMLElement).style.left,top:(e as HTMLElement).style.top}))).toEqual(before);});

test('gooey drift merges in a theme-colored background and pauses for Reduced Motion', async ({ page }) => {
    const input = thirdFixture('gooey-blob-merge');
    const effect = input.sections[0].children![0].effects[0];
    effect.validatedControls.flow = 'drift';
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?draft');
    await openWebsiteWorkspace(page);
    await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'gooey-drift.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(input)) });
    const el = target(page, 'gooey-blob-merge');
    const surface = el.locator('.cin-gooey-drift');
    await el.scrollIntoViewIfNeeded();
    await expect(surface.locator('circle')).toHaveCount(3);
    await expect(surface.locator('g[filter]')).toHaveCount(1);
    await expect.poll(() => running(el)).toBe(3);
    const first = surface.locator('circle').first();
    const initial = await first.evaluate(circle => getComputedStyle(circle).transform);
    await expect.poll(() => first.evaluate(circle => getComputedStyle(circle).transform)).not.toBe(initial);
    const carrier = surface.locator('.cin-gooey-carrier').first();
    await el.hover();
    await expect(carrier).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 36.4, 0)');
    await expect(first).toHaveCSS('fill', await el.evaluate(node => getComputedStyle(node).getPropertyValue('--accent').trim()).then(async token =>
      page.evaluate(value => {
        const probe = document.createElement('span');
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }, token)));
    await page.setViewportSize({ width: 375, height: 840 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(surface.locator('circle')).toHaveCount(3);
    await expect(surface.locator('g[filter]')).toHaveCount(0);
    await expect.poll(() => running(el)).toBe(0);
});
