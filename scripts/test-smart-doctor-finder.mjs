/* Non-publishing regression tests for SlashPromo's real doctor-search functions and public directory data. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("assets/native-directory.js","utf8");
const db=JSON.parse(fs.readFileSync("assets/directory.json","utf8"));
assert.ok(source.includes("if (!roots.length) return;"),"Original script guard changed");
assert.ok(source.trimEnd().endsWith("})();"),"Unexpected script format");
const instrumented=source
  .replace("if (!roots.length) return;","/* test harness allows pure helper evaluation */")
  .replace(/}\)\(\);\s*$/,"globalThis.__finder={normal,matchesTextSearch,filterByCity,hospitalKey,slashcureLink};})();");
const sandbox={
  document:{querySelectorAll:()=>[]},
  fetch:async()=>({ok:true,json:async()=>({doctors:[],hospitals:[]})}),
  URL,URLSearchParams
};
vm.runInNewContext(instrumented,sandbox,{timeout:1500,filename:"assets/native-directory.js"});
const {normal,matchesTextSearch,filterByCity,hospitalKey,slashcureLink}=sandbox.__finder;
assert.equal(normal("دِل کا ڈاکٹر"),"دل کا ڈاکٹر","Urdu diacritics normalize");
assert.equal(normal("Paediatrician"),"pediatrician","English spelling normalizes");

const doctors=db.doctors;
assert.ok(doctors.length>0,"Existing directory must be present");
assert.equal(new Set(doctors.map(d=>d.url)).size,doctors.length,"No duplicate local profile URLs");
const pick=expression=>doctors.find(d=>expression.test(d.specialty||""));
const cardio=pick(/cardiolog/i),pediatrician=pick(/paediatrician|pediatrician/i),
  pediatricSurgeon=pick(/p[a]?ediatric.*surgeon|pediatric.*surgeon/i),
  gynae=pick(/gynecol|gynaecol|obstetric/i);
assert.ok(cardio&&pediatrician&&gynae,"Representative specialties missing");
assert.equal(matchesTextSearch(cardio,normal("دل کا ڈاکٹر")),true,"Urdu cardiac synonym");
assert.equal(matchesTextSearch(cardio,normal("heart specialist")),true,"English cardiac synonym");
assert.equal(matchesTextSearch(gynae,normal("ماہر امراض نسواں")),true,"Urdu gynecology synonym");
assert.equal(matchesTextSearch(pediatrician,normal("بچوں کا ڈاکٹر")),true,"Urdu paediatrics synonym");
assert.equal(matchesTextSearch(gynae,normal("دل کا ڈاکٹر")),false,"Never infer unrelated specialty");
assert.equal(matchesTextSearch(cardio,normal("نامعلوم ماہر")),false,"Unknown Urdu must not show all doctors");
if(pediatricSurgeon)assert.equal(matchesTextSearch(pediatricSurgeon,normal("بچوں کا ڈاکٹر")),false,"Paediatric surgeons are not general paediatricians");

for(const city of ["Sukkur","Karachi","Lahore","Khairpur","Hyderabad","Pano Aqil"]){
  const subset=filterByCity(doctors,city);
  assert.ok(subset.length>0,city+" has profiles");
  assert.ok(subset.every(d=>(d.cities||[d.city]).some(c=>normal(c)===normal(city))),city+" filtering");
}
assert.equal(hospitalKey("Hira Medical Centre, Sukkur"),hospitalKey("Hira Medical Centre Sukkur"),"Existing hospital alias retained");

const direct=doctors.find(d=>/^https:\/\/(?:www\.)?slashcure\.com\/[^/]+\/[^/]+\/dr-/i.test(d.externalProfile||""));
assert.ok(direct,"A verified-format Slashcure doctor URL must exist");
const doctorLink=slashcureLink(direct);
assert.equal(doctorLink.direct,true,"Safe published Slashcure profile gets a direct link");
assert.equal(doctorLink.url,direct.externalProfile,"Never invent or rewrite published links");
const fallback=slashcureLink({...direct,externalProfile:"https://example.net/not-slashcure"});
assert.equal(fallback.direct,false,"External untrusted host is not a doctor profile");
assert.ok(fallback.url.startsWith("https://slashcure.com/doctors?"),"Fallback is a Slashcure search URL");
const hospitalOnly=slashcureLink({...direct,externalProfile:"https://slashcure.com/hospitals/lahore/neo-medical-center"});
assert.equal(hospitalOnly.direct,true,"Published hospital roster source should open the facility");
assert.ok(hospitalOnly.label.includes("hospital listing"),"Hospital roster must be labeled as facility, not doctor profile");
assert.ok(source.includes('ensureDoctorFilter("data-native-hospital"') &&
  source.includes('ensureDoctorFilter("data-native-area"') &&
  source.includes("refreshDependentFilters()"),"Existing filters must be extended, not replaced");

console.log("PASS: bilingual specialty search, city filtering, hospital normalization, duplicate safety, and conservative Slashcure links.");
