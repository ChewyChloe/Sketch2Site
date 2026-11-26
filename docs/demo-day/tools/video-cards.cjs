// Renders title, end and caption cards as transparent PNGs (1920x1080) with Noto Sans TC.
const { chromium } = require('playwright'); const fs = require('fs');
const D = process.argv[2]; const { marks } = JSON.parse(fs.readFileSync(D + '/marks.json'));
const base = `<link rel="stylesheet" href="file://${D}/noto.css"><style>html,body{margin:0;width:1920px;height:1080px;font-family:'Noto Sans TC',sans-serif}</style>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const render = async (name, html, transparent) => { await p.setContent(base + html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: D + '/' + name + '.png', omitBackground: transparent }); };
  const card = (big, small, kicker) => `<div style="position:absolute;inset:0;background:#0d0e11;color:#f4f1ea;display:flex;flex-direction:column;justify-content:center;padding:0 160px">
    <div style="font-size:30px;letter-spacing:.2em;color:#18c964;font-weight:700">${kicker}</div>
    <div style="font-size:104px;font-weight:900;line-height:1.15;margin-top:28px">${big}</div>
    <div style="font-size:36px;margin-top:40px;color:#bdb9b0;line-height:1.6">${small}</div></div>`;
  await render('title', card('Sketch2Site<br>操作示範', '畫面是實際操作，生成跟修改有呼叫 AI', 'DEMO'), false);
  await render('end', card('Sketch2Site', '全隊　呂沛珍（資管三）', 'MICROSOFT × NCU AI INNOVATION DEMO DAY'), false);
  for (const m of marks) if (m.text) await render('cap-' + m.id, `<div style="position:absolute;left:0;right:0;bottom:56px;display:flex;justify-content:center"><div style="max-width:1500px;padding:18px 34px;border-radius:14px;background:rgba(13,14,17,.86);color:#fff;font-size:44px;font-weight:700;line-height:1.35;text-align:center">${m.text}</div></div>`, true);
  await render('badge', `<div style="position:absolute;right:40px;top:120px;padding:10px 18px;border-radius:999px;background:rgba(13,14,17,.8);color:#18c964;font-size:24px;font-weight:700">實際操作畫面</div>`, true);
  await b.close(); })();
