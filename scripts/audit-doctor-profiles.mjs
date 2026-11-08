#!/usr/bin/env node
/* Slashpromo public doctor profile quality audit.
   Data-integrity failures fail CI; incomplete/unverified provider details are
   review tasks, not fabricated facts and not automatic publication changes. */
import {readFileSync, existsSync, appendFileSync} from "node:fs";
const BASE="https://slashpromo.com";
const json=JSON.parse(readFileSync("assets/directory.json","utf8"));
const doctors=json.doctors||[];
const sitemap=readFileSync("sitemap.xml","utf8");
const doctorRoutes=new Set();
const idSet=new Set();
const errors=[],review=[];
const cities=new Map();
const names=new Map();
const report=[];
const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const isProfileLink=url=>{
  try{
    const u=new URL(url);
    return u.protocol==="https:"&&/^(?:www\.)?slashcure\.com$/i.test(u.hostname)
      &&(/\/(?:dr-|prof-dr-)[a-z0-9-]+\/?$/i.test(u.pathname));
  }catch{return false;}
};
const check=(doctor)=>{
  const city=String(doctor.city||"");
  const route=String(doctor.url||"");
  cities.set(city,(cities.get(city)||0)+1);
  const issues=[];
  if(!doctor.id||idSet.has(doctor.id))errors.push("Duplicate/missing doctor ID: "+doctor.id);
  idSet.add(doctor.id);
  if(!route.startsWith("/doctors/")||!route.endsWith("/"))errors.push("Unexpected doctor URL: "+route);
  if(doctorRoutes.has(route))errors.push("Duplicate doctor route: "+route);
  doctorRoutes.add(route);
  const routeParts=route.split("/").filter(Boolean);
  if(routeParts[1]!==slug(city))errors.push(doctor.name+": route city mismatch: "+route);
  const file=route.slice(1)+"index.html";
  if(!existsSync(file))errors.push(doctor.name+": published HTML missing: "+file);
  else {
    const html=readFileSync(file,"utf8");
    if(!html.includes('<link rel="canonical" href="'+BASE+route+'">'))
      errors.push(doctor.name+": canonical URL mismatch: "+file);
    if(!/<meta[^>]+name=["']description["']/i.test(html))
      issues.push("Missing meta description");
    if(!html.includes('name="robots" content="index,follow'))
      issues.push("Indexing directives need manual review");
    if(!html.includes("<h1"))issues.push("Missing on-page heading");
  }
  if(!sitemap.includes("<loc>"+BASE+route+"</loc>"))errors.push(doctor.name+": missing from sitemap");
  if(!doctor.qualifications)issues.push("Qualifications not specified");
  if(!doctor.hospital)issues.push("Clinic/hospital affiliation not specified");
  if(!doctor.externalProfile)issues.push("No direct Slashcure link provided");
  else if(!isProfileLink(doctor.externalProfile))
    issues.push("Slashcure destination is not a doctor profile; review before labeling it as one");
  const label=String(doctor.name||"").toLowerCase().replace(/\s+/g," ").trim();
  if(!names.has(label))names.set(label,[]);
  names.get(label).push({city,route,qualifications:doctor.qualifications});
  report.push({name:doctor.name,city,url:route,issues});
  if(issues.length)review.push({name:doctor.name,city,route,issues});
};
doctors.forEach(check);
for(const [name,profiles] of names){
  if(profiles.length>1){
    for(const p of profiles){
      const target=report.find(x=>x.url===p.route);
      if(target)target.issues.push("Duplicate name in multiple city records; verify both locations");
    }
    review.push({name,city:"Multiple cities",route:profiles.map(x=>x.route).join(" and "),
      issues:["Same name appears in "+profiles.map(x=>x.city).join(" and ")+". Do not delete either location without verifying practice addresses."]});
  }
}
const sukkur=report.filter(x=>x.city==="Sukkur");
const flaggedSukkur=sukkur.filter(x=>x.issues.length);
const external=doctors.filter(x=>isProfileLink(x.externalProfile));
const info=[
  ["Doctor directory entries",doctors.length],
  ["Sukkur directory entries",sukkur.length],
  ["Valid direct Slashcure doctor profile URLs",external.length],
  ["Sukkur valid direct doctor profile URLs",doctors.filter(x=>x.city==="Sukkur"&&isProfileLink(x.externalProfile)).length],
  ["Sukkur profiles requiring manual data review",flaggedSukkur.length],
  ["Structural errors",errors.length],
  ["Records with any review flags",report.filter(x=>x.issues.length).length]
];
console.log("=== Slashpromo public doctor profile quality report ===");
for(const [k,v] of info)console.log(k+": "+v);
for(const x of flaggedSukkur)console.log("SUKKUR REVIEW: "+x.name+" — "+x.issues.join("; "));
for(const x of review.filter(x=>x.city==="Multiple cities"))console.log("CROSS-CITY REVIEW: "+x.issues.join("; "));
for(const error of errors)console.error("ERROR: "+error);
if(process.env.GITHUB_STEP_SUMMARY){
  let md="## Doctor directory audit (public metadata only)\n\n";
  md+="| Check | Count |\n|---|---:|\n"+
    info.map(([a,b])=>"| "+a+" | "+b+" |").join("\n")+"\n\n";
  md+="### Sukkur profiles needing manual review\n\n"+
    "| Doctor | Review required |\n|---|---|\n"+
    flaggedSukkur.map(x=>"| "+x.name+" | "+x.issues.join("; ")+" |").join("\n")+"\n\n";
  md+="### Duplicate names across different cities\n\n"+
    (review.filter(x=>x.city==="Multiple cities").map(x=>"- "+x.issues.join("; ")).join("\n")||"None")+"\n\n";
  md+="**Do not invent OPD schedules, clinic addresses, contact numbers, or credentials.** "+
    "Schedules should remain dynamic on verified provider pages. A missing data field is not proof the provider lacks a clinic.\n";
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
if(errors.length)process.exitCode=1;
