/* Cross-platform doctor and hospital profile links.
 * Never pass off a hospital page or a generic search URL as a doctor's personal profile.
 * Directory-backed and shared on static and dynamically refreshed cards.
 */
(() => {
  "use strict";
  const normalizePath = pathname => pathname.replace(/\/+/g,"/").replace(/\/?$/,"/");
  const docPath = normalizePath(location.pathname);
  if(!document.querySelector('link[href="/assets/cross-profile-links.css"]')){
    const stylesheet=document.createElement("link");
    stylesheet.rel="stylesheet";
    stylesheet.href="/assets/cross-profile-links.css";
    document.head.append(stylesheet);
  }
  const safeProfile = raw => {
    if(!raw) return null;
    try {
      const url = new URL(raw);
      if(url.protocol!=="https:" || !/^(?:www\.)?slashcure\.com$/i.test(url.hostname))return null;
      const path=normalizePath(url.pathname);
      if(path==="/" || path==="/doctors/" || path==="/hospitals/" || path==="/live-updates/")return null;
      return {url:url.href,category:path.startsWith("/hospitals/")?"hospital":"doctor"};
    } catch {return null;}
  };
  const el = (tag,cls,text) => {
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text)n.textContent=text;
    return n;
  };
  const action = (url,cls,label) => {
    const a=el("a",cls,label);
    a.href=url;
    if(url.startsWith("https://")) {
      a.target="_blank";
      a.rel="noopener noreferrer";
    }
    return a;
  };
  const extraAction = (record,kind) => {
    const profile=safeProfile(record.externalProfile);
    if(profile && profile.category===kind)
      return action(profile.url,"sp-cross-link sp-cross-link-external","View Slashcure Profile ↗");
    if(kind==="doctor" && profile && profile.category==="hospital")
      return action(profile.url,"sp-cross-link sp-cross-link-facility","View Hospital on Slashcure ↗");
    return el("span","sp-cross-link sp-cross-link-pending","Slashcure profile not linked yet");
  };
  const linked = (record,kind,hero) => {
    const container=el("div","sp-cross-profile-actions"+(hero?" sp-cross-profile-hero":""));
    container.setAttribute("aria-label","SlashPromo and Slashcure profile links");
    if(hero){
      const badge=el("span","sp-cross-link sp-cross-link-current","✓ Viewing SlashPromo Profile");
      badge.setAttribute("aria-current","page");
      container.append(badge);
    } else {
      container.append(action(record.url,"sp-cross-link sp-cross-link-local","View SlashPromo Profile ↗"));
    }
    container.append(extraAction(record,kind));
    return container;
  };
  fetch("/assets/directory.json",{cache:"no-store"}).then(response=>{
    if(!response.ok)throw new Error("Directory unavailable");
    return response.json();
  }).then(db=>{
    const doctorMap=new Map((db.doctors||[]).map(r=>[normalizePath(r.url),r]));
    const hospitalMap=new Map((db.hospitals||[]).map(r=>[normalizePath(r.url),r]));
    const patchCard=card=>{
      if(card.querySelector(".sp-cross-profile-actions"))return;
      const href=card.querySelector("h3 a[href]")?.getAttribute("href");
      if(!href||!href.startsWith("/"))return;
      const path=normalizePath(href.split(/[?#]/)[0]);
      const record=doctorMap.get(path)||hospitalMap.get(path);
      if(!record)return;
      const original=card.querySelector(".sp-card-link");
      if(original){
        const parent=original.parentNode;
        if(!parent)return;
        parent.replaceChild(linked(record,doctorMap.has(path)?"doctor":"hospital",false),original);
      }else{
        const body=card.querySelector(".sp-directory-body")||card;
        body.append(linked(record,doctorMap.has(path)?"doctor":"hospital",false));
      }
    };
    const patchCards=root=>(root||document).querySelectorAll(".sp-directory-card").forEach(patchCard);
    patchCards();
    document.querySelectorAll(".sp-directory-grid[data-native-results]").forEach(root=>{
      if(root.dataset.spCrossObserved==="true")return;
      root.dataset.spCrossObserved="true";
      const observer=new MutationObserver(()=>patchCards(root));
      observer.observe(root,{childList:true});
    });
    const record=doctorMap.get(docPath)||hospitalMap.get(docPath);
    if(!record)return;
    const hero=document.querySelector(".sp-profile-hero .wrap");
    if(hero&&!hero.querySelector(".sp-cross-profile-actions")){
      const target=hero.querySelector(".sp-profile-tags")||hero.querySelector("h1");
      if(target)target.insertAdjacentElement("afterend",linked(record,doctorMap.has(docPath)?"doctor":"hospital",true));
    }
    const details=document.querySelector(".sp-profile-links");
    const profile=safeProfile(record.externalProfile);
    if(details&&profile){
      const kind=doctorMap.has(docPath)?"doctor":"hospital";
      const existing=[...details.querySelectorAll('a[href]')].find(a=>a.href===profile.url);
      const text=kind==="doctor"&&profile.category==="hospital"?"View Associated Hospital on Slashcure ↗":"View Slashcure Profile ↗";
      if(existing)existing.textContent=text;
      else details.append(action(profile.url,"",text));
    }
  }).catch(()=>{/* Keep existing profile navigation intact when directory data is unavailable. */});
})();