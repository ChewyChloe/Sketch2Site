// node world.cjs <intro|outro> <seconds> <outdir> [t1,t2,...]: renders the 3D opening or closing at 30 fps.
const { chromium } = require('playwright'); const fs = require('fs');
const [name, dur, out, only] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text())); p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:8765/world.html'); await p.waitForFunction(() => window.ready); await p.evaluate(() => window.ready);
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(dur * 30) }, (_, i) => i / 30);
  for (const [i, t] of times.entries()) { await p.evaluate(([n, t]) => run(n, t), [name, t]); await p.screenshot({ path: `${out}/${only ? 't' + t : String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }); }
  await b.close(); })();
