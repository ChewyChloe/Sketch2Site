import { test, expect, type Page } from '@playwright/test';
import { advancedMotionIds, motionCatalog } from '../src/motionCatalog';
import { advancedFixture, advancedId, advancedCanvas } from './fixtures/advancedMotions';
import { openWebsiteWorkspace, openPanel, editSelection, viewAction } from './helpers/workbench';
async function load(page: Page, id?: string, bare = false) { const errors: string[] = [], calls: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/generation')
    calls.push(r.url()); }); await page.goto('/?draft'); await expect(page.getByRole('status')).toContainText('草稿已就緒'); await openWebsiteWorkspace(page); if (id === 'layered-parallax' || id === 'scroll-milestones')
    await page.addStyleTag({ content: '.preview-frame .page-card{height:120px;overflow-y:auto}.preview-frame .page-card>[data-page-id]{min-height:180px;flex-shrink:0}' }); await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'advanced.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(advancedFixture(id, bare))) }); await expect(page.getByTestId('page-save-status')).toHaveText('已儲存'); return () => { expect(errors).toEqual([]); expect(calls).toEqual([]); }; }
const target = (page: Page, id: typeof advancedMotionIds[number]) => page.locator(`.preview-frame [data-page-id="${advancedId(advancedMotionIds.indexOf(id) * 10 + 10)}"]`);
const running = (el: ReturnType<typeof target>) => el.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
for (const id of advancedMotionIds)
    test(`${id}: real runtime, stable final state and reduced motion`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        // Capture transient frames in the browser; polling a locator after the
        // overlay has been removed can wait for an animation that already ended.
        if (id === 'character-decode') await page.addInitScript(() => {
            const frames = new Set<string>();
            new MutationObserver(() => {
                const overlay = document.querySelector('.preview-frame .advanced-text-overlay');
                if (overlay?.textContent) {
                    frames.add(overlay.textContent);
                    document.documentElement.dataset.decodeFrames = String(frames.size);
                }
            }).observe(document, { subtree: true, childList: true, characterData: true });
        });
        const check = await load(page, id);
        const el = target(page, id);
        await el.scrollIntoViewIfNeeded();
        await el.evaluate(e => e.addEventListener('click', event => event.preventDefault()));
        if (['character-decode', 'split-line-assembly', 'rolling-characters', 'kinetic-text-wave'].includes(id)) {
            const original = await el.locator('.advanced-text-source').textContent();
            if (id === 'character-decode') {
                await expect.poll(() => page.locator('html').getAttribute('data-decode-frames').then(value => Number(value))).toBeGreaterThan(1);
            } else {
                await expect(el.locator('.advanced-text-overlay')).toBeVisible();
                await expect.poll(() => running(el)).toBeGreaterThan(0);
            }
            await expect(el.locator('.advanced-text-overlay')).toHaveCount(0, { timeout: 5000 });
            await expect(el.locator('.advanced-text-source')).toHaveText(original!);
            await expect(el.locator('.advanced-text-source')).toHaveCSS('opacity', '1');
        }
        else if (id === 'hand-drawn-highlight') {
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await expect(el.locator('.advanced-highlight')).toHaveCSS('background-repeat', 'no-repeat');
        }
        else if (id === 'cursor-spotlight') {
            const box = (await el.boundingBox())!;
            await page.mouse.move(box.x + 10, box.y + 10);
            await expect(el.locator('.advanced-spotlight')).toHaveCSS('opacity', '1');
            expect(await el.locator('.advanced-spotlight').evaluate(e => parseFloat((e as HTMLElement).style.left))).toBeLessThan(20);
            await page.mouse.move(0, 0);
            await expect(el.locator('.advanced-spotlight')).toHaveCSS('opacity', '0');
        }
        else if (id === 'liquid-button-fill') {
            await el.focus();
            await expect(el.locator('.advanced-liquid')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
            await el.blur();
            await expect.poll(() => el.locator('.advanced-liquid').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m42)).toBeGreaterThan(0);
        }
        else if (id === 'radial-ink-ripple') {
            await el.dispatchEvent('pointerdown', { button: 0, pointerType: 'mouse', clientX: (await el.boundingBox())!.x + 12, clientY: (await el.boundingBox())!.y + 8 });
            await expect(el.locator('.advanced-ripple')).toHaveCount(1);
            await expect(el.locator('.advanced-ripple')).toHaveCount(0);
            await el.focus();
            await el.press('Space');
            await expect(el.locator('.advanced-ripple')).toHaveCount(1);
            await expect(el.locator('.advanced-ripple')).toHaveCount(0);
        }
        else if (id === 'orbiting-icon') {
            await el.focus();
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await expect(el.locator('.advanced-orbit')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 3, 0)');
            await el.blur();
            await expect(el.locator('.advanced-orbit')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
        }
        else if (id === 'border-light-trace') {
            await el.focus();
            await expect(el.locator('.advanced-border-svg')).toHaveCSS('opacity', '1');
            expect(await el.locator('rect').evaluate(e => e.getBoundingClientRect().width)).toBeGreaterThan(10);
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            await el.blur();
            await expect(el.locator('.advanced-border-svg')).toHaveCSS('opacity', '0');
        }
        else if (id === 'perspective-tilt') {
            const b = (await el.boundingBox())!;
            await page.mouse.move(b.x + b.width * .8, b.y + b.height * .25);
            await expect.poll(() => el.evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
            await page.mouse.move(0, 0);
            await expect(el).toHaveCSS('transform', 'none');
        }
        else if (['venetian-reveal', 'circular-mask-expansion', 'cinematic-image-pan', 'grid-diagonal-turn', 'svg-path-drawing', 'numeric-gauge-sweep'].includes(id)) {
            await expect.poll(() => running(el)).toBeGreaterThan(0);
            const frames = await el.evaluate(e => e.getAnimations({ subtree: true }).map(a => (a.effect as KeyframeEffect).getKeyframes()));
            expect(JSON.stringify(frames)).toContain(id === 'venetian-reveal' ? 'polygon' : id === 'circular-mask-expansion' ? 'circle' : id === 'cinematic-image-pan' ? 'scale' : id === 'grid-diagonal-turn' ? 'perspective' : 'strokeDashoffset');
            if (id === 'numeric-gauge-sweep')
                await expect(el.locator('path')).toHaveCSS('stroke-dashoffset', '25px');
        }
        else if (id === 'card-deck-fan') {
            await el.focus();
            await expect.poll(() => el.locator('[data-page-id]').first().evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
            await el.blur();
            await expect(el.locator('[data-page-id]').first()).toHaveCSS('transform', 'none');
        }
        else if (id === 'layered-parallax' || id === 'scroll-milestones') {
            await el.evaluate(e => { Object.assign((e as HTMLElement).style, { height: '120px', overflowY: 'auto' }); e.querySelectorAll<HTMLElement>('[data-page-id]').forEach(c => c.style.minHeight = '180px'); });
            await el.evaluate(e => e.scrollTop = 0);
            if (id === 'scroll-milestones') {
                await expect(el.locator('.advanced-milestones')).toHaveAttribute('aria-valuenow', '0');
                await el.evaluate(e => e.scrollTop = e.scrollHeight);
                await expect(el.locator('.advanced-milestones')).toHaveAttribute('aria-valuenow', '5');
            }
            else {
                const before = await el.locator('[data-page-id]').first().evaluate(e => getComputedStyle(e).translate);
                await el.evaluate(e => e.scrollTop = e.scrollHeight);
                await expect.poll(() => el.locator('[data-page-id]').first().evaluate(e => getComputedStyle(e).translate)).not.toBe(before);
            }
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => running(el)).toBe(0);
        await expect(el).toBeVisible();
        check();
    });
for (const id of advancedMotionIds)
    test(`${id}: apply, parameters, remove, Undo/Redo, IndexedDB reload`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const check = await load(page, id, true);
        const el = target(page, id);
        await page.getByRole('button', { name: '選取', exact: true }).click();
        await el.click({ position: { x: 4, y: 4 } });
        await openPanel(page, '動畫');
        await page.getByLabel('搜尋動畫').fill(id);
        await page.locator(`#preview-inspector [data-effect-id="${id}"] .asset-choose`).click();
        await expect(el).toHaveAttribute('data-effects', id);
        await editSelection(page);
        const [key, c] = Object.entries(motionCatalog[id].controls).find(([, c]) => c.kind === 'number')!;
        const label = key === 'durationMs' ? motionCatalog[id].nameZh + '時長' : c.label;
        const input = page.getByLabel(label, { exact: true }), value = String(c.min);
        await input.fill(value);
        await page.getByRole('button', { name: '套用', exact: true }).click();
        await expect(page.getByRole('status')).toContainText('已套用');
        await page.getByRole('button', { name: '撤銷修改', exact: true }).click();
        await expect(input).toHaveValue(String(c.default));
        await page.getByRole('button', { name: '重做修改', exact: true }).click();
        await expect(input).toHaveValue(value);
        await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
        await page.reload();
        await openWebsiteWorkspace(page);
        await expect(target(page, id)).toHaveAttribute('data-effects', id);
        await page.getByRole('button', { name: '選取', exact: true }).click();
        await target(page, id).click({ position: { x: 4, y: 4 } });
        await editSelection(page);
        await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
        await page.getByRole('button', { name: '移除' + motionCatalog[id].nameZh, exact: true }).click();
        await expect(target(page, id)).toHaveAttribute('data-effects', '');
        check();
    });
for (const width of [1440, 768, 375])
    test(`advanced gallery ${width}: all live previews replay without overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/?draft');
        await expect(page.getByRole('status')).toContainText('草稿已就緒');
        await page.getByRole('button', { name: '動畫素材庫', exact: true }).click();
        await expect(page.locator('.sidebar [data-effect-id]')).toHaveCount(75);
        for (const id of advancedMotionIds) {
            const asset = page.locator(`.sidebar [data-effect-id="${id}"]`);
            await asset.scrollIntoViewIfNeeded();
            await asset.locator('.motion-replay').click();
            await expect(asset.locator('.preview-error')).toHaveCount(0);
            await expect(asset.locator('[data-page-id]').first()).toBeVisible();
        }
        await page.screenshot({ path: `test-results/advanced-gallery-${width}.png`, fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errors).toEqual([]);
    });
test('twenty draft markers survive a real IndexedDB save and reload without changing layout', async ({ page }) => { await page.goto('/?draft'); await expect(page.getByRole('status')).toContainText('草稿已就緒'); const c = advancedCanvas(); await page.evaluate(async (c) => new Promise<void>((resolve, reject) => { const request = indexedDB.open('sketch2site', 3); request.onsuccess = () => { const db = request.result, t = db.transaction('drafts', 'readwrite'); t.objectStore('drafts').put(c, 'current'); t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error); }; }), c); await page.reload(); await expect(page.getByTestId('canvas-node')).toHaveCount(20); for (const node of c.nodes) {
    const el = page.locator(`[data-node-id="${node.id}"]`);
    await expect(el).toHaveCSS('left', node.x + 'px');
    await expect(el).toHaveCSS('top', node.y + 'px');
    await expect(el.locator('.effect-tags>span')).toHaveCount(1);
} await page.screenshot({ path: 'test-results/advanced-draft.png', fullPage: true }); });

test('long text falls back safely and real line layout survives resize',async({page})=>{
 page.on('dialog',d=>d.accept());await load(page,'character-decode');const f=advancedFixture('character-decode'),text='繁體中文👩‍💻 '.repeat(40);f.sections[0].children![0].content=text;await page.getByLabel('載入頁面檔案').setInputFiles({name:'long.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f))});await expect(target(page,'character-decode').locator('.advanced-text-source')).toHaveText(text);await expect(target(page,'character-decode').locator('.advanced-text-overlay')).toHaveCount(0);
 const lines=advancedFixture('split-line-assembly');await page.getByLabel('載入頁面檔案').setInputFiles({name:'lines.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lines))});await page.setViewportSize({width:375,height:1000});await expect(target(page,'split-line-assembly').locator('.advanced-text-source')).toHaveCSS('opacity','1');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('actual multi-column grid uses distinct row, column and center timing without reordering DOM',async({page})=>{
 page.on('dialog',d=>d.accept());await load(page,'grid-diagonal-turn');const f=advancedFixture('grid-diagonal-turn'),grid=f.sections[0].children![0];grid.type='grid';grid.columns=3;f.responsive.desktopColumns=3;const originals=grid.children!;grid.children=[...originals,...originals.map((n,i)=>({...n,id:advancedId(900+i)}))];const timings:string[]=[];
 for(const order of ['row','column','center']){grid.effects[0].validatedControls.order=order;await page.getByLabel('載入頁面檔案').setInputFiles({name:'grid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f))});const el=target(page,'grid-diagonal-turn');await expect(el.locator(':scope>[data-page-id]')).toHaveCount(6);await expect.poll(()=>running(el)).toBeGreaterThan(0);if(timings.length)await expect.poll(()=>el.evaluate(e=>JSON.stringify(Array.from(e.children).filter(n=>(n as HTMLElement).dataset.pageId).map(n=>n.getAnimations()[0]?.effect?.getTiming().delay)))).not.toBe(timings.at(-1));const values=await el.evaluate(e=>Array.from(e.children).filter(n=>(n as HTMLElement).dataset.pageId).map(n=>({id:(n as HTMLElement).dataset.pageId,delay:n.getAnimations()[0]?.effect?.getTiming().delay})));expect(values.map(v=>v.id)).toEqual(grid.children.map(n=>n.id));timings.push(JSON.stringify(values.map(v=>v.delay)));}
 expect(new Set(timings).size).toBe(3);
});

test('Mock generation preserves all twenty new draft motions through candidate acceptance and reload',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?draft');await expect(page.getByRole('status')).toContainText('草稿已就緒');const c=advancedCanvas();await page.evaluate(async value=>new Promise<void>((resolve,reject)=>{const q=indexedDB.open('sketch2site',3);q.onsuccess=()=>{const db=q.result,t=db.transaction('drafts','readwrite');t.objectStore('drafts').put(value,'current');t.oncomplete=()=>{db.close();resolve();};t.onabort=()=>reject(t.error);};}),c);await page.reload();await expect(page.getByRole('status')).toContainText('草稿已就緒');await page.getByRole('button',{name:'生成網站',exact:true}).click();await expect(page.getByRole('main',{name:'生成候選預覽'})).toBeVisible();await expect(page.locator('[data-candidate-mode="mock"]')).toBeVisible();for(const node of c.nodes)await expect(page.locator(`[aria-label="生成候選預覽"] [data-page-id="${node.id}"]`)).toHaveAttribute('data-effects',node.effects[0].presetId);await page.screenshot({path:'test-results/advanced-mock-generation.png',fullPage:true});await page.getByRole('button',{name:'使用此版本',exact:true}).click();await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');await page.reload();await openWebsiteWorkspace(page);for(const node of c.nodes)await expect(page.locator(`.preview-frame [data-page-id="${node.id}"]`)).toHaveAttribute('data-effects',node.effects[0].presetId);
});
test('ripple cancellation removes transient DOM when the workspace is hidden; rapid presses remain bounded',async({page})=>{await load(page,'radial-ink-ripple');const el=target(page,'radial-ink-ripple');await el.evaluate(e=>{const b=e.getBoundingClientRect();for(let i=0;i<12;i++)e.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerType:'mouse',clientX:b.left+8,clientY:b.top+8}));});expect(await el.locator('.advanced-ripple').count()).toBeLessThanOrEqual(3);await page.getByRole('button',{name:'草稿',exact:true}).click();await expect(el.locator('.advanced-ripple')).toHaveCount(0);});
test('hover text wave supports focus and click replay, cancels interruptions and preserves exact text',async({page})=>{page.on('dialog',d=>d.accept());await load(page,'kinetic-text-wave');const f=advancedFixture('kinetic-text-wave');f.sections[0].children![0].effects[0].validatedControls.trigger='hover';await page.getByLabel('載入頁面檔案').setInputFiles({name:'hover.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f))});const el=target(page,'kinetic-text-wave'),wave=el.locator('.advanced-text');await expect(wave).toHaveAttribute('tabindex','0');await wave.focus();await expect(el.locator('.advanced-text-overlay')).toBeVisible();await wave.blur();await expect(el.locator('.advanced-text-overlay')).toHaveCount(0);await expect.poll(()=>running(el)).toBe(0);await wave.dispatchEvent('click',{pointerType:'touch'});await expect(el.locator('.advanced-text-overlay')).toBeVisible();await expect(el.locator('.advanced-text-overlay')).toHaveCount(0);await expect(el.locator('.advanced-text-source')).toHaveText('讓文字起舞 Wave');});
