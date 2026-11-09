import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const base="https://slashpromo.com", external="https://slashcure.com/paediatricians/sukkur/dr-rizwana-qureshi";
const path="/doctors/sukkur/dr-rizwana-qureshi/";
const files={
  doctor:"doctors/sukkur/dr-rizwana-qureshi/index.html",
  hospital:"hospitals/sukkur/dr-shahid-mirani-hospital-sukkur/index.html",
  specialty:"doctors/sukkur/pediatricians/index.html",
  city:"sukkur/index.html",
  topic:"sukkur/health-topics/childhood-fever-and-illness/index.html",
  related:"doctors/sukkur/dr-sajid-khadim/index.html"
};
const db=JSON.parse(read("assets/directory.json"));
const doc=db.doctors.find(x=>x.url===path);
assert(doc&&doc.name==="Dr. Rizwana Qureshi"&&doc.city==="Sukkur");
assert(doc.externalProfile===external&&/FCPS/.test(doc.qualifications));
const hospital=db.hospitals.find(x=>x.url==="/hospitals/sukkur/dr-shahid-mirani-hospital-sukkur/");
assert(hospital?.linkedDoctorIds.includes(doc.id));
assert(new Set(hospital.linkedDoctorIds).size===3,"Expected 3 unique linked Mirani doctors");
assert.equal(db.doctors.filter(x=>x.city==="Sukkur").length,28);
const html=read(files.doctor);
assert(html.includes('rel="canonical" href="'+base+path+'"'));
assert(html.includes("Assistant Professor")&&html.includes("Ghulam Muhammad Mahar Medical College"));
assert(html.includes("Monday to Saturday")&&html.includes("3:00 PM")&&html.includes("0336-0886544"));
assert(html.includes("not a live availability confirmation"),"Never imply live OPD confirmation");
assert(html.includes('href="'+external+'"')&&html.includes("sp-qa-fallback"));
for(const [label,file] of Object.entries(files)){
 const page=read(file);
 assert(page.includes("dr-rizwana-qureshi"),label+" missing direct doctor link");
 const blocks=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert(blocks.length>0,label+" missing schema.org metadata");
 for(const block of blocks)JSON.parse(block[1]);
}
const doctorJson=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const graph=doctorJson["@graph"]||[doctorJson];
assert(graph.some(x=>x["@type"]==="Physician"&&x.name==="Dr. Rizwana Qureshi"));
assert(graph.some(x=>x["@type"]==="ProfilePage"));
assert(graph.some(x=>x["@type"]==="BreadcrumbList"));
assert(read(files.specialty).includes("Browse 3 listed doctors"));
assert(read(files.topic).includes("3 linked profiles"));
assert(read(files.city).includes("28 doctors listed")&&read(files.city).includes("26 direct Slashcure doctor profiles"));
assert(read(files.hospital).includes("Dr. Rizwana Qureshi — Consultant Paediatrician"));
assert(read("sitemap.xml").includes("<loc>"+base+path+"</loc>"));
console.log("PASS static: new paediatrician credentials, reported OPD, contact, schema, hospital association, five cross-linked pages and sitemap.");

if(process.argv.includes("--live")){
 const checks=[
 [path,["Dr. Rizwana Qureshi","0336-0886544","sp-qa-fallback"]],
 ["/hospitals/sukkur/dr-shahid-mirani-hospital-sukkur/",["dr-rizwana-qureshi","Consultant Paediatrician"]],
 ["/doctors/sukkur/pediatricians/",["dr-rizwana-qureshi","Browse 3 listed doctors"]],
 ["/sukkur/",["dr-rizwana-qureshi","28 doctors listed"]],
 ["/sukkur/health-topics/childhood-fever-and-illness/",["dr-rizwana-qureshi","3 linked profiles"]],
 ["/sitemap.xml",["<loc>"+base+path+"</loc>"]]
 ];
 let ready=false;
 for(let attempt=1;attempt<=24;attempt++){
   let ok=true;
   for(const [route,expect] of checks){
     try{
       const response=await fetch(base+route+"?verify="+(process.env.GITHUB_SHA||"").slice(0,9),{signal:AbortSignal.timeout(16000)});
       const html=await response.text();
       if(response.status!==200||expect.some(x=>!html.includes(x))){
         console.log("PENDING "+route+" HTTP "+response.status+" attempt "+attempt);
         ok=false;break;
       }
     }catch(e){console.log("PENDING "+route+": "+e.message);ok=false;break}
   }
   if(ok){ready=true;break}
   if(attempt<24)await new Promise(resolve=>setTimeout(resolve,12000));
 }
 assert(ready,"Cloudflare has not yet served all six new doctor integration URLs");
 console.log("PASS live: Doctor, hospital, Sukkur, specialty, health-topic pages and sitemap contain Dr. Rizwana Qureshi.");
 try{
   const resp=await fetch(external,{signal:AbortSignal.timeout(16000)});
   console.log("Slashcure source page returned HTTP "+resp.status);
   if(!resp.ok)console.log("NOTICE: Doctor's Slashcure destination requires a browser check; may be blocked from GitHub runner.");
 }catch(e){console.log("NOTICE: External Slashcure URL could not be tested: "+e.message)}
}
