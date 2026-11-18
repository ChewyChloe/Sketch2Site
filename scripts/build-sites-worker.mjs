import { build } from 'esbuild';
import { readdir, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
// Only public Vite build files enter the asset table; never project source or env files.
const assets = {};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
async function collect(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await collect(p);
    else if (e.name !== '_headers') {
      if (!types[path.extname(p)]) throw Error('Unexpected browser asset type: '+p);
      const key = '/'+path.relative('dist', p).split(path.sep).join('/');
      assets[key] = { body: (await readFile(p)).toString('base64'), type: types[path.extname(p)] };
    }
  }
}
await collect('dist');
const entry = `import api from './server/sitesWorker.ts';
import {warmOwnerPreflight} from './server/sitesPreflight.ts';
const assets=${JSON.stringify(assets)};
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
export default { async fetch(request, env, ctx) {
try {
const url=new URL(request.url);
if(url.pathname.startsWith('/api/')) return await api(request,env);
if(url.pathname==='/' && request.method==='GET' && ctx?.waitUntil) ctx.waitUntil(warmOwnerPreflight(request,env).catch(()=>{}));
if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers});
const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
if(!asset)return new Response('Not found',{status:404,headers});
const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
return new Response(request.method==='HEAD'?null:bytes,{headers:{...headers,'Content-Type':asset.type,'Cache-Control':url.pathname.startsWith('/assets/')?'private, max-age=31536000, immutable':'private, no-store'}});
} catch { return new Response(JSON.stringify({code:'UNAVAILABLE'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}); }
}};`;
await rm('outputs/sites-artifact', { recursive:true, force:true });
await mkdir('outputs/sites-artifact/dist/server', { recursive: true });
await build({ stdin: { contents:entry, resolveDir:process.cwd(), sourcefile:'sites-entry.ts' }, outfile:'outputs/sites-artifact/dist/server/index.js', bundle:true, format:'esm', platform:'browser', target:'es2022', external:['node:buffer'], minify:true, sourcemap:false });
await writeFile('outputs/sites-artifact/dist/server/wrangler.json', JSON.stringify({ name:'sketch2site-private-test',main:'index.js',compatibility_date:'2026-11-16',compatibility_flags:['nodejs_compat'] },null,2)+'\n');
console.log('PASS: self-contained Worker built; static assets embedded; no node:http server.');

await mkdir('outputs/sites-artifact/.openai', { recursive: true });
await writeFile('outputs/sites-artifact/.openai/hosting.json', await readFile('.openai/hosting.json'));
await cp('drizzle', 'outputs/sites-artifact/drizzle', {recursive:true});
