/* SlashPromo lightweight interactions, with anonymous aggregate analytics. */
(function(){
  "use strict";

/* A small, text-only city navigation row and GEO-specific search copy. */
  if(!document.getElementById("sp-city-nav-contrast-v3"))document.head.insertAdjacentHTML("beforeend","<style id=\"sp-city-nav-contrast-v3\">/* Always-visible high contrast city navigation — small text, spaced links. */\nnav.sp-quicknav[data-sp-city-nav]{background:#111a32!important;color:#eaf3ff!important;border-top:1px solid #263e63!important;border-bottom:1px solid #365075!important;box-shadow:inset 0 1px 0 #ffffff0c!important}\nnav.sp-quicknav[data-sp-city-nav]>.wrap{padding-top:10px!important;padding-bottom:11px!important}\nnav.sp-quicknav[data-sp-city-nav] .sp-quicknav-inner{display:flex!important;flex-direction:row!important;align-items:center!important;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:0 8px!important;white-space:nowrap!important;overflow-x:auto!important;overscroll-behavior-x:contain;scrollbar-width:none;min-height:0!important;padding:0 0 1px!important}\nnav.sp-quicknav[data-sp-city-nav] .sp-quicknav-inner::-webkit-scrollbar{display:none}\nnav.sp-quicknav[data-sp-city-nav] a{display:inline-block!important;flex:0 0 auto!important;color:#edf6ff!important;font-size:13px!important;line-height:1.55!important;font-weight:700!important;letter-spacing:0!important;text-decoration:none!important;white-space:nowrap!important}\nnav.sp-quicknav[data-sp-city-nav] a:hover,nav.sp-quicknav[data-sp-city-nav] a[aria-current=\"page\"]{color:#80ead8!important;text-decoration:underline!important;text-decoration-color:#80ead8!important;text-underline-offset:4px!important}\nnav.sp-quicknav[data-sp-city-nav] .sp-quicknav-sep{flex:0 0 auto!important;color:#8da4c9!important;font-size:12px!important;line-height:1!important;padding:0!important}\nnav.sp-quicknav[data-sp-city-nav] p.sp-quicknav-message{display:block!important;margin:7px 0 0!important;padding:8px 0 0!important;border-top:1px solid #ffffff27!important;background:transparent!important;color:#cad9ef!important;font-size:12px!important;font-weight:450!important;line-height:1.65!important;letter-spacing:0!important;max-width:100%!important}\nnav.sp-quicknav[data-sp-city-nav] a:focus-visible{outline:2px solid #80ead8!important;outline-offset:3px!important;border-radius:2px!important}\n@media(max-width:560px){nav.sp-quicknav[data-sp-city-nav]>.wrap{padding-top:9px!important;padding-bottom:11px!important}nav.sp-quicknav[data-sp-city-nav] .sp-quicknav-inner{gap:0 7px!important}nav.sp-quicknav[data-sp-city-nav] a{font-size:12px!important}nav.sp-quicknav[data-sp-city-nav] .sp-quicknav-sep{font-size:11px!important}nav.sp-quicknav[data-sp-city-nav] p.sp-quicknav-message{font-size:11.5px!important;line-height:1.55!important}}\n</style>");
  const header=document.querySelector(".site-header");
  if(header&&!document.querySelector("[data-sp-city-nav]"))header.insertAdjacentHTML("afterend","<nav class=\"sp-quicknav\" aria-label=\"Quick city links\" data-sp-city-nav><div class=\"wrap\"><div class=\"sp-quicknav-inner\"><a href=\"/\" data-city-shortcut=\"home\">Home</a><span class=\"sp-quicknav-sep\" aria-hidden=\"true\">/</span><a href=\"/sukkur/\" data-city-shortcut=\"sukkur\">Sukkur</a><span class=\"sp-quicknav-sep\" aria-hidden=\"true\">/</span><a href=\"/khairpur/\" data-city-shortcut=\"khairpur\">Khairpur</a><span class=\"sp-quicknav-sep\" aria-hidden=\"true\">/</span><a href=\"/karachi/\" data-city-shortcut=\"karachi\">Karachi</a><span class=\"sp-quicknav-sep\" aria-hidden=\"true\">/</span><a href=\"/hyderabad/\" data-city-shortcut=\"hyderabad\">Hyderabad</a><span class=\"sp-quicknav-sep\" aria-hidden=\"true\">/</span><a href=\"/shikarpur/\" data-city-shortcut=\"shikarpur\">Shikarpur</a></div><p class=\"sp-quicknav-message\">Find the best doctors in Sukkur, Khairpur, Karachi, Hyderabad and Shikarpur. View complete weekly OPD schedules, check published availability and explore online appointment options.</p></div></nav>");
  const activeShortcut=location.pathname==="/"
    ? "home"
    : location.pathname.match(/^\/(?:doctors\/|hospitals\/)?(sukkur|khairpur|karachi|hyderabad|shikarpur)(?:\/|$)/i)?.[1]?.toLowerCase();
  if(activeShortcut){
    const activeLink=document.querySelector('[data-sp-city-nav] [data-city-shortcut="'+activeShortcut+'"]');
    if(activeLink)activeLink.setAttribute("aria-current","page");
  }
  const cityCopy=document.querySelector(".sp-quicknav-message");
  const cityLabel={sukkur:"Sukkur",khairpur:"Khairpur",karachi:"Karachi",hyderabad:"Hyderabad",shikarpur:"Shikarpur"}[activeShortcut];
  if(cityCopy&&cityLabel)cityCopy.textContent="Find the best doctors in "+cityLabel+", Sindh. View complete weekly OPD schedules, check published availability and explore online appointment options.";

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
import("/assets/slashcure-strip.js?v=20261106-darkbrand3").catch(()=>{});

/* Present verified SlashPromo and Slashcure profile destinations together. */
import("/assets/cross-profile-links.js?v=20261108-national-contact-qa2").catch(()=>{});


/* Enhance the text "Slashcure" everywhere, including dynamically generated
   directory cards. Link destinations, accessible link text and indexing stay intact. */
(function () {
  "use strict";
  const BRAND = /slashcure/i;
  const PARTS = /(slashcure)/gi;
  const EXCLUDE = "script,style,noscript,textarea,option,select,svg,math,code,pre,[contenteditable],[data-sp-slashcure-wordmark]";
  const styleId = "sp-slashcure-colorwordmark-v3";

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = "\n/* Site-wide Slashcure typography: dark Slash blue + red on white profile buttons; text only, no icon. */\n.sp-slashcure-wordmark{\n  display:inline;\n  white-space:nowrap;\n  font-weight:850;\n  letter-spacing:-.015em;\n}\n.sp-slashcure-wordmark .sp-slashcure-blue{color:#195eb4!important}\n.sp-slashcure-wordmark .sp-slashcure-red{color:#c62d43!important}\n:is(.page-hero,.site-footer,.sp-slashcure-frame,.sc-promo-strip,\n.sp-shk-action-partner,.sp-shk-slashcure,\n.sp-shk-aside-link,.sp-shk-action-partner,.sp-gastro-hero,\n.sp-profile-hero,.sp-shk-hospital-hero,.btn.dark) .sp-slashcure-wordmark .sp-slashcure-blue{color:#195eb4!important}\n:is(.page-hero,.site-footer,.sp-slashcure-frame,.sc-promo-strip,\n.sp-shk-action-partner,.sp-shk-slashcure,\n.sp-shk-aside-link,.sp-gastro-hero,.sp-profile-hero,\n.sp-shk-hospital-hero,.btn.dark) .sp-slashcure-wordmark .sp-slashcure-red{color:#c62d43!important}\n/* Ensure dark-blue/red lettering remains legible over dark hero, navigation and footer surfaces. */\n:is(.page-hero,.site-footer,.sp-slashcure-frame,.sp-gastro-hero,.sp-profile-hero,.sp-shk-hospital-hero,.btn.dark,.kh-hero) .sp-slashcure-wordmark{display:inline-block;background:#fff!important;padding:1px 4px;border-radius:5px;white-space:nowrap}\n\n/* Doctor and hospital cross-profile actions always show the dark brand colors on white buttons. */\n.sp-cross-link:is(.sp-cross-link-external,.sp-cross-link-fallback){background:#fff!important;border-color:#b5d4eb!important}\n.sp-cross-link:is(.sp-cross-link-external,.sp-cross-link-fallback) .sp-slashcure-wordmark .sp-slashcure-blue{color:#195eb4!important}\n.sp-cross-link:is(.sp-cross-link-external,.sp-cross-link-fallback) .sp-slashcure-wordmark .sp-slashcure-red{color:#c62d43!important}\n";
    document.head.appendChild(style);
  }

  const upgrade = (node) => {
    if (!node || node.nodeType !== 3 || !BRAND.test(node.nodeValue || "")) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(EXCLUDE)) return;
    const pieces = node.nodeValue.split(PARTS);
    if (pieces.length === 1) return;
    const frag = document.createDocumentFragment();
    for (const part of pieces) {
      if (!part) continue;
      if (!/^slashcure$/i.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const mark = document.createElement("span");
      mark.className = "sp-slashcure-wordmark";
      mark.dataset.spSlashcureWordmark = "";
      const blue = document.createElement("span");
      blue.className = "sp-slashcure-blue";
      blue.textContent = "Slash";
      const red = document.createElement("span");
      red.className = "sp-slashcure-red";
      red.textContent = "cure";
      mark.append(blue, red);
      frag.appendChild(mark);
    }
    parent.replaceChild(frag, node);
  };

  const scan = (root) => {
    if (!root) return;
    if (root.nodeType === 3) return upgrade(root);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && (root.matches(EXCLUDE) || root.closest("[data-sp-slashcure-wordmark]"))) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const targets = [];
    let current;
    while ((current = walker.nextNode())) if (BRAND.test(current.nodeValue || "")) targets.push(current);
    for (const target of targets) upgrade(target);
  };

  const init = () => {
    scan(document.body);
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === "characterData") scan(change.target);
        else for (const added of change.addedNodes) scan(added);
      }
    }).observe(document.body, {subtree:true,childList:true,characterData:true});
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();

/* One moderated, page-specific Q&A for every published city doctor, hospital,
   clinic, laboratory, local specialty and health-topic page. City roots load
   the module directly. No duplicate forms or cross-city question threads. */
(function(){
  "use strict";
  const supported=new Set(["sukkur","khairpur","shikarpur","ghotki","karachi","hyderabad"]);
  const parts=location.pathname.toLowerCase().split("/").filter(Boolean);
  const isCitySubpage=supported.has(parts[0])&&parts.length>1;
  const isProviderSubpage=["doctors","hospitals","clinics","laboratories"].includes(parts[0])
    &&supported.has(parts[1])&&parts.length>2;
  if(!(isCitySubpage||isProviderSubpage)||document.querySelector('script[src*="/assets/city-questions.js"]'))return;
  const script=document.createElement("script");
  script.src="/assets/city-questions.js?v=20261108-qahistory5";
  script.async=true;
  document.head.appendChild(script);
})();


/* SlashPromo shared support WhatsApp: public contact number from /contact/.
   Load on public pages using the shared site.js; do not display in admin tools.
   No visitor information is collected, sent or prefilled automatically. */
(function(){
  "use strict";
  if(/^\/(?:qa-admin|admin|api)(?:\/|$)/i.test(location.pathname))return;
  const init=()=>{
    if(!document.body||document.getElementById("sp-team-whatsapp-float"))return;
    const contact="923352648572";
    const text="Hello, I have a question about a doctor, hospital or OPD information listed on Slashpromo.com.";
    const link=document.createElement("a");
    link.id="sp-team-whatsapp-float";
    link.className="sp-team-whatsapp-float";
    link.href="https://wa.me/"+contact+"?text="+encodeURIComponent(text);
    link.target="_blank";
    link.rel="noopener noreferrer";
    link.title="Chat with the SlashPromo team on WhatsApp: +92 335 2648572";
    link.setAttribute("aria-label","Chat with the SlashPromo team on WhatsApp at +92 335 2648572");
    link.innerHTML='<svg class="sp-team-whatsapp-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 11.6a8.4 8.4 0 0 1-12.6 7.2L3 20.1l1.2-4.4a8.4 8.4 0 1 1 16-4.1Z"/><path d="M8.7 8.3c.4 3.2 2.4 5.3 5.5 6.1l1.4-1.6"/></svg><span class="sp-team-whatsapp-copy"><strong>WhatsApp our team</strong><small>+92 335 2648572</small></span>';
    document.body.appendChild(link);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();


/* Page-aware, consent-based WhatsApp enquiry: private D1 save before handoff.
   Opening WhatsApp never means the message was sent. */
(function(){
  "use strict";
  if(/^\/(?:qa-admin|admin|analytics|enquiries|api)(?:\/|$)/i.test(location.pathname))return;
  function setup(){
    const old=document.getElementById("sp-team-whatsapp-float");
    if(!old||document.getElementById("sp-wa-query-panel"))return;
    const toggle=document.createElement("button");
    toggle.type="button";toggle.id=old.id;toggle.className=old.className;
    toggle.innerHTML=old.innerHTML;toggle.title="Ask SlashPromo a question on WhatsApp";
    toggle.setAttribute("aria-label","Open enquiry form");
    toggle.setAttribute("aria-controls","sp-wa-query-panel");
    toggle.setAttribute("aria-expanded","false");
    old.replaceWith(toggle);
    const panel=document.createElement("section");
    panel.id="sp-wa-query-panel";panel.className="sp-wa-query-panel";
    panel.setAttribute("role","region");
    panel.setAttribute("aria-labelledby","sp-wa-query-title");
    panel.hidden=true;
    panel.innerHTML=[
      '<div class="sp-wa-query-head"><div><h2 id="sp-wa-query-title">WhatsApp enquiry</h2><p>Ask about doctors, hospitals or OPD</p></div><button type="button" class="sp-wa-query-close" aria-label="Close form">×</button></div>',
      '<form id="sp-wa-query-form" class="sp-wa-query-form">',
      '<label for="sp-wa-name">Your name *</label><input id="sp-wa-name" name="visitorName" type="text" maxlength="100" autocomplete="name" placeholder="Enter your name" required>',
      '<label for="sp-wa-address">City / Area *</label><input id="sp-wa-address" name="visitorAddress" type="text" maxlength="120" autocomplete="address-level2" placeholder="City or area (not full home address)" required>',
      '<label for="sp-wa-phone">WhatsApp contact (optional)</label><input id="sp-wa-phone" name="visitorPhone" type="tel" maxlength="24" autocomplete="tel" placeholder="+92 300 1234567">',
      '<label for="sp-wa-question">Your enquiry *</label><textarea id="sp-wa-question" name="query" rows="3" minlength="5" maxlength="700" placeholder="Ask about a doctor, clinic, hospital or published OPD time. Do not include medical records." required></textarea>',
      '<div class="sp-wa-source"><strong>Source page (automatically attached)</strong><span id="sp-wa-source-label"></span></div>',
      '<label class="sp-wa-consent"><input id="sp-wa-consent" name="consent" type="checkbox" required><span>I agree to SlashPromo privately saving my name, city/area, enquiry and optional phone number, so its team can respond. I can request deletion. <a href="/privacy/" target="_blank" rel="noopener noreferrer">Privacy policy</a>.</span></label>',
      '<div class="sp-wa-turnstile" id="sp-wa-turnstile" aria-label="Spam protection"></div>',
      '<p class="sp-wa-privacy">Please do not include patient records, medical reports or other sensitive health information. This is not an emergency service. Saving the enquiry does <strong>not</strong> send a WhatsApp message.</p>',
      '<p id="sp-wa-feedback" class="sp-wa-feedback" role="status" aria-live="polite"></p>',
      '<button id="sp-wa-save" type="submit" class="sp-wa-submit" disabled>Save private enquiry</button>',
      '<div id="sp-wa-handoff" class="sp-wa-handoff" hidden></div>',
      '<p class="sp-wa-privacy">Prefer not to save? <a href="https://wa.me/923352648572" target="_blank" rel="noopener noreferrer">Contact WhatsApp directly</a>.</p>',
      '</form>'
    ].join("");
    document.body.appendChild(panel);
    const form=panel.querySelector("form"),saveButton=panel.querySelector("#sp-wa-save");
    const feedback=panel.querySelector("#sp-wa-feedback"),handoff=panel.querySelector("#sp-wa-handoff");
    const security=panel.querySelector("#sp-wa-turnstile");
    const parts=location.pathname.toLowerCase().split("/").filter(Boolean);
    const cities=new Set(["sukkur","khairpur","shikarpur","ghotki","karachi","hyderabad","lahore"]);
    let category="Other SlashPromo page";
    if(parts.length===0)category="Homepage";
    else if(parts.length===1&&cities.has(parts[0]))category=parts[0].charAt(0).toUpperCase()+parts[0].slice(1)+" landing page";
    else if(parts[0]==="doctors"&&parts.length===3)category="Doctor profile";
    else if(parts[0]==="hospitals"&&parts.length===3)category="Hospital profile";
    else if(parts[0]==="doctors"&&parts.length===2)category="Specialty / city doctor directory";
    else if(parts[0]==="hospitals")category="Hospital directory";
    else if(parts[0]==="doctors")category="Doctors directory";
    else if(cities.has(parts[0]))category="City information page";
    const title=(document.querySelector("main h1")?.textContent||document.title||"SlashPromo").replace(/\s+/g," ").trim().slice(0,130);
    let url="https://slashpromo.com"+location.pathname;
    try{
      const canonical=document.querySelector('link[rel="canonical"]');
      const link=new URL(canonical?.href||location.href,location.origin);
      if(["slashpromo.com","www.slashpromo.com"].includes(link.hostname)){
        link.search="";link.hash="";url=link.href;
      }
    }catch{}
    panel.querySelector("#sp-wa-source-label").textContent=category+" — "+title;
    let token="",turnstileId=null,ready=false,loading=false;
    function message(text,kind="info"){
      feedback.textContent=text;feedback.dataset.kind=kind;
    }
    function enableTurnstile(siteKey){
      if(turnstileId!==null)return;
      const render=()=>{
        if(!window.turnstile||turnstileId!==null)return;
        try{
          turnstileId=window.turnstile.render(security,{
            sitekey:siteKey,
            callback:value=>{token=value;saveButton.disabled=false},
            "expired-callback":()=>{token="";saveButton.disabled=true;message("Security check expired. Please complete it again.","error")},
            "error-callback":()=>{token="";saveButton.disabled=true;message("Security check is unavailable. Try again.","error")}
          });
        }catch{message("Security check is unavailable. You may contact WhatsApp directly.","error")}
      };
      if(window.turnstile){render();return}
      const script=document.createElement("script");
      script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.onload=render;
      script.onerror=()=>message("Security check did not load. Try again or contact WhatsApp directly.","error");
      document.head.appendChild(script);
    }
    async function loadConfig(){
      if(ready||loading)return;
      loading=true;message("Checking secure enquiry submission…");
      try{
        const response=await fetch("/api/enquiries",{headers:{"Accept":"application/json"},cache:"no-store"});
        const data=await response.json();
        if(!response.ok||!data.enabled||!data.siteKey)throw Error("Enquiry storage is temporarily unavailable.");
        ready=true;message("Complete the security check, then save your enquiry.");enableTurnstile(data.siteKey);
      }catch(error){message(error.message||"Cannot enable secure enquiry storage. Please use direct WhatsApp.","error")}
      finally{loading=false}
    }
    function open(next){
      panel.hidden=!next;
      toggle.setAttribute("aria-expanded",next?"true":"false");
      if(next){
        if(form.dataset.saved==="yes"){
          form.reset();form.dataset.saved="no";handoff.replaceChildren();handoff.hidden=true;
          token="";saveButton.disabled=true;
          if(window.turnstile&&turnstileId!==null)try{window.turnstile.reset(turnstileId)}catch{}
          feedback.textContent="";
        }
        loadConfig();form.elements.namedItem("visitorName").focus();
      }else toggle.focus();
    }
    toggle.addEventListener("click",()=>{const next=panel.hidden;open(next);if(next)window.slashpromoTrack?.("whatsapp_open")});
    panel.querySelector(".sp-wa-query-close").addEventListener("click",()=>open(false));
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden)open(false)});
    document.addEventListener("pointerdown",event=>{
      if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target)){
        panel.hidden=true;toggle.setAttribute("aria-expanded","false");
      }
    });
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      if(!ready||!token){message("Complete the security check to save your enquiry.","error");return}
      if(!form.reportValidity())return;
      const name=form.elements.namedItem("visitorName").value.trim();
      const area=form.elements.namedItem("visitorAddress").value.trim();
      const phone=form.elements.namedItem("visitorPhone").value.trim();
      const question=form.elements.namedItem("query").value.trim();
      if(!name||!area||question.length<5)return;
      saveButton.disabled=true;message("Saving your enquiry privately…");
      try{
        const response=await fetch("/api/enquiries",{
          method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({name,area,phone,query:question,sourcePath:new URL(url).pathname,
            sourceTitle:title,consent:form.elements.namedItem("consent").checked,turnstileToken:token})
        });
        const data=await response.json();
        if(!response.ok||!data.saved)throw Error(data.error||"Could not save the enquiry.");
        form.dataset.saved="yes";
        message("Saved privately. Reference "+data.reference+". Your WhatsApp message has NOT been sent.","success");
        const outgoing=[
          "Hello SlashPromo Team, I have an enquiry.",
          "Reference: "+data.reference,
          "Name: "+name,
          "Address / City: "+area,
          ...(phone?["My contact: "+phone]:[]),
          "Query: "+question,
          "",
          "From page type: "+category,
          "From page title: "+title,
          "From page URL: "+url
        ].join("\n");
        const link=document.createElement("a");
        link.href="https://wa.me/923352648572?text="+encodeURIComponent(outgoing);
        link.target="_blank";link.rel="noopener noreferrer";link.className="sp-wa-submit sp-wa-open";
        link.textContent="Open WhatsApp with this enquiry ↗";
        link.addEventListener("click",()=>window.slashpromoTrack?.("whatsapp_continue"));
        handoff.replaceChildren(link);
        handoff.hidden=false;
        saveButton.textContent="Enquiry saved";saveButton.disabled=true;
      }catch(error){
        message(error.message||"Your enquiry was not saved.","error");
        token="";
        if(window.turnstile&&turnstileId!==null)try{window.turnstile.reset(turnstileId)}catch{}
      }
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
  else setup();
})();


/* SlashPromo privacy-conscious site analytics: aggregate event counters only.
   No cookies, visitor IDs, IPs, search terms, form names or medical details. */
(function(){
  "use strict";
  if(/^\/(?:admin|qa-admin|analytics|api)(?:\/|$)/i.test(location.pathname))return;
  const canonical=document.querySelector('link[rel="canonical"]');
  let path=location.pathname;
  try{
    if(canonical){
      const url=new URL(canonical.href,location.origin);
      if(["slashpromo.com","www.slashpromo.com"].includes(url.hostname))path=url.pathname;
    }
  }catch{}
  if(!/^\/(?:[a-z0-9-]+\/){0,5}$/.test(path))return;
  const events=new Set(["page_view","slashcure_click","whatsapp_open","whatsapp_continue","qa_submitted"]);
  window.slashpromoTrack=function(event){
    if(!events.has(event))return;
    const body=JSON.stringify({event,path});
    try{
      if(navigator.sendBeacon&&navigator.sendBeacon("/api/analytics",new Blob([body],{type:"text/plain;charset=UTF-8"})))return;
      fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body,keepalive:true,credentials:"omit"}).catch(()=>{});
    }catch{}
  };
  const view=()=>window.slashpromoTrack("page_view");
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",view,{once:true});
  else view();
  document.addEventListener("click",event=>{
    const anchor=event.target.closest?.("a[href]");
    if(anchor){
      try{
        const dest=new URL(anchor.href,location.href);
        if(dest.hostname==="slashcure.com"||dest.hostname==="www.slashcure.com")
          window.slashpromoTrack("slashcure_click");
      }catch{}
    }
  });
})();

/* Visitors browsing three public pages may optionally share browser location
   to prioritize the nearest listed city. Permission is never requested automatically. */
(function(){
  "use strict";
  if(/^\/(?:admin|qa-admin|control-center|analytics|enquiries|secure-backups|api)(?:\/|$)/i.test(location.pathname))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="/assets/location-personalization.css?v=20261109-consent2";
  document.head.appendChild(link);
  import("/assets/location-personalization.js?v=20261109-consent2").catch(()=>{});
})();
