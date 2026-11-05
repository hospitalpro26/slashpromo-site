/* Public sponsored placements: sourced only from approved live campaigns. */
(async () => {
"use strict";
const parts=location.pathname.toLowerCase().split("/").filter(Boolean);
const cities=["sukkur","khairpur","shikarpur","ghotki","karachi"];
const categories=["doctors","hospitals","laboratories","clinics"];
let placement=null,city="all",category="";
if(!parts.length)placement="homepage";
else if(parts.length===1&&cities.includes(parts[0])){placement="city";city=parts[0];}
else if(parts.length===1&&categories.includes(parts[0])){placement="category";category=parts[0];}
if(!placement)return;
const url=new URL("/api/campaigns",location.origin);
url.searchParams.set("placement",placement);url.searchParams.set("city",city);
if(category)url.searchParams.set("category",category);
let campaigns=[];
try{const response=await fetch(url,{headers:{"Accept":"application/json"}});if(response.ok){const data=await response.json();campaigns=Array.isArray(data.campaigns)?data.campaigns:[];}}catch(_){return;}
if(!campaigns.length)return;
const text=(tag,content,className)=>{const el=document.createElement(tag);if(className)el.className=className;el.textContent=String(content||"");return el;};
const section=document.createElement("section");section.className="section white sponsored-list";section.setAttribute("aria-labelledby","sponsored-campaigns");
const wrap=text("div","","wrap"),heading=text("div","","section-head"),intro=text("div","","intro");
intro.append(text("span","Sponsored healthcare campaigns","eyebrow"),text("h2","In the spotlight.",""));
intro.lastChild.id="sponsored-campaigns";
intro.append(text("p","Paid promotional placements from participating healthcare organizations. Confirm current services with the provider.","lead"));
heading.append(intro);wrap.append(heading);
const grid=text("div","","spot-grid");
for(const c of campaigns){
 if(typeof c.id!=="string"||!/^[0-9a-f-]{36}$/i.test(c.id))continue;
 const card=text("article","","spot-card"),visual=text("div","","spot-visual");
 visual.style.setProperty("--visual-bg","linear-gradient(130deg,#253762,#7456a4)");
 const pill=text("span","Sponsored • "+String(c.category||"").slice(0,30),"category-pill");visual.append(pill);
 if(c.image_url){
  try{const u=new URL(c.image_url);if(u.protocol==="https:"){const img=document.createElement("img");img.src=u.toString();img.loading="lazy";img.alt="";img.referrerPolicy="no-referrer";img.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;";pill.style.cssText="position:relative;z-index:1";visual.append(img);}}catch(_){}
 }else{visual.append(text("span","✦","visual-symbol"));}
 const body=text("div","","spot-body");
 body.append(text("span",(String(c.city||"Pakistan")+" • Sponsored").toUpperCase(),"spot-meta"),text("h3",c.title||c.provider_name||"Healthcare campaign"),text("p",c.description||""));
 const foot=text("div","","spot-footer"),link=text("a",c.cta_label||"Explore campaign","");link.href="/go/"+encodeURIComponent(c.id);link.target="_blank";link.rel="noopener noreferrer sponsored";link.referrerPolicy="no-referrer";
 foot.append(link,text("small","Advertisement"));body.append(foot);card.append(visual,body);grid.append(card);
}
if(!grid.children.length)return;
wrap.append(grid);section.append(wrap);
const spotlights=document.getElementById("spotlights");
if(spotlights){spotlights.parentNode.insertBefore(section,spotlights);}
else{
 const firstSoft=document.querySelector("main .section.soft");
 if(firstSoft)firstSoft.parentNode.insertBefore(section,firstSoft);
 else document.querySelector("main")?.append(section);
}
})();