import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const routes=["doctors/shikarpur/physiotherapists/","shikarpur/health-topics/back-pain-and-sciatica-physiotherapy/","shikarpur/health-topics/frozen-shoulder-physiotherapy/","shikarpur/health-topics/post-injury-rehabilitation/"];
const base="https://slashpromo.com/";
const doc="/doctors/shikarpur/dr-ali-ilyas-napar/";
const slashcure="https://slashcure.com/consultant-physiotherapists/shikarpur/dr-ali-ilyas-napar";
const directory=JSON.parse(readFileSync("assets/directory.json","utf8"));
const matches=directory.doctors.filter(d=>/napar/i.test(d.name));
assert.equal(matches.length,1,"Duplicate Napar profile detected");
assert.equal(matches[0].url,doc);
assert.equal(matches[0].externalProfile,slashcure);
const sitemap=readFileSync("sitemap.xml","utf8"),ai=readFileSync("ai.txt","utf8"),llms=readFileSync("llms.txt","utf8"),full=readFileSync("llms-full.txt","utf8");
for(const route of routes){
const path=route+"index.html";assert(existsSync(path),"Missing "+path);
const html=readFileSync(path,"utf8");const canonical=base+route;
assert(html.includes('<link rel="canonical" href="'+canonical+'"'),"Wrong canonical "+route);
assert(html.includes('<meta name="robots" content="index,follow,max-image-preview:large"'),"Wrong robots "+route);
assert(html.includes('<meta property="og:title"')&&html.includes('<meta name="twitter:title"'),"No social metadata "+route);
assert(html.includes('name="geo.placename" content="Shikarpur, Sindh, Pakistan"'),"Missing geography "+route);
assert(html.includes('lang="ur" dir="rtl"'),"Missing Urdu content "+route);
assert(html.includes('href="'+doc+'"')&&html.includes('href="'+slashcure+'"'),"No doctor cross link "+route);
assert(html.includes('href="/shikarpur/'),"No city links "+route);
assert(html.includes("not")&&html.includes("emergency"),"Missing safeguards "+route);
assert(sitemap.includes("<loc>"+canonical+"</loc><lastmod>2026-11-10</lastmod>"),"Missing sitemap "+route);
assert(ai.includes(canonical)&&llms.includes(canonical)&&full.includes(canonical),"Missing AI references "+route);
const jsons=[...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)];
assert(jsons.length>0,"Missing structured data "+route);
for(const match of jsons){const j=JSON.parse(match[1]);assert.equal(j["@context"],"https://schema.org");const nodes=j["@graph"]||[j];assert(nodes.some(n=>n.url===canonical),"Wrong JSONLD url "+route);}
const anchors=new Set([...html.matchAll(/\\bid="([^"]+)"/g)].map(m=>m[1]));
for(const a of html.matchAll(/href="#([^"]+)"/g))assert(anchors.has(a[1]),"Broken local fragment "+route);
}
const city=readFileSync("shikarpur/index.html","utf8"),doctor=readFileSync("doctors/shikarpur/dr-ali-ilyas-napar/index.html","utf8");
assert(routes.every(route=>city.includes('href="/'+route+'"')),"City hub missing links");
assert(routes.every(route=>doctor.includes('href="/'+route+'"')),"Doctor profile missing guide links");
assert.equal(directory.doctors.filter(d=>d.city==="Shikarpur").length,3,"Doctor directory mutated");
assert(doctor.includes('"sameAs":["'+slashcure+'"]'),"Doctor schema source profile link missing");
console.log("PASS: 4 new Shikarpur physiotherapy pages, unique verified clinician, bilingual medical guidance, city and doctor backlinks, canonical/meta/schema/sitemap/AI links.");
