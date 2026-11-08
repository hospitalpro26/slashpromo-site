#!/usr/bin/env node
/* SlashPromo profile data quality: measure coverage without making up fields.
   Missing information is a review item, not evidence that a provider lacks it.
   Fail only for genuinely inconsistent local routes, canonical URLs or unsafe
   third-party link destinations. Never auto-publish unverified OPD times. */
import {readFileSync,existsSync,appendFileSync} from "node:fs";
const ORIGIN="https://slashpromo.com";
const db=JSON.parse(readFileSync("assets/directory.json","utf8"));
const xml=readFileSync("sitemap.xml","utf8");
const inSitemap=new Set([...xml.matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]+)<\/loc>/g)].map(x=>x[1]));
const errors=[],review={missingQualifications:[],missingFacility:[],noDoctorLink:[],hospitalOnlyLink:[],noHospitalLink:[],missingAddress:[],missingPhone:[]};
function externalLink(value){
 if(!value)return "missing";
 try{
  const u=new URL(value);
  if(u.protocol!=="https:"||!["slashcure.com","www.slashcure.com"].includes(u.hostname)||u.search||u.hash)return "invalid";
  if(/^\/(?:[a-z0-9-]+\/[a-z0-9-]+\/)?dr-[a-z0-9-]+\/?$/.test(u.pathname))return "doctor";
  if(/^\/hospitals\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(u.pathname))return "hospital";
  return "other";
 }catch{return "invalid";}
}
function check(record,kind){
 const path=record.url;
 if(typeof path!=="string"||!/^\/(?:doctors|hospitals)\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(path)){
  errors.push(kind+" "+record.name+": unsupported page URL "+path);
  return;
 }
 const htmlPath=path.slice(1)+"index.html";
 if(!existsSync(htmlPath)){
  // Retired or redirected profiles may intentionally be absent from the sitemap.
  if(inSitemap.has(ORIGIN+path))errors.push(kind+" "+record.name+": published HTML missing");
  return;
 }
 const html=readFileSync(htmlPath,"utf8");
 if(!html.includes('<link rel="canonical" href="'+ORIGIN+path+'">'))
  errors.push(kind+" "+record.name+": incorrect canonical URL");
 if(!inSitemap.has(ORIGIN+path)){
  // Some retired doctor routes are retained in older registry data, but redirect
  // to their current home. These are not automatically added to the sitemap.
  const redirects=readFileSync("_redirects","utf8");
  if(!redirects.split(/\r?\n/).some(line=>line.startsWith(path+" ")))
    errors.push(kind+" "+record.name+": non-retired page missing from sitemap");
 }
}
const doctorUrls=new Set(),hospitalUrls=new Set();
for(const doc of db.doctors){
 if(doctorUrls.has(doc.url))errors.push("Duplicate doctor URL: "+doc.url);
 doctorUrls.add(doc.url);
 check(doc,"Doctor");
 if(!doc.qualifications?.trim())review.missingQualifications.push(doc.name+" ("+doc.city+")");
 if(!doc.hospital?.trim())review.missingFacility.push(doc.name+" ("+doc.city+")");
 const type=externalLink(doc.externalProfile);
 if(type==="invalid"||type==="other")errors.push("Doctor "+doc.name+": unsupported Slashcure profile URL");
 else if(type==="hospital")review.hospitalOnlyLink.push(doc.name+" ("+doc.city+")");
 else if(type==="missing")review.noDoctorLink.push(doc.name+" ("+doc.city+")");
}
for(const h of db.hospitals){
 if(hospitalUrls.has(h.url))errors.push("Duplicate hospital URL: "+h.url);
 hospitalUrls.add(h.url);
 check(h,"Hospital");
 const type=externalLink(h.externalProfile);
 if(type==="invalid"||type==="other"||type==="doctor")errors.push("Hospital "+h.name+": invalid Slashcure facility link");
 else if(type==="missing")review.noHospitalLink.push(h.name+" ("+h.city+")");
 if(!h.address?.trim())review.missingAddress.push(h.name+" ("+h.city+")");
 if(!h.phone?.trim())review.missingPhone.push(h.name+" ("+h.city+")");
}
const docDirect=db.doctors.filter(doc=>externalLink(doc.externalProfile)==="doctor").length;
const docFacility=db.doctors.filter(doc=>externalLink(doc.externalProfile)==="hospital").length;
const hasHospitalLink=db.hospitals.filter(h=>externalLink(h.externalProfile)==="hospital").length;
const figures=[
 ["Doctor records",db.doctors.length],
 ["Doctor profiles linking directly to Slashcure",docDirect],
 ["Doctor records linking to associated facility only",docFacility],
 ["Doctors with no Slashcure link",review.noDoctorLink.length],
 ["Doctor records missing qualifications",review.missingQualifications.length],
 ["Doctor records missing named facility",review.missingFacility.length],
 ["Hospital listings",db.hospitals.length],
 ["Hospitals with direct Slashcure facility link",hasHospitalLink],
 ["Hospital listings missing address",review.missingAddress.length],
 ["Hospital listings missing public phone number",review.missingPhone.length],
 ["Structural errors",errors.length]
];
console.log("SlashPromo quality coverage summary:");
for(const [label,count] of figures)console.log(label+": "+count);
for(const e of errors)console.error("ERROR:",e);
if(process.env.GITHUB_STEP_SUMMARY){
 let md="## SlashPromo profile information audit\n\n"+"| Check | Records |\n|---|---:|\n";
 for(const [label,count] of figures)md+="| "+label+" | "+count+" |\n";
 md+="\nA blank field means the **directory has no published value**, not that the doctor or hospital lacks the information. Do not invent contact details, appointments, credentials or opening hours.\n";
 for(const [key,title] of Object.entries({
  missingQualifications:"Doctors missing qualifications",
  missingFacility:"Doctors without a listed clinic",
  hospitalOnlyLink:"Doctor records whose Slashcure link opens a hospital, not the doctor",
  noDoctorLink:"Doctors without a confirmed Slashcure link",
  noHospitalLink:"Hospital listings without a Slashcure facility link",
  missingAddress:"Hospital listings missing a precise address",
  missingPhone:"Hospital listings missing a public contact number"
 })){
  const entries=review[key];
  if(entries.length)md+="\n### "+title+" ("+entries.length+")\n"+entries.map(v=>"- "+v).join("\n")+"\n";
 }
 if(errors.length)md+="\n### Structural errors\n"+errors.map(v=>"- "+v).join("\n")+"\n";
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
if(errors.length)process.exitCode=1;
