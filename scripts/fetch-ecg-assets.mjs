// Build-time only. The installed application never downloads these tracings.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const sources=JSON.parse(await readFile(new URL('android/ecg-sources.json',root),'utf8'));
const target=new URL('android/app/src/main/assets/ecg/',root);
await mkdir(target,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const source of sources){
  if(!/^tracing-\d{2}\.(png|jpg)$/.test(source.file))throw Error('Invalid asset path');
  const destination=new URL(source.file,target);
  let current;try{current=await readFile(destination);}catch{}
  if(current && hash(current)===source.sha256)continue;
  const address=new URL(source.url);
  if(address.protocol!=='https:' || !['upload.wikimedia.org','cdn.ncbi.nlm.nih.gov'].includes(address.hostname))throw Error('Unexpected source host');
  let lastError;
  for(let attempt=0;attempt<5;attempt++){
    try{
      const url=new URL(address);if(attempt%2)url.search='';
      const response=await fetch(url,{signal:AbortSignal.timeout(60000),headers:{'User-Agent':'Slashview-Educational-ECG-Build/1.0'}});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length!==source.bytes || hash(bytes)!==source.sha256)throw Error('ECG integrity mismatch');
      const temporary=new URL(source.file+'.part',target);
      await writeFile(temporary,bytes);await rename(temporary,destination);lastError=null;break;
    }catch(error){lastError=error;if(attempt<4)await new Promise(r=>setTimeout(r,Math.min(30000,2000*2**attempt)));}
  }
  if(lastError)throw Error(`Failed to obtain ${source.file}: ${lastError.message}`);
  console.log(`Verified ${source.file}`);
}
console.log(`Verified all ${sources.length} offline ECG images.`);
