/* SlashPromo IndexNow: notify participating search engines about published URLs.
   No API credentials are stored here; the IndexNow ownership key is public. */
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const HOST="slashpromo.com";
const ORIGIN="https://"+HOST;
const KEY="83dd41d8cf7d247ddf4579c34499dbc6";
const KEY_PATH="/"+KEY+".txt";
const WAIT_MS=15000;
const MAX_ATTEMPTS=24;

function sitemapUrls(text){
  return new Set(
    [...text.matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]+)<\/loc>/g)]
      .map(match=>match[1])
      .filter(url=>!url.includes("/qa-admin/")&&!url.includes("/api/"))
  );
}
function git(args){
  return execFileSync("git",args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
}
function pageUrl(file){
  if(file==="index.html")return ORIGIN+"/";
  if(!file.endsWith("/index.html"))return null;
  const pathname=file.slice(0,-"index.html".length);
  return ORIGIN+"/"+pathname;
}
function changedFiles(base,head){
  if(!/^[a-f0-9]{40}$/i.test(base)||/^0{40}$/.test(base))return null;
  try{
    return git(["diff","--name-only","--diff-filter=ACMRT",base,head])
      .split("\n").map(line=>line.trim()).filter(Boolean);
  }catch(error){
    console.error("Cannot inspect changed files:",error.message);
    return null;
  }
}
function previousSitemap(base){
  try{return sitemapUrls(git(["show",base+":sitemap.xml"]));}
  catch{return new Set();}
}
async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function verifyKeyIsLive(){
  const url=ORIGIN+KEY_PATH;
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    try{
      const result=await fetch(url,{headers:{"Cache-Control":"no-cache"},signal:AbortSignal.timeout(15000)});
      if(result.ok&&(await result.text()).trim()===KEY){
        console.log("Live ownership file verified at "+url);
        return;
      }
      console.log("Key file not yet published; check "+attempt+"/"+MAX_ATTEMPTS);
    }catch(error){
      console.log("Waiting for public site: "+error.message);
    }
    if(attempt<MAX_ATTEMPTS)await sleep(WAIT_MS);
  }
  throw Error("IndexNow key file is not live; notification skipped to prevent unverified submission.");
}
async function submitBatch(urls){
  const response=await fetch("https://api.indexnow.org/IndexNow",{
    method:"POST",
    headers:{"Content-Type":"application/json; charset=utf-8"},
    body:JSON.stringify({host:HOST,key:KEY,keyLocation:ORIGIN+KEY_PATH,urlList:urls}),
    signal:AbortSignal.timeout(30000)
  });
  const message=(await response.text()).slice(0,500);
  if(![200,202].includes(response.status)){
    throw Error("IndexNow HTTP "+response.status+": "+message);
  }
  console.log("IndexNow accepted "+urls.length+" URL(s) (HTTP "+response.status+").");
}
async function main(){
  if(readFileSync("83dd41d8cf7d247ddf4579c34499dbc6.txt","utf8").trim()!==KEY)
    throw Error("IndexNow verification key and public file do not match.");
  const sitemap=sitemapUrls(readFileSync("sitemap.xml","utf8"));
  sitemap.add(ORIGIN+"/");
  const base=process.env.BEFORE_SHA||"";
  const head=process.env.AFTER_SHA||"HEAD";
  const files=changedFiles(base,head);
  const full=process.env.FULL_INDEX==="true"||files===null||
    files.includes("83dd41d8cf7d247ddf4579c34499dbc6.txt")||
    files.includes(".github/workflows/indexnow.yml");
  const urls=new Set();
  if(full){
    for(const url of sitemap)urls.add(url);
  }else{
    for(const file of files){
      const url=pageUrl(file);
      if(url&&sitemap.has(url))urls.add(url);
    }
    if(files.includes("sitemap.xml")){
      const old=previousSitemap(base);
      for(const url of sitemap)if(!old.has(url))urls.add(url);
    }
  }
  if(!urls.size){
    console.log("No newly published or updated HTML pages; no IndexNow request.");
    return;
  }
  console.log("Preparing "+urls.size+" canonical URL(s) from the current sitemap.");
  await verifyKeyIsLive();
  // Allow the Git-integrated Cloudflare Pages deployment to complete after the
  // GitHub push, then verify the first URL is reachable before submission.
  if(process.env.FULL_INDEX!=="true")await sleep(60000);
  const ordered=[...urls].sort();
  for(let index=0;index<ordered.length;index+=500){
    await submitBatch(ordered.slice(index,index+500));
    if(index+500<ordered.length)await sleep(1000);
  }
  console.log("IndexNow notification finished. Search indexing itself is not guaranteed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
