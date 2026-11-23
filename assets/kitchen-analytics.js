/* SlashPromo kitchen analytics: anonymous per-page aggregates only.
   Injected automatically on city/local-food routes by scoped Cloudflare middleware. */
(()=>{
  "use strict";
  const path=location.pathname.replace(/\/index\.html$/,"/");
  const kitchenPage=/^\/[a-z0-9-]+\/local-food\/(?:[a-z0-9-]+\/)*$/;
  if(!kitchenPage.test(path)||navigator.globalPrivacyControl===true||navigator.doNotTrack==="1")return;
  /* Existing pages may still reference this file explicitly; count once per load. */
  if(window.__slashpromoKitchenAnalyticsStarted)return;
  window.__slashpromoKitchenAnalyticsStarted=true;
  function send(event){
    const payload=JSON.stringify({event,path});
    try{
      if(navigator.sendBeacon&&navigator.sendBeacon("/api/analytics",new Blob([payload],{type:"text/plain"})))return;
      fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"text/plain"},body:payload,keepalive:true,credentials:"same-origin"}).catch(()=>{});
    }catch{}
  }
  send("page_view");
  document.addEventListener("click",event=>{
    const link=event.target.closest?.("a[href]");
    if(!link)return;
    try{
      const url=new URL(link.href,location.href);
      if(["wa.me","api.whatsapp.com","web.whatsapp.com"].includes(url.hostname))send("kitchen_whatsapp_click");
    }catch{}
  },{capture:true});
})();
