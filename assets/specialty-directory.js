/* Nationwide specialties: grouped from existing directory specialties; no invented doctor credentials. */
(() => {
"use strict";
const groups=[
{id:"physicians",name:"Consultant Physicians & General Medicine",urdu:"ماہر امراض باطنی",description:"Internal medicine, general physicians and family medicine",aliases:["physician","general physician","internal medicine","family doctor","لیڈی ڈاکٹر"],match:/physician|internal medicine|family medicine|postgraduate trainee/i},
{id:"cardiology",name:"Cardiologists",urdu:"دل کا ڈاکٹر",description:"Heart and cardiovascular specialists",aliases:["heart doctor","heart specialist","cardiac specialist","ماہر امراض قلب"],match:/cardiolog|cardiac/i},
{id:"paediatrics",name:"Paediatricians",urdu:"بچوں کا ڈاکٹر",description:"Child health and neonatal medicine",aliases:["pediatrician","child specialist","ماہر امراض اطفال"],match:/paediatrician|pediatrician|child specialist|neonatal care/i},
{id:"gynecology",name:"Gynecologists & Obstetricians",urdu:"خواتین کا ڈاکٹر",description:"Women's health, pregnancy and obstetric services",aliases:["gynaecologist","gynae","ماہر امراض نسواں"],match:/gyn(?:a)?ecolog|obstetric/i},
{id:"physiotherapy",name:"Physiotherapists",urdu:"فزیوتھراپسٹ",description:"Physiotherapy and rehabilitation",aliases:["physical therapy","physiotherapy","فزیوتھراپی"],match:/physiotherap|rehabilitation/i},
{id:"gastroenterology",name:"Gastroenterologists",urdu:"معدے کا ڈاکٹر",description:"Digestive, gastroenterology and liver specialists",aliases:["liver specialist","hepatologist","معدہ","جگر"],match:/gastroenterolog|hepatolog/i},
{id:"orthopedics",name:"Orthopedic Surgeons",urdu:"ہڈیوں کا ڈاکٹر",description:"Bone, joint, orthopedic and limb surgery",aliases:["orthopaedic","bone doctor","جوڑوں کا ڈاکٹر"],match:/orthop|limb reconstruction/i},
{id:"general-surgery",name:"General & Laparoscopic Surgeons",urdu:"جنرل سرجن",description:"General surgery and minimally invasive procedures",aliases:["laparoscopy","general surgeon","لیپروسکوپک سرجری"],match:/(general|laparoscop|bariatric|thoracic|oncological)\s*(?:&\s*)?(?:laparoscop\s*)?surgeon|general.*surg|laparoscop|thoracic surgeon/i},
{id:"paediatric-surgery",name:"Paediatric Surgeons",urdu:"بچوں کا سرجن",description:"Surgical care for children",aliases:["pediatric surgeon","child surgeon"],match:/p[a]?ediatric.*surgeon|pediatric.*surgeon/i},
{id:"pulmonology",name:"Pulmonologists & Chest Specialists",urdu:"پھیپھڑوں کا ڈاکٹر",description:"Lung and respiratory specialists",aliases:["chest specialist","lung specialist","سانس کا ڈاکٹر"],match:/pulmonolog|chest specialist/i},
{id:"neurology",name:"Neurologists",urdu:"ماہر امراض اعصاب",description:"Neurology and neurophysician care",aliases:["neurophysician","nerves doctor"],match:/neurolog|neurophysician/i},
{id:"neurosurgery",name:"Neurosurgeons",urdu:"نیورو سرجن",description:"Brain, spine and neurosurgical care",aliases:["brain surgeon","spine surgeon"],match:/neurosurg|brain and spine surgeon/i},
{id:"rheumatology",name:"Rheumatologists",urdu:"رمیٹالوجسٹ",description:"Rheumatology and autoimmune joint care",aliases:["arthritis specialist"],match:/rheumatolog/i},
{id:"psychiatry",name:"Psychiatrists",urdu:"ماہر نفسیات",description:"Mental health and psychiatric care",aliases:["mental health doctor","psychiatrist"],match:/psychiatr/i},
{id:"urology",name:"Urologists",urdu:"ماہر امراضِ گردہ و مثانہ",description:"Urology and urinary tract care",aliases:["urologist","urinary specialist"],match:/urolog/i},
{id:"dentistry",name:"Dentists",urdu:"دانتوں کا ڈاکٹر",description:"Dentistry and prosthodontic care",aliases:["dental","prosthodontist"],match:/dentist|prosthodont/i},
{id:"dermatology",name:"Dermatologists",urdu:"جلد کا ڈاکٹر",description:"Skin and dermatology care",aliases:["skin doctor"],match:/dermatolog/i},
{id:"endocrinology",name:"Endocrinologists & Diabetologists",urdu:"شوگر اور ہارمونز کے ڈاکٹر",description:"Hormone and diabetes specialists",aliases:["diabetes specialist","endocrinologist"],match:/endocrinolog|diabetolog/i},
{id:"hematology",name:"Hematologists",urdu:"خون کے امراض کے ماہر",description:"Blood disorders and hematology",aliases:["blood specialist","haematologist"],match:/hematolog|haematolog/i},
{id:"ent",name:"ENT Specialists",urdu:"ناک کان گلے کا ڈاکٹر",description:"Ear, nose and throat care",aliases:["otolaryngology","ent doctor"],match:/\bENT\b|otolaryngolog/i}
];
const clean=s=>String(s||"").normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,"").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[^a-z0-9\u0600-\u06ff]+/g," ").trim();
const query=document.getElementById("specialtyQuery"),city=document.getElementById("specialtyCity"),category=document.getElementById("specialtyCategory"),status=document.getElementById("specialtyStatus"),results=document.getElementById("specialtyResults"),cards=document.getElementById("specialtyCards"),more=document.getElementById("specialtyMore");let doctors=[],shown=15;
function matches(group,doctor){return group.match.test(doctor.specialty||"")}
function kind(doctor){return groups.filter(g=>matches(g,doctor)).map(g=>g.id)}
function safePath(s){return typeof s==="string"&&/^\/doctors\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(s)}
function el(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n}
function matchingGroup(g,q){return !q||[g.name,g.urdu,...g.aliases].some(v=>clean(v).includes(q)||q.includes(clean(v)))}
function render(){
const q=clean(query.value),c=city.value,k=category.value;const scoped=groups.filter(g=>matchingGroup(g,q)&&(!k||g.id===k)).map(g=>({g,count:doctors.filter(d=>matches(g,d)&&(!c||d.city===c)).length})).filter(x=>x.count>0);
cards.replaceChildren();for(const {g,count} of scoped){const article=el("article","sp-specialty-card");const h=el("h2","",g.name);const ur=el("p","",g.urdu);ur.lang="ur";ur.dir="rtl";article.append(h,ur,el("p","",g.description));const b=el("button","",count+" listed "+(count===1?"doctor":"doctors")+" — explore ↗");b.type="button";b.setAttribute("aria-pressed",String(k===g.id));b.addEventListener("click",()=>{category.value=k===g.id?"":g.id;shown=15;render();document.getElementById("resultsTitle").scrollIntoView({behavior:"smooth",block:"start"})});article.append(b);cards.append(article)}
const eligible=doctors.filter(d=>(!c||d.city===c)&&(!k||kind(d).includes(k))&&(!q||clean([d.name,d.city,d.hospital,d.specialty].join(" ")).includes(q)||kind(d).some(id=>{const g=groups.find(x=>x.id===id);return g&&matchingGroup(g,q)})));
eligible.sort((a,b)=>a.city.localeCompare(b.city)||a.name.localeCompare(b.name));status.textContent=eligible.length+" matching public doctor "+(eligible.length===1?"profile":"profiles");results.replaceChildren();
for(const d of eligible.slice(0,shown)){const article=el("article","sp-specialty-doctor");article.append(el("h3","",d.name),el("p","",(d.specialty||"Doctor")+" · "+d.city));if(d.hospital)article.append(el("p","",d.hospital));const a=el("a","", "View SlashPromo doctor profile ↗");a.href=d.url;article.append(a);results.append(article)}
more.hidden=eligible.length<=shown;more.textContent="Show more ("+(eligible.length-shown)+" remaining)";
if(!eligible.length)results.append(el("p","sp-specialty-note","No doctor profiles match these filters. Try another city or specialty."));
}
fetch("/assets/directory.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Directory unavailable");return r.json()}).then(data=>{if(!Array.isArray(data.doctors))throw Error("Invalid directory");doctors=data.doctors.filter(d=>d&&safePath(d.url)&&typeof d.city==="string"&&typeof d.specialty==="string");const cities=[...new Set(doctors.map(d=>d.city))].sort();for(const v of cities){let o=el("option","",v);o.value=v;city.append(o)}for(const g of groups){if(!doctors.some(d=>matches(g,d)))continue;let o=el("option","",g.name);o.value=g.id;category.append(o)}const params=new URLSearchParams(location.search);if(params.has("q"))query.value=params.get("q").slice(0,100);if(params.has("city")&&cities.includes(params.get("city")))city.value=params.get("city");if(params.has("specialty")&&groups.some(g=>g.id===params.get("specialty")))category.value=params.get("specialty");render()}).catch(()=>{status.textContent="Directory temporarily unavailable. Browse the static specialty links above or retry later."});
document.getElementById("specialtyFilters").addEventListener("submit",e=>e.preventDefault());for(const control of [query,city,category])control.addEventListener("input",()=>{shown=15;render()});more.addEventListener("click",()=>{shown+=15;render()});
})();
