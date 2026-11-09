/* Premium Sukkur hero search bridges to the existing, independent doctor directory.
   Read-only: no forms are sent off-site or to Slashcure. */
(function(){
  "use strict";
  var heroForm=document.getElementById("sp-premium-doctor-search");
  var root=document.getElementById("listed-doctors");
  if(!heroForm||!root)return;
  var heroQuery=document.getElementById("sp-premium-doctor-term");
  var heroSpecialty=document.getElementById("sp-premium-specialty");
  var directoryQuery=root.querySelector("[data-native-query]");
  var directorySpecialty=root.querySelector("[data-native-specialty]");
  var directoryForm=root.querySelector("[data-native-search]");
  var ready=root.getAttribute("data-ready")==="true";
  var pending=false;
  var status=document.createElement("p");
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");
  status.className="sp-premium-search-status";
  status.style.cssText="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden";
  heroForm.appendChild(status);
  function fillSpecialties(){
    if(!directorySpecialty)return;
    var val=heroSpecialty.value;
    heroSpecialty.replaceChildren(new Option("All medical specialties",""));
    Array.from(directorySpecialty.options).forEach(function(opt){
      if(opt.value)heroSpecialty.appendChild(new Option(opt.textContent,opt.value));
    });
    if(Array.from(heroSpecialty.options).some(function(opt){return opt.value===val}))heroSpecialty.value=val;
  }
  function filterAndScroll(){
    if(!directoryQuery||!directoryForm||!ready)return false;
    directoryQuery.value=heroQuery.value.trim().slice(0,100);
    directoryQuery.dispatchEvent(new Event("input",{bubbles:true}));
    if(directorySpecialty){
      var v=heroSpecialty.value;
      directorySpecialty.value=Array.from(directorySpecialty.options).some(function(x){return x.value===v})?v:"";
      directorySpecialty.dispatchEvent(new Event("change",{bubbles:true}));
    }
    directoryForm.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    status.textContent="Showing matching Sukkur doctor profiles in the local directory below.";
    return true;
  }
  var observer=new MutationObserver(function(){
    if(root.getAttribute("data-ready")==="true"){
      ready=true;fillSpecialties();
      observer.disconnect();
      if(pending){pending=false;filterAndScroll();}
    }
  });
  if(ready)fillSpecialties();else observer.observe(root,{attributes:true,attributeFilter:["data-ready"]});
  heroForm.addEventListener("submit",function(ev){
    ev.preventDefault();
    if(!filterAndScroll()){
      pending=true;status.textContent="Loading Sukkur doctor profiles.";
      root.scrollIntoView({behavior:"smooth",block:"start"});
    }
  });
})();
