/* SlashPromo Phase 2B — lightweight first-party analytics for standalone guides.
   Reuses /api/analytics aggregate counters; no cookies, visitor ID, referrer,
   URL query, link destination, personal information or health search terms.
   Do not include on pages that already load assets/site.js. */
(function () {
  "use strict";
  if (window.slashpromoTrack) return;
  var canonical = document.querySelector('link[rel="canonical"]');
  var page = location.pathname;
  try {
    if (canonical) {
      var u = new URL(canonical.href, location.href);
      if (u.hostname === "slashpromo.com" || u.hostname === "www.slashpromo.com") page = u.pathname;
    }
  } catch (_) { /* Use the public page path. */ }
  // Only approved public pages; no query strings or personal text.
  if (!/^\/(?:[a-z0-9-]+\/){0,5}$/.test(page)) return;
  var allowed = {page_view:true,slashcure_click:true};
  function track(event) {
    if (!allowed[event]) return;
    var payload = JSON.stringify({event:event,path:page});
    try {
      if (navigator.sendBeacon &&
          navigator.sendBeacon("/api/analytics",new Blob([payload],{type:"text/plain;charset=UTF-8"}))) return;
      fetch("/api/analytics",{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:payload,keepalive:true,credentials:"omit"
      }).catch(function(){});
    } catch (_) { /* Analytics must never block navigation. */ }
  }
  window.slashpromoTrack=track;
  function onOutbound(e) {
    if (e.defaultPrevented || (e.type==="auxclick" && e.button!==1)) return;
    var a=e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    try {
      var dest=new URL(a.href,location.href);
      if (dest.protocol==="https:" &&
          (dest.hostname==="slashcure.com" || dest.hostname==="www.slashcure.com")) {
        track("slashcure_click");
      }
    } catch (_) {}
  }
  document.addEventListener("click",onOutbound);
  document.addEventListener("auxclick",onOutbound);
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){track("page_view");},{once:true});
  else track("page_view");
})();
