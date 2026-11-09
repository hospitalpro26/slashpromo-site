/* Hyderabad source-linked doctor listings. Filters only on the client.
   Cards remain in static HTML for SEO and no-JS accessibility.
   Never retrieves, displays or caches doctor schedules/availability. */
(function(){
"use strict";
const labels={all:"All doctors",cardiology:"Cardiologists",electrophysiology:"Electrophysiologists",cardiac_surgery:"Cardiac surgeons",neurology:"Neurophysicians",neurosurgery:"Neurosurgeons",medicine:"General physicians",paediatrics:"Paediatricians",dentistry:"Dentists"};
const normal=v=>String(v||"").normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g,"").trim();
document.querySelectorAll("[data-hyd-doctor-directory]").forEach(root=>{
 const cards=[...root.querySelectorAll("[data-hyd-doctor]")];
 if(!cards.length)return;
 const form=root.querySelector("[data-native-search]");
 const query=root.querySelector("[data-native-query]");
 const specialty=root.querySelector("[data-native-specialty]");
 const facets=root.querySelector("[data-native-facets]");
 const count=root.querySelector("[data-native-count]");
 const more=root.querySelector("[data-native-more]");
 const reset=root.querySelector("[data-native-reset]");
 const hero=document.querySelector("[data-hyd-hero]");
 const heroQuery=hero?.querySelector("[data-city-search-term]");
 const heroSpecialty=hero?.querySelector("[data-city-search-specialty]");
 let selected="",term="",visible=6;
 const groups=[...new Set(cards.map(card=>card.dataset.hydGroup||"").filter(Boolean))];
 const ordered=Object.keys(labels).filter(k=>k!=="all"&&groups.includes(k));
 function makeOptions(el){if(!el)return;const current=el.value;el.replaceChildren(new Option("All specialties",""));ordered.forEach(key=>el.appendChild(new Option(labels[key],key)));if([...el.options].some(x=>x.value===current))el.value=current;}
 makeOptions(specialty);makeOptions(heroSpecialty);
 if(facets){facets.replaceChildren();[["","All doctors"],...ordered.map(k=>[k,labels[k]])].forEach(([key,label])=>{const b=document.createElement("button");b.type="button";b.dataset.hydFacet=key;b.setAttribute("aria-pressed",key===""?"true":"false");b.textContent=label;facets.appendChild(b)});}
 const show=()=>{
  const matching=cards.filter(card=>(!selected||card.dataset.hydGroup===selected)&&(!term||normal([card.dataset.hydName,card.dataset.hydSpecialty,card.dataset.hydHospital].join(" ")).includes(term)));
  let shown=0;
  cards.forEach(card=>{const match=matching.includes(card),present=match&&shown<visible;card.hidden=!present;if(match)shown++;});
  if(count)count.textContent=matching.length+" Hyderabad doctor"+(matching.length===1?"":"s")+" found";
  if(more){const left=matching.length-visible;more.hidden=left<=0;more.textContent="Show more doctors ("+Math.max(0,left)+" remaining)";}
  facets?.querySelectorAll("[data-hyd-facet]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.hydFacet===selected)));
 };
 const apply=(name,group)=>{term=normal(name);selected=group||"";visible=6;if(query)query.value=name||"";if(specialty)specialty.value=selected;if(heroQuery)heroQuery.value=name||"";if(heroSpecialty)heroSpecialty.value=selected;show();};
 facets?.addEventListener("click",e=>{const b=e.target.closest("[data-hyd-facet]");if(!b||!facets.contains(b))return;apply("",b.dataset.hydFacet);});
 form?.addEventListener("submit",e=>{e.preventDefault();apply(query?.value||"",specialty?.value||"");root.scrollIntoView({behavior:"smooth",block:"start"});});
 query?.addEventListener("input",()=>apply(query.value,specialty?.value||""));
 specialty?.addEventListener("change",()=>apply(query?.value||"",specialty.value));
 reset?.addEventListener("click",()=>apply("",""));
 more?.addEventListener("click",()=>{visible+=6;show()});
 hero?.addEventListener("submit",e=>{e.preventDefault();apply(heroQuery?.value||"",heroSpecialty?.value||"");root.scrollIntoView({behavior:"smooth",block:"start"});});
 show();
});
})();