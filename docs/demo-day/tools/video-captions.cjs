// Renders single-line caption cards (1920x1080, transparent) from caps.json.
const { chromium } = require('playwright'); const fs = require('fs');
const D = process.argv[2]; const caps = JSON.parse(fs.readFileSync(D + '/caps.json'));
const base = `<link rel="stylesheet" href="file://${D}/noto.css"><style>html,body{margin:0;width:1920px;height:1080px;font-family:'Noto Sans TC',sans-serif}</style>`;
const just = { left: 'flex-start', center: 'center', right: 'flex-end' };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [i, c] of caps.entries()) {
    await p.setContent(base + `<div style="position:absolute;left:40px;right:40px;bottom:56px;display:flex;justify-content:${just[c[3]]}"><div id="cap" style="white-space:nowrap;padding:16px 32px;border-radius:14px;background:rgba(13,14,17,.86);color:#fff;font-size:42px;font-weight:700;line-height:1.3">${c[2]}</div></div>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    const w = await p.locator('#cap').evaluate((e) => e.getBoundingClientRect().width);
    if (w > 1840) throw new Error('caption too wide: ' + c[2]);
    await p.screenshot({ path: `${D}/line-${i}.png`, omitBackground: true });
  }
  await b.close(); })();
