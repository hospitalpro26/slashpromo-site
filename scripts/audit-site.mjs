/* Regression audit for static SEO and moderated Q&A route coverage.
   Run locally: node scripts/audit-site.mjs */
import {readFileSync,existsSync,appendFileSync} from "node:fs";
import {CITIES,questionPage} from "../functions/_lib/qa.js";

const BASE="https://slashpromo.com";
const supported=new Set(CITIES);
const errors=[],warnings=[],seen=new Set(),titles=new Map();
const xml=readFileSync("sitemap.xml","utf8");
const urls=[...xml.matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]*)<\/loc>/g)].map(m=>m[1]);
let scoped=0,roots=0;

function getAttr(tag,name){
  const match=tag?.match(new RegExp("\\b"+name+"=[\"']([^\"']+)[\"']","i"));
  return match?.[1]||"";
}
function localCity(path){
  const parts=path.split("/").filter(Boolean);
  if(supported.has(parts[0]))return parts[0];
  if(["doctors","hospitals","clinics","laboratories"].includes(parts[0])&&supported.has(parts[1]))return parts[1];
  return null;
}
function check(url){
  if(seen.has(url)){errors.push("Duplicate sitemap URL: "+url);return;}
  seen.add(url);
  const path=url.slice(BASE.length);
  const file=path==="/"?"index.html":path.slice(1)+"index.html";
  if(!existsSync(file)){errors.push("Missing published HTML file: "+file);return;}
  const html=readFileSync(file,"utf8");
  const title=html.match(/<title>([^<]*)<\/title>/i)?.[1]||"";
  if(!title.trim())errors.push("Missing title: "+file);
  else if(titles.has(title))warnings.push("Duplicate title: "+file+" and "+titles.get(title));
  else titles.set(title,file);
  const meta=html.match(/<meta\s+name=["']description["'][^>]*>/i)?.[0];
  if(!getAttr(meta,"content"))warnings.push("Missing meta description: "+file);
  const canonical=html.match(/<link\s+rel=["']canonical["'][^>]*>/i)?.[0];
  if(getAttr(canonical,"href")!==url)errors.push("Canonical differs from sitemap: "+file);
  if(!/<h1(?:\s|>)/i.test(html))warnings.push("Missing visible h1: "+file);
  if(/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
    errors.push("Noindex URL listed in sitemap: "+file);
  const city=localCity(path);
  if(city){
    if(questionPage(city,path)!==path)errors.push("Invalid city Q&A path mapping: "+path);
    const isRoot=path==="/"+city+"/";
    if(isRoot){
      roots++;
      if(!html.includes("/assets/city-questions.js"))errors.push("City page missing direct Q&A loader: "+file);
    }else{
      scoped++;
      if(!html.includes("/assets/site.js"))errors.push("Local page missing shared script: "+file);
      if(!html.includes("sp-qa-fallback"))errors.push("Local page missing Q&A fallback: "+file);
      for(const other of CITIES){
        if(other!==city && questionPage(other,path)!==null)
          errors.push("Cross-city Q&A leak: "+path+" accepted as "+other);
      }
    }
  }
}
for(const url of urls)check(url);
if(!urls.includes(BASE+"/"))errors.push("Sitemap is missing the homepage.");
if(!readFileSync("robots.txt","utf8").includes("Sitemap: "+BASE+"/sitemap.xml"))
  errors.push("robots.txt is missing the canonical sitemap location.");
const key="83dd41d8cf7d247ddf4579c34499dbc6";
if(!existsSync(key+".txt")||readFileSync(key+".txt","utf8").trim()!==key)
  errors.push("IndexNow ownership file is missing or invalid.");
const summary=[
  "SlashPromo static site audit",
  "Sitemap URLs: "+urls.length,
  "City home Q&A pages: "+roots,
  "Scoped local Q&A pages: "+scoped,
  "Errors: "+errors.length,
  "Warnings: "+warnings.length
];
console.log(summary.join("\n"));
for(const item of errors)console.error("ERROR: "+item);
for(const item of warnings)console.warn("WARN: "+item);
if(process.env.GITHUB_STEP_SUMMARY){
 const md="## SlashPromo SEO and Q&A audit\n\n"+
   "| Check | Count |\n|---|---:|\n"+
   "| Sitemap URLs | "+urls.length+" |\n"+
   "| City root Q&A pages | "+roots+" |\n"+
   "| Scoped local Q&A pages | "+scoped+" |\n"+
   "| Errors | "+errors.length+" |\n"+
   "| Warnings | "+warnings.length+" |\n\n"+
   (errors.length?"### Errors\n"+errors.map(x=>"- "+x).join("\n")+"\n":"")+
   (warnings.length?"### Warnings\n"+warnings.slice(0,30).map(x=>"- "+x).join("\n")+"\n":"");
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
if(errors.length)process.exitCode=1;
