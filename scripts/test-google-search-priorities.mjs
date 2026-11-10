/* Search-result snippet and JSON-LD regression tests. Read-only, no network or publishing. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base="https://slashpromo.com/";
const entries=[
  {path:"hospitals/sukkur/red-crescent-hospital-sukkur/",entity:"Red Crescent Hospital",loc:"Minara Road"},
  {path:"hospitals/sukkur/dr-shahid-mirani-hospital-sukkur/",entity:"Dr. Shahid Mirani Hospital",loc:"Teer Chowk"},
  {path:"doctors/lahore/dr-muhammad-umair-arshad/",entity:"Dr. Muhammad Umair Arshad",loc:"Lahore"},
  {path:"doctors/sukkur/dr-naveed-ahmed-mahar/",entity:"Dr. Naveed Ahmed Mahar",loc:"Sukkur"}
];
const sitemap=readFileSync(new URL("../sitemap.xml", import.meta.url),"utf8");
const titles=new Set(),descriptions=new Set();
for(const e of entries){
  const html=readFileSync(new URL("../"+e.path+"index.html",import.meta.url),"utf8");
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1]?.replaceAll("&amp;","&");
  const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert(title&&title.includes(e.entity),e.path+" missing entity in title");
  assert(title.length<=70,e.path+" title too long");
  assert(desc&&desc.length>=90&&desc.length<=180,e.path+" description size");
  assert(desc.includes(e.loc),e.path+" location absent in snippet");
  assert(!titles.has(title)&&!descriptions.has(desc),"Duplicate priority SEO snippets");
  titles.add(title);descriptions.add(desc);
  assert(html.includes('rel="canonical" href="'+base+e.path+'"'),e.path+" invalid canonical");
  assert(html.includes('content="index,follow,max-image-preview:large"'),e.path+" indexing directive changed");
  const titleRaw=title.replaceAll("&","&amp;");
  assert(html.includes('property="og:title" content="'+titleRaw+'"'),e.path+" OG title mismatch");
  assert(html.includes('property="og:description" content="'+desc+'"'),e.path+" OG description mismatch");
  assert(sitemap.includes("<loc>"+base+e.path+"</loc><lastmod>2026-11-10</lastmod>"),e.path+" stale sitemap date");
  const raw=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert(raw.length>=1,e.path+" missing structured data");
  const data=raw.map(m=>JSON.parse(m[1]));
  assert(data.every(d=>d["@context"]==="https://schema.org"),e.path+" invalid context");
  const nodes=data.flatMap(d=>d["@graph"]||[d]);
  assert(nodes.some(d=>d.description===desc),e.path+" schema/visible snippet description mismatch");
  const idSet=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of html.matchAll(/href="#([^"]+)"/g))assert(idSet.has(m[1]),e.path+" broken anchor #"+m[1]);
  if(e.entity==="Dr. Naveed Ahmed Mahar"){
    const doctor=nodes.find(d=>d["@type"]==="Physician");
    assert(doctor&&doctor.name===e.entity,"Urologist schema absent");
    assert(doctor.jobTitle==="Urologist" && doctor.medicalSpecialty==="Urology","Urology specialty mismatch");
    assert(doctor.sameAs?.[0]==="https://slashcure.com/urologists/sukkur/dr-naveed-ahmed-mahar","Unexpected Slashcure URL");
    assert(html.includes(doctor.sameAs[0]),"Structured link does not appear on public page");
    assert(nodes.some(d=>d["@type"]==="BreadcrumbList"),"Missing visible-path breadcrumbs");
  }
  if(e.path.includes("red-crescent")||e.path.includes("mirani"))
    assert(html.includes("not been independently"),"Hospital phone verification disclaimer removed");
}
console.log("PASS: four priority SEO snippets, location relevance, unchanged canonical/indexability, sitemap dates, JSON-LD consistency, verified Slashcure link, public telephone disclaimer, and intra-page anchors.");
