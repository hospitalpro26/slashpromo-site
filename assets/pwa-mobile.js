/* Public-only Android-first app enhancement. Never render controls inside private administration. */
(function(){
  "use strict";
  const blocked = /^\/(?:api(?:\/|$)|admin(?:\/|$)|qa-admin(?:\/|$)|control-center(?:\/|$)|analytics(?:\/|$)|enquiries(?:\/|$)|secure-backups(?:\/|$)|review(?:\/|$)|automation(?:\/|$))/i;
  if(blocked.test(location.pathname)) return;
  if(!document.querySelector('link[rel="manifest"]')){
    const link=document.createElement("link");
    link.rel="manifest";
    link.href="/manifest.webmanifest";
    document.head.appendChild(link);
  }
  const standalone=window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  if(standalone){
    const tabs=[
      {label:"Home",href:"/",icon:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>'},
      {label:"Find",href:"/#find-doctors",icon:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'},
      {label:"Cities",href:"/cities/",icon:'<path d="m3 21 5-15 8-3 5 15-8 3z"/><path d="m8 6 5 15m3-18-3 18"/>'},
      {label:"News",href:"/health-news/",icon:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h4M7 16h10"/>'}
    ];
    const nav=document.createElement("nav");
    nav.className="sp-pwa-tabs";
    nav.setAttribute("aria-label","App navigation");
    const path=location.pathname;
    const current=path.startsWith("/health-news/")?"News":path.startsWith("/cities/")||/^\/(?:sukkur|khairpur|karachi|hyderabad|shikarpur|pano-aqil|ghotki|ratodero|larkana|lahore|sheikhupura)(?:\/|$)/.test(path)?"Cities":(path==="/"&&location.hash==="#find-doctors")||path.startsWith("/doctors/")?"Find":"Home";
    for(const tab of tabs){
      const a=document.createElement("a"); a.href=tab.href;
      a.textContent=tab.label;
      const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
      icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("aria-hidden","true");
      icon.innerHTML=tab.icon;
      a.prepend(icon);
      if(current===tab.label)a.setAttribute("aria-current","page");
      nav.appendChild(a);
    }
    const mount=()=>{if(!document.querySelector(".sp-pwa-tabs")&&document.body){document.body.classList.add("sp-pwa-public");document.body.appendChild(nav)}};
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
  }
  if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost")){
    window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{}),{once:true});
  }
})();
