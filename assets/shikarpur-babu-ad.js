/* Shikarpur-only sponsored placement. No tracking, no third-party scripts, no invented contact details. */
(function(){
  "use strict";
  var path = window.location.pathname.toLowerCase();
  if (!/^\/(?:shikarpur|doctors\/shikarpur|hospitals\/shikarpur)(?:\/|$)/.test(path)) return;

  function start(){
    var main = document.querySelector("main");
    if (!main || document.getElementById("sp-babu-cloth-ad")) return;

    var style = document.createElement("style");
    style.id = "sp-babu-cloth-style";
    style.textContent = [
      '@property --sp-babu-angle{syntax:"<angle>";inherits:false;initial-value:0deg}',
      '@keyframes sp-babu-border-flow{to{--sp-babu-angle:360deg}}',
      '.sp-babu-rail{display:grid;gap:16px;align-content:start;min-width:0}',
      '.sp-babu-card{--sp-babu-angle:0deg;box-sizing:border-box;display:block;position:relative;min-width:0;width:100%;padding:21px;border:3px solid #1761c7;border-radius:18px;',
      'background:linear-gradient(155deg,#ffffff,#f7fbff) padding-box,conic-gradient(from var(--sp-babu-angle),#1761c7 0deg,#138558 90deg,#1761c7 180deg,#138558 275deg,#1761c7 360deg) border-box;',
      'box-shadow:0 13px 30px rgba(18,50,86,.14),0 3px 9px rgba(18,50,86,.06);animation:sp-babu-border-flow 6s linear infinite}',
      '.sp-babu-label{display:inline-block;border-radius:999px;padding:6px 11px;background:#e9f4ed;color:#225d51;letter-spacing:.055em;text-transform:uppercase;font-size:11px;line-height:1.4;font-weight:850}',
      '.sp-babu-card h3{color:#123762!important;font-size:23px!important;font-weight:900!important;line-height:1.22!important;margin:13px 0 8px!important}',
      '.sp-babu-card p{color:#294b66!important;font-size:15px!important;font-weight:750!important;line-height:1.6!important;margin:0 0 14px!important}',
      '.sp-babu-location{font-size:14px!important;color:#22527e!important;font-weight:800!important}',
      '.sp-babu-since{color:#12734e!important;font-weight:900!important}',
      '.sp-babu-card .sp-babu-action{box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-decoration:none!important;border-radius:10px;',
      'padding:12px 15px;border:1px solid #164f9d;background:#155bc0;color:#fff!important;font-size:14px!important;font-weight:850!important;line-height:1.4!important}',
      '.sp-babu-card .sp-babu-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
      '.sp-babu-card .sp-babu-action{padding:11px 7px;font-size:13px!important;min-width:0}',
      '.sp-babu-card .sp-babu-action.sp-babu-whatsapp{background:#0d8059;border-color:#0d8059}',
      '.sp-babu-card .sp-babu-contact{font-size:14px!important;color:#214460!important;margin-bottom:15px!important}',
      '.sp-babu-card .sp-babu-contact strong{font-weight:900!important}',
      '@media(max-width:375px){.sp-babu-card .sp-babu-actions{grid-template-columns:1fr}}',
      '.sp-babu-card .sp-babu-action:hover{filter:brightness(.93)}',
      '.sp-babu-card .sp-babu-action:focus-visible{outline:3px solid #21a571;outline-offset:3px}',
      '.sp-babu-directory-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,330px);gap:22px;align-items:start;margin:23px 0 28px}',
      '.sp-babu-directory-layout>.sp-shk-local-grid{margin:0!important;grid-template-columns:repeat(2,minmax(0,1fr));min-width:0}',
      '.sp-babu-directory-sidebar{position:sticky;top:20px;min-width:0;align-self:start}',
      '@media(max-width:940px){.sp-babu-directory-layout{grid-template-columns:1fr}.sp-babu-directory-sidebar{position:static}.sp-babu-directory-layout>.sp-shk-local-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:560px){.sp-babu-directory-layout>.sp-shk-local-grid{grid-template-columns:1fr}}',
      '.sp-babu-fallback{width:100%;display:flex;justify-content:flex-end;margin:18px 0 25px}',
      '.sp-babu-fallback .sp-babu-card{width:min(355px,100%)}',
      '.sp-babu-profile-column>.sp-babu-card,.sp-shk-profile-aside>.sp-babu-card,.phys-sidebar>.sp-babu-card{margin-top:16px}',
      '@media(max-width:800px){.sp-babu-card{padding:17px}.sp-babu-card h3{font-size:21px!important}.sp-babu-card p{font-size:14px!important}}',
      '@media(max-width:560px){.sp-babu-fallback{justify-content:stretch}.sp-babu-fallback .sp-babu-card{width:100%}}',
      '@media(prefers-reduced-motion:reduce){.sp-babu-card{animation:none!important}}'
    ].join("");
    document.head.appendChild(style);

    function makeCard(){
      var ad=document.createElement("aside");
      ad.id="sp-babu-cloth-ad";
      ad.className="sp-babu-card";
      ad.setAttribute("aria-label","Advertisement: Babu Cloth Store Shikarpur");
      ad.innerHTML='<span class="sp-babu-label">Advertisement · Shikarpur</span>'+
        '<h3>Babu Cloth Store</h3>'+
        '<p class="sp-babu-location">Meena Bazar, Shikarpur</p>'+
        '<p>Cloth store <span class="sp-babu-since">· Since 1982</span></p>'+
        '<p class="sp-babu-contact">WhatsApp: <strong>+92 336 2388806</strong></p>'+
        '<div class="sp-babu-actions"><a class="sp-babu-action sp-babu-whatsapp" href="https://wa.me/923362388806?text=Assalam-o-Alaikum%2C%0A%0AI%20came%20across%20Babu%20Cloth%20Store%2C%20Meena%20Bazar%2C%20Shikarpur%2C%20and%20would%20like%20to%20learn%20more%20about%20your%20collection%20of%20clothes%20and%20perfumes.%0A%0ACould%20you%20please%20share%20details%20about%20your%20available%20products%2C%20latest%20collections%2C%20prices%2C%20and%20ordering%20options%3F%0A%0AThank%20you.%20I%20look%20forward%20to%20hearing%20from%20you.%0A%0AI%20found%20your%20store%20on%20Slashpromo.com." target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp chat with Babu Cloth Store">WhatsApp ↗</a>'+
        '<a class="sp-babu-action" href="/advertisers/babu-cloth-store/">View details ↗</a></div>';
      return ad;
    }
    function wrapAside(aside){
      if(!aside || !aside.parentElement)return false;
      var rail=document.createElement("div");
      rail.className="sp-babu-rail";
      aside.parentNode.insertBefore(rail,aside);
      rail.appendChild(aside);
      rail.appendChild(makeCard());
      return true;
    }
    var pageAside = main.querySelector(".city-detail > .detail-aside");
    if(pageAside && wrapAside(pageAside))return;
    var profileAside = main.querySelector(".sp-profile-columns > aside.sp-profile-panel");
    if(profileAside && wrapAside(profileAside))return;
    var hospitalAside = main.querySelector("aside.sp-shk-profile-aside");
    if(hospitalAside){hospitalAside.appendChild(makeCard());return;}
    var physAside = main.querySelector("aside.phys-sidebar");
    if(physAside){physAside.appendChild(makeCard());return;}
    var anyAside = main.querySelector(".wrap > aside:not(.sp-babu-card)");
    if(anyAside && wrapAside(anyAside))return;

    /* Category listings: preserve the listing grid and place the ad in its own right-side column. */
    var directorySection=main.querySelector(".sp-shk-local-section");
    var directoryWrap=directorySection && directorySection.querySelector(".wrap");
    var grid=directoryWrap && directoryWrap.querySelector(".sp-shk-local-grid");
    if(grid){
      var layout=document.createElement("div");
      layout.className="sp-babu-directory-layout";
      var sidebar=document.createElement("div");
      sidebar.className="sp-babu-directory-sidebar";
      grid.parentNode.insertBefore(layout,grid);
      layout.appendChild(grid);
      sidebar.appendChild(makeCard());
      layout.appendChild(sidebar);
      return;
    }
    /* Fallback for any future Shikarpur template without a defined sidebar or directory grid. */
    var holder=document.createElement("div");
    holder.className="sp-babu-fallback";
    holder.appendChild(makeCard());
    if(directoryWrap)directoryWrap.appendChild(holder);
    else{
      var sections=main.querySelectorAll("section");
      if(sections.length>1)main.insertBefore(holder,sections[1]);else main.appendChild(holder);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();