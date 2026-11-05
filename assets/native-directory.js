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
  const searchable = record => normal([record.name,record.city,...(record.cities||[]),title(record),record.hospital,record.qualifications].join(" "));
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
  const card = r => `<article class="sp-directory-card">
    <div class="sp-directory-icon" aria-hidden="true">${esc(symbol(r))}</div>
    <div class="sp-directory-body">
      <span class="sp-card-type">${r.kind==="hospital"?"HEALTHCARE FACILITY":"DOCTOR PROFILE"} · ${esc(r.city)}</span>
      <h3><a href="${esc(r.url)}">${esc(r.name)}</a></h3>
      <p class="sp-card-specialty">${esc(title(r))}</p>
      ${r.hospital?`<p class="sp-card-clinic">⌖ ${esc(r.hospital)}</p>`:""}
      <a class="sp-card-link" href="${esc(r.url)}">Explore profile <span aria-hidden="true">↗</span></a>
    </div></article>`;
  const setup = (root,db) => {
    const type = root.dataset.kind || "doctor";
    const scope = root.dataset.scope || "all";
    const initialCity = root.dataset.city || "";
    const items = (type === "hospital" ? db.hospitals : db.doctors).filter(r =>
      !initialCity || (r.cities||[r.city]).some(c=>normal(c) === normal(initialCity)));
    const form = root.querySelector("[data-native-search]");
    const query = root.querySelector("[data-native-query]");
    const city = root.querySelector("[data-native-city]");
    const specialties = root.querySelector("[data-native-specialty]");
    const datalist = root.querySelector("[data-native-city-list]");
    const output = root.querySelector("[data-native-results]");
    const label = root.querySelector("[data-native-count]");
    const load = root.querySelector("[data-native-more]");
    const reset = root.querySelector("[data-native-reset]");
    if(!output)return;
    const cities = [...new Set(items.flatMap(r=>r.cities||[r.city]))].sort();
    const specs=[...new Set(items.map(r=>title(r)))].sort();
    if(datalist)datalist.innerHTML=cities.map(v=>`<option value="${esc(v)}"></option>`).join("");
    if(specialties)specialties.innerHTML='<option value="">All specialties</option>'+
      specs.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(city&&initialCity)city.value=initialCity;
    let showing = scope === "home" ? 6 : scope === "all" ? 18 : 40;
    const render = () => {
      const q=normal(query?.value);
      const cv=normal(city?.value);
      const sv=normal(specialties?.value);
      const matches=items.filter(r=>(!q||searchable(r).includes(q)) &&
        (!cv||(r.cities||[r.city]).some(c=>normal(c).includes(cv))) &&
        (!sv||normal(title(r)) === sv)).sort((a,b)=>a.name.localeCompare(b.name));
      const current=matches.slice(0,showing);
      output.innerHTML=current.map(card).join("");
      const state=matches.length===0?"No matching profiles yet. Try a different name, city or specialty.":`${matches.length} ${type === "hospital"?"healthcare facilities":"doctor profiles"} found`;
      if(label)label.textContent=state;
      if(load){load.hidden=showing>=matches.length;load.textContent=`Show more (${matches.length-current.length} remaining)`;}
      const empty=root.querySelector("[data-native-empty]");
      if(empty)empty.hidden=matches.length!==0;
      root.setAttribute("data-ready","true");
    };
    form?.addEventListener("submit",e=>{e.preventDefault();showing=1000;render();root.querySelector("[data-native-results]")?.scrollIntoView({behavior:"smooth",block:"start"});});
    [query,city,specialties].forEach(el=>el?.addEventListener(el?.tagName==="SELECT"?"change":"input",()=>{showing=scope==="home"?6:1000;render();}));
    reset?.addEventListener("click",()=>{if(query)query.value="";if(city)city.value=initialCity;if(specialties)specialties.value="";showing=scope==="home"?6:scope==="all"?18:40;render();});
    load?.addEventListener("click",()=>{showing+=18;render();});
    const params=new URLSearchParams(window.location.search);
    if(scope==="all" && !initialCity){
      if(query&&params.has("q"))query.value=params.get("q").slice(0,100);
      if(city&&params.has("city"))city.value=params.get("city").slice(0,100);
    }
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
