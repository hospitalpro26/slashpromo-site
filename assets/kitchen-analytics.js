/* SlashPromo privacy-first kitchen analytics: aggregate counts only. */
(()=>{
  "use strict";
  const path=location.pathname.replace(/\/index\.html$/,"/");
  const allowed=new Set([
    "/sukkur/local-food/","/sukkur/local-food/sukkur-township/",
    "/sukkur/local-food/sadias-kitchen/","/sukkur/local-food/js-kitchen/",
    "/sukkur/local-food/a2z-home-baker/","/sukkur/local-food/sukkur-homemade-food/"
  ]);
  if(!allowed.has(path)||navigator.globalPrivacyControl===true||navigator.doNotTrack==="1")return;
  function send(event){
    const payload=JSON.stringify({event,path});
    try{
      if(navigator.sendBeacon&&navigator.sendBeacon("/api/analytics",new Blob([payload],{type:"text/plain"})))return;
      fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"text/plain"},body:payload,keepalive:true,credentials:"same-origin"}).catch(()=>{});
    }catch{}
  }
  send("page_view");
  document.addEventListener("click",e=>{
    const link=e.target.closest?.("a[href]");
    if(!link)return;
    try{const u=new URL(link.href,location.href);if(u.hostname==="wa.me"||u.hostname==="api.whatsapp.com"||u.hostname==="web.whatsapp.com")send("kitchen_whatsapp_click");}catch{}
  },{capture:true});
})();
