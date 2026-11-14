import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const native=read("assets/native-directory.js");
const paired=read("assets/cross-profile-links.js");
const site=read("assets/site.js");
const css=read("assets/cross-profile-links.css");
const directory=JSON.parse(read("assets/directory.json"));
new Function(native);new Function(paired);new Function(site);
assert(site.includes("cross-profile-links.js?v=20261109-patient3"),"Shared site script must load fresh patient module");
assert(paired.includes("cross-profile-links.css?v=20261109-patient3"),"Patient guidance stylesheet must be cache-busted");
assert(paired.includes("profileGuide(record,kind)")&&paired.includes("cityGuide()"),"Patient guidance must run on existing provider and city pages");
assert(paired.includes("record.hospital")&&paired.includes("record.area")&&paired.includes("record.address"),"Guidance must use directory-backed clinic and location fields");
assert(paired.includes("destination(record,kind)"),"Patient guides must use validated Slashcure destinations");
assert(paired.includes("phoneHref(record.phone)"),"Call actions require a published facility phone number");
assert(paired.includes("encodeURIComponent(address)"),"Map searches must encode an existing address");
assert(paired.includes("Schedules")||paired.includes("schedules"),"Guidance must not promise live scheduling");
assert(native.includes("Listed area:")&&native.includes("sp-card-patient-detail"),"Directory cards must display grounded locations");
assert(native.includes("Check OPD & contact on Slashcure"),"Doctor cards must make OPD action clear");
assert(native.includes("Call published number"),"Hospital cards must offer a call only if a number exists");
assert(native.includes("r.kind==="+'"hospital"&&typeof r.phone==='+'"string"'),"Contact information must be conditional");
assert(css.includes(".sp-patient-guide")&&css.includes("@media(max-width:620px)"),"Patient guide needs responsive styling");

const links={
  "Sukkur":["sukkur/index.html","listed-doctors","listed-hospitals"],
  "Karachi":["karachi/index.html","listed-doctors","karachi-healthcare"],
  "Khairpur":["khairpur/index.html","khairpur-doctors","khairpur-facilities"],
  "Shikarpur":["shikarpur/index.html","shikarpur-doctors","shikarpur-hospitals"]
};
for(const [city,[file,doctorId,facilityId]] of Object.entries(links)){
  const html=read(file);
  assert(html.includes('id="'+doctorId+'"'),city+" doctor jump target missing");
  assert(html.includes('id="'+facilityId+'"'),city+" facility jump target missing");
  assert(/\/assets\/site\.js(?:\?v=[a-zA-Z0-9-]+)?/.test(html),city+" page must load shared patient script");
  assert((directory.doctors||[]).some(r=>r.city===city),city+" doctor directory records missing");
  assert((directory.hospitals||[]).some(r=>r.city===city),city+" facility directory records missing");
}
const validNumber=/^[+0-9\s().-]{7,25}$/;
assert(validNumber.test("+92 346 8078687"),"Pakistani phone formatting should pass");
assert(!validNumber.test("javascript:alert(1)"),"Invalid phone input must be rejected");
assert.equal("+92 346 8078687".replace(/[^+\d]/g,""),"+923468078687");
const all=[...(directory.doctors||[]),...(directory.hospitals||[])];
let direct=0,fallback=0;
for(const record of all){
 if(!record.externalProfile){fallback++;continue}
 const url=new URL(record.externalProfile);
 assert.equal(url.protocol,"https:","Only HTTPS direct links allowed");
 assert(["slashcure.com","www.slashcure.com"].includes(url.hostname),"Invalid Slashcure hostname");
 direct++;
}
assert(direct>0&&fallback>0,"Direct and fallback patient navigation must coexist");
console.log("PASS: responsive city and profile guides; existing clinic facts, validated links, published contact details, safe map searches.");
console.log("Directory audit: "+all.length+" records, "+direct+" direct Slashcure links, "+fallback+" directory search fallbacks.");
