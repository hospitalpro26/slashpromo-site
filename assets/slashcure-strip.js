/* Approved lightweight Slashcure strip for suitable SlashPromo public pages.
 * Contextual referral copy only; SlashPromo's own search remains independent.
 * No admin, policy, contact, or conversion pages receive an ad.
 */
(() => {
  "use strict";
  if (document.querySelector("[data-slashcure-strip]")) return;
  const main = document.querySelector("main");
  if (!main) return;
  const path = (location.pathname.replace(/\/+/g, "/").replace(/\/?$/, "/") || "/").toLowerCase();
  const excluded = new Set([
    "/admin/", "/about/", "/advertise/", "/contact/", "/faq/", "/terms/",
    "/privacy/", "/cookie-policy/", "/editorial-policy/", "/advertising-policy/",
    "/accessibility/"
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
  let heading="", description="";
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
    heading="Explore "+(profileName||"specialist doctors")+" in "+cityName;
    description="Looking for "+(specialty ? specialty.toLowerCase()+" services" : "specialist care")+" in "+cityName+"? Explore this doctor's profile on SlashPromo. Visit Slashcure for provider-published OPD hours, hospital information and live notices where available.";
  } else if (hospitalProfile){
    heading="Explore "+(profileName||"healthcare facilities")+" in "+cityName;
    description="Looking for doctors and hospital information in "+cityName+"? Explore this facility's SlashPromo profile, then visit Slashcure for published provider details, OPD schedules and availability notices where available.";
  } else if (cityName){
    heading="Looking for doctors and hospitals in "+cityName+"?";
    description="Discover doctor profiles, medical specialties, hospitals and clinics in "+cityName+" on SlashPromo. Visit Slashcure for published OPD timings and live clinic notices where available.";
  } else return;
  const section=document.createElement("section");
  section.className="sc-strip-section";
  section.setAttribute("aria-label","Slashcure partner advertisement");
  const container=document.createElement("div");
  container.className="wrap";
  const banner=document.createElement("aside");
  banner.className="sc-promo-strip";
  banner.dataset.slashcureStrip="";
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
  tagline.textContent="Health Care, Connected."+(cityName ? " · "+cityName+", Pakistan" : " · Pakistan");
  copy.append(mark,h2,p,tagline);
  const cta=document.createElement("a");
  cta.className="sc-promo-button";
  cta.href="https://slashcure.com/";
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
