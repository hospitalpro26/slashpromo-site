/* City-specific advertising slot placed next to the introductory city copy.
 * Advertiser artwork/URLs must be verified before marking an ad published.
 * Never display draft sponsors, placeholder phone numbers, or fake CTAs.
 */
(() => {
 "use strict";
 const cityKey=location.pathname.match(/^\/(karachi|sukkur|khairpur|shikarpur|hyderabad|ghotki)\/?$/i)?.[1]?.toLowerCase();
 if(!cityKey)return;
 const cityName=cityKey.charAt(0).toUpperCase()+cityKey.slice(1);
 const run=()=>{
  const aside=document.querySelector("main .city-detail > aside.detail-aside");
  if(!aside || aside.parentElement?.querySelector(".sp-city-ad-stack"))return;
  const stack=document.createElement("div");
  stack.className="sp-city-ad-stack";
  aside.before(stack);
  stack.appendChild(aside);
  const css=document.createElement("link");
  css.rel="stylesheet";
  css.href="/assets/city-sidebar-ads.css?v=20261106-sideads1";
  document.head.appendChild(css);
  const buildCard=(ad)=>{
    const active=!!ad;
    const card=document.createElement("aside");
    card.className="sp-city-ad-unit";
    card.dataset.adActive=String(active);
    card.setAttribute("aria-label",active?"Sponsored advertisement in "+cityName:"Advertising opportunity in "+cityName);
    const header=document.createElement("div");
    header.className="sp-city-ad-eyebrow";
    const eyebrow=document.createElement("span");
    eyebrow.textContent=active?"Local business in "+cityName:"Your business in "+cityName;
    const status=document.createElement("span");
    status.className="sp-ad-status";
    status.textContent=active?"Sponsored":"Ad space";
    header.append(eyebrow,status);
    const media=document.createElement("div");
    media.className="sp-city-ad-media";
    if(active && typeof ad.image==="string" && /^\/assets\/ads\/[a-z0-9._/-]+\.(?:png|jpe?g|webp)$/i.test(ad.image)){
      const img=document.createElement("img");
      img.src=ad.image;img.alt=ad.imageAlt||ad.name;img.loading="lazy";img.decoding="async";
      img.addEventListener("error",()=>{img.remove();media.textContent="Local business";},{once:true});
      media.append(img);
    } else {
      const illustration=document.createElement("span");
      illustration.className="sp-city-ad-illustration";
      illustration.setAttribute("aria-hidden","true");
      illustration.textContent="✦";
      media.appendChild(illustration);
    }
    const content=document.createElement("div");
    content.className="sp-city-ad-content";
    const name=document.createElement("h3");
    name.textContent=active?ad.name:"Advertise your business in "+cityName;
    const description=document.createElement("p");
    description.textContent=active?ad.description:"Showcase your restaurant, home-food service, hostel, shop or local business here, right beside the city’s healthcare listings.";
    const link=document.createElement("a");
    link.className="sp-city-ad-cta";
    if(active){link.href=ad.url;link.rel="sponsored noopener noreferrer";link.target="_blank";link.textContent=ad.cta||"Discover this business ↗";}
    else{link.href="/advertise/";link.textContent="Reserve this ad space ↗";}
    const fine=document.createElement("small");
    fine.className="sp-city-ad-footnote";
    fine.textContent=active?"Paid advertisement · Business information supplied by the advertiser.":"Sidebar placement · Third-party ads displayed here only after approval.";
    content.append(name,description,link,fine);
    card.append(header,media,content);
    return card;
  };
  const valid=ad=>ad && ad.published===true && typeof ad.name==="string" && ad.name.trim() && typeof ad.description==="string" && ad.description.trim() && typeof ad.url==="string" && /^https:\/\//i.test(ad.url);
  const show=ads=>{
    if(!stack.isConnected)return;
    const selected=(Array.isArray(ads)?ads:[]).filter(valid).slice(0,2);
    if(!selected.length)stack.append(buildCard(null));
    else selected.forEach(ad=>stack.append(buildCard(ad)));
  };
  fetch("/assets/city-ad-config.json?v=20261106-sideads1")
   .then(res=>{if(!res.ok)throw Error("Config unavailable");return res.json();})
   .then(data=>show(data?.cities?.[cityKey]))
   .catch(()=>show([]));
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});
 else run();
})();