import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const paths=[
"/pano-aqil/",
"/doctors/pano-aqil/dr-saba-ali-raza-mahesar/",
"/doctors/pano-aqil/dr-farooq-illahi/",
"/doctors/pano-aqil/dr-parvez-ahmed/"
];
const sitemap=readFileSync("sitemap.xml","utf8");
const robots=readFileSync("robots.txt","utf8");
assert(robots.includes("Sitemap: https://slashpromo.com/sitemap.xml"),"Site map missing from robots.txt");
assert(!/Disallow: \/(\s|$)/m.test(robots),"A global disallow rule blocks Googlebot");
for(const path of paths){
  const url="https://slashpromo.com"+path;
  const html=readFileSync(path.slice(1)+"index.html","utf8");
  assert(sitemap.includes("<loc>"+url+"</loc><lastmod>2026-11-09</lastmod>"),"Outdated or missing sitemap URL: "+url);
  assert(html.includes('<link rel="canonical" href="'+url+'"'),"Wrong canonical "+url);
  assert(html.includes('name="robots" content="index,follow'),"Missing indexability signal "+url);
  assert(!/name="robots"[^>]*noindex/i.test(html),"Noindex forbidden for "+url);
  assert(/<h1[^>]*>[^<]+<\/h1>/i.test(html),"Main heading missing "+url);
  assert(html.includes("/assets/site.js"),"Common public site script missing "+url);
  console.log("PASS: "+url);
}
const city=readFileSync("pano-aqil/index.html","utf8");
for(const path of paths.slice(1))assert(city.includes('href="'+path+'"'),"City page missing doctor "+path);
assert(readFileSync("index.html","utf8").includes('href="/pano-aqil/"'),"Home missing Pano Aqil");
assert(readFileSync("cities/index.html","utf8").includes('href="/pano-aqil/"'),"Cities index missing Pano Aqil");
console.log("PASS: Google crawl readiness (not proof of Google indexing)");
