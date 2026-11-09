/* Read-only public launch smoke test, run from GitHub Actions after publish.
   No patient data, private admin keys, GPS requests, or analytics POST events. */
const ORIGIN="https://slashpromo.com";
const expectedVersion="20261109-patient3";
const commit=String(process.env.GITHUB_SHA||"").slice(0,12);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw Error(message)};
async function request(path,options={}){
  const url=ORIGIN+path;
  const response=await fetch(url,{
    headers:{"User-Agent":"SlashPromo-Launch-Check/1.0","Cache-Control":"no-cache"},
    redirect:options.redirect||"follow",
    signal:AbortSignal.timeout(20000)
  });
  return {status:response.status,location:response.headers.get("location")||"",
    contentType:response.headers.get("content-type")||"",
    text:options.body===false?"":await response.text(),url:response.url};
}
async function checked(path,fragments=[],status=200,opts={}){
  let last;
  for(let i=1;i<=3;i++){
    try{
      const r=await request(path,opts);
      assert(r.status===status,path+" returned HTTP "+r.status+" (expected "+status+")");
      for(const fragment of fragments)
        assert(r.text.includes(fragment),path+" missing required content: "+fragment);
      console.log("PASS",path,status);
      return r;
    }catch(err){
      last=err;
      if(i<3)await sleep(3500);
    }
  }
  throw last;
}
async function waitForLahore(){
  for(let attempt=1;attempt<=25;attempt++){
    try{
      const r=await request("/lahore/?verify="+commit+"-"+attempt);
      if(r.status===200&&r.text.includes('href="/doctors/lahore/dr-muhammad-umair-arshad/"')&&
         r.text.includes('rel="canonical" href="https://slashpromo.com/lahore/"')){
        console.log("PASS Lahore published and fresh on attempt",attempt);
        return r;
      }
      console.log("Lahore publish check",attempt,"status",r.status);
    }catch(e){console.log("Lahore publish check",attempt,String(e.message).slice(0,120))}
    if(attempt<25)await sleep(12000);
  }
  throw Error("Lahore's new directory is not yet publicly visible.");
}
async function main(){
  const lahore=await waitForLahore();
  const cards=(lahore.text.match(/class="sp-directory-card"/g)||[]).length;
  assert(cards===19,"Lahore must show 19 published doctor cards; found "+cards);
  const schemas=[...lahore.text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert(schemas.length>0,"Lahore needs crawler-readable structured data");
  const entities=schemas.flatMap(x=>{const j=JSON.parse(x[1]);return j["@graph"]||[j]});
  assert(entities.some(x=>x["@type"]==="CollectionPage"),"Lahore must have CollectionPage schema");
  assert(entities.some(x=>x["@type"]==="ItemList"),"Lahore must have doctor list schema");
  console.log("PASS Lahore HTML cards, canonical and structured data",cards);

  const cityPages=[
    ["/",["data-menu-toggle","data-nav","/assets/site.js?v="+expectedVersion]],
    ["/cities/",['href="/lahore/"']],
    ["/sukkur/",["id=\"listed-doctors\"","/assets/city-questions.js"]],
    ["/karachi/",["id=\"listed-doctors\""]],
    ["/khairpur/",["id=\"khairpur-doctors\""]],
    ["/shikarpur/",["id=\"shikarpur-doctors\""]]
  ];
  for(const [path,fragments] of cityPages)await checked(path,fragments);
  for(const path of [
    "/doctors/sukkur/dr-bashir-ahmed-khoso/",
    "/doctors/lahore/dr-muhammad-umair-arshad/",
    "/hospitals/karachi/astro-physiocare/",
    "/hospitals/shikarpur/alkhidmat-medical-center/"
  ])await checked(path,["rel=\"canonical\"","/assets/site.js"]);

  const sitemap=await checked("/sitemap.xml",[
    "<loc>https://slashpromo.com/lahore/</loc>",
    "<loc>https://slashpromo.com/sukkur/</loc>",
    "<loc>https://slashpromo.com/karachi/</loc>"
  ]);
  const urls=[...sitemap.text.matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]+)<\/loc>/g)];
  assert(urls.length>=161,"Sitemap should contain at least 161 canonical URLs");
  await checked("/robots.txt",["Sitemap: https://slashpromo.com/sitemap.xml"]);
  await checked("/assets/site.js",[
    "window.slashpromoTrack",
    "cross-profile-links.js?v=20261109-patient3",
    "[data-menu-toggle]"
  ]);
  await checked("/assets/native-directory.js",["sp-card-patient-detail","Call published number"]);
  await checked("/assets/cross-profile-links.js",["Planning a visit?","cityGuide()","profileGuide(record,kind)"]);
  await checked("/assets/cross-profile-links.css",[".sp-patient-guide"]);
  await checked("/assets/location-personalization.js",["Use my location","navigator.geolocation","slashpromo_preferred_city_v1"]);
  await checked("/assets/city-questions.js",["cityMap","Sukkur","Karachi"]);
  for(const [source,target] of [
    ["/doctors/sukkur/dr-deepak/","/doctors/sukkur/dr-deepak-kumar/"],
    ["/doctors/sukkur/dr-aabid-raza/","/doctors/ubauro/dr-aabid-raza/"]
  ]){
    const r=await checked(source,[],301,{redirect:"manual",body:false});
    const destination=new URL(r.location,ORIGIN);
    assert(destination.origin===ORIGIN&&destination.pathname===target,
      "Wrong legacy redirect: "+source+" -> "+r.location);
    console.log("PASS redirect",source,"->",target);
  }
  await checked("/api/analytics-report?days=7",[],401,{body:false});
  await checked("/api/analytics",[],405,{body:false});
  const health=await checked("/api/analytics?health=1",['"enabled":true']);
  console.log("PASS analytics available, unauthorized report denied, GET ingestion blocked");
  console.log("SUCCESS: live city pages, doctor profiles, hospital profiles, mobile navigation assets, location consent, Q&A, sitemap, redirects and private analytics guards verified without mutations.");
}
main().catch(err=>{console.error("LIVE VERIFY FAILED:",err?.message||err);process.exitCode=1});
