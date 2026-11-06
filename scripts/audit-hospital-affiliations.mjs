#!/usr/bin/env node
/* Fail CI if a SlashPromo hospital page lacks named associated doctors.
 * Checks the site's local directory claims; it does not independently certify
 * provider employment, clinic hours or medical credentials.
 */
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root=path.resolve(import.meta.dirname,"..");
const read=async file=>readFile(path.join(root,file),"utf8");
const db=JSON.parse(await read("assets/directory.json"));
const doctors=new Map(db.doctors.map(d=>[d.id,d]));
const errors=[];
const urlPath=u=>u.replace(/^\/+/,"")+"index.html";
const normalize=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const aliases={
  "sukkur-ghulam-muhammad-mahar-medical-teaching-hospital":/gmc teaching hospital|ghulam muhammad mahar medical teaching/i,
  "sukkur-sicvd-hospital-sukkur":/\bsicvd\b/i
};
const associationMatches=(facility,doctor)=>{
  const s=normalize(doctor.hospital);
  if(!s)return false;
  if(aliases[facility.id])return aliases[facility.id].test(s);
  const name=normalize(facility.name).replace(/ sukkur$/,"");
  return s.includes(name);
};
const sitemap=await read("sitemap.xml");
const hospitalIndex=await read("hospitals/index.html");
const sukPage=await read("sukkur/index.html");
const redirects=await read("_redirects");
const retiredHospitalRoutes=[
  "/hospitals/sukkur/alkhidmat-mother-child-health-care-center/",
  "/hospitals/sukkur/halar-memon-hospital-sukkur/",
  "/hospitals/sukkur/siut-hospital-sukkur/",
  "/hospitals/sukkur/sukkur-blood-bank-hospital/"
];
const listedFiles=new Set();
for(const facility of db.hospitals){
  const file=urlPath(facility.url);
  if(listedFiles.has(file))errors.push("Duplicate hospital record: "+file);
  listedFiles.add(file);
  for(const [label,html] of [["hospital directory",hospitalIndex],["Sukkur city page",sukPage]]){
    if(!html.includes('href="'+facility.url+'"'))errors.push(facility.name+": missing from "+label);
  }
  const ids=facility.linkedDoctorIds;
  if(!Array.isArray(ids)||ids.length===0){errors.push(facility.name+": no linkedDoctorIds");continue;}
  const unique=new Set(ids);
  if(unique.size!==ids.length)errors.push(facility.name+": duplicate doctor association");
  let html="";
  try{html=await read(file)}catch{errors.push("Missing hospital page: "+file);continue;}
  for(const id of ids){
    const d=doctors.get(id);
    if(!d){errors.push(facility.name+": unknown doctor "+id);continue;}
    if(d.city!==facility.city)errors.push(facility.name+": city mismatch for "+d.name);
    if(!associationMatches(facility,d))errors.push(facility.name+": no supporting hospital affiliation in "+d.name+"'s directory record");
    if(!html.includes('href="'+d.url+'"'))errors.push(facility.name+": no linked profile in page for "+d.name);
    let doctorHtml="";
    try{doctorHtml=await read(urlPath(d.url))}catch{errors.push(facility.name+": doctor page missing "+d.url);}
    if(doctorHtml&&!doctorHtml.includes('href="'+facility.url+'"')){
      errors.push(d.name+": doctor profile does not link back to "+facility.name);
    }
  }
  // A hospital page must not list doctors beyond its declared associations.
  // Reciprocal links are separately checked above, so both directions agree.
  const allowedDoctorUrls=new Set(ids.map(id=>doctors.get(id)?.url).filter(Boolean));
  const linkedDoctorUrls=new Set([...html.matchAll(/href="(\\/doctors\\/[^"#?]+\\/)"/g)].map(match=>match[1]));
  for(const doctorUrl of linkedDoctorUrls){
    if(!allowedDoctorUrls.has(doctorUrl)){
      errors.push(facility.name+": unrelated doctor linked on hospital page: "+doctorUrl);
    }
  }
  if(!sitemap.includes("<loc>https://slashpromo.com"+facility.url+"</loc>"))errors.push("Hospital omitted from sitemap: "+facility.url);
}
const dirs=await readdir(path.join(root,"hospitals"),{withFileTypes:true});
for(const city of dirs.filter(e=>e.isDirectory())){
  const cityRoot=path.join(root,"hospitals",city.name);
  for(const site of (await readdir(cityRoot,{withFileTypes:true})).filter(e=>e.isDirectory())){
    const candidate="hospitals/"+city.name+"/"+site.name+"/index.html";
    try{await access(path.join(root,candidate))}catch{continue;}
    if(!listedFiles.has(candidate))errors.push("Unlisted hospital page with no verified linked doctors: "+candidate);
  }
}
for(const route of retiredHospitalRoutes){
  if(sitemap.includes("<loc>https://slashpromo.com"+route+"</loc>")){
    errors.push("Retired hospital still appears in sitemap: "+route);
  }
  for(const [label,html] of [["hospital directory",hospitalIndex],["Sukkur city page",sukPage]]){
    if(html.includes('href="'+route+'"'))errors.push("Retired hospital still linked from "+label+": "+route);
  }
  const redirect=route+" /sukkur/ 301";
  if(!redirects.split(/\r?\n/).some(line=>line.trim()===redirect)){
    errors.push("Retired hospital lacks redirect: "+route);
  }
}
// The static hospital and Sukkur discovery pages must not link to unlisted facilities.
for(const [label,html] of [["hospital directory",hospitalIndex],["Sukkur city page",sukPage]]){
  const linkedHospitals=new Set([...html.matchAll(/href="(\\/hospitals\\/[^"#?]+\\/)"/g)].map(match=>match[1]));
  for(const linkedUrl of linkedHospitals){
    if(!listedFiles.has(urlPath(linkedUrl))){
      errors.push(label+": unsupported hospital link: "+linkedUrl);
    }
  }
}
const sitemapHospitals=[...sitemap.matchAll(/<loc>https:\/\/slashpromo\.com(\/hospitals\/[^<]+)<\/loc>/g)].map(m=>m[1]);
for(const route of sitemapHospitals){
  if(!listedFiles.has(urlPath(route)))errors.push("Sitemap lists unassociated hospital: "+route);
}
if(errors.length){
  for(const e of errors)console.error("ERROR:",e);
  console.error("Hospital affiliation check failed:",errors.length,"issue(s).");
  process.exitCode=1;
}else console.log("Hospital affiliation check passed:",db.hospitals.length,"hospital pages and",db.hospitals.reduce((n,h)=>n+h.linkedDoctorIds.length,0),"doctor associations.");
