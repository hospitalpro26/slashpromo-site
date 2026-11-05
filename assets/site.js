/* SlashPromo lightweight interactions — no cookies, trackers, or external dependencies. */
(function(){
  "use strict";
  const navButton=document.querySelector("[data-menu-toggle]");
  const nav=document.querySelector("[data-nav]");
  if(navButton&&nav){
    const close=()=>{nav.classList.remove("open");navButton.setAttribute("aria-expanded","false");document.body.classList.remove("menu-open");};
    navButton.addEventListener("click",()=>{const open=nav.classList.toggle("open");navButton.setAttribute("aria-expanded",String(open));document.body.classList.toggle("menu-open",open);});
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  }
  document.querySelectorAll("[data-year]").forEach(el=>el.textContent=String(new Date().getFullYear()));
  const search=document.querySelector("[data-spot-search]");
  const cards=[...document.querySelectorAll("[data-spot-card]")];
  const filters=[...document.querySelectorAll("[data-spot-filter]")];
  const empty=document.querySelector("[data-spot-empty]");
  let current="all";
  const refresh=()=>{const q=(search?.value||"").trim().toLocaleLowerCase(),visible=cards.reduce((count,card)=>{
    const cat=card.dataset.category||"";
    const matchCat=current==="all"||cat===current;
    const matchText=!q||(card.dataset.keywords||card.textContent||"").toLocaleLowerCase().includes(q);
    card.hidden=!(matchCat&&matchText);return count+(matchCat&&matchText?1:0);
  },0);if(empty)empty.hidden=visible!==0;};
  if(cards.length){search?.addEventListener("input",refresh);filters.forEach(btn=>btn.addEventListener("click",()=>{
    current=btn.dataset.spotFilter||"all";filters.forEach(x=>x.setAttribute("aria-pressed",String(x===btn)));refresh();
  }));refresh();}
  document.querySelectorAll("[data-copy-email]").forEach(btn=>btn.addEventListener("click",async()=>{
    const email=btn.dataset.copyEmail;
    if(!email)return;
    try{await navigator.clipboard.writeText(email);btn.textContent="Copied ✓";setTimeout(()=>btn.textContent="Copy email",1800);}
    catch(_){window.location.href="mailto:"+email;}
  }));
})();
/* Activate live sponsored placements without changing existing site routes. */
import("/assets/sponsored.js").catch(()=>{});
