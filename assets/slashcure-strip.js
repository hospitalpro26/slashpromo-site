/* Approved contextual Slashcure promotional strip for public SlashPromo pages.
 * City pages, doctor specialties and hospital profiles get distinct GEO-focused copy.
 * SlashPromo's native search remains fully independent of Slashcure.
 * Admin, inaccessible routes and legal-policy documents are excluded.
 */
(() => {
  "use strict";
  if (document.querySelector("[data-slashcure-strip]")) return;
  const main = document.querySelector("main");
  if (!main) return;
  const path = (location.pathname.replace(/\/+/g, "/").replace(/\/?$/, "/") || "/").toLowerCase();
  const excluded = new Set([
    "/admin/", "/terms/", "/privacy/", "/cookie-policy/",
    "/editorial-policy/", "/advertising-policy/", "/accessibility/"
  ]);
  if (excluded.has(path) || path.startsWith("/admin/")) return;
  const cityPages = {
    "/sukkur/":"Sukkur", "/khairpur/":"Khairpur", "/shikarpur/":"Shikarpur",
    "/ghotki/":"Ghotki", "/karachi/":"Karachi"
  };
  const page = path.split("/").filter(Boolean);
  const prettify = slug => slug.split("-").map(word=>word[0] ? word[0].toUpperCase()+word.slice(1) : "").join(" ");
  const doctorProfile = page.length===3 && page[0]==="doctors";
  const hospitalProfile = page.length===3 && page[0]==="hospitals";
  const cityName = cityPages[path] || (doctorProfile||hospitalProfile ? prettify(page[1]) : "");
  const profileName = main.querySelector("h1")?.textContent?.trim()?.slice(0,115) || "";
  const specialty = main.querySelector(".sp-subtitle")?.textContent?.trim()?.slice(0,95) || "";
  const specialtyGroup = value => {
    const s = String(value||"").toLowerCase().replace(/paediatric/g,"pediatric").replace(/gynaecolog/g,"gynecolog").replace(/orthopaed/g,"orthoped");
    if(/gastro|hepat|liver|endoscop/.test(s))return "gastroenterologists and liver specialists";
    if(/cardio|cardiac/.test(s))return "cardiologists and heart specialists";
    if(/neurosurg/.test(s))return "neurosurgeons";
    if(/neurolog|neurophysician/.test(s))return "neurologists and neurophysicians";
    if(/orthope|spine|trauma/.test(s))return "orthopedic and spine specialists";
    if(/gynecol|obstetric/.test(s))return "gynecologists and obstetricians";
    if(/pediatric.*surg|child.*surg|neonatal.*surg/.test(s))return "pediatric surgeons";
    if(/pediatric|neonatal|child/.test(s))return "pediatricians and child specialists";
    if(/dent|prosthodont/.test(s))return "dentists and dental specialists";
    if(/physio|rehabilitat|dry needling/.test(s))return "physiotherapists and rehabilitation specialists";
    if(/urolog/.test(s))return "urologists and kidney specialists";
    if(/nephrol|renal/.test(s))return "nephrologists and kidney specialists";
    if(/pulmon|chest|respirat/.test(s))return "pulmonologists and chest specialists";
    if(/psychiatr|mental health/.test(s))return "psychiatrists and mental health specialists";
    if(/derm|skin/.test(s))return "dermatologists and skin specialists";
    if(/hematol|haematol/.test(s))return "hematologists and blood specialists";
    if(/diabet|endocrin/.test(s))return "diabetes and endocrine specialists";
    if(/ent|otolaryng/.test(s))return "ENT specialists";
    if(/general.*surg|laparoscop|surg/.test(s))return "general and laparoscopic surgeons";
    if(/internal medicine|consultant physician|medical specialist|general physician|family physician/.test(s))return "consultant physicians and internal medicine specialists";
    return "specialist doctors";
  };
  const cityDescriptions = {
    Sukkur:"Explore consultant physicians, gastroenterologists, cardiologists, gynecologists and other doctors in Sukkur. Browse hospitals including Hira Medical Centre, River City Hospital and Dr. Ziauddin Hospital, then check published OPD schedules and updates where available.",
    Khairpur:"Looking for doctors in Khairpur? Explore consultant physicians, neurology specialists, hospital and clinic profiles across Khairpur, Sindh. Visit Slashcure for published doctor schedules and OPD updates where available.",
    Karachi:"Find doctors and specialist care in Karachi, Sindh. Explore physiotherapists, rehabilitation services, neurologists and other medical professionals; check published clinic schedules and hospital information where available.",
    Shikarpur:"Discover doctors in Shikarpur, Sindh, including physiotherapy, general medicine and other specialties. Explore provider information and check published OPD timings, clinics and availability updates where available.",
    Ghotki:"Looking for doctors in Ghotki, Sindh? Explore physicians, chest specialists and healthcare facilities. Check published doctor profiles, OPD hours and clinic notices on Slashcure where available."
  };
  let heading="", description="",context="general";
  if(path==="/"){
    heading="Explore doctors, hospitals & OPD schedules across Pakistan";
    description="Looking for the right doctor in Pakistan? Find specialist profiles and hospitals on SlashPromo, and use Slashcure to check published clinic schedules, OPD updates and available provider information.";
  } else if (path==="/doctors/"){
    heading="Looking for the best doctor for your needs in Pakistan?";
    description="Explore doctor names, specialties and city-wise profiles on SlashPromo. Visit Slashcure for published OPD schedules, clinic availability notices and hospital information where available.";
  } else if (path==="/hospitals/"){
    heading="Find hospitals, specialists & OPD information in Pakistan";
    description="Discover hospital and healthcare centre profiles on SlashPromo. Visit Slashcure to check available specialist listings, published clinic schedules and hospital updates.";
  } else if (path==="/cities/"){
    heading="Find doctors and hospitals across cities in Pakistan";
    description="Discover city-wise healthcare information, doctors and specialists on SlashPromo. Visit Slashcure for provider-published OPD schedules and updates where available.";
  } else if (path==="/clinics/"){
    heading="Discover clinics & specialist doctors across Pakistan";
    description="Explore healthcare centres, specialists and clinical services on SlashPromo. Check Slashcure for published OPD timings, doctor schedules and related updates when available.";
  } else if (path==="/laboratories/"){
    heading="Explore diagnostic centres & healthcare services in Pakistan";
    description="Find healthcare and diagnostic service information on SlashPromo, then visit Slashcure for doctor profiles, hospitals and available published clinic updates.";
  } else if (doctorProfile){
    const group=specialtyGroup(specialty);
    context="specialty";
    heading="Explore other "+group+" in "+cityName;
    description="Looking for more "+group+" in "+cityName+"? Discover other doctor profiles, specialty options and clinics on Slashcure. Review published OPD schedules and live updates where provided; confirm appointments with each clinic.";
  } else if (hospitalProfile){
    context="hospital";
    heading="Discover doctors and hospitals around "+cityName;
    description="Exploring "+(profileName||"a hospital")+" in "+cityName+"? Discover doctors in the area, related specialists and other hospitals on Slashcure. Check published OPD timings and provider updates where available.";
  } else if (cityName){
    context="city";
    heading="Looking for the best doctors in "+cityName+"?";
    description=cityDescriptions[cityName] || "Explore doctors, hospitals, medical specialties and clinic information in "+cityName+", Pakistan. Check published OPD schedules and notices where available.";
  } else if (path==="/about/"){
    heading="Explore doctors, hospitals and clinics across Pakistan";
    description="Learn about SlashPromo's healthcare promotion work, then discover doctors, hospitals and published OPD schedules on Slashcure where available.";
  } else if (path==="/faq/"){
    heading="Need doctor names, clinics or OPD schedule information?";
    description="Browse doctors by specialty and city, explore hospital profiles and check published clinic timings on Slashcure where available.";
  } else if (path==="/contact/"){
    heading="Find doctors and hospitals while exploring healthcare";
    description="Looking for a specialist, clinic or hospital? Discover doctor profiles and published OPD information on Slashcure while SlashPromo handles promotion enquiries.";
  } else if (path==="/advertise/"){
    heading="Connect healthcare audiences with helpful information";
    description="See how people can explore doctors, hospitals and published OPD schedules on Slashcure while SlashPromo helps organizations present accurate healthcare promotions.";
  } else return;
  const section=document.createElement("section");
  section.className="sc-strip-section";
  section.setAttribute("aria-label","Slashcure partner advertisement");
  const container=document.createElement("div");
  container.className="wrap";
  const banner=document.createElement("aside");
  banner.className="sc-promo-strip";
  banner.dataset.slashcureStrip="";
  banner.dataset.context=context;
  banner.setAttribute("aria-label","Visit Slashcure for doctors, hospitals and OPD information");
  const copy=document.createElement("div");
  copy.className="sc-promo-copy";
  const mark=document.createElement("div");
  mark.className="sc-promo-mark";
  mark.setAttribute("aria-label","Slashcure.com");
  mark.append(document.createTextNode("Slash"));
  const red=document.createElement("strong");
  red.textContent="cure";
  const dot=document.createElement("small");
  dot.textContent=".com";
  mark.append(red,dot);
  const h2=document.createElement("h2");
  h2.className="sc-promo-heading";
  h2.textContent=heading;
  const p=document.createElement("p");
  p.className="sc-promo-description";
  p.textContent=description;
  const tagline=document.createElement("p");
  tagline.className="sc-promo-tagline";
  tagline.textContent="Advertisement · Health Care, Connected."+(cityName ? " · "+cityName+", Pakistan" : " · Pakistan");
  copy.append(mark,h2,p,tagline);
  const cta=document.createElement("a");
  cta.className="sc-promo-button";
  cta.href=cityName==="Sukkur" ? "https://slashcure.com/doctors/sukkur" : "https://slashcure.com/doctors";
  cta.target="_blank";
  cta.rel="noopener noreferrer";
  cta.setAttribute("aria-label","Visit Slashcure.com");
  const letters=document.createElement("span");
  letters.className="sc-promo-button-letters";
  letters.setAttribute("aria-hidden","true");
  [..."Visit Slashcure.com"].forEach((char,i)=>{
    const span=document.createElement("span");
    if(char!==" "){
      span.className="sc-promo-wave-letter";
      span.style.setProperty("--sc-i",i);
      span.textContent=char;
    } else span.textContent="\u00a0";
    letters.append(span);
  });
  const arrow=document.createElement("span");
  arrow.className="sc-promo-arrow";
  arrow.setAttribute("aria-hidden","true");
  arrow.textContent="↗";
  cta.append(letters,arrow);
  banner.append(copy,cta);
  container.append(banner);
  section.append(container);
  const sections=[...main.children].filter(el=>el.tagName==="SECTION");
  let anchor;
  if(doctorProfile||hospitalProfile) anchor=main.querySelector(".sp-profile")||sections[sections.length-1];
  else if(path==="/") anchor=main.querySelector("#explore-cities")||sections[3]||sections[1];
  else if(path==="/doctors/"||path==="/hospitals/") anchor=main.querySelector(".sp-index")||sections[1];
  else if(["/about/","/faq/","/contact/","/advertise/"].includes(path)) anchor=sections[sections.length-2]||sections[0];
  else anchor=sections[1]||sections[0];
  if(!anchor) return;
  anchor.insertAdjacentElement("afterend",section);
  if(!document.querySelector('link[href="/assets/slashcure-strip.css"]')){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="/assets/slashcure-strip.css";
    document.head.append(css);
  }
})();
