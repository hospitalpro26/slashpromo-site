/* Shared premium city hero search. Opt-in via data-city-search and
   data-directory-target. Uses the existing native city-scoped directory only;
   no new user-submitted data, analytics events, cookies, or booking calls. */
(function(){
"use strict";
document.querySelectorAll("form[data-city-search][data-directory-target]").forEach(function(hero){
  var id=hero.getAttribute("data-directory-target");
  if(!/^[a-zA-Z0-9-]{1,64}$/.test(id||""))return;
  var root=document.getElementById(id),term=hero.querySelector("[data-city-search-term]");
  var spec=hero.querySelector("[data-city-search-specialty]");
  if(!root||!term||!spec)return;
  var query=root.querySelector("[data-native-query]");
  var specialty=root.querySelector("[data-native-specialty]");
  var nativeForm=root.querySelector("[data-native-search]");
  if(!query||!specialty||!nativeForm)return;
  var pending=false;
  var status=document.createElement("span");
  status.setAttribute("role","status");status.setAttribute("aria-live","polite");
  status.className="visually-hidden";
  status.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  hero.appendChild(status);
  function fill(){
    var selected=spec.value;
    spec.replaceChildren(new Option("All medical specialties",""));
    Array.from(specialty.options).forEach(function(option){
      if(option.value)spec.appendChild(new Option(option.textContent,option.value));
    });
    if(Array.from(spec.options).some(function(option){return option.value===selected;}))spec.value=selected;
  }
  function run(){
    if(root.getAttribute("data-ready")!=="true")return false;
    query.value=term.value.trim().slice(0,100);
    query.dispatchEvent(new Event("input",{bubbles:true}));
    var value=spec.value;
    specialty.value=Array.from(specialty.options).some(function(o){return o.value===value})?value:"";
    specialty.dispatchEvent(new Event("change",{bubbles:true}));
    nativeForm.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    status.textContent="Filtered local doctor profiles are shown below.";
    return true;
  }
  var observer=new MutationObserver(function(){
    if(root.getAttribute("data-ready")==="true"){
      observer.disconnect();fill();
      if(pending){pending=false;run();}
    }
  });
  if(root.getAttribute("data-ready")==="true")fill();
  else observer.observe(root,{attributes:true,attributeFilter:["data-ready"]});
  root.addEventListener("slashpromo:doctor-facet-selected",function(){
    term.value="";spec.value="";
    status.textContent="Showing doctors in the selected specialty.";
  });
  hero.addEventListener("submit",function(event){
    event.preventDefault();
    if(!run()){
      pending=true;status.textContent="Loading the local doctor directory.";
      root.scrollIntoView({behavior:"smooth",block:"start"});
    }
  });
});
})();