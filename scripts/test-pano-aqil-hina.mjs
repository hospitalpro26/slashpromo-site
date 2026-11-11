import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const routes=[
 "/doctors/pano-aqil/dr-hina-soomro/",
 "/doctors/pano-aqil/physiotherapists/",
 "/pano-aqil/health-topics/neck-pain-physiotherapy/",
 "/pano-aqil/health-topics/sciatica-physiotherapy/",
 "/pano-aqil/health-topics/knee-pain-arthritis-physiotherapy/"
];
const profile=routes[0];
const site="https://slashpromo.com";
const source="https://slashcure.com/physiotherapists/panoaqil/dr-hina-soomro";
const sitemap=readFileSync("sitemap.xml","utf8");
const ai=readFileSync("ai.txt","utf8");
const llms=readFileSync("llms.txt","utf8");
const full=readFileSync("llms-full.txt","utf8");
const names=new Set();
for(const route of routes){
 const file=route.slice(1)+"index.html";
 assert(existsSync(file),"Missing "+file);
 const h=readFileSync(file,"utf8"),url=site+route;
 assert(h.includes('<link rel="canonical" href="'+url+'"'),"Wrong canonical "+file);
 assert(h.includes('content="index,follow,max-image-preview:large"'),"Unexpected indexing "+file);
 assert(h.includes('meta property="og:title"')&&h.includes('meta name="twitter:title"'),"Missing meta "+file);
 assert(h.includes('lang="ur"')&&h.includes('dir="rtl"'),"Missing Urdu content "+file);
 assert(h.includes('id="sp-qa-fallback"')&&h.includes('/assets/site.js'),"Q&A support missing "+file);
 assert(h.includes(source),"Verified original Slashcure doctor link missing: "+file);
 assert(h.includes('href="'+profile+'"'),"Unlinked doctor profile "+file);
 assert(h.includes("Old NADRA Office")&&h.includes("Katchery Road"),"Outdated clinic address: "+file);
 assert(h.includes("Monday–Sunday")||h.includes("Monday to Sunday"),"Incorrect published weekly hours: "+file);
 assert(!h.includes("A Block")&&!h.includes("اے بلاک")&&!h.includes("Monday–Saturday")&&!h.includes("پیر تا ہفتہ"),"Stale clinic facts: "+file);
 assert(!h.includes("03163896482"),"Private phone exposure: "+file);
 assert(sitemap.includes('<loc>'+url+'</loc><lastmod>2026-11-11</lastmod>'),"Missing refreshed sitemap "+file);
 assert(ai.includes(url)&&llms.includes(url)&&full.includes(url),"Missing AI index "+file);
 const s=h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(s,"Missing JSON-LD "+file);
 const j=JSON.parse(s[1]);
 assert.equal(j["@context"],"https://schema.org");
 assert(j["@graph"].some(o=>o.url===url),"Wrong page schema "+file);
 const title=h.match(/<title>([^<]+)<\/title>/)?.[1];
 assert(title&&!names.has(title),"Missing/duplicate title "+file);
 names.add(title);
}
const doc=readFileSync(profile.slice(1)+"index.html","utf8");
for(const value of ["Dr. Hina Soomro","Visiting Lecturer (BNBWU)","KPM Supervisor, Sukkur Region","Dua Medical Center","DPT","6+ years","Monday to Sunday","4:00 PM to 8:00 PM"])assert(doc.includes(value),"Missing doctor fact: "+value);
assert(!doc.includes("PhD")&&!doc.includes("FCPS"),"Unsupported qualification included");
const person=JSON.parse(doc.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"].find(o=>o["@type"]==="Person");
assert(person?.sameAs?.includes(source),"Missing structured link to official doctor profile");
const city=readFileSync("pano-aqil/index.html","utf8");
assert(city.includes('id="profile-hina-soomro"')&&city.includes('href="'+profile+'"')&&city.includes(source),"Pano Aqil city card missing official doctor link");
const data=JSON.parse(readFileSync("assets/directory.json","utf8"));
const matching=data.doctors.filter(d=>d.name==="Dr. Hina Soomro"||d.id==="pano-aqil-dr-hina-soomro");
assert.equal(matching.length,1,"Expected exactly one indexed Dr. Hina Soomro record");
assert.equal(matching[0].externalProfile,source,"Incorrect external doctor link");
assert.equal(matching[0].url,profile,"Incorrect existing doctor profile URL");
assert.equal(matching[0].qualifications,"DPT","Incorrect qualification in doctor index");
console.log("PASS: existing Hina Soomro profile linked to verified Slashcure source on five pages and city card, corrected Pano Aqil address, daily hours, DPT, SEO and directory, without exposing contact number.");
