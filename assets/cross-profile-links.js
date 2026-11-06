/* Paired SlashPromo and Slashcure links for doctors and hospitals.
 * Individual Slashcure links are used only when the directory includes a matching profile URL.
 * Generic directories and hospital URLs are never described as personal doctor profiles.
 */
(() => {
  "use strict";
  const pathOf = path => String(path || "/").replace(/\/+/g, "/").replace(/\/?$/, "/");
  const currentPath = pathOf(location.pathname);
  const css = "/assets/cross-profile-links.css";
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
    if(kind === "hospital") return {url:"https://slashcure.com/hospitals",label:"Browse hospitals on Slashcure ↗",direct:false};
    const query = new URL("https://slashcure.com/doctors");
    query.searchParams.set("type","all");
    if(record.city) query.searchParams.set("loc",record.city);
    if(record.name) query.searchParams.set("q",record.name);
    return {url:query.href,label:"Find doctor on Slashcure ↗",direct:false};
  };
  const destination = (record,kind) => {
    const profile=parse(record.externalProfile);
    if(profile && profile.kind===kind)
      return {url:profile.url,label:kind==="hospital"?"View hospital on Slashcure ↗":"View doctor on Slashcure ↗",direct:true};
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
    document.querySelectorAll(".sp-directory-grid[data-native-results]").forEach(root=>{
      if(root.dataset.spCrossObserved)return;
      root.dataset.spCrossObserved="true";
      new MutationObserver(()=>patchCards(root)).observe(root,{childList:true});
    });
    const record=doctorMap.get(currentPath)||hospitalMap.get(currentPath);
    if(!record)return;
    const kind=doctorMap.has(currentPath)?"doctor":"hospital";
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
        if(facility)facility.textContent="View associated hospital on Slashcure ↗";
      }
    }
  }).catch(()=>{/* Keep native SlashPromo navigation intact if the directory cannot load. */});
})();
