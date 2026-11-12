#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HOST='https://slashcure.com';
const SITE='https://slashpromo.com';
const specialties={
  paediatricians:['Paediatrician','pediatricians'],pediatricians:['Paediatrician','pediatricians'],
  'paediatric-surgeons':['Paediatric Surgeon','pediatric-surgeons'],'pediatric-surgeons':['Paediatric Surgeon','pediatric-surgeons'],
  cardiologists:['Cardiologist','cardiologists'],pulmonologists:['Pulmonologist','pulmonologists'],
  rheumatologists:['Rheumatologist','rheumatologists'],urologists:['Urologist','urologists'],
  gastroenterologists:['Gastroenterologist','gastroenterologists'],
  'gynecologists-obstetricians':['Gynecologist & Obstetrician','gynecologists'],
  'orthopedic-surgeons':['Orthopedic Surgeon','orthopedic-surgeons'],
  'general-physicians':['General Physician','general-physicians'],
  'consultant-physicians':['Consultant Physician','consultant-physicians'],
  'consultant-physiotherapists':['Physiotherapist','physiotherapists'],
  physiotherapists:['Physiotherapist','physiotherapists'],dentists:['Dentist','dentists'],
  'general-surgeons-laproscopic-surgeons':['General & Laparoscopic Surgeon','general-surgeons'],
  'general-surgeons':['General Surgeon','general-surgeons'],
  psychiatrists:['Psychiatrist','psychiatrists'],
  neurologists:['Neurologist','neurologists'],neurosurgeons:['Neurosurgeon','neurosurgeons'],
  nephrologists:['Nephrologist','nephrologists'],dermatologists:['Dermatologist','dermatologists'],
  hematologists:['Hematologist','hematologists']
};
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const escapeHtml=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
// A doctor's name is the identity, not the exact profile URL or job suffix.
// Example: /dr-komal-kandhir-pt and Dr. Komal Kandhir both resolve to komal-kandhir.
const cityAliases={'panoaqil':'pano-aqil','panoaqi':'pano-aqil','pano-akil':'pano-aqil','pano-aqil-sindh':'pano-aqil','lakhi-ghulam-shah-shikarpur-sindh':'lakhi-ghulam-shah','dina-jhelum':'jhelum','mianchannu':'mian-channu'};
function normalizedCitySlug(value){const key=slug(value);return cityAliases[key]||key;}
function doctorIdentity(value){
  // Remove honorifics and PT suffixes before testing name+city identity.
  return slug(value)
    .replace(/^(?:(?:prof|professor|associate|assistant|asst|dr|doctor)-)+/,'')
    .replace(/-(?:(?:pt|dpt|physiotherapist)-?)+$/,'');
}
function isAlreadyListedByIdentity(candidate,existingDoctors){
  const key=normalizedCitySlug(candidate.city)+':'+doctorIdentity(candidate.doctorSlug);
  return existingDoctors.some(d=>(candidate.source && parseDoctorUrl(d.externalProfile)?.source===candidate.source) ||
    normalizedCitySlug(d.city)+':'+doctorIdentity(d.name)===key ||
    normalizedCitySlug(d.city)+':'+doctorIdentity(d.url?.split('/').filter(Boolean).at(-1))===key);
}

function parseDoctorUrl(value){
  try {
    const u=new URL(value,HOST);
    if(u.hostname!=='slashcure.com'||u.protocol!=='https:'||u.search||u.hash)return null;
    const p=u.pathname.toLowerCase().split('/').filter(Boolean);
    if(p.length!==3||!specialties[p[0]]||!/^[a-z0-9-]+$/.test(p[1])||!/^dr-[a-z0-9-]{3,90}$/.test(p[2]))return null;
    return {source:HOST+'/'+p.join('/'),specialtySlug:p[0],city:p[1],doctorSlug:p[2]};
  }catch{return null;}
}
function extractDoctorLinks(html){
  const found=[];
  for(const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    const result=parseDoctorUrl(m[1].replace(/&amp;/g,'&'));
    if(result)found.push(result);
  }
  for(const m of html.matchAll(/<loc>([^<]+)<\/loc>/gi)){
    const result=parseDoctorUrl(m[1]);if(result)found.push(result);
  }
  return found;
}
function extractDoctorName(html,doctorSlug){
  const heads=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>clean(m[1]));
  const t=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const last=doctorSlug.split('-').at(-1);
  for(let name of [...heads,t]){
    name=name.split(/\s+[|–—]\s+|\s+-\s+/)[0].replace(/\s+\((?:PT|DPT)\)$/i,'').trim();
    if(!/^Dr\.?\s+[a-z][a-z .'-]{3,80}$/i.test(name))continue;
    if(!slug(name).split('-').includes(last))continue;
    return name.replace(/^Dr\s+/i,'Dr. ');
  }
  return null;
}
async function fetchPublic(url){
  const r=await fetch(url,{headers:{'Accept':'text/html, application/xml','User-Agent':'SlashPromoPublicDirectoryChecker/1.0 (https://slashpromo.com)'},signal:AbortSignal.timeout(17000),redirect:'follow'});
  if(!r.ok)throw new Error('HTTP '+r.status+' '+url);
  if(new URL(r.url).hostname!=='slashcure.com')throw new Error('Unexpected redirect host');
  const html=await r.text();if(html.length>4000000)throw new Error('Response exceeds 4MB');
  return html;
}
function doctorPage(d){
  const t=fs.readFileSync('doctors/sukkur/dr-rizwana-qureshi/index.html','utf8');
  const main=t.indexOf('<main id="main">'),end=t.indexOf('</main>',main);
  if(main<0||end<0)throw new Error('Reference template is unavailable');
  const chrome=t.slice(t.indexOf('<body>'),main),footer=t.slice(end+7);
  const n=escapeHtml(d.name),sp=escapeHtml(d.specialty),city=escapeHtml(d.city);
  const canonical=SITE+d.url;
  const descr=d.name+', '+d.specialty+' in '+d.city+'. Read the published Slashcure profile for current clinic information and OPD availability.';
  const structured=JSON.stringify({'@context':'https://schema.org','@graph':[
    {'@type':'Physician','name':d.name,'url':canonical,'sameAs':[d.externalProfile],'medicalSpecialty':d.specialty,'address':{'@type':'PostalAddress','addressLocality':d.city,'addressCountry':'PK'}},
    {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':SITE+'/'},{'@type':'ListItem','position':2,'name':d.city,'item':SITE+'/'+slug(d.city)+'/'},{'@type':'ListItem','position':3,'name':d.name,'item':canonical}]}
  ]}).replace(/</g,'\\u003c');
  const head='<!doctype html><html lang="en-PK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+n+' | '+sp+' in '+city+' | SlashPromo</title><meta name="description" content="'+escapeHtml(descr)+'"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+canonical+'"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><meta property="og:type" content="profile"><meta property="og:site_name" content="SlashPromo"><meta property="og:title" content="'+n+' | '+sp+' in '+city+'"><meta property="og:description" content="'+escapeHtml(descr)+'"><meta property="og:url" content="'+canonical+'"><script type="application/ld+json">'+structured+'</script><link rel="stylesheet" href="/assets/theme.css?v=20261108-enquiries6"><link rel="stylesheet" href="/assets/cross-profile-links.css?v=20261106-darkbrand3"><script defer src="/assets/site.js?v=20261109-patient3"></script><script defer src="/assets/social-glow.js"></script></head>';
  const body='<main id="main"><section class="sp-profile-hero"><div class="wrap"><div class="sp-crumb"><a href="/">Home</a><span>›</span><a href="/'+slug(d.city)+'/">'+city+'</a><span>›</span>Doctor</div><p class="sp-kicker">DOCTOR PROFILE · '+city.toUpperCase()+'</p><h1>'+n+'</h1><p class="sp-subtitle">'+sp+' in '+city+', Pakistan</p><div class="sp-cross-profile-actions sp-cross-profile-hero"><span class="sp-cross-link sp-cross-link-current">Viewing SlashPromo profile</span><a class="sp-cross-link sp-cross-link-external" href="'+d.externalProfile+'" target="_blank" rel="noopener noreferrer">View published Slashcure profile ↗</a></div></div></section><section class="sp-profile"><div class="wrap sp-profile-columns"><article class="sp-profile-panel"><span class="eyebrow">Healthcare directory</span><h2>About '+n+'</h2><p>'+n+' has a public '+sp+' doctor listing in '+city+'. Please refer to the original Slashcure page for current medical services, clinic affiliation, appointment details and OPD schedules.</p><h2>Location and consultation information</h2><p>Hospital, clinic, qualifications, telephone number and OPD hours require additional verification and have not been copied into this automatically prepared draft.</p><p><a href="'+d.externalProfile+'" target="_blank" rel="noopener noreferrer">Check '+n+' on Slashcure ↗</a></p><h2>Profile details</h2><dl class="sp-profile-facts"><div><dt>Specialty</dt><dd>'+sp+'</dd></div><div><dt>City</dt><dd>'+city+'</dd></div><div><dt>Original profile</dt><dd><a href="'+d.externalProfile+'" target="_blank" rel="noopener noreferrer">View on Slashcure ↗</a></dd></div></dl><p class="sp-profile-disclaimer">This profile is for directory navigation, not a ranking or proof of current clinical availability. Confirm all information directly.</p></article><aside class="sp-profile-panel"><span class="eyebrow">Explore healthcare</span><h2>Find more doctors in '+city+'</h2><div class="sp-profile-links"><a href="/'+slug(d.city)+'/">Explore '+city+' ↗</a><a href="'+d.externalProfile+'" target="_blank" rel="noopener noreferrer">Published Slashcure profile ↗</a></div></aside></div></section><section id="sp-qa-fallback" aria-labelledby="sp-qa-fallback-title" style="padding:32px 20px;background:#f4f8ff;border-top:1px solid #d9e4f4"><div class="wrap"><h2 id="sp-qa-fallback-title">Questions &amp; Answers about '+n+'</h2><p>Ask a question about public clinic information. Never include private medical details or emergencies in public questions.</p></div></section></main>';
  return head+chrome+body+footer;
}
function addReviewLink(file,d){
  if(!fs.existsSync(file))return false;
  const html=fs.readFileSync(file,'utf8');
  if(html.includes('href="'+d.url+'"'))return true;
  const section='<section class="section white" aria-label="New doctor listing"><div class="wrap"><h2>New doctor in '+escapeHtml(d.city)+'</h2><p><a href="'+d.url+'">'+escapeHtml(d.name)+' — '+escapeHtml(d.specialty)+'</a>. Visit the <a href="'+d.externalProfile+'" target="_blank" rel="noopener noreferrer">published Slashcure profile</a> to confirm OPD and clinic details.</p></div></section>';
  if(!html.includes('</main>'))return false;
  fs.writeFileSync(file,html.replace('</main>',section+'</main>'));
  return true;
}
function report(data){
  const lines=['# Daily Slashcure doctor discovery','', 'Public links discovered: '+data.found,'Already known: '+data.known,'New eligible links: '+data.pending,'Drafts prepared: '+data.drafts.length,'Source coverage: '+(data.coverage||'not evaluated'),'Unreachable sources: '+(data.sourceFailures?.length||0),'', '## Review required'];
  for(const d of data.drafts)lines.push('- '+d.name+' ('+d.specialty+', '+d.city+'): '+d.externalProfile+'; draft '+SITE+d.url);
  lines.push('', '## Required approval before publication','- [ ] Verify name, city and specialty against the real doctor profile','- [ ] Verify credentials and active hospital/clinic affiliation; add hospital links only after confirmation','- [ ] Check OPD hours, contact information and service details; do not invent missing data','- [ ] Review city/specialty links and structured data','- [ ] Merge only when accurate. Cloudflare deploys and IndexNow submits after merging.','', '## Deferred / uncertain');
  lines.push(...data.deferred.map(x=>'- '+x));
  lines.push('', '## Public source checks', ...data.sources.map(x=>'- '+x.url+': '+x.result));
  const out=lines.join('\n')+'\n';
  fs.mkdirSync('.doctor-sync',{recursive:true});
  fs.writeFileSync('.doctor-sync/review.md',out);
  fs.writeFileSync('.doctor-sync/report.json',JSON.stringify(data,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,out);
  console.log(out.slice(0,7000));
}
async function main(){
  const apply=process.argv.includes('--apply');
  const db=JSON.parse(fs.readFileSync('assets/directory.json','utf8'));
  // A national catch-all label is not a city directory and must not generate /doctors/pakistan 404 checks.
  const cities=[...new Set(db.doctors.map(x=>normalizedCitySlug(x.city)).filter(x=>x&&x!=='pakistan'))].sort();
  const sources=[],links=new Map();
  // The national Slashcure directory is paginated. Inspect all early pages so
  // a doctor outside page one (or a newly represented city) is not overlooked.
  const urls=[...Array.from({length:8},(_,i)=>HOST+'/doctors/?page='+(i+1)),
    ...cities.map(x=>HOST+'/doctors/'+x), HOST+'/sitemap.xml'];
  for(let i=0;i<urls.length;i+=4){
    const results=await Promise.all(urls.slice(i,i+4).map(async url=>{
      try {const text=await fetchPublic(url);return {url,result:'OK',links:extractDoctorLinks(text)};}
      catch(e){return {url,result:String(e.message).slice(0,150),links:[]};}
    }));
    for(const r of results){sources.push({url:r.url,result:r.result+'; '+r.links.length+' links'});for(const item of r.links)links.set(item.source,item);}
  }
  // A successful run with only partial source coverage must not be presented as a complete scan.
  const primaryDirectory=HOST+'/doctors/?page=1';
  if(!sources.some(x=>x.url===primaryDirectory&&x.result.startsWith('OK;')))
    throw new Error('Primary Slashcure doctor directory was unavailable: discovery completeness cannot be trusted. No drafts created.');
  if(!links.size)throw new Error('No public doctor links detected: stop safely and investigate source availability');
  const sourceFailures=sources.filter(x=>!x.result.startsWith('OK;'));
  if(sourceFailures.length)console.warn('::warning::Partial Slashcure discovery coverage: '+sourceFailures.map(x=>x.url+' ('+x.result+')').join('; '));
  const existing=new Set(db.doctors.map(x=>parseDoctorUrl(x.externalProfile)?.source).filter(Boolean));
  const byNameCity=new Set(db.doctors.map(x=>normalizedCitySlug(x.city)+':'+doctorIdentity(x.name)));
  const alreadyDrafted=new Set();
  const newLinks=[...links.values()].filter(x=>!existing.has(x.source)&&!isAlreadyListedByIdentity(x,db.doctors));
  const drafts=[],deferred=[];
  for(const item of newLinks.sort((a,b)=>a.source.localeCompare(b.source))){
    if(drafts.length>=3){deferred.push('Candidate remains queued: '+item.source);continue;}
    const citySlug=normalizedCitySlug(item.city);
    const cityPage=citySlug+'/index.html';
    if(!fs.existsSync(cityPage)){deferred.push('City directory missing; review manually: '+item.source);continue;}
    let html;
    try {html=await fetchPublic(item.source);}catch(e){deferred.push('Could not inspect '+item.source+': '+e.message);continue;}
    const name=extractDoctorName(html,item.doctorSlug);
    if(!name){deferred.push('Doctor name requires manual verification: '+item.source);continue;}
    const city=citySlug.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ');
    const identity=normalizedCitySlug(city)+':'+doctorIdentity(name);
    if(byNameCity.has(identity)||alreadyDrafted.has(identity)){deferred.push('Potential duplicate name/city: '+item.source);continue;}
    const local='/doctors/'+citySlug+'/'+item.doctorSlug+'/';
    if(fs.existsSync(local.slice(1)+'index.html'))continue;
    const info=specialties[item.specialtySlug];
    const doctor={id:citySlug+'-'+item.doctorSlug,name,city,cities:[city],specialty:info[0],hospital:'',qualifications:'',url:local,externalProfile:item.source,hospitalpro:'',kind:'doctor'};
    drafts.push(doctor);
    alreadyDrafted.add(identity);
    if(apply){
      const file=local.slice(1)+'index.html';fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,doctorPage(doctor));
      addReviewLink(cityPage,doctor);
      const spec='doctors/'+citySlug+'/'+info[1]+'/index.html';
      if(!addReviewLink(spec,doctor))deferred.push('Specialty page requires review: '+spec);
      db.doctors.push(doctor);byNameCity.add(identity);
    }
  }
  if(apply&&drafts.length){
    db.doctors.sort((a,b)=>a.city.localeCompare(b.city)||a.name.localeCompare(b.name));
    fs.writeFileSync('assets/directory.json',JSON.stringify(db,null,2)+'\n');
    let sitemap=fs.readFileSync('sitemap.xml','utf8');
    const day=new Date().toISOString().slice(0,10);
    for(const d of drafts){
      const u=SITE+d.url;
      if(!sitemap.includes('<loc>'+u+'</loc>'))sitemap=sitemap.replace('</urlset>','  <url><loc>'+u+'</loc><lastmod>'+day+'</lastmod></url>\n</urlset>');
    }
    fs.writeFileSync('sitemap.xml',sitemap);
  }
  report({found:links.size,known:links.size-newLinks.length,pending:newLinks.length,drafts,deferred,sources,sourceFailures,coverage:sourceFailures.length?'partial':'all sources available',applied:apply});
  if(!apply)console.log('Dry run: no files changed.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(e=>{console.error(e);process.exitCode=1;});
export {parseDoctorUrl,extractDoctorLinks,extractDoctorName,escapeHtml,slug,normalizedCitySlug,doctorIdentity,isAlreadyListedByIdentity};