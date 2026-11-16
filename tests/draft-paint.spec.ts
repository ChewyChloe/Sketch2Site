import {writeFile} from "node:fs/promises";
import { expect, test, type Page } from '@playwright/test';

// Decode the actual Chromium screenshot, rather than inferring paint from DOM
// counts or computed styles. Keep the dependency set unchanged.
async function greenPixels(page: Page, png: Buffer, excluded?: { x: number; y: number; width: number; height: number }) {
  return page.evaluate(async ({ data, excluded }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let green = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (excluded && x >= excluded.x && x < excluded.x + excluded.width &&
            y >= excluded.y && y < excluded.y + excluded.height) continue;
        const i = (y * canvas.width + x) * 4;
        // Includes antialiased accent edges on the white draft canvas.
        if (pixels[i + 1] - pixels[i] > 12 && pixels[i + 1] - pixels[i + 2] > 7) green++;
      }
    }
    return green;
  }, { data: png.toString('base64'), excluded });
}

for (const scale of [0.6, 0.75]) {
  test(`draft selection leaves no painted trails after many moves at ${scale * 100}%`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1800, height: 1100 });
    await page.route('https://**/*', route => route.abort());
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('草稿已就緒');
    await page.getByLabel('畫布縮放').selectOption(String(scale));
    const canvas = page.getByTestId('canvas');
    await page.getByRole('button', { name: '新增標題', exact: true }).dragTo(canvas, {
      targetPosition: { x: 100, y: 100 },
    });
    const node = page.locator('.canvas .node.heading');
    await expect(node).toHaveCount(1);
    // Remove only the content text; retain the real selection label. This makes
    // stale label/edge paint distinguishable from legitimate heading content.
    await node.evaluate(element => {
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) child.textContent = '';
      }
    });
    const board = (await canvas.boundingBox())!;
    const clip = { x: Math.ceil(board.x), y: Math.ceil(board.y), width: 800, height: 650 };
    const initial = await node.evaluate(el => ({ x: parseFloat((el as HTMLElement).style.left), y: parseFloat((el as HTMLElement).style.top) }));
    const box = (await node.boundingBox())!;
    const start = { x: box.x + 20, y: box.y + 20 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let i = 0; i < 32; i++) {
      const dx = (40 + (i % 8) * 45) * scale;
      const dy = (40 + Math.floor(i / 8) * 65) * scale;
      await page.mouse.move(start.x + dx, start.y + dy, { steps: 3 });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    await page.mouse.up();
    const final = { x: Math.round(initial.x + 355), y: Math.round(initial.y + 235) };
    await expect(node.locator('.node-label')).toContainText(`${Math.round(final.x)}, ${Math.round(final.y)}`);
    expect(await node.evaluate(el=>parseFloat(getComputedStyle(el).left))).toBeCloseTo(final.x,2);
    expect(await node.evaluate(el=>parseFloat(getComputedStyle(el).top))).toBeCloseTo(final.y,2);
    const finalBox = (await node.boundingBox())!;
    const selected = await page.screenshot({ clip });
    await writeFile(`test-results/repair-drag-selected-${scale}.png`,selected);
    await testInfo.attach('selected-after-moves', { body: selected, contentType: 'image/png' });
    expect(await greenPixels(page, selected)).toBeGreaterThan(20);
    // Cover the current frame and its label only; every old horizontal edge,
    // vertical edge and label region remains in the pixel assertion.
    expect(await greenPixels(page, selected, {
      x: finalBox.x - clip.x - 8,
      y: finalBox.y - clip.y - 35,
      width: finalBox.width + 16,
      height: finalBox.height + 43,
    })).toBe(0);
    await canvas.click({ position: { x: 750, y: 600 } });
    await expect(node).not.toHaveClass(/selected/);
    const cleared = await page.screenshot({ clip });
    await writeFile(`test-results/repair-drag-cleared-${scale}.png`,cleared);
    await testInfo.attach('deselected-after-moves', { body: cleared, contentType: 'image/png' });
    expect(await greenPixels(page, cleared)).toBe(0);
    expect(await node.evaluate(el=>parseFloat(getComputedStyle(el).left))).toBeCloseTo(final.x,2);
    expect(await node.evaluate(el=>parseFloat(getComputedStyle(el).top))).toBeCloseTo(final.y,2);
  });
}
