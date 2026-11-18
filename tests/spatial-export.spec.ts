import {test,expect} from '@playwright/test';
import {readFile,mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
test('real paid preserve-layout output exports and builds as an independent React project',async({page})=>{
 test.skip(!existsSync('outputs/paid-six-audit/0/page.json'),'Requires separately authorized paid result');test.setTimeout(180000);
 const value=JSON.parse(await readFile('outputs/paid-six-audit/0/page.json','utf8'));await page.goto('/');
 const files=await page.evaluate(async value=>{const {exportProjectFiles}=await import('/src/exportProject.ts');return exportProjectFiles(value);},value);
 const root=await mkdtemp(join(tmpdir(),'sketch-spatial-export-'));for(const f of files){const p=join(root,f.path);await mkdir(dirname(p),{recursive:true});if(typeof f.content==='string')await writeFile(p,f.content);else await writeFile(p,Buffer.from(Object.values(f.content)));}
 await run('npm',['ci','--ignore-scripts','--no-audit','--no-fund','--cache','/workspace/.npm-cache'],{cwd:root,timeout:120000});
 const build=await run('npm',['run','build'],{cwd:root,timeout:60000});expect(build.stdout).toContain('built in');
 expect(files.some(f=>typeof f.content==='string'&&f.content.includes('draftLayout'))).toBe(true);
});
