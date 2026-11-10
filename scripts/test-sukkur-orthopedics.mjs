import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const base="https://slashpromo.com";
const slugs=["fracture-nonunion","ilizarov-limb-reconstruction","fracture-trauma-care","knee-pain-orthopedic-care"];
const routes=slugs.map(s=>"/sukkur/orthopedics/"+s+"/");
const doctors=[
 {name:"Dr. Dost Muhammad",city:"Sukkur",path:"/doctors/sukkur/dr-dost-muhammad/"},
 {name:"Dr. Rehmat Khan",city:"Peshawar",path:"/doctors/peshawar/dr-rehmat-khan/"},
 {name:"Dr. Hafiz Muhammad Umar",city:"Mian Channu",path:"/doctors/mian-channu/dr-hafiz-muhammad-umar/"},
 {name:"Dr. Mahboob Ali",city:"Wari",path:"/doctors/wari/dr-mahboob-ali/"}
];
const directory=JSON.parse(readFileSync("assets/directory.json","utf8"));
const sitemap=readFileSync("sitemap.xml","utf8");
const files=["ai.txt","llms.txt","llms-full.txt"].map(p=>readFileSync(p,"utf8"));
const titles=new Set();
assert(existsSync("assets/sukkur-orthopedics.css"),"Orthopedics stylesheet missing");
assert(readFileSync("assets/sukkur-orthopedics.css","utf8").includes("grid-template-columns"),"Two-column responsive CSS missing");
for(const route of routes){
 const file=route.slice(1)+"index.html", url=base+route;
 assert(existsSync(file),"Missing guide: "+file);
 const html=readFileSync(file,"utf8");
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 assert(title&&!titles.has(title),"Non-unique title: "+file);titles.add(title);
 assert(html.includes('<link rel="canonical" href="'+url+'"'),"Wrong canonical "+file);
 assert(html.includes('content="index,follow,max-image-preview:large"'),"Unexpected robots "+file);
 assert(html.includes("lang=\"ur\" dir=\"rtl\""),"Urdu content missing "+file);
 assert(html.includes('<meta property="og:title"')&&html.includes('name="twitter:title"'),"Social metadata missing "+file);
 assert(html.includes('src="/assets/site.js')&&html.includes('id="sp-qa-fallback"'),"Scoped Q&A missing "+file);
 assert(html.includes('<aside class="sp-ortho-side"'),"Right sidebar missing "+file);
 assert(html.includes('href="/doctors/sukkur/dr-ahmed-raza-laghari/"'),"Dr. Ahmed Raza link missing "+file);
 assert(html.includes('href="https://slashcure.com/orthopedic-surgeons/sukkur/dr-ahmed-raza-laghari"'),"Verified original profile link missing "+file);
 assert(html.includes("Other orthopedic surgeons on Slashpromo"),"Other surgeons heading missing "+file);
 assert(html.includes("When to seek urgent medical help"),"Medical red flags missing "+file);
 for(const d of doctors){
  assert(directory.doctors.some(x=>x.name===d.name&&x.city===d.city&&x.url===d.path),"Unverified sidebar doctor "+d.name);
  assert(sitemap.includes("<loc>"+base+d.path+"</loc>"),"Doctor not in sitemap: "+d.name);
  assert(html.includes('href="'+d.path+'"')&&html.includes(d.city+", Pakistan"),"Sidebar lacks surgeon/city "+d.name+" on "+file);
 }
 for(const other of routes)assert(html.includes('href="'+other+'"'),"Missing cross-link "+other+" from "+file);
 assert(sitemap.includes("<loc>"+url+"</loc>"),"Sitemap missing "+url);
 for(const content of files)assert(content.includes(url),"AI inventory missing "+url);
 const json=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
 assert(json,"Structured data missing "+file);
 const meta=JSON.parse(json);
 assert.equal(meta["@context"],"https://schema.org");
 assert(meta["@graph"].some(x=>x.url===url),"WebPage schema URL missing "+file);
}
for(const path of [
 "doctors/sukkur/dr-ahmed-raza-laghari/index.html",
 "doctors/sukkur/dr-dost-muhammad/index.html",
 "doctors/sukkur/orthopedic-surgeons/index.html",
 "sukkur/health-topics/joint-and-back-pain/index.html",
 "sukkur/health-topics/index.html"
]){
 const html=readFileSync(path,"utf8");
 for(const route of routes)assert(html.includes('href="'+route+'"'),"Existing page missing guide link: "+path+" -> "+route);
}
for(const path of ["doctors/sukkur/dr-ahmed-raza-laghari/index.html","doctors/sukkur/dr-dost-muhammad/index.html"]){
 const html=readFileSync(path,"utf8");
 assert(html.includes("Other orthopedic surgeons on Slashpromo"),"Other-doctors sidebar missing "+path);
 for(const d of doctors)if(!path.includes(d.path.slice(1)))assert(html.includes(d.city),"Other orthopedist city missing "+d.city);
}
console.log("PASS: four Sukkur orthopedic guides, bilingual content, cross-city right sidebars, existing source profiles, sitemap/AI files and non-publishing review linkage.");
