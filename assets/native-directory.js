/* SlashPromo native directory. Search is performed entirely on SlashPromo, using its own JSON index. */
(() => {
  "use strict";
  const roots = Array.from(document.querySelectorAll("[data-native-directory]"));
  if (!roots.length) return;
  const normal = input => String(input || "").normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "").replace(/paediatric/g,"pediatric")
    .replace(/gynaecolog/g,"gynecolog").replace(/orthopaed/g,"orthoped")
    .replace(/physiotherap/g,"physiotherap").replace(/[^a-z0-9]+/g," ").trim();
  const esc = input => String(input || "").replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[s]);
  const title = record => record.specialty || record.category || "Healthcare professional";
  const searchable = record => normal([record.name,record.city,...(record.cities||[]),title(record),record.hospital,record.area,record.qualifications].join(" "));
  const symbol = record => {
    const s=normal(title(record));
    if(record.kind === "hospital")return "✚";
    if(s.includes("cardio"))return "♡";
    if(s.includes("dent")||s.includes("prosthodont"))return "✦";
    if(s.includes("pediatric")||s.includes("child"))return "☼";
    if(s.includes("orthoped"))return "✧";
    if(s.includes("physio"))return "↗";
    if(s.includes("gastro")||s.includes("hepat"))return "◌";
    return "✳";
  };
  /* Anatomy-inspired line icons are intentionally local to Sukkur doctor cards. */
  const specialtyIconType = record => {
    const s=normal(title(record));
    if(/psychiatr|neurolog|neurosurg|brain/.test(s))return "brain";
    if(/cardiol|cardiac|heart/.test(s))return "heart";
    if(/gastro|stomach|digestive/.test(s))return "stomach";
    if(/hepat|liver/.test(s))return "liver";
    if(/orthoped|orthop|spine|trauma/.test(s))return "bone";
    if(/urolog|kidney|nephrol|renal/.test(s))return "kidney";
    if(/gynecol|obstetric|maternity/.test(s))return "uterus";
    if(/dent|prosthodont/.test(s))return "tooth";
    if(/physio|rehabilitation|movement/.test(s))return "movement";
    if(/pediatric|child|neonatal|paeds/.test(s))return "baby";
    if(/pulmon|chest|respiratory|lung/.test(s))return "lungs";
    if(/hematol|haematol|blood/.test(s))return "blood";
    if(/surg|laparoscop|scalpel/.test(s))return "scalpel";
    if(/diabet|endocrin/.test(s))return "glucose";
    return "medicine";
  };
  const specialtyPaths = Object.freeze({
    brain:'<path d="M12 5.4a3.3 3.3 0 0 0-6.25-1.4A4.4 4.4 0 0 0 3 10v2.1a4.1 4.1 0 0 0 1.8 7.7A3.5 3.5 0 0 0 12 18V5.4Z"/><path d="M12 5.4a3.3 3.3 0 0 1 6.25-1.4A4.4 4.4 0 0 1 21 10v2.1a4.1 4.1 0 0 1-1.8 7.7A3.5 3.5 0 0 1 12 18V5.4Z"/><path d="M8 8c-2 .2-2.8 1.6-2.7 3.2M7 15c1.6-.7 2.5-.2 3 1M16 8c2 .2 2.8 1.6 2.7 3.2M17 15c-1.6-.7-2.5-.2-3 1"/>',
    heart:'<path d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.8l-1.3-1.2a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-7.9a5.3 5.3 0 0 0 0-7.5Z"/><path d="M3.5 12h4l1.4-2.6 2.2 5 1.9-3.1 1.2.7H20"/>',
    stomach:'<path d="M11 2.5v5.4c0 2 1 3.1 3 3.1h1.9c2.5 0 4.4 2 4.4 4.7 0 3.5-2.7 6.1-6.4 6.1-4 0-7.7-3.1-7.7-6.8 0-2.2 1.1-4.1 2.8-5.5 1.3-1 2-1.8 2-3V2.5"/><path d="M11.1 15.7c.6 1.5 1.9 2.3 3.5 2.4"/>',
    liver:'<path d="M3 11c2.1-5.2 7.2-7.5 12.4-6.7 2.9.4 4.9 1.7 5.6 4.1v5.2c-2.6-.3-4.2.3-6.5 1.5-2.5 1.4-4.7 2.4-7.6 1.7L3 15.4V11Z"/><path d="M3 12.4c4.2-.3 9.2.2 12.4 2.7M15 8c.4 2.4 1.9 4.1 6 5.6"/>',
    bone:'<path d="m9 15 6-6"/><path d="M6.2 13.7a2.8 2.8 0 1 0-3.4 4.4 2.8 2.8 0 1 0 4.4 3.4 2.9 2.9 0 0 0 2.3-2.1l5.9-5.9A2.9 2.9 0 0 0 17.5 7a2.8 2.8 0 1 0 3.4-4.4 2.8 2.8 0 1 0-4.4-3.4A2.9 2.9 0 0 0 14.4 5L8.5 10.9a2.9 2.9 0 0 0-2.3 2.8Z" transform="translate(0 2) scale(.94)"/>',
    kidney:'<path d="M8.8 3C5.1 3 3 6.2 3 10.8c0 5.2 2 9.6 5.6 9.6 2.4 0 3.7-2 3.7-4.5 0-2.1-1.2-3.8-3.2-4.3C6.9 11 6.8 9 7.5 7.3"/><path d="M15.2 3C18.9 3 21 6.2 21 10.8c0 5.2-2 9.6-5.6 9.6-2.4 0-3.7-2-3.7-4.5 0-2.1 1.2-3.8 3.2-4.3 2.2-.6 2.3-2.6 1.6-4.3"/><path d="M9.2 15.8c.5 2.1 1.5 3 2.8 3.4M14.8 15.8c-.5 2.1-1.5 3-2.8 3.4"/>',
    uterus:'<path d="M8.5 7c1.5-1.2 5.5-1.2 7 0v5.5a3.5 3.5 0 0 1-7 0V7Z"/><path d="M8.5 8.8C6.4 5 4.2 4.2 2.5 5.5M15.5 8.8c2.1-3.8 4.3-4.6 6-3.3M2.5 5.5 3 8l2 1M21.5 5.5 21 8l-2 1M12 16v5m-2.5-1.5h5"/>',
    tooth:'<path d="M8.1 3.3C5 2.3 3 4.4 3 7.8c0 4.3 2.4 6.4 3.4 10.7.4 1.6 1 2.5 2.1 2.5 1.4 0 1.8-5.5 3.5-5.5s2.1 5.5 3.5 5.5c1.1 0 1.7-.9 2.1-2.5 1-4.3 3.4-6.4 3.4-10.7 0-3.4-2-5.5-5.1-4.5-1.3.4-2.9 1.1-3.9 1.1s-2.6-.7-3.9-1.1Z"/>',
    movement:'<circle cx="14.7" cy="4.4" r="2"/><path d="m7 21 3.1-5.2 1.6-4.1 4.4 3.3 3.3 1.2"/><path d="m4 13.5 6-2.4 3.4-3.1 3.8 2.2"/><path d="m11.7 11.7-3.1 4.8 3.3 4.5"/>',
    baby:'<circle cx="12" cy="13" r="8.1"/><path d="M10 5.4c-1.1-2.3.2-4.1 2-4 1.5.1 2.1 1.6 1.4 2.8"/><path d="M8.5 12.3h.1M15.4 12.3h.1"/><path d="M9.2 16c1.5 1.5 4.1 1.5 5.6 0"/>',
    lungs:'<path d="M10 3v7.5C8.3 9.9 6.5 7 5.5 7 3.7 7 2.8 12 2.8 16.8c0 3.3 2.5 4 4.6 2.1 2-1.8 2.6-3.7 2.6-6"/><path d="M14 3v7.5c1.7-.6 3.5-3.5 4.5-3.5 1.8 0 2.7 5 2.7 9.8 0 3.3-2.5 4-4.6 2.1-2-1.8-2.6-3.7-2.6-6"/><path d="M12 3v7m-2 1 2-1 2 1"/>',
    blood:'<path d="M12 2.3c-2.8 4.7-7.3 9.4-7.3 13.3a7.3 7.3 0 0 0 14.6 0C19.3 11.7 14.8 7 12 2.3Z"/><path d="M9 16.2c.2 1.2 1.2 2.3 2.5 2.6"/>',
    scalpel:'<path d="m3 21 7.2-7.2m0 0 2.7 2.7M10.2 13.8l5.7-5.7m0 0L21 3c1.5 4.2-1.1 8-5.1 10l-2.3-2.3M4.8 18.8l2.5 2.5"/>',
    glucose:'<path d="M12 2.5c-3.2 5.1-6.6 9-6.6 12.2a6.6 6.6 0 0 0 13.2 0C18.6 11.5 15.2 7.6 12 2.5Z"/><path d="M9.7 14.6h4.6M12 12.3v4.6"/>',
    medicine:'<path d="M7 3v7a5 5 0 0 0 10 0V3M5 4h4M15 4h4M12 15v2.3a3.7 3.7 0 1 0 3.7-3.7"/><circle cx="18.5" cy="13.8" r="2.2"/>'
  });
  const specialtyIcon = type => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+(specialtyPaths[type]||specialtyPaths.medicine)+'</svg>';
  const slashcureLink = r => {
    let external = null;
    try{
      const parsed = new URL(r.externalProfile || "");
      const path = parsed.pathname.replace(/\/?$/, "/");
      if(parsed.protocol==="https:" && /^(?:www\.)?slashcure\.com$/i.test(parsed.hostname)
         && !parsed.search && !parsed.hash){
        if(r.kind==="hospital" && /^\/hospitals\/[^/]+\/[^/]+\/$/.test(path)) external=parsed.href;
        if(r.kind!=="hospital" && (/^\/dr-[a-z0-9-]+\/$/i.test(path) || /^\/[a-z0-9-]+\/[a-z0-9-]+\/dr-[a-z0-9-]+\/$/i.test(path))) external=parsed.href;
      }
    }catch(_){}
    if(external)return {url:external,label:r.kind==="hospital"?"Hospital OPD & contact on Slashcure ↗":"Check OPD & contact on Slashcure ↗",direct:true};
    if(r.kind==="hospital")return {url:"https://slashcure.com/hospitals",label:"Browse hospitals on Slashcure ↗",direct:false};
    const search = new URL("https://slashcure.com/doctors");
    search.searchParams.set("type","all");
    if(r.city)search.searchParams.set("loc",r.city);
    if(r.name)search.searchParams.set("q",r.name);
    return {url:search.href,label:"Search doctor & OPD on Slashcure ↗",direct:false};
  };
  const card = (r, sukDoctorIcons=false) => {
    const type=sukDoctorIcons ? specialtyIconType(r) : "";
    const icon=sukDoctorIcons ? '<div class="sp-directory-icon sp-specialty-icon sp-specialty-'+type+'" aria-hidden="true">'+specialtyIcon(type)+'</div>'
      : '<div class="sp-directory-icon" aria-hidden="true">'+esc(symbol(r))+'</div>';
    const external=slashcureLink(r);
    return '<article class="sp-directory-card'+(sukDoctorIcons ? " sp-specialty-card" : "")+'">'+
      icon+
      '<div class="sp-directory-body">'+
        '<span class="sp-card-type">'+(r.kind==="hospital"?"HEALTHCARE FACILITY":"DOCTOR PROFILE")+' · '+esc(r.city)+'</span>'+
        '<h3><a href="'+esc(r.url)+'">'+esc(r.name)+'</a></h3>'+
        '<p class="sp-card-specialty">'+esc(title(r))+'</p>'+
        (r.hospital?'<p class="sp-card-clinic">⌖ '+esc(r.hospital)+'</p>':"")+
        (r.area?'<p class="sp-card-patient-detail"><strong>Listed area:</strong> '+esc(r.area)+'</p>':"")+
        (r.kind==="hospital"&&r.address?'<p class="sp-card-patient-detail"><strong>Address:</strong> '+esc(r.address)+'</p>':"")+
        '<div class="sp-cross-profile-actions" aria-label="SlashPromo and Slashcure navigation">'+
          '<a class="sp-cross-link sp-cross-link-local" href="'+esc(r.url)+'">View SlashPromo Profile ↗</a>'+
          '<a class="sp-cross-link '+(external.direct?'sp-cross-link-external':'sp-cross-link-fallback')+'" href="'+esc(external.url)+'" target="_blank" rel="noopener noreferrer">'+esc(external.label)+'</a>'+
          (r.kind==="hospital"&&typeof r.phone==="string"&&/^[+0-9\\s().-]{7,25}$/.test(r.phone.trim())?
            '<a class="sp-cross-link sp-patient-card-action" href="tel:'+esc(r.phone.replace(/[^+\\d]/g,""))+'">Call published number</a>':"")+
          (r.kind==="hospital"&&typeof r.address==="string"&&r.address.trim().length>8?
            '<a class="sp-cross-link sp-patient-card-action" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(r.address.trim())+'" target="_blank" rel="noopener noreferrer">Search address on map ↗</a>':"")+
        '</div>'+
      '</div></article>';
  };
  const preferredKey="slashpromo_preferred_city_v1";
  function readPreferred(){
    try{
      const saved=JSON.parse(localStorage.getItem(preferredKey)||"null");
      return saved && typeof saved.city==="string" && saved.expires>Date.now()
        && saved.city.length<=80 ? saved.city : "";
    }catch{return ""}
  }
  const setup = (root,db) => {
    const type = root.dataset.kind || "doctor";
    const scope = root.dataset.scope || "all";
    const initialCity = root.dataset.city || "";
    const linkedDoctors = new Set((db.doctors||[]).map(d=>d.id));
    const items = (type === "hospital" ? db.hospitals : db.doctors).filter(r =>
      (type !== "hospital" || (Array.isArray(r.linkedDoctorIds) && r.linkedDoctorIds.some(id=>linkedDoctors.has(id))) || /^https:\/\/(?:www\.)?slashcure\.com\/hospitals\/[^/]+\/[^/]+\/?$/i.test(r.externalProfile||"")) &&
      (!initialCity || (r.cities||[r.city]).some(c=>normal(c) === normal(initialCity))) &&
      (!root.dataset.specialtyMatch || normal(title(r)).includes(normal(root.dataset.specialtyMatch))));
    const form = root.querySelector("[data-native-search]");
    const query = root.querySelector("[data-native-query]");
    const city = root.querySelector("[data-native-city]");
    const specialties = root.querySelector("[data-native-specialty]");
    const area = root.querySelector("[data-native-area]");
    const hospital = root.querySelector("[data-native-hospital]");
    const datalist = root.querySelector("[data-native-city-list]");
    const output = root.querySelector("[data-native-results]");
    const label = root.querySelector("[data-native-count]");
    const load = root.querySelector("[data-native-more]");
    const reset = root.querySelector("[data-native-reset]");
    if(!output)return;
    let preferredCity=readPreferred();
    const preferenceNote=document.createElement("div");
    preferenceNote.className="sp-preferred-city-note";
    preferenceNote.hidden=true;
    const preferenceText=document.createElement("span");
    const clearPreference=document.createElement("button");
    clearPreference.type="button";
    clearPreference.textContent="Remove location preference";
    clearPreference.addEventListener("click",()=>{
      try{localStorage.removeItem(preferredKey)}catch{}
      window.dispatchEvent(new CustomEvent("slashpromo:city-preference",{detail:{city:""}}));
    });
    preferenceNote.append(preferenceText,clearPreference);
    output.before(preferenceNote);
    const cities = [...new Set(items.flatMap(r=>r.cities||[r.city]))].sort();
    const specs=[...new Set(items.map(r=>title(r)))].sort();
    if(datalist)datalist.innerHTML=cities.map(v=>`<option value="${esc(v)}"></option>`).join("");
    if(specialties)specialties.innerHTML='<option value="">All specialties</option>'+
      specs.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(area){const areas=[...new Set(items.map(r=>r.area||"").filter(Boolean))].sort();area.innerHTML='<option value="">All listed areas</option>'+areas.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");}
    const hospitalKey = value => normal(value).replace(/(?: sukku?r| airport road| teer chowk)+$/,"").trim();
    if(hospital){
      const names=new Map();
      items.filter(r=>r.hospital).forEach(r=>{const key=hospitalKey(r.hospital);if(key&&!names.has(key))names.set(key,r.hospital.replace(/,\s*Sukkur$/i,""));});
      hospital.innerHTML='<option value="">All listed hospitals</option>'+[...names].sort((a,b)=>a[1].localeCompare(b[1])).map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join("");
    }
    if(city&&initialCity)city.value=initialCity;
    let showing = scope === "home" ? 6 : scope === "all" ? 18 : 40;
    const render = () => {
      const q=normal(query?.value);
      const cv=normal(city?.value);
      const sv=normal(specialties?.value);
      const av=normal(area?.value);
      const hv=normal(hospital?.value);
      const matches=items.filter(r=>(!q||searchable(r).includes(q)) &&
        (!cv||(r.cities||[r.city]).some(c=>normal(c).includes(cv))) &&
        (!sv||normal(title(r)) === sv) && (!av||normal(r.area)===av) && (!hv||hospitalKey(r.hospital)===hv)).sort((a,b)=>{
        if(!cv&&!initialCity&&preferredCity){
          const local=normal(preferredCity);
          const aLocal=(a.cities||[a.city]).some(c=>normal(c)===local)?1:0;
          const bLocal=(b.cities||[b.city]).some(c=>normal(c)===local)?1:0;
          if(aLocal!==bLocal)return bLocal-aLocal;
        }
        return a.name.localeCompare(b.name);
      });
      const current=matches.slice(0,showing);
      const sukDoctorIcons=(scope === "sukkur" || scope === "karachi") && type === "doctor";
      output.innerHTML=current.map(r=>card(r,sukDoctorIcons)).join("");
      const state=matches.length===0?"No matching profiles yet. Try a different name, city or specialty.":`${matches.length} ${type === "hospital"?"healthcare facilities":"doctor profiles"} found`;
      if(label)label.textContent=state;
      const hasPreferred=!initialCity&&Boolean(preferredCity)&&items.some(r=>(r.cities||[r.city]).some(c=>normal(c)===normal(preferredCity)));
      preferenceNote.hidden=!hasPreferred;
      if(hasPreferred)preferenceText.textContent="Based on the city you chose to share: "+preferredCity+" listings appear first when no city filter is applied.";
      if(load){load.hidden=showing>=matches.length;load.textContent=`Show more (${matches.length-current.length} remaining)`;}
      const empty=root.querySelector("[data-native-empty]");
      if(empty)empty.hidden=matches.length!==0;
      root.setAttribute("data-ready","true");
    };
    form?.addEventListener("submit",e=>{e.preventDefault();showing=1000;render();root.querySelector("[data-native-results]")?.scrollIntoView({behavior:"smooth",block:"start"});});
    [query,city,specialties,area,hospital].forEach(el=>el?.addEventListener(el?.tagName==="SELECT"?"change":"input",()=>{showing=scope==="home"?6:1000;render();}));
    reset?.addEventListener("click",()=>{if(query)query.value="";if(city)city.value=initialCity;if(specialties)specialties.value="";if(area)area.value="";if(hospital)hospital.value="";showing=scope==="home"?6:scope==="all"?18:40;render();});
    load?.addEventListener("click",()=>{showing+=18;render();});
    window.addEventListener("slashpromo:city-preference",ev=>{
      preferredCity=typeof ev.detail?.city==="string"?ev.detail.city:"";
      render();
    });
    const params=new URLSearchParams(window.location.search);
    if(scope==="all" && !initialCity){
      if(query&&params.has("q"))query.value=params.get("q").slice(0,100);
      if(city&&params.has("city"))city.value=params.get("city").slice(0,100);
    }
    if(scope==="sukkur" && type==="doctor" && area && params.has("area")){const wanted=params.get("area").slice(0,100);if([...area.options].some(o=>o.value===wanted))area.value=wanted;}
    if(scope==="sukkur" && type==="doctor" && hospital && params.has("hospital")){const wanted=params.get("hospital").slice(0,100);if([...hospital.options].some(o=>o.value===wanted))hospital.value=wanted;}
    render();
  };
  fetch("/assets/directory.json",{cache:"no-store"}).then(r=>{
    if(!r.ok)throw new Error("Directory temporarily unavailable");
    return r.json();
  }).then(db=>roots.forEach(root=>setup(root,db))).catch(()=>{
    roots.forEach(root=>{
      const status=root.querySelector("[data-native-count]");
      if(status)status.textContent="Directory temporarily unavailable. Refresh this page to retry.";
    });
  });
})();
