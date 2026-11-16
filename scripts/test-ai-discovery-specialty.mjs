import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {onRequestPost} from "../functions/api/ai-discovery.js";

const directory=JSON.parse(readFileSync(new URL("../assets/directory.json",import.meta.url),"utf8"));
const ctx={
  env:{ASSETS:{fetch:async()=>new Response(JSON.stringify(directory),{status:200})}}
};
async function search(question,ai){
  const req=new Request("https://slashpromo.com/api/ai-discovery",{
    method:"POST",headers:{"content-type":"application/json","origin":"https://slashpromo.com"},
    body:JSON.stringify({question})
  });
  const response=await onRequestPost({...ctx,request:req,...(ai||{})});
  assert.equal(response.status,200,question);
  return response.json();
}
const physicians=await search("Find consultant physicians in Sukkur");
assert(physicians.results.length>0,"Sukkur consultant physician must be discoverable");
assert(physicians.results.every(r=>/consultant physician|internal medicine/i.test(r.specialty)), "Surgeons and unrelated clinicians must not appear in consultant physician searches");
const ratodero=await search("رتوڈیرو میں فزیشن");
assert(ratodero.results.length>0&&ratodero.results.every(r=>r.city==="Ratodero"),"Urdu Ratodero city must be interpreted correctly");
assert(ratodero.results.every(r=>!(/surgeon/i.test(r.specialty))),"Urdu physician search must exclude surgeons");
const urdu=await search("سکھر میں جنرل فزیشن");
assert(urdu.results.length>0&&urdu.results.every(r=>r.city==="Sukkur"),"Urdu Sukkur city must be interpreted correctly");
assert(urdu.results.every(r=>!(/surgeon/i.test(r.specialty))),"Urdu general physician search must exclude surgeons");
const female=await search("female consultant physician in Ratodero");
assert(female.results.some(r=>r.name==="Dr. Nadia Khan Arbani"),"Known female Ratodero physician must appear");
assert(female.results.every(r=>r.city==="Ratodero"),"Female search must respect city");
const femaleSukkur=await search("lady physician in Sukkur");
assert(femaleSukkur.results.some(r=>r.name==="Dr. Salma Lakho"),"Known female Sukkur physician must appear");
const surgeons=await search("general surgeon in Sukkur");
assert(surgeons.results.some(r=>/Surgeon/i.test(r.specialty)),"Surgery search must find surgeons");
assert(surgeons.results.every(r=>/surgeon|surgery/i.test(r.specialty)),"Surgery results must exclude non-surgeons");
const pluralSurgeons=await search("surgeons in Sukkur");
assert(pluralSurgeons.results.length>0&&pluralSurgeons.results.every(r=>/surgeon|surgery/i.test(r.specialty)),"Plural surgeons must not return physicians");
const exact=await search("consultant physician in Ratodero");
assert(exact.results.length>0&&exact.results.every(r=>r.city==="Ratodero"),"Explicit city cannot be ignored");
const nonsense=await search("nonsense specialty in Ratodero");
assert.equal(nonsense.results.length,0,"Unknown specialty must not return arbitrary city doctors");
const cityOnly=await search("find doctors in Ratodero");
assert(cityOnly.results.length>0&&cityOnly.results.every(r=>r.city==="Ratodero"),"City-only searches may list local doctors");
const aiChanged=await search("consultant physician in Ratodero",{env:{
  ...ctx.env,AI_DISCOVERY_ENABLED:"true",
  AI:{run:async()=>({response:JSON.stringify({query:"general surgeon in Sukkur",city:"Sukkur"})})}
}});
assert(aiChanged.results.every(r=>r.city==="Ratodero"),"AI must not override user's city");
assert(aiChanged.results.every(r=>/consultant physician|internal medicine/i.test(r.specialty)),"AI must not override explicit physician specialty");
const romanUrdu=await search("dil ka doctor Sukkur");
assert(romanUrdu.results.length>0&&romanUrdu.results.every(r=>/cardiolog/i.test(r.specialty)),"Roman Urdu heart-doctor query must show cardiologists only");
const romanChild=await search("bachon ka doctor Sukkur");
assert(romanChild.results.length>0&&romanChild.results.every(r=>/paediatric|pediatric/i.test(r.specialty)),"Roman Urdu child-doctor query must show paediatricians only");
const namedHospital=await search("general surgeon at Hira Medical Centre in Sukkur");
assert(namedHospital.results.length>0,"Known Hira surgical listing should be found");
assert(namedHospital.results.every(r=>/hira medical centre/i.test(r.hospital)&&/surgeon|surgery/i.test(r.specialty)),"Hospital and specialty must both be enforced");
const romanLungs=await search("saans ka doctor Ghotki");
assert(romanLungs.results.length>0&&romanLungs.results.every(r=>/pulmonolog/i.test(r.specialty)),"Roman Urdu respiratory query must only match pulmonologists");
const area=await search("orthopedic surgeon on Barrage Colony Sukkur");
assert(area.results.length>0&&area.results.every(r=>r.city==="Sukkur"&&/orthop/i.test(r.specialty)),"Published clinic-area matches must preserve specialty and city");
const road=await search("paediatrician on Shikarpur Road Sukkur");
assert(road.results.every(r=>r.city==="Sukkur"),"Shikarpur Road must not become Shikarpur city");
const ambiguous=await search("cardiologist or pulmonologist in Sukkur");
assert.equal(ambiguous.clarification,true,"Two explicit specialties require clarification");
assert.equal(ambiguous.results.length,0,"Ambiguous searches must not return only one specialty");
const alternative=await search("cardiologist in Ratodero");
assert.equal(alternative.results.length,0,"Do not invent a local cardiologist");
assert(alternative.suggestedCities.includes("Sukkur"),"Offer a city with published cardiologists when no local listing exists");
const emergency=await search("chest pain need doctor");
assert.equal(emergency.urgent,true,"Emergency warning must remain functional");
console.log("PASS: physicians vs surgeons, Urdu aliases, female verified listings, exact cities, AI override safety, emergency handling.");
