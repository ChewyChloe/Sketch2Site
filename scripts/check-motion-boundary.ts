import {readdir,readFile} from 'node:fs/promises';
import {serverMotionRegistry} from '../server/motionBriefs';
async function scan(directory:string):Promise<void>{
 for(const item of await readdir(directory,{withFileTypes:true})){
  const path=directory+'/'+item.name;
  if(item.isDirectory()){await scan(path);continue;}
  if(!/\.(js|html|css|json)$/.test(path))continue;
  const text=await readFile(path,'utf8');
  for(const spec of Object.values(serverMotionRegistry)){
   for(const snippet of [spec.designIntent,spec.implementationBrief]){
    if(text.includes(snippet)||text.includes(JSON.stringify(snippet).slice(1,-1)))throw Error('Server-only motion guidance reached browser output: '+path);
   }
  }
 }
}
await scan('dist');
console.log(`PASS: all ${Object.keys(serverMotionRegistry).length} server-only motion briefs absent from browser build; no API invoked.`);
