/* Site-wide SEO, local discovery (GEO), AI-answer readiness, and sitemap audit.
   This is read-only. It never rewrites doctor or hospital facts and never publishes.
   Run: node scripts/audit-seo-geo.mjs
   Required: no duplicate/broken sitemap entries, every public canonical page present,
   valid title/description/schema. Enhancements are reported, not fabricated. */
import {readFileSync,readdirSync,existsSync,appendFileSync} from "node:fs";

const ORIGIN="https://slashpromo.com", errors=[],warnings=[];
const xml=readFileSync("sitemap.xml","utf8");
const names=[...xml.matchAll(/<url>\s*<loc>(https:\/\/slashpromo\.com\/[^<]*)<\/loc>([\s\S]*?)<\/url>/g)];
const urls=names.map(x=>x[1]);
const listed=new Set(urls);
const redirectPaths=new Set();
for(const line of readFileSync("_redirects","utf8").split(/\r?\n/)){
  const parts=line.trim().split(/\s+/);
  if(parts.length>=3&&["301","308"].includes(parts[2]))redirectPaths.add(parts[0]);
}
function allHtml(dir="."){
  const out=[];
  for(const e of readdirSync(dir,{withFileTypes:true})){
    if([".git",".github","node_modules","assets","functions","scripts"].includes(e.name))continue;
    const p=dir==="."?e.name:dir+"/"+e.name;
    if(e.isDirectory())out.push(...allHtml(p));
    else if(e.isFile()&&(p==="index.html"||p.endsWith("/index.html")))out.push(p);
  }
  return out;
}
const pages=allHtml();
const simpleTag=(c,re)=>c.match(re)?.[1]?.replaceAll("&amp;","&")?.trim()||"";
const region={sukkur:"PK-SD",karachi:"PK-SD",khairpur:"PK-SD",shikarpur:"PK-SD",hyderabad:"PK-SD","pano-aqil":"PK-SD",ghotki:"PK-SD",ratodero:"PK-SD",larkana:"PK-SD",ubauro:"PK-SD","lakhi-ghulam-shah":"PK-SD",sobhodero:"PK-SD",lahore:"PK-PB",faisalabad:"PK-PB","fort-abbas":"PK-PB","mian-channu":"PK-PB",jhelum:"PK-PB",rawalpindi:"PK-PB",sheikhupura:"PK-PB",pakpattan:"PK-PB",bahawalpur:"PK-PB",gojra:"PK-PB",islamabad:"PK-IS",quetta:"PK-BA",peshawar:"PK-KP","dir-upper":"PK-KP",wari:"PK-KP"};
const localSegments=new Set(["doctors","hospitals","clinics","laboratories"]);
const counts={html:pages.length,public:0,private:0,redirect:0,geotagged:0,local:0,description:0,openGraph:0,schema:0,breadcrumb:0,news:0,city:0};
const titles=new Map(),descBuckets=new Map(),unlisted=[],missingGeo=[],missingGraph=[],missingBreadcrumb=[];
for(const path of pages){
  const p=path==="index.html"?"/":"/"+path.slice(0,-"index.html".length);
  const url=ORIGIN+p,content=readFileSync(path,"utf8");
  const robots=simpleTag(content,/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const canonical=simpleTag(content,/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const title=simpleTag(content,/<title>([^<]*)<\/title>/i);
  const description=simpleTag(content,/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const isRedirect=redirectPaths.has(p);
  const noindex=/\bnoindex\b/i.test(robots);
  if(isRedirect){counts.redirect++;if(listed.has(url))errors.push("Redirect in sitemap: "+p);continue;}
  if(noindex){counts.private++;if(listed.has(url))errors.push("Noindex in sitemap: "+p);continue;}
  // Only sitemap-listed pages are considered launch-approved indexable pages.
  counts.public++;
  if(!listed.has(url))unlisted.push(p);
  if(!title)errors.push("Missing title: "+path);
  if(!description)errors.push("Missing meta description: "+path);else counts.description++;
  if(!canonical)errors.push("Missing canonical: "+path);
  else if(canonical!==url)warnings.push("Canonical differs from actual path: "+path+" → "+canonical);
  if(!/<h1[\s>]/i.test(content))warnings.push("No visible H1: "+path);
  if(title.length>72)warnings.push("Long SEO title ("+title.length+"): "+path);
  if(description.length>175)warnings.push("Long meta description ("+description.length+"): "+path);
  if(titles.has(title))warnings.push("Repeated SEO title: "+path+" & "+titles.get(title));
  else titles.set(title,path);
  if(description){const prior=descBuckets.get(description)||[];prior.push(path);descBuckets.set(description,prior);}
  if(content.includes('property="og:title"')&&content.includes('property="og:description"'))counts.openGraph++;
  else missingGraph.push(path);
  const seg=p.split("/").filter(Boolean);
  const city=localSegments.has(seg[0])?seg[1]:seg[0];
  if(region[city]){
    counts.local++;
    if(seg.length===1)counts.city++;
    if(content.includes('name="geo.placename"')&&content.includes('name="geo.region"'))counts.geotagged++;
    else missingGeo.push(path);
  }
  const blocks=[...content.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if(blocks.length)counts.schema++;
  else warnings.push("No structured data: "+path);
  let hasBreadcrumb=false;
  for(const block of blocks){
    try{
      const data=JSON.parse(block[1]);
      if(data["@context"]!=="https://schema.org")warnings.push("Unrecognized schema context: "+path);
      const nodes=Array.isArray(data["@graph"])?data["@graph"]:[data];
      if(nodes.some(n=>n["@type"]==="BreadcrumbList"))hasBreadcrumb=true;
    }catch(e){errors.push("Invalid JSON-LD: "+path+" — "+e.message);}
  }
  if(hasBreadcrumb)counts.breadcrumb++;else if(seg.length>1)missingBreadcrumb.push(path);
  if(p.startsWith("/health-news/")&&p!=="/health-news/"){
    counts.news++;
    if(!content.includes('"@type":"NewsArticle"'))warnings.push("News item has no NewsArticle schema: "+path);
  }
}
if(urls.length!==listed.size)errors.push("Duplicate sitemap URLs: "+(urls.length-listed.size));
if(!urls.includes(ORIGIN+"/"))errors.push("Homepage absent from sitemap");
if(!readFileSync("robots.txt","utf8").includes("Sitemap: "+ORIGIN+"/sitemap.xml"))errors.push("Sitemap not advertised by robots.txt");
for(const url of urls){const p=url.slice(ORIGIN.length);const file=p==="/"?"index.html":p.slice(1)+"index.html";if(!existsSync(file))errors.push("Sitemap points to missing page: "+url);}
for(const item of names){
 const lastmod=item[2].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
 if(!lastmod)warnings.push("Missing lastmod: "+item[1]);
 else if(!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)||lastmod>new Date().toISOString().slice(0,10))errors.push("Invalid/future lastmod: "+item[1]);
}
for(const missing of unlisted)errors.push("Public indexable page absent from sitemap: "+missing);
for(const [desc,paths] of descBuckets)if(paths.length>1)warnings.push("Duplicate meta description across "+paths.length+" pages: "+paths.slice(0,4).join(", "));
const summary=[
 "SlashPromo site-wide SEO/GEO/AEO readiness audit",
 "HTML pages: "+counts.html,
 "Indexable pages: "+counts.public,
 "Sitemap URLs: "+urls.length,
 "Noindex/private pages: "+counts.private,
 "Redirect fallbacks: "+counts.redirect,
 "Titles/descriptions: "+titles.size+"/"+counts.description,
 "OpenGraph titles and descriptions: "+counts.openGraph,
 "Valid schema-present pages: "+counts.schema,
 "Local pages with geolocation meta: "+counts.geotagged+"/"+counts.local,
 "Pages with breadcrumb structured data: "+counts.breadcrumb,
 "City root pages: "+counts.city,
 "Health News articles: "+counts.news,
 "Missing OpenGraph previews: "+missingGraph.length,
 "Missing GEO meta on local pages: "+missingGeo.length,
 "Missing breadcrumbs on nested pages: "+missingBreadcrumb.length,
 "Errors: "+errors.length,
 "Warnings: "+warnings.length
].join("\n");
console.log(summary);
for(const e of errors)console.error("ERROR: "+e);
for(const e of warnings.slice(0,80))console.warn("WARN: "+e);
if(process.env.GITHUB_STEP_SUMMARY){
 const report="## Site-wide SEO, local GEO and answer-readiness\n\n"+summary.split("\n").slice(1).map(s=>"- "+s).join("\n")+"\n\n"+
 "### Priority follow-up\n"+
 "- Missing OpenGraph: "+missingGraph.slice(0,25).join(", ")+"\n"+
 "- Missing local GEO metadata: "+missingGeo.slice(0,25).join(", ")+"\n"+
 "- Missing breadcrumb schema: "+missingBreadcrumb.slice(0,25).join(", ")+"\n\n"+
 (errors.length?"### Critical findings\n"+errors.slice(0,50).map(x=>"- "+x).join("\n")+"\n":"");
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
}
if(errors.length)process.exitCode=1;