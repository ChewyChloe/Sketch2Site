// node render.cjs <scene> <seconds> <outdir> [t1,t2,...]: renders frames at 30 fps, or only the given times.
const { chromium } = require('playwright'); const fs=require('fs');
const [scene,dur,out,only]=process.argv.slice(2); fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
 await p.goto('http://127.0.0.1:8765/scene.html?'+scene);await p.waitForFunction(()=>window.figReady);await p.evaluate(()=>window.figReady);await p.evaluate(()=>document.fonts.ready);
 await p.evaluate(s=>{window.run=scenes[s]();document.querySelectorAll('img').forEach(i=>i.decode())},scene);
 await p.waitForTimeout(500);
 const times=only?only.split(',').map(Number):Array.from({length:Math.round(dur*30)},(_,i)=>i/30);
 for(const [i,t] of times.entries()){await p.evaluate(t=>run(t),t);await p.screenshot({path:`${out}/${only?'t'+t:String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:92})}
 await b.close()})();
