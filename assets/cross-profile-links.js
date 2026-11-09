/* Paired SlashPromo and Slashcure links for doctors and hospitals.
 * Individual Slashcure links are used only when the directory includes a matching profile URL.
 * Generic directories and hospital URLs are never described as personal doctor profiles.
 */
(() => {
  "use strict";
  const pathOf = path => String(path || "/").replace(/\/+/g, "/").replace(/\/?$/, "/");
  const currentPath = pathOf(location.pathname);
  const css = "/assets/cross-profile-links.css?v=20261109-patient3";
  if(!document.querySelector('link[href="'+css+'"]')){
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet"; stylesheet.href = css;
    document.head.append(stylesheet);
  }
  const parse = raw => {
    if(!raw) return null;
    try {
      const u = new URL(raw);
      if(u.protocol !== "https:" || !/^(?:www\.)?slashcure\.com$/i.test(u.hostname)) return null;
      const pathname = pathOf(u.pathname);
      if(u.search || u.hash) return null;
      if(/^\/hospitals\/[^/]+\/[^/]+\/$/.test(pathname)) return {url:u.href,kind:"hospital"};
      if(/^\/dr-[a-z0-9-]+\/$/i.test(pathname) || /^\/[a-z0-9-]+\/[a-z0-9-]+\/dr-[a-z0-9-]+\/$/i.test(pathname))
        return {url:u.href,kind:"doctor"};
    }catch(_){}
    return null;
  };
  const fallback = (record,kind) => {
    if(kind === "hospital") return {url:"https://slashcure.com/hospitals",label:"Find hospital and clinic details on Slashcure ↗",direct:false};
    const query = new URL("https://slashcure.com/doctors");
    query.searchParams.set("type","all");
    if(record.city) query.searchParams.set("loc",record.city);
    if(record.name) query.searchParams.set("q",record.name);
    return {url:query.href,label:"Search doctor and OPD details on Slashcure ↗",direct:false};
  };
  const destination = (record,kind) => {
    const profile=parse(record.externalProfile);
    if(profile && profile.kind===kind)
      return {url:profile.url,label:kind==="hospital"?"View hospital and doctors on Slashcure ↗":"Check doctor profile and published OPD details ↗",direct:true};
    return fallback(record,kind);
  };
  const el = (tag,className,text) => {
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text)node.textContent=text;
    return node;
  };
  const link = (url,className,label) => {
    const a=el("a",className,label);
    a.href=url;
    if(/^https:\/\//.test(url)){a.target="_blank";a.rel="noopener noreferrer";}
    return a;
  };
  const phoneHref=value=>{
    const raw=String(value||"").trim();
    return /^[+0-9\s().-]{7,25}$/.test(raw) ? "tel:"+raw.replace(/[^+\d]/g,"") : "";
  };
  const mapUrl=address=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address);
  /* Display only published directory details. Do not invent OPD timings,
     guarantee appointments or expose personal patient information. */
  const profileGuide=(record,kind)=>{
    const hero=document.querySelector("main .sp-profile-hero,main .zia-page-hero");
    if(!hero||document.getElementById("sp-patient-profile-guide"))return;
    const section=el("section","sp-patient-guide sp-patient-profile");
    section.id="sp-patient-profile-guide";
    section.setAttribute("aria-label","Patient information and next steps");
    const wrap=el("div","sp-patient-guide-wrap");
    wrap.append(el("h2","","Planning a visit?"));
    const intro=el("p","sp-patient-guide-intro","Check the latest published OPD details and confirm with the healthcare provider before travelling.");
    wrap.append(intro);
    const facts=el("div","sp-patient-facts");
    const addFact=(label,value)=>{
      if(typeof value!=="string"||!value.trim())return;
      const row=el("p","sp-patient-fact");
      row.append(el("strong","",label+" "),document.createTextNode(value.trim()));
      facts.append(row);
    };
    if(kind==="doctor"){
      addFact("Clinic / hospital:",record.hospital);
      addFact("Listed area:",record.area);
      addFact("City:",record.city);
    }else{
      addFact("Facility:",record.name);
      addFact("Address:",record.address);
      addFact("City:",record.city);
    }
    if(facts.children.length)wrap.append(facts);
    const actions=el("div","sp-patient-guide-actions");
    const target=destination(record,kind);
    const primary=link(target.url,"sp-patient-guide-link sp-patient-primary",
      target.direct?"Check published OPD and contact details on Slashcure ↗":"Search Slashcure for published contact and OPD information ↗");
    actions.append(primary);
    if(kind==="hospital"){
      const phone=phoneHref(record.phone);
      if(phone)actions.append(link(phone,"sp-patient-guide-link sp-patient-secondary","Call published hospital number"));
      if(typeof record.address==="string"&&record.address.trim().length>8){
        actions.append(link(mapUrl(record.address.trim()),"sp-patient-guide-link sp-patient-secondary","Search address on Google Maps ↗"));
      }
    }
    wrap.append(actions);
    wrap.append(el("p","sp-patient-guide-note","Clinic schedules, contact information and facility associations can change. SlashPromo does not confirm live opening hours or guarantee an appointment."));
    section.append(wrap);
    hero.insertAdjacentElement("afterend",section);
  };
  const cityGuide=()=>{
    const links={
      "/sukkur/":["Sukkur","#listed-doctors","#listed-hospitals"],
      "/karachi/":["Karachi","#listed-doctors","#karachi-healthcare"],
      "/khairpur/":["Khairpur","#khairpur-doctors","#khairpur-facilities"],
      "/shikarpur/":["Shikarpur","#shikarpur-doctors","#shikarpur-hospitals"]
    };
    const config=links[currentPath];
    if(!config||document.getElementById("sp-patient-city-guide"))return;
    const hero=document.querySelector("main .page-hero");
    if(!hero)return;
    const section=el("section","sp-patient-guide sp-patient-city");
    section.id="sp-patient-city-guide";section.setAttribute("aria-label","Find healthcare in "+config[0]);
    const wrap=el("div","sp-patient-guide-wrap");
    wrap.append(el("h2","","Find care in "+config[0]));
    wrap.append(el("p","sp-patient-guide-intro","Browse local doctors and healthcare facilities, then use their linked profiles to check published OPD hours and contact options."));
    const actions=el("div","sp-patient-guide-actions");
    if(document.getElementById(config[1].slice(1)))actions.append(link(config[1],"sp-patient-guide-link sp-patient-primary","Find local doctors ↓"));
    if(document.getElementById(config[2].slice(1)))actions.append(link(config[2],"sp-patient-guide-link sp-patient-secondary","Explore hospitals & clinics ↓"));
    wrap.append(actions);
    wrap.append(el("p","sp-patient-guide-note","Published schedules may change. Always confirm clinic hours and appointments directly with the provider."));
    section.append(wrap);hero.insertAdjacentElement("afterend",section);
  };
  const pair = (record,kind,isProfile) => {
    const container=el("div","sp-cross-profile-actions"+(isProfile?" sp-cross-profile-hero":""));
    container.setAttribute("aria-label","SlashPromo and Slashcure navigation");
    if(isProfile){
      const now=el("span","sp-cross-link sp-cross-link-current","✓ Viewing SlashPromo Profile");
      now.setAttribute("aria-current","page");
      container.append(now);
    }else{
      container.append(link(record.url,"sp-cross-link sp-cross-link-local","View SlashPromo Profile ↗"));
    }
    const target=destination(record,kind);
    container.append(link(target.url,"sp-cross-link "+(target.direct?"sp-cross-link-external":"sp-cross-link-fallback"),target.label));
    // Some doctor records currently link to a clinic or hospital rather than to
    // the doctor's personal Slashcure page. Preserve that useful destination,
    // but clearly identify it as a facility rather than a verified doctor link.
    const facility=kind==="doctor"?parse(record.externalProfile):null;
    if(facility?.kind==="hospital"){
      container.append(link(facility.url,"sp-cross-link sp-cross-link-facility","View associated facility on Slashcure ↗"));
    }
    const city=currentPath.split("/").filter(Boolean)[1];
    if(isProfile&&["sukkur","karachi","khairpur","shikarpur","ghotki","hyderabad"].includes(city)){
      container.append(link("#community-questions","sp-cross-link sp-cross-link-question","Ask about OPD timings or clinic details ↓"));
    }
    return container;
  };
  fetch("/assets/directory.json",{cache:"no-store"}).then(res=>{
    if(!res.ok)throw new Error("SlashPromo directory unavailable");
    return res.json();
  }).then(db=>{
    const doctorMap=new Map((db.doctors||[]).map(record=>[pathOf(record.url),record]));
    const hospitalMap=new Map((db.hospitals||[]).map(record=>[pathOf(record.url),record]));
    const patchCard = card => {
      if(card.querySelector(".sp-cross-profile-actions"))return;
      const local=card.querySelector('h3 a[href^="/"]');
      if(!local)return;
      const localPath=pathOf(local.getAttribute("href").split(/[?#]/)[0]);
      const record=doctorMap.get(localPath)||hospitalMap.get(localPath);
      if(!record)return;
      const existing=card.querySelector(".sp-card-link");
      const duo=pair(record,doctorMap.has(localPath)?"doctor":"hospital",false);
      if(existing)existing.replaceWith(duo);
      else (card.querySelector(".sp-directory-body")||card).append(duo);
    };
    const patchCards=root=>(root||document).querySelectorAll(".sp-directory-card").forEach(patchCard);
    patchCards();
    cityGuide();
    document.querySelectorAll(".sp-directory-grid[data-native-results]").forEach(root=>{
      if(root.dataset.spCrossObserved)return;
      root.dataset.spCrossObserved="true";
      new MutationObserver(()=>patchCards(root)).observe(root,{childList:true});
    });
    const record=doctorMap.get(currentPath)||hospitalMap.get(currentPath);
    if(!record)return;
    const kind=doctorMap.has(currentPath)?"doctor":"hospital";
    profileGuide(record,kind);
    const hero=document.querySelector(".sp-profile-hero .wrap, .zia-page-hero .wrap");
    if(hero&&!hero.querySelector(".sp-cross-profile-actions")){
      const anchor=hero.querySelector(".sp-profile-tags, .zia-hero-badges, h1");
      if(anchor)anchor.insertAdjacentElement("afterend",pair(record,kind,true));
    }
    const sidebar=document.querySelector(".sp-profile-links");
    if(sidebar){
      const direct=parse(record.externalProfile);
      const target=destination(record,kind);
      let matching=[...sidebar.querySelectorAll('a[href]')].find(a=>a.href===target.url);
      if(matching)matching.textContent=target.label;
      else sidebar.append(link(target.url,"",target.label));
      if(kind==="doctor" && direct && direct.kind==="hospital"){
        const facility=[...sidebar.querySelectorAll('a[href]')].find(a=>a.href===direct.url);
        if(facility)facility.textContent="View associated facility on Slashcure ↗";
        else sidebar.append(link(direct.url,"","View associated facility on Slashcure ↗"));
      }
    }
  }).catch(()=>{/* Keep native SlashPromo navigation intact if the directory cannot load. */});
})();
