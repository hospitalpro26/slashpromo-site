/* Khairpur published-doctor directories: static HTML remains crawlable.
 * Accessible, local-only filters with fixed six-card progressive expansion.
 * No doctor schedules, live status, cookies, analytics, or submissions.
 */
(function(){
"use strict";
const labels={medicine:"Consultant Physicians",neurology:"Neurologists",diabetology:"Diabetologists",sonography:"Sonologists & Ultrasound Specialists",gastroenterology:"Gastroenterologists",cardiology:"Cardiologists",general_surgery:"General Surgeons",pediatric_surgery:"Paediatric Surgeons",paediatrics:"Paediatricians",gynecology:"Gynecologists",dermatology:"Dermatologists",orthopedics:"Orthopedic Surgeons",urology:"Urologists",dentistry:"Dentists"};
const clean=value=>String(value??"").normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
document.querySelectorAll("[data-khp-directory]").forEach(root=>{
  const cards=Array.from(root.querySelectorAll("[data-khp-card]"));
  if(!cards.length)return;
  const form=root.querySelector("[data-khp-form]");
  const q=root.querySelector("[data-khp-query]");
  const select=root.querySelector("[data-khp-select]");
  const chips=root.querySelector("[data-khp-facets]");
  const count=root.querySelector("[data-khp-count]");
  const more=root.querySelector("[data-khp-more]");
  const clear=root.querySelector("[data-khp-clear]");
  const empty=root.querySelector("[data-khp-empty]");
  const hero=document.querySelector("[data-khp-hero]");
  const heroQuery=hero?.querySelector("[data-khp-hero-query]");
  const heroSelect=hero?.querySelector("[data-khp-hero-select]");
  const groups=[...new Set(cards.map(x=>x.dataset.khpGroup).filter(Boolean))];
  const ordered=Object.keys(labels).filter(key=>groups.includes(key));
  const counts=new Map(ordered.map(key=>[key,cards.filter(x=>x.dataset.khpGroup===key).length]));
  let keyword="",selected="",limit=6;
  function addOptions(element){
    if(!element)return;
    element.replaceChildren(new Option("All specialties",""));
    ordered.forEach(key=>element.appendChild(new Option(labels[key],key)));
  }
  addOptions(select);addOptions(heroSelect);
  if(chips){
    chips.replaceChildren();
    [["","All doctors",cards.length],...ordered.map(key=>[key,labels[key],counts.get(key)])].forEach(([key,label,n])=>{
      const btn=document.createElement("button");btn.type="button";
      btn.dataset.khpFacet=key;btn.setAttribute("aria-pressed",String(key===""));
      btn.textContent=label+" ("+n+")";chips.appendChild(btn);
    });
  }
  function draw(){
    const matches=cards.filter(card=>(!selected||card.dataset.khpGroup===selected)&&(!keyword||clean([card.dataset.khpName,card.dataset.khpSpecialty,card.dataset.khpHospital].join(" ")).includes(keyword)));
    let shown=0;
    const matchSet=new Set(matches);
    cards.forEach(card=>{const match=matchSet.has(card);card.hidden=!(match&&shown<limit);if(match)shown++;});
    if(count)count.textContent=matches.length+" doctor"+(matches.length===1?"":"s")+" found · Khairpur";
    if(empty)empty.hidden=matches.length!==0;
    if(more){const remaining=Math.max(0,matches.length-limit);more.hidden=remaining===0;more.textContent="Show more doctors ("+remaining+" remaining)";}
    chips?.querySelectorAll("[data-khp-facet]").forEach(btn=>btn.setAttribute("aria-pressed",String((btn.dataset.khpFacet||"")===selected)));
  }
  function apply(text,group,scroll){
    keyword=clean(text);selected=ordered.includes(group)?group:"";limit=6;
    if(q)q.value=text||"";if(select)select.value=selected;
    if(heroQuery)heroQuery.value=text||"";if(heroSelect)heroSelect.value=selected;
    draw();if(scroll)root.scrollIntoView({behavior:"smooth",block:"start"});
  }
  chips?.addEventListener("click",event=>{const btn=event.target.closest("[data-khp-facet]");if(btn&&chips.contains(btn))apply("",btn.dataset.khpFacet,true);});
  form?.addEventListener("submit",e=>{e.preventDefault();apply(q?.value||"",select?.value||"",true);});
  q?.addEventListener("input",()=>apply(q.value,select?.value||"",false));
  select?.addEventListener("change",()=>apply(q?.value||"",select.value,false));
  clear?.addEventListener("click",()=>apply("","",false));
  more?.addEventListener("click",()=>{limit+=6;draw();});
  hero?.addEventListener("submit",e=>{e.preventDefault();apply(heroQuery?.value||"",heroSelect?.value||"",true);});
  draw();
});
})();