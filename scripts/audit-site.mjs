/* Regression audit for static SEO and moderated Q&A route coverage.
   Run locally: node scripts/audit-site.mjs */
import {readFileSync,existsSync,appendFileSync,readdirSync} from "node:fs";
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

/* Crawlability and canonical integrity across the full static build.
   Search engines should discover every indexable canonical HTML page,
   but never private dashboards or legacy redirect duplicates. */
const redirectRules=new Map();
for(const raw of readFileSync("_redirects","utf8").split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith("#"))continue;
  const cols=line.split(/\s+/);
  if(cols.length>=3&&["301","308"].includes(cols[2]))redirectRules.set(cols[0],cols[1]);
}
function htmlFiles(dir="."){
  const output=[];
  for(const item of readdirSync(dir,{withFileTypes:true})){
    if([".git",".github","node_modules","assets","functions","scripts"].includes(item.name))continue;
    const next=dir==="."?item.name:dir+"/"+item.name;
    if(item.isDirectory())output.push(...htmlFiles(next));
    else if(item.isFile()&&(next==="index.html"||next.endsWith("/index.html")))output.push(next);
  }
  return output;
}
let schemaBlocks=0,redirectedPages=0,privatePages=0,indexablePages=0,missingLocalLinks=0;
const staticPages=new Set(htmlFiles());
for(const file of staticPages){
  const html=readFileSync(file,"utf8");
  const path=file==="index.html"?"/":"/"+file.slice(0,-"index.html".length);
  const expected=BASE+path;
  const canonical=html.match(/<link\s+rel=["']canonical["'][^>]*>/i)?.[0];
  const canonicalUrl=getAttr(canonical,"href");
  const robotsTag=html.match(/<meta\s+name=["']robots["'][^>]*>/i)?.[0];
  const noindex=/\bnoindex\b/i.test(getAttr(robotsTag,"content"));
  const redirect=redirectRules.get(path);
  if(redirect){
    redirectedPages++;
    if(seen.has(expected))errors.push("Redirect source included in sitemap: "+path);
    if(!noindex)errors.push("Redirect fallback must not be indexable: "+file);
    if(canonicalUrl!==BASE+redirect)errors.push("Redirect fallback canonical differs from target: "+file);
  }else if(noindex){
    privatePages++;
    if(seen.has(expected))errors.push("Non-indexable private page in sitemap: "+file);
  }else{
    indexablePages++;
    if(canonicalUrl===expected&&!seen.has(expected))errors.push("Indexable canonical page omitted from sitemap: "+file);
    if(!canonicalUrl)warnings.push("Indexable page missing canonical link: "+file);
    else if(canonicalUrl!==expected)warnings.push("Indexable page points to different canonical URL: "+file);
  }
  if(!noindex&&!redirect){
    const schemas=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for(const match of schemas){
      schemaBlocks++;
      try{
        const root=JSON.parse(match[1]);
        if(root["@context"]!=="https://schema.org")warnings.push("JSON-LD missing schema.org context: "+file);
        const entities=Array.isArray(root["@graph"])?root["@graph"]:[root];
        for(const entity of entities){
          /* Only page-shaped entities must use this page's canonical URL.
             Doctors and hospitals linked from a directory correctly have
             their own profile URLs, so they are not canonical conflicts. */
          const types=Array.isArray(entity["@type"])?entity["@type"]:[entity["@type"]];
          const isPage=types.some(type=>["WebPage","CollectionPage","ProfilePage","AboutPage","ContactPage","SearchResultsPage"].includes(type));
          if(isPage&&typeof entity.url==="string"&&entity.url.startsWith(BASE)&&entity.url!==expected)
            warnings.push("Structured data page URL differs from canonical: "+file+" => "+entity.url);
        }
      }catch(error){errors.push("Invalid JSON-LD: "+file+": "+error.message)}
    }
    if(!schemas.length)warnings.push("Indexable page has no JSON-LD: "+file);
  }
  const hrefs=[...html.matchAll(/\bhref=["'](\/[^"']*)["']/gi)].map(m=>m[1]);
  for(const href of new Set(hrefs)){
    if(href.startsWith("//"))continue;
    const link=href.split(/[?#]/,1)[0];
    if(!link.endsWith("/")||link.startsWith("/api/")||link.startsWith("/go/"))continue;
    if(!staticPages.has(link.slice(1)+"index.html")&&!(link==="/"&&staticPages.has("index.html"))&&!redirectRules.has(link)){
      missingLocalLinks++;
      warnings.push("Internal navigation points to missing static page: "+file+" -> "+link);
    }
  }
}
const sitemapDates=[...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)];
const today=new Date().toISOString().slice(0,10);
for(const [,url,body] of sitemapDates){
  const modified=body.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  if(modified&&(!/^\d{4}-\d\d-\d\d$/.test(modified)||Number.isNaN(Date.parse(modified))||modified>today))
    errors.push("Sitemap lastmod is invalid or in future: "+url+" "+modified);
}
if(!urls.includes(BASE+"/"))errors.push("Sitemap is missing the homepage.");
if(!readFileSync("robots.txt","utf8").includes("Sitemap: "+BASE+"/sitemap.xml"))
  errors.push("robots.txt is missing the canonical sitemap location.");
const key="83dd41d8cf7d247ddf4579c34499dbc6";
if(!existsSync(key+".txt")||readFileSync(key+".txt","utf8").trim()!==key)
  errors.push("IndexNow ownership file is missing or invalid.");
const summary=[
  "SlashPromo static site audit",
  "Sitemap URLs: "+urls.length,
  "Indexable HTML pages: "+indexablePages,
  "Private noindex pages: "+privatePages,
  "Legacy redirected HTML pages: "+redirectedPages,
  "Validated JSON-LD blocks: "+schemaBlocks,
  "Internal links to missing static pages (warnings): "+missingLocalLinks,
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
   "| Indexable HTML pages | "+indexablePages+" |\n"+
   "| Redirect fallback pages | "+redirectedPages+" |\n"+
   "| Private noindex pages | "+privatePages+" |\n"+
   "| JSON-LD blocks | "+schemaBlocks+" |\n"+
   "| Missing internal links (warnings) | "+missingLocalLinks+" |\n"+
   "| City root Q&A pages | "+roots+" |\n"+
   "| Scoped local Q&A pages | "+scoped+" |\n"+
   "| Errors | "+errors.length+" |\n"+
   "| Warnings | "+warnings.length+" |\n\n"+
   (errors.length?"### Errors\n"+errors.map(x=>"- "+x).join("\n")+"\n":"")+
   (warnings.length?"### Warnings\n"+warnings.slice(0,30).map(x=>"- "+x).join("\n")+"\n":"");
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
if(errors.length)process.exitCode=1;
