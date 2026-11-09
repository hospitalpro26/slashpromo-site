/* Read-only search crawlability check for SlashPromo.
   This checks whether pages can be fetched and advertise indexable metadata.
   It CANNOT establish which URLs are present in Google's or Bing's index.
   Googlebot/Bingbot strings from GitHub runners do not authenticate crawler IPs. */
import {readFileSync} from "node:fs";
const ORIGIN="https://slashpromo.com";
const paths=[
  "/", "/cities/", "/doctors/", "/hospitals/",
  "/sukkur/", "/khairpur/", "/shikarpur/", "/karachi/", "/lahore/", "/ghotki/",
  "/doctors/sukkur/dr-bashir-ahmed-khoso/",
  "/doctors/lahore/dr-muhammad-umair-arshad/",
  "/doctors/karachi/dr-anozia-sabir/",
  "/doctors/khairpur/dr-kanwal-aijaz/",
  "/hospitals/sukkur/river-city-hospital/",
  "/hospitals/karachi/astro-physiocare/",
  "/hospitals/shikarpur/alkhidmat-medical-center/",
  "/sukkur/health-topics/joint-and-back-pain/"
];
const agents={
  browser:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
  "googlebot-ua":"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "bingbot-ua":"Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
};
const findings=[];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function get(url,ua="browser"){
  let lastError;
  for(let i=0;i<3;i++){
    try{
      const response=await fetch(url,{redirect:"follow",headers:{
        "User-Agent":agents[ua],
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control":"no-cache"
      },signal:AbortSignal.timeout(16000)});
      const text=await response.text();
      return {response,text,agent:ua};
    }catch(e){lastError=e;if(i<2)await sleep(1200*(i+1))}
  }
  throw lastError;
}
function attr(html,pattern){return pattern.exec(html)?.[1]||""}
function checkPage(path,data){
  const {response,text,agent}=data;
  const url=ORIGIN+path,canonical=attr(text,/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const robots=attr(text,/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  const headerRobots=response.headers.get("x-robots-tag")||"";
  const title=attr(text,/<title>([^<]+)<\/title>/i);
  const description=attr(text,/<meta\s+name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const failures=[];
  if(response.status!==200)failures.push("HTTP "+response.status);
  if(!response.headers.get("content-type")?.includes("text/html"))failures.push("not HTML content type");
  if(response.url!==url)failures.push("unexpected final URL "+response.url);
  if(canonical!==url)failures.push("canonical mismatch "+canonical);
  if(/(?:^|,)\s*noindex\b/i.test(robots)||/\bnoindex\b/i.test(headerRobots))failures.push("noindex detected");
  if(!title||!description)failures.push("missing title or description");
  if(!/<h1(?:\s|>)/i.test(text))failures.push("missing HTML heading");
  if(!/name=["']viewport["']/i.test(text))failures.push("missing mobile viewport");
  if(/<title>\s*(?:Just a moment|Attention Required|Access denied)/i.test(text)||/cf-mitigated:\s*challenge/i.test(JSON.stringify([...response.headers])))failures.push("security challenge");
  let schemaCount=0;
  for(const match of text.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{const obj=JSON.parse(match[1]);if(obj["@context"]==="https://schema.org")schemaCount++}catch{failures.push("invalid JSON-LD")}
  }
  if(!schemaCount)failures.push("missing valid schema.org JSON-LD");
  const result={path,agent,status:response.status,canonical,schemas:schemaCount,errors:failures};
  findings.push(result);
  console.log((failures.length?"FAIL":"PASS")+" "+agent+" "+path+" "+response.status+
    (failures.length?" "+failures.join("; "):""));
}
async function main(){
  const sitemap=await get(ORIGIN+"/sitemap.xml");
  assert(sitemap.response.status===200,"Sitemap not publicly available");
  const urls=[...sitemap.text.matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]*)<\/loc>/g)].map(m=>m[1]);
  const canonicalSet=new Set(urls);
  assert(urls.length===canonicalSet.size,"Duplicate sitemap URLs");
  assert(urls.length>=160,"Expected >=160 canonical URLs in sitemap");
  for(const p of paths)assert(canonicalSet.has(ORIGIN+p),"Monitored page absent from sitemap: "+p);
  const robots=await get(ORIGIN+"/robots.txt");
  assert(robots.response.status===200,"robots.txt not available");
  assert(robots.text.includes("Sitemap: "+ORIGIN+"/sitemap.xml"),"robots.txt missing sitemap reference");
  assert(!/Disallow:\s*\/\s*(?:\n|$)/m.test(robots.text),"robots.txt blocks whole website");

  /* Sample first with a typical browser. Then use crawler-like UA values for a
     smaller representative group; these are not Google's or Bing's real IPs. */
  for(const path of paths)checkPage(path,await get(ORIGIN+path));
  for(const agent of ["googlebot-ua","bingbot-ua"]){
    for(const path of ["/","/sukkur/","/lahore/","/doctors/sukkur/dr-bashir-ahmed-khoso/","/hospitals/karachi/astro-physiocare/"])
      checkPage(path,await get(ORIGIN+path,agent));
  }
  const failures=findings.filter(x=>x.errors.length);
  console.log("CRAWL SUMMARY: sitemap="+urls.length+
    " sampled_fetches="+findings.length+" errors="+failures.length+
    ". A successful check means technically crawlable, NOT verified indexed.");
  if(process.env.GITHUB_STEP_SUMMARY){
    const {appendFileSync}=await import("node:fs");
    const md="## SlashPromo indexing readiness (not actual indexing)\n"+
      "Sitemap canonical URLs: **"+urls.length+"**\n\n"+
      "Read-only HTTP checks: **"+findings.length+"**, failures: **"+failures.length+"**\n\n"+
      (failures.length?failures.map(x=>"- "+x.agent+" "+x.path+": "+x.errors.join("; ")).join("\n")+"\n\n":"")+
      "Crawler user-agent tests use GitHub runners, not verified search-engine IPs. "+
      "Check Google Search Console and Bing Webmaster Tools for indexed URL counts and search impressions.\n";
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
  if(failures.length)process.exitCode=1;
}
main().catch(err=>{console.error("CRAWL AUDIT FAILED:",err.message||err);process.exitCode=1});
