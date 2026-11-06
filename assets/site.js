/* SlashPromo lightweight interactions — no cookies, trackers, or external dependencies. */
(function(){
  "use strict";
/* Show the city-first navigation on every public SlashPromo page. Home has crawlable markup. */
  const header=document.querySelector(".site-header");
  if(header&&!document.querySelector("[data-sp-city-nav]"))header.insertAdjacentHTML("afterend","<nav class=\"sp-city-nav\" aria-label=\"Explore doctors by city\" data-sp-city-nav><div class=\"wrap sp-city-nav-inner\"><div class=\"sp-city-nav-label\"><span class=\"sp-city-nav-pin\" aria-hidden=\"true\">⌖</span><span><strong>Explore Doctors by City</strong><small>Find healthcare near you</small></span></div><div class=\"sp-city-nav-scroll\" tabindex=\"0\" aria-label=\"City shortcuts — scroll horizontally for more cities\"><a class=\"sp-city-link sp-city-link-karachi\" href=\"/karachi/\" data-city-shortcut=\"karachi\" aria-label=\"Explore doctors and healthcare in Karachi\"><span class=\"sp-city-thumb\"><svg class=\"sp-city-artwork\" viewBox=\"0 0 98 72\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M9 57H88M19 57V40L28 32H69L79 40V57M30 33V24H67V33M49 7C37 16 35 19 35 24H63C63 19 61 16 49 7ZM39 57V40H59V57M22 45H30M68 45H76\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M26 34H73\" stroke=\"currentColor\" stroke-width=\"2\"/><path d=\"M49 7V3\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"/></svg></span><span class=\"sp-city-name\">Karachi</span><span class=\"sp-city-chevron\" aria-hidden=\"true\">›</span></a><a class=\"sp-city-link sp-city-link-sukkur\" href=\"/sukkur/\" data-city-shortcut=\"sukkur\" aria-label=\"Explore doctors and healthcare in Sukkur\"><span class=\"sp-city-thumb\"><svg class=\"sp-city-artwork\" viewBox=\"0 0 98 72\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 59H91M13 59V42M85 59V42M13 44C31 13 67 13 85 44M13 44H85M24 42V55M36 31V55M49 27V55M61 31V55M74 42V55\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M0 65Q12 62 24 65T48 65T72 65T96 65\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg></span><span class=\"sp-city-name\">Sukkur</span><span class=\"sp-city-chevron\" aria-hidden=\"true\">›</span></a><a class=\"sp-city-link sp-city-link-shikarpur\" href=\"/shikarpur/\" data-city-shortcut=\"shikarpur\" aria-label=\"Explore doctors and healthcare in Shikarpur\"><span class=\"sp-city-thumb\"><svg class=\"sp-city-artwork\" viewBox=\"0 0 98 72\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M23 62H78M29 62V22H72V62M26 22H75M35 22V12H67V22M33 12H69M42 12V6H60V12M39 34H64V57H39V34ZM44 38H59V52H44V38Z\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"51\" cy=\"27\" r=\"5.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"/><path d=\"M51 27L51 23M51 27L55 29\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg></span><span class=\"sp-city-name\">Shikarpur</span><span class=\"sp-city-chevron\" aria-hidden=\"true\">›</span></a><a class=\"sp-city-link sp-city-link-hyderabad\" href=\"/hyderabad/\" data-city-shortcut=\"hyderabad\" aria-label=\"Explore doctors and healthcare in Hyderabad\"><span class=\"sp-city-thumb\"><svg class=\"sp-city-artwork\" viewBox=\"0 0 98 72\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M9 62H91M18 62V26L28 18H70L80 26V62M28 18V11H70V18M38 62V43C38 29 62 29 62 43V62M21 33H35M64 33H77M24 47H34M66 47H76M44 11V6H54V11\" stroke=\"currentColor\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M18 26H80\" stroke=\"currentColor\" stroke-width=\"2.2\"/></svg></span><span class=\"sp-city-name\">Hyderabad</span><span class=\"sp-city-chevron\" aria-hidden=\"true\">›</span></a></div></div></nav>");
  const currentCity=location.pathname.match(/^\/(?:doctors\/|hospitals\/)?(karachi|sukkur|shikarpur|hyderabad)(?:\/|$)/i)?.[1]?.toLowerCase();
  if(currentCity){const activeCity=document.querySelector('[data-city-shortcut="'+currentCity+'"]');if(activeCity){activeCity.setAttribute("aria-current","page");activeCity.classList.add("is-active");}}

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

/* Show the approved contextual Slashcure strip on suitable public pages. */
import("/assets/slashcure-strip.js").catch(()=>{});

/* Present verified SlashPromo and Slashcure profile destinations together. */
import("/assets/cross-profile-links.js").catch(()=>{});
