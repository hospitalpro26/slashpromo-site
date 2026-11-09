import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const site=readFileSync(new URL("../assets/site.js",import.meta.url),"utf8");
const db=JSON.parse(readFileSync(new URL("../assets/directory.json",import.meta.url),"utf8"));
const start=site.indexOf("/* SlashPromo privacy-conscious site analytics:");
const end=site.indexOf("/* Visitors browsing three public pages",start);
assert(start>=0 && end>start,"Shared analytics tracking block must exist");
const source=site.slice(start,end);
assert(!/localStorage|sessionStorage|cookie/i.test(source),"Referral tracker must not create visitor identifiers.");

const handlers=new Map(),queued=[];
const doc={
  readyState:"complete",
  querySelector:()=>({href:"https://slashpromo.com/doctors/sukkur/dr-bashir-ahmed-khoso/"}),
  addEventListener:(type,handler)=>handlers.set(type,handler)
};
const win={};
const context={
  document:doc,window:win,location:{
    pathname:"/doctors/sukkur/dr-bashir-ahmed-khoso/",
    origin:"https://slashpromo.com",
    href:"https://slashpromo.com/doctors/sukkur/dr-bashir-ahmed-khoso/"
  },
  navigator:{sendBeacon:(url,blob)=>{queued.push({url,blob});return true}},
  Blob,URL,Set,JSON,fetch:()=>{throw Error("Unexpected fallback fetch")}
};
runInNewContext(source,context);
const click=(url,type="click",button=0,defaultPrevented=false)=>{
  assert(handlers.has(type),"Missing delegated "+type+" listener");
  handlers.get(type)({type,button,defaultPrevented,target:{closest:selector=>{
    assert.equal(selector,"a[href]");
    return url?{href:url}:null;
  }}});
};
click("https://slashcure.com/rheumatologists/sukkur/dr-bashir-ahmed-khoso");
click("https://slashcure.com/doctors?type=all&q=example");
click("https://www.slashcure.com/hospitals/karachi/astro-physiocare","auxclick",1);
click("https://www.example.com/");
click("https://evilslashcure.com/");
click("http://slashcure.com/");
click("https://slashcure.com/","auxclick",2);
click("https://slashcure.com/", "click",0,true);
const queuedEvents=await Promise.all(queued.map(async r=>{
  assert.equal(r.url,"/api/analytics");
  return JSON.parse(await r.blob.text());
}));
assert.deepEqual(queuedEvents.map(r=>r.event),["page_view","slashcure_click","slashcure_click","slashcure_click"]);
assert(queuedEvents.every(r=>r.path==="/doctors/sukkur/dr-bashir-ahmed-khoso/"));
assert(queuedEvents.every(r=>Object.keys(r).sort().join(",")==="event,path"));

const records=[...(db.doctors||[]),...(db.hospitals||[])];
let linked=0,unlinked=0;
for(const record of records){
  assert(/^\/(?:doctors|hospitals)\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(record.url),
    "Invalid directory profile path: "+record.url);
  if(!record.externalProfile){unlinked++;continue}
  const target=new URL(record.externalProfile);
  assert.equal(target.protocol,"https:");
  assert(["slashcure.com","www.slashcure.com"].includes(target.hostname));
  linked++;
}
assert(linked>0 && unlinked>=0,"Directory must have real destinations");
console.log("PASS: delegated links, direct and fallback referrals, middle-click, unrelated domains, privacy.");
console.log("DIRECTORY: "+linked+" direct Slashcure destinations; "+unlinked+" records using directory search fallback (not verified personal profile links).");

/* Test the actual Cloudflare Pages handler without writing to production. */
const lib=readFileSync(new URL("../functions/_lib/analytics.js",import.meta.url),"utf8");
const api=readFileSync(new URL("../functions/api/analytics.js",import.meta.url),"utf8");
const libUrl="data:text/javascript,"+encodeURIComponent(lib);
const testApi=api.replace('"../_lib/analytics.js"',JSON.stringify(libUrl));
const {onRequestPost}=await import("data:text/javascript,"+encodeURIComponent(testApi));
const inserts=[];
const fakeDb={prepare:sql=>({
  bind(...args){this.args=args;return this},
  async run(){inserts.push({sql,args:this.args});return {success:true}}
})};
const input={event:"slashcure_click",path:"/doctors/sukkur/dr-bashir-ahmed-khoso/"};
const response=await onRequestPost({
  request:new Request("https://slashpromo.com/api/analytics",{
    method:"POST",headers:{"Origin":"https://slashpromo.com","Content-Type":"text/plain;charset=UTF-8"},
    body:JSON.stringify(input)
  }),
  env:{QA_DB:fakeDb}
});
assert.equal(response.status,204,"Valid referral event must be accepted.");
assert(inserts.some(x=>x.sql.includes("INSERT INTO site_analytics_daily")&&x.args[3]==="slashcure_click"),"Referrals must be written to daily aggregate counts.");
const crossOrigin=await onRequestPost({
  request:new Request("https://slashpromo.com/api/analytics",{
    method:"POST",headers:{"Origin":"https://unrelated.example","Content-Type":"text/plain"},
    body:JSON.stringify(input)
  }),
  env:{QA_DB:fakeDb}
});
assert.equal(crossOrigin.status,403,"Cross-origin analytics events must be refused.");
console.log("PASS: backend aggregates authorized referral events and rejects cross-origin events.");
