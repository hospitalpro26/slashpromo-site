import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync(new URL("../hospitals/sukkur/red-crescent-hospital-sukkur/index.html",import.meta.url),"utf8");
const data=JSON.parse(readFileSync(new URL("../assets/directory.json",import.meta.url),"utf8"));
const hospital=data.hospitals.find(x=>x.id==="sukkur-red-crescent-hospital-sukkur");
assert(hospital,"Missing hospital listing");
const ids=["sukkur-dr-tofique-ahmed-kamboh","sukkur-dr-aftab-ahmed-mughal"];
assert.deepEqual([...hospital.linkedDoctorIds].sort(),[...ids].sort(),"Hospital doctor roster changed without approval");
for(const id of ids){
  const d=data.doctors.find(x=>x.id===id);
  assert(d && /Red Crescent/i.test(d.hospital),id+" wrong hospital");
  assert(/^https:\/\/slashcure\.com\//.test(d.externalProfile),id+" not linked to Slashcure");
  assert(html.includes('href="'+d.externalProfile+'"'),id+" link absent on expanded hospital page");
  assert(html.includes('href="'+d.url+'"'),id+" local profile link absent");
}
assert(html.includes('id="red-crescent-visitor-faq"'),"Missing patient-facing FAQ");
for(const needle of ["Hilal-e-Ahmer Hospital Sukkur","Minara Road, near SIUT","not a complete hospital roster","not been independently confirmed","Suggest a correction for review"]){
  assert(html.includes(needle),"Unclear or unsafe patient information: "+needle);
}
assert(html.includes('href="/doctors/sukkur/consultant-physicians/"')&&html.includes('href="/doctors/sukkur/general-surgeons/"'),"Specialty navigation missing");
const knownUnverified=["Khalil Ahmed","Awaais Iqbal Bhatti","Tanveer Shaikh","Saqib Shah","Syed Ghaznafar Mehdi","Mehmood Ahmed"];
assert(knownUnverified.every(name=>!html.includes(name)),"Unreviewed doctor name must not enter published roster");
const idsOnPage=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(idsOnPage).size,idsOnPage.length,"Duplicate HTML section ID");
for(const m of html.matchAll(/href="#([^"]+)"/g))assert(idsOnPage.includes(m[1]),"Broken intra-page anchor");
const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert(schemas.length>=1,"Hospital JSON-LD missing");
assert(schemas.every(m=>JSON.parse(m[1])["@context"]==="https://schema.org"),"Invalid JSON-LD");
console.log("PASS: verified Red Crescent doctor links, hospital roster unchanged, visible bilingual patient guidance, internal specialty links, private-only candidate safeguards and valid structured data.");