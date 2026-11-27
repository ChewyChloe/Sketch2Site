import { test, expect, type Page } from '@playwright/test';
import { motionCatalog, referenceMotionIds } from '../src/motionCatalog';
import { referenceFixture as fixture, uid, type Id } from './fixtures/referenceMotions';
import { openWebsiteWorkspace, openPanel, editSelection } from './helpers/workbench';

// Reference batch 1: real previews in the library, then on a site: apply, change a
// parameter, Undo/Redo, save and reload, phone width, reduced motion and export.
const target = (page: Page, id: Id) => page.locator(`.preview-frame [data-page-id="${uid(100 + referenceMotionIds.indexOf(id))}"]`);
async function load(page: Page, withEffect: boolean) {
    const errors: string[] = [], calls: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname.startsWith('/api/generation')) calls.push(r.url()); });
    await page.goto('/?draft');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await openWebsiteWorkspace(page);
    await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'reference.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture(withEffect))) });
    await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
    return () => { expect(errors).toEqual([]); expect(calls).toEqual([]); };
}

test('library previews are live: hover, scroll and replay show the real effect', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?draft');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await page.getByRole('button', { name: '動畫素材庫', exact: true }).click();
    await expect(page.locator('.sidebar [data-effect-id]')).toHaveCount(77);
    const card = (id: string) => page.locator(`.sidebar [data-effect-id="${id}"]`);
    for (const id of referenceMotionIds) {
        await card(id).scrollIntoViewIfNeeded();
        await expect(card(id).locator('.asset-new')).toHaveText('NEW');
        await expect(card(id)).toContainText(motionCatalog[id].nameZh);
    }
    // Dolly frame: hovering zooms the photo inside a fixed frame and raises the caption.
    const dolly = card('dolly-frame').locator('[data-effects~=dolly-frame]');
    await card('dolly-frame').scrollIntoViewIfNeeded();
    const frame = await dolly.boundingBox();
    await dolly.hover();
    await expect(dolly).toHaveAttribute('data-ref-on', '');
    await expect.poll(() => dolly.locator('img').evaluate(e => getComputedStyle(e).transform)).toContain('matrix(1.08');
    await expect(dolly.locator('.ref-caption')).toHaveCSS('opacity', '1');
    const zoomed = await dolly.boundingBox();
    expect(zoomed!.width).toBeCloseTo(frame!.width, 0);
    expect(zoomed!.height).toBeCloseTo(frame!.height, 0);
    // Color wake: grey until hovered.
    const wake = card('color-wake').locator('[data-effects~=color-wake]');
    await card('color-wake').scrollIntoViewIfNeeded();
    await expect(wake.locator('img')).toHaveCSS('filter', /grayscale/);
    await wake.hover();
    await expect.poll(() => wake.locator('img').evaluate(e => getComputedStyle(e).filter)).toBe('none');
    // Ink as you read builds a word layer; the real paragraph text is unchanged.
    await card('scroll-ink-words').scrollIntoViewIfNeeded();
    const ink = card('scroll-ink-words').locator('[data-effects~=scroll-ink-words]');
    await expect(ink.locator('.ref-ink > span').first()).toBeAttached();
    await expect(ink).toContainText('每一杯咖啡');
    // Hollow to solid: outline, then filled on hover.
    const hollow = card('hollow-fill-sweep').locator('[data-effects~=hollow-fill-sweep]');
    await card('hollow-fill-sweep').scrollIntoViewIfNeeded();
    await expect(hollow).toHaveCSS('background-position', '100% 0px');
    await hollow.hover();
    await expect.poll(() => hollow.evaluate(e => getComputedStyle(e).backgroundPosition)).toBe('0px 0px');
    // Letter windows: a photo clipped to the letters, drifting.
    const windows = card('letter-windows').locator('[data-effects~=letter-windows]');
    await card('letter-windows').scrollIntoViewIfNeeded();
    await expect(windows).toHaveCSS('background-clip', 'text, text');
    await expect(windows).toHaveCSS('background-image', /coffee-pourover\.jpg/);
    await expect.poll(() => windows.evaluate(e => e.getAnimations().length)).toBeGreaterThan(0);
    // Bold relay: one animated copy per letter.
    const relay = card('bold-relay').locator('[data-effects~=bold-relay]');
    await card('bold-relay').scrollIntoViewIfNeeded();
    await expect(relay.locator('.ref-relay > span')).toHaveCount(5);
    await expect.poll(() => relay.evaluate(e => e.getAnimations({ subtree: true }).length)).toBeGreaterThan(3);
    // Chart build-up: hovering the card plays the bars growing.
    await card('chart-build').scrollIntoViewIfNeeded();
    await card('chart-build').hover();
    await expect.poll(() => card('chart-build').locator('rect.chart-bar').first().evaluate(e => e.getAnimations().length)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

for (const id of referenceMotionIds)
    test(`${id}: apply, parameter, Undo/Redo and IndexedDB reload`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const check = await load(page, false);
        const el = target(page, id);
        await page.getByRole('button', { name: '選取', exact: true }).click();
        await el.click({ position: { x: 4, y: 4 } });
        await openPanel(page, '動畫');
        await page.getByLabel('搜尋動畫').fill(motionCatalog[id].nameZh);
        await page.locator(`#preview-inspector [data-effect-id="${id}"] .asset-choose`).click();
        await expect(el).toHaveAttribute('data-effects', id);
        await editSelection(page);
        const [key, c] = Object.entries(motionCatalog[id].controls).find(([, c]) => c.kind === 'number')!;
        const label = key === 'durationMs' ? motionCatalog[id].nameZh + '時長' : c.label;
        const input = page.getByLabel(label, { exact: true }), value = String(c.max);
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
        check();
    });

test('chart build-up is offered only for charts', async ({ page }) => {
    const check = await load(page, false);
    await page.getByRole('button', { name: '選取', exact: true }).click();
    await target(page, 'dolly-frame').click({ position: { x: 4, y: 4 } });
    await openPanel(page, '動畫');
    await page.getByLabel('搜尋動畫').fill(motionCatalog['chart-build'].nameZh);
    await expect(page.locator('#preview-inspector [data-effect-id="chart-build"]')).toHaveAttribute('data-compatibility', 'unavailable');
    check();
});

for (const width of [1440, 375])
    test(`site at ${width}px: effects run, text stays real, reduced motion is still`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const check = await load(page, true);
        const hollow = target(page, 'hollow-fill-sweep');
        await hollow.scrollIntoViewIfNeeded();
        await expect(hollow).toHaveText('自家烘豆');
        await expect(hollow).toHaveClass(/ref-hollow/);
        const ink = target(page, 'scroll-ink-words');
        await ink.scrollIntoViewIfNeeded();
        await expect(ink.locator('.ref-ink')).toHaveAttribute('aria-hidden', 'true');
        const box = await ink.boundingBox(), layer = await ink.locator('.ref-ink').boundingBox();
        expect(layer!.width).toBeLessThanOrEqual(box!.width + 1);
        const chart = target(page, 'chart-build');
        await chart.scrollIntoViewIfNeeded();
        await expect(chart.locator('svg[role=img]')).toHaveAttribute('aria-label', /一月 32/);
        const doc = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
        expect(doc).toBe(true);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.reload();
        await openWebsiteWorkspace(page);
        await expect(target(page, 'hollow-fill-sweep')).not.toHaveClass(/ref-hollow/);
        await expect(target(page, 'scroll-ink-words').locator('.ref-ink')).toHaveCount(0);
        await expect(target(page, 'bold-relay').locator('.ref-relay')).toHaveCount(0);
        check();
    });

test('React export ships the runtime, the metadata and the photo in the motion', async ({ page }) => {
    await page.goto('/?draft');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    const result = await page.evaluate(async (input) => {
        const { exportProjectFiles } = await import('/src/exportProject.ts');
        let files;
        try { files = await exportProjectFiles(input); } catch (e) { return { error: String((e as Error).message).slice(0, 600) }; }
        const runtime = files.find(f => f.path === 'src/PageRuntime.tsx')!.content as string;
        const json = files.find(f => f.path === 'src/page.json')!.content as string;
        return { paths: files.map(f => f.path), hooked: runtime.includes('useReferenceMotion'), json };
    }, fixture(true));
    expect(result.error).toBeUndefined();
    expect(result.paths).toEqual(expect.arrayContaining(['src/ReferenceMotion.tsx', 'src/referenceMotions.ts', 'public/assets/samples/coffee-pourover.jpg']));
    expect(result.hooked).toBe(true);
    for (const id of referenceMotionIds) expect(result.json).toContain(`"presetId": "${id}"`);
});

test('replay in the library plays hover and scroll effects by themselves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?draft');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await page.getByRole('button', { name: '動畫素材庫', exact: true }).click();
    const card = (id: string) => page.locator(`.sidebar [data-effect-id="${id}"]`);
    for (const id of ['dolly-frame', 'color-wake', 'hollow-fill-sweep'] as const) {
        await card(id).scrollIntoViewIfNeeded();
        await card(id).locator('.motion-replay').click();
        await page.mouse.move(2, 2);
        // Turns on with nobody hovering, then settles back.
        await expect(card(id).locator(`[data-effects~=${id}]`)).toHaveAttribute('data-ref-on', '', { timeout: 3000 });
        await expect(card(id).locator(`[data-effects~=${id}]`)).not.toHaveAttribute('data-ref-on', '', { timeout: 5000 });
    }
    // The reading sweep: the last word starts dim and ends at full strength.
    await card('scroll-ink-words').scrollIntoViewIfNeeded();
    await card('scroll-ink-words').locator('.motion-replay').click();
    await page.mouse.move(2, 2);
    const last = card('scroll-ink-words').locator('.ref-ink > span').last();
    await expect.poll(() => last.evaluate(e => Number(getComputedStyle(e).opacity)), { timeout: 1500 }).toBeLessThan(0.5);
    await expect.poll(() => last.evaluate(e => Number(getComputedStyle(e).opacity)), { timeout: 5000 }).toBeGreaterThan(0.95);
});

test('remove a reference motion on the site, then Undo brings it back', async ({ page }) => {
    const check = await load(page, true);
    const el = target(page, 'dolly-frame');
    await expect(el).toHaveClass(/ref-dolly/);
    await page.getByRole('button', { name: '選取', exact: true }).click();
    await el.click({ position: { x: 4, y: 4 } });
    await editSelection(page);
    await page.getByRole('button', { name: '移除' + motionCatalog['dolly-frame'].nameZh }).click();
    await expect(el).not.toHaveAttribute('data-effects', /dolly-frame/);
    await expect(el).not.toHaveClass(/ref-dolly/);
    await expect(el.locator('.ref-caption')).toHaveCount(0);
    await page.getByRole('button', { name: '撤銷修改', exact: true }).click();
    await expect(el).toHaveAttribute('data-effects', 'dolly-frame');
    await expect(el).toHaveClass(/ref-dolly/);
    check();
});

test('on the draft canvas: apply to a heading and a chart, both reach the generated site', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/\/api\/generation\/(status|ready)$/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: false }) }));
    await page.goto('/?draft');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    const card = (id: string) => page.locator(`.sidebar [data-effect-id="${id}"]`);
    // A chart from the element panel.
    await page.getByRole('tab', { name: '元件' }).click();
    await page.getByRole('button', { name: '新增圖表' }).click();
    const chart = page.locator('[data-testid="canvas-node"].media').last();
    await chart.click();
    await page.getByRole('tab', { name: '動畫' }).click();
    await card('chart-build').locator('.asset-choose').click();
    await expect(chart.locator('.effect-tags')).toContainText(motionCatalog['chart-build'].nameZh);
    // A new heading.
    await page.getByRole('tab', { name: '元件' }).click();
    await page.getByRole('button', { name: '新增標題', exact: true }).click();
    const heading = page.locator('[data-testid="canvas-node"].heading').last();
    await heading.click();
    await page.getByRole('tab', { name: '動畫' }).click();
    await card('hollow-fill-sweep').locator('.asset-choose').click();
    await expect(heading.locator('.effect-tags')).toContainText(motionCatalog['hollow-fill-sweep'].nameZh);
    // Incompatible: the chart motion is not offered for the heading.
    await expect(card('chart-build')).toHaveAttribute('data-compatibility', 'unavailable');
    await page.getByRole('button', { name: '生成網站', exact: true }).click();
    const site = page.locator(".candidate-preview .rendered-page, main[aria-label='生成候選預覽'] .rendered-page").first();
    await expect(site.locator('[data-effects~=chart-build]')).toHaveCount(1);
    await expect(site.locator('[data-effects~=hollow-fill-sweep]')).toHaveCount(1);
    expect(errors).toEqual([]);
});

test('bold relay keeps Latin text on the same lines as the real heading', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 375, height: 800 });
    const check = await load(page, true);
    await page.getByLabel('載入頁面檔案').setInputFiles({ name: 'latin.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify((() => { const f = fixture(true); const n = f.sections[referenceMotionIds.indexOf('bold-relay')].children[0] as { content: string }; n.content = 'FRESH COFFEE EVERY MORNING'; return f; })())) });
    await expect(page.getByTestId('page-save-status')).toHaveText('已儲存');
    const relay = target(page, 'bold-relay');
    await relay.scrollIntoViewIfNeeded();
    await expect(relay.locator('.ref-relay')).toBeAttached();
    await page.waitForTimeout(1200);
    const [host, copy] = await relay.evaluate(e => [e.clientHeight, (e.querySelector('.ref-relay') as HTMLElement).scrollHeight]);
    expect(copy).toBeLessThanOrEqual(host + 2);
    check();
});

for (const [id, layer, tracks] of [
    ["crosswind-ribbons", ".ref-ribbons", ".ref-ribbon-track"],
    ["vanishing-lattice", ".ref-lattice", ".ref-lattice-floor"],
] as const) {
    test(`${id}: live theme decoration, mobile bounds, replay and reduced motion`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 900 });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        const check = await load(page, true);
        const node = target(page, id);
        await node.scrollIntoViewIfNeeded();
        const decoration = node.locator(layer);
        await expect(decoration).toHaveAttribute("aria-hidden", "true");
        await expect(decoration).toHaveCSS("pointer-events", "none");
        const animating = decoration.locator(tracks).first();
        await expect.poll(() => animating.evaluate(el => el.getAnimations()[0]?.playState)).toBe("running");
        const previous = await animating.evaluate(el => Number(el.getAnimations()[0].currentTime));
        await expect.poll(() => animating.evaluate(el => Number(el.getAnimations()[0].currentTime))).toBeGreaterThan(previous);
        const layers = await decoration.boundingBox(), host = await node.boundingBox();
        expect(layers!.width).toBeLessThanOrEqual(host!.width + 1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect.poll(() => decoration.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
        await expect(node).toHaveAttribute("data-effects", id);
        check();
    });
}
