/* Optional location-based city suggestions for returning SlashPromo visitors.
   Browser GPS is accessed ONLY after a real click on "Use my location".
   Raw coordinates never leave this page and are never stored.
   Only an explicitly chosen nearest listed city is kept in this browser. */
(() => {
  "use strict";
  const path=location.pathname.toLowerCase();
  // Never invoke geolocation until the visitor presses the consent button.
  if(/^\/(?:admin|qa-admin|control-center|analytics|enquiries|secure-backups|api|privacy|cookie-policy|terms|contact|advertise|editorial-policy|advertising-policy|accessibility)(?:\/|$)/.test(path))return;
  if(!document.querySelector(".site-header"))return;
  const CITY_KEY="slashpromo_preferred_city_v1";
  const PROMPT_KEY="slashpromo_location_prompt_v2";
  const SEEN_KEY="slashpromo_seen_pages_v2";
  const MONTH=30*24*60*60*1000;
  const now=Date.now();
  /* These are approximate directory-city centres, not visitor location records.
     Unknown/distant areas are never silently assigned to a city. */
  const centers=[
    ["Sukkur",27.71,68.86],["Khairpur",27.53,68.76],["Shikarpur",27.96,68.64],
    ["Ghotki",28.01,69.31],["Karachi",24.86,67.01],["Hyderabad",25.40,68.36],
    ["Larkana",27.56,68.21],["Lahore",31.55,74.34],["Islamabad",33.69,73.05],
    ["Rawalpindi",33.60,73.04],["Peshawar",34.01,71.58],["Quetta",30.19,67.00],
    ["Bahawalpur",29.39,71.68],["Faisalabad",31.42,73.08],["Sheikhupura",31.71,73.98],
    ["Pano Aqil",27.84,69.11],["Ubauro",28.16,69.73],["Mian Channu",30.44,72.35],
    ["Fort Abbas",29.19,72.86],["Gojra",31.15,72.68],["Jhelum",32.94,73.73],
    ["Pakpattan",30.34,73.38]
  ];
  const get=(store,key)=>{try{return JSON.parse(store.getItem(key)||"null")}catch{return null}};
  const put=(store,key,value)=>{try{store.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const remove=(store,key)=>{try{store.removeItem(key)}catch{}};
  const selected=get(localStorage,CITY_KEY);
  if(selected && typeof selected.city==="string" && selected.expires>now)return;
  if(selected)remove(localStorage,CITY_KEY);
  const lastPrompt=get(localStorage,PROMPT_KEY);
  if(lastPrompt && Number(lastPrompt.until)>now)return;
  /* Track two different public-page visits across tabs during a one-hour window.
     Store only the previous path, a count and an expiry; no browsing history. */
  const previous=get(localStorage,SEEN_KEY);
  const normalized=path.endsWith("/")?path:path+"/";
  const active=previous&&Number(previous.until)>now&&typeof previous.last==="string"&&Number.isInteger(previous.count);
  const seen=active
    ? {last:normalized,count:Math.min(2,previous.count+(previous.last===normalized?0:1)),until:now+3600000}
    : {last:normalized,count:1,until:now+3600000};
  if(!put(localStorage,SEEN_KEY,seen)||seen.count<2)return;

  function distanceKm(lat1,lon1,lat2,lon2){
    const rad=Math.PI/180;
    const dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function nearestCity(lat,lon){
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    let best=null;
    for(const [city,cLat,cLon] of centers){
      const km=distanceKm(lat,lon,cLat,cLon);
      if(best===null || km<best.km)best={city,km};
    }
    return best&&best.km<=85?best.city:null;
  }
  function buildPrompt(){
    if(document.getElementById("sp-location-request")||!document.body)return;
    const box=document.createElement("aside");
    box.id="sp-location-request";
    box.className="sp-location-request";
    box.setAttribute("role","region");
    box.setAttribute("aria-label","Optional location-based doctor listings");
    box.innerHTML=[
      '<div class="sp-location-heading"><span class="sp-location-pin" aria-hidden="true">⌖</span>',
      '<strong>Find healthcare near you</strong>',
      '<button class="sp-location-close" type="button" aria-label="Dismiss location request">×</button></div>',
      '<p class="sp-location-message" aria-live="polite">Improve your search experience: use your location to see doctors and hospitals in a nearby listed city first.</p>',
      '<p class="sp-location-privacy">Optional. Your browser asks permission only if you choose. Exact coordinates are not saved or sent to SlashPromo.</p>',
      '<div class="sp-location-actions"><button type="button" class="sp-location-allow">Use my location</button>',
      '<button type="button" class="sp-location-later">Not now</button></div>',
      '<a class="sp-location-manual" href="/doctors/">Or choose a city yourself</a>'
    ].join("");
    const allow=box.querySelector(".sp-location-allow");
    const later=box.querySelector(".sp-location-later");
    const close=box.querySelector(".sp-location-close");
    const msg=box.querySelector(".sp-location-message");
    const desc=box.querySelector(".sp-location-privacy");
    const actions=box.querySelector(".sp-location-actions");
    const manual=box.querySelector(".sp-location-manual");
    const dismiss=()=>{
      put(localStorage,PROMPT_KEY,{until:Date.now()+MONTH});
      box.remove();
    };
    later.addEventListener("click",dismiss);
    close.addEventListener("click",dismiss);
    /* Displayed-but-unanswered prompts are snoozed for one day, not 30 days.
       Explicit dismissal still pauses the invitation for 30 days. */
    put(localStorage,PROMPT_KEY,{until:Date.now()+24*60*60*1000});
    allow.addEventListener("click",()=>{
      allow.disabled=true;
      later.disabled=true;
      msg.textContent="Checking for a nearby listed city…";
      if(!window.isSecureContext||!navigator.geolocation||typeof navigator.geolocation.getCurrentPosition!=="function"){
        msg.textContent="Location is unavailable in this browser. You can still choose your city manually.";
        desc.textContent="No location information was collected or saved.";
        allow.hidden=true;later.disabled=false;later.textContent="Close";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        result=>{
          /* Calculate in the browser only; neither coordinates nor precision are retained. */
          const city=nearestCity(result.coords.latitude,result.coords.longitude);
          allow.disabled=false;later.disabled=false;
          if(!city){
            msg.textContent="We couldn't confidently match your location to a nearby listed city. You can still browse by city.";
            desc.textContent="No location coordinates or city preference were saved.";
            allow.hidden=true;
            manual.textContent="Browse all doctors by city";
            return;
          }
          const saved=put(localStorage,CITY_KEY,{city,expires:Date.now()+MONTH});
          if(saved)window.dispatchEvent(new CustomEvent("slashpromo:city-preference",{detail:{city}}));
          msg.textContent=city+" is your closest supported directory city. Listings there are now prioritised when available.";
          desc.textContent=saved
            ?"Only the city name is saved in this browser for 30 days. Exact coordinates were not saved or sent."
            :"No preference could be saved; you can still browse nearby listings.";
          actions.replaceChildren();
          const browse=document.createElement("a");
          browse.className="sp-location-browse";
          browse.href="/doctors/?city="+encodeURIComponent(city);
          browse.textContent="Browse "+city+" doctors";
          actions.append(browse);
          const done=document.createElement("button");
          done.type="button";done.className="sp-location-later";
          done.textContent="Done";done.addEventListener("click",()=>box.remove());
          actions.append(done);
          manual.hidden=true;
        },
        error=>{
          allow.disabled=false;later.disabled=false;
          msg.textContent=error&&error.code===1
            ?"Location permission wasn't granted. You can still search doctors by city."
            :"We couldn't determine your location. Please choose a city instead.";
          desc.textContent="No exact location or city preference was saved.";
          allow.hidden=true;later.textContent="Close";
        },
        {enableHighAccuracy:false,timeout:10000,maximumAge:300000}
      );
    });
    document.body.append(box);
  }
  const start=()=>{
    if(document.visibilityState==="hidden"){
      document.addEventListener("visibilitychange",()=>{
        if(document.visibilityState==="visible")buildPrompt();
      },{once:true});
    }else buildPrompt();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(start,1600),{once:true});
  else setTimeout(start,1600);
})();
