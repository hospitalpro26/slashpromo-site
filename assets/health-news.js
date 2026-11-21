"use strict";
/* Public, read-only health news feed. Only source-verified, explicitly published
   entries in the review-controlled JSON may appear; no browser HTML injection. */
(()=>{
  const $=id=>document.getElementById(id);
  const city=$("hn-city"),topic=$("hn-topic"),hospital=$("hn-hospital"),query=$("hn-query");
  const grid=$("hn-stories"),empty=$("hn-empty"),status=$("hn-result-status"),hospitalLinks=$("hn-hospital-links");
  const cityLabels={sukkur:"Sukkur",khairpur:"Khairpur",shikarpur:"Shikarpur",karachi:"Karachi",hyderabad:"Hyderabad","pano-aqil":"Pano Aqil",ghotki:"Ghotki",ratodero:"Ratodero",larkana:"Larkana",lahore:"Lahore",islamabad:"Islamabad",quetta:"Quetta"};
  const allowedTopics=new Set(["Hospital updates","Public health alerts","Medical research","Health campaigns","Health policy","Education & training","Community health"]);
  let articles=[];
  function node(tag,cls,value){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    return el;
  }
  function internalArticleUrl(value){return typeof value==="string"&&/^\/health-news\/[a-z0-9\-/]+\/$/.test(value)&&!value.includes("//")}
  function sourceUrl(value){if(typeof value!=="string")return false;try{const u=new URL(value);return u.protocol==="https:"&&Boolean(u.hostname)&&!u.username&&!u.password}catch{return false}}
  function validStory(s){
    return s&&s.status==="published"&&typeof s.title==="string"&&s.title.trim().length>8&&
      typeof s.summary==="string"&&s.summary.trim().length>20&&
      typeof s.city==="string"&&Object.hasOwn(cityLabels,s.city)&&
      allowedTopics.has(s.topic)&&
      /^\d{4}-\d{2}-\d{2}$/.test(s.datePublished||"")&&!Number.isNaN(Date.parse(s.datePublished))&&
      internalArticleUrl(s.url)&&sourceUrl(s.sourceUrl)&&typeof s.sourceName==="string"&&s.sourceName.trim().length>2;
  }
  function prettyDate(value){try{return new Date(value+"T00:00:00Z").toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}catch{return value}}
  function syncFiltersFromUrl(){
    const p=new URLSearchParams(location.search);
    const c=p.get("city")||"",t=p.get("topic")||"",h=p.get("hospital")||"";
    city.value=Object.hasOwn(cityLabels,c)?c:"";
    topic.value=allowedTopics.has(t)?t:"";
    hospital.value=[...hospital.options].some(o=>o.value===h)?h:"";
    query.value=(p.get("q")||"").slice(0,100);
  }
  function buildHospitalOptions(){
    const names=[...new Set(articles.map(s=>s.hospitalName).filter(x=>typeof x==="string"&&x.trim().length>2))].sort((a,b)=>a.localeCompare(b));
    hospital.replaceChildren();
    hospital.append(node("option","","All hospitals"));
    hospital.firstChild.value="";
    hospitalLinks.replaceChildren();
    if(!names.length){hospitalLinks.append(node("p","","No hospital-specific updates are published yet."));return}
    names.forEach(name=>{
      const option=node("option","",name);option.value=name;hospital.append(option);
      const a=node("a","",name);a.href="/health-news/?hospital="+encodeURIComponent(name)+"#latest";hospitalLinks.append(a);
    });
  }
  function renderCard(s){
    const card=node("article","hn-story");
    // Image URLs come from the editorially reviewed local news feed.
    // Restrict to approved HTTPS image hosts and never render feed HTML.
    let safeImage=false;
    if(typeof s.imageUrl==="string"){
      try{
        const source=new URL(s.imageUrl);
        safeImage=source.protocol==="https:" && !source.username && !source.password &&
          (source.hostname==="d2ol7oe51mr4n9.cloudfront.net" || source.hostname==="slashpromo.com" ||
           (source.hostname==="slashcure.com" && /^\/doctors\/[a-zA-Z0-9]+\/photo$/.test(source.pathname)));
      }catch{safeImage=false}
    }
    const media=node("div",safeImage?"hn-story-top hn-story-has-photo":"hn-story-top");
    if(safeImage){
      const img=node("img","hn-story-image");
      img.src=s.imageUrl;
      img.alt=typeof s.imageAlt==="string"?s.imageAlt:"Healthcare news photograph";
      img.loading="lazy";
      img.decoding="async";
      img.width=1280;
      img.height=720;
      media.append(img);
    }
    card.append(media);
    const body=node("div","hn-story-content");
    body.append(node("div","hn-story-kicker",s.topic+" · "+cityLabels[s.city]));
    const title=node("h3","");
    const link=node("a","",s.title);link.href=s.url;title.append(link);body.append(title);
    body.append(node("p","",s.summary));
    // Explicit verified doctor link: display only trusted Slashcure doctor profile URLs.
    if(typeof s.doctorName==="string" && typeof s.doctorProfileUrl==="string"){
      try{
        const doctorUrl=new URL(s.doctorProfileUrl);
        if(doctorUrl.protocol==="https:" && doctorUrl.hostname==="slashcure.com" &&
           /^\/[a-z0-9-]+\/[a-z0-9-]+\/dr-[a-z0-9-]+\/?$/.test(doctorUrl.pathname) &&
           !doctorUrl.username && !doctorUrl.password){
          const doctorLink=node("a","hn-story-doctor",s.doctorName+" — Slashcure profile");
          doctorLink.href=doctorUrl.href;
          body.append(doctorLink);
        }
      }catch{}
    }
    if(s.hospitalName)body.append(node("div","hn-story-meta","Hospital: "+s.hospitalName));
    body.append(node("div","hn-story-meta",prettyDate(s.datePublished)+" · Source: "+s.sourceName));
    const source=node("a","hn-story-source","Original source ↗");
    source.href=s.sourceUrl;source.target="_blank";source.rel="noopener noreferrer nofollow";
    body.append(source);card.append(body);return card;
  }
  function render(){
    const c=city.value,t=topic.value,h=hospital.value,q=query.value.trim().toLocaleLowerCase("en");
    const match=articles.filter(s=>(!c||s.city===c)&&(!t||s.topic===t)&&(!h||s.hospitalName===h)&&
      (!q||[s.title,s.summary,s.hospitalName,s.topic,cityLabels[s.city]].some(v=>String(v||"").toLocaleLowerCase("en").includes(q))));
    grid.replaceChildren();
    match.forEach(s=>grid.append(renderCard(s)));
    empty.hidden=match.length>0;
    status.textContent=match.length+" verified "+(match.length===1?"story":"stories")+" found"+(c?" in "+cityLabels[c]:"")+".";
    document.querySelectorAll("#hn-city-links a").forEach(a=>{
      a.removeAttribute("aria-current");
      try{if(new URL(a.href).searchParams.get("city")===c&&c)a.setAttribute("aria-current","page")}catch{}
    });
  }
  function syncUrl(){
    const params=new URLSearchParams();
    if(query.value.trim())params.set("q",query.value.trim().slice(0,100));
    if(city.value)params.set("city",city.value);
    if(topic.value)params.set("topic",topic.value);
    if(hospital.value)params.set("hospital",hospital.value);
    history.replaceState(null,"",location.pathname+(params.size?"?"+params:"")+location.hash);
  }
  $("hn-filters").addEventListener("submit",event=>{event.preventDefault();syncUrl();render()});
  $("hn-clear").addEventListener("click",()=>{city.value="";topic.value="";hospital.value="";query.value="";syncUrl();render()});
  addEventListener("popstate",()=>{syncFiltersFromUrl();render()});
  fetch("/health-news/news.json",{cache:"no-store",headers:{Accept:"application/json"}}).then(async response=>{
    if(!response.ok||!(response.headers.get("content-type")||"").includes("json"))throw new Error("News feed unavailable");
    const payload=await response.json();
    if(!payload||payload.version!==1||!Array.isArray(payload.articles))throw new Error("Invalid news feed");
    const seen=new Set();
    articles=payload.articles.filter(validStory).filter(s=>{
      if(seen.has(s.url))return false;
      seen.add(s.url);return true;
    }).sort((a,b)=>b.datePublished.localeCompare(a.datePublished));
    buildHospitalOptions();syncFiltersFromUrl();render();
  }).catch(()=>{
    grid.replaceChildren();empty.hidden=false;
    status.textContent="News feed unavailable. Please try again later.";
    empty.querySelector("h3").textContent="The news feed could not load";
    empty.querySelector("p").textContent="Healthcare updates are temporarily unavailable. You can still explore city guides or try again later.";
  });
})();
