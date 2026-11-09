import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const entries=[
  ["hospitals/sukkur/red-crescent-hospital-sukkur/index.html","Red Crescent Hospital Sukkur","red-crescent-quick-answer"],
  ["doctors/lahore/dr-muhammad-umair-arshad/index.html","Dr. Muhammad Umair Arshad","umair-quick-answer"],
  ["hospitals/sukkur/dr-ziauddin-hospital-sukkur/index.html","Dr. Ziauddin Hospital Sukkur","ziauddin-quick-answer"],
  ["hospitals/sukkur/dr-shahid-mirani-hospital-sukkur/index.html","Dr. Shahid Mirani Hospital Sukkur","mirani-quick-answer"],
  ["sukkur/index.html","Sukkur","sukkur-quick-start-title"]
];
const sitemap=readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
const style=readFileSync(new URL("../assets/seo-patient-guide.css",import.meta.url),"utf8");
assert(style.includes("@media(max-width:620px)"),"New patient guidance must adapt on mobile");
const titles=new Set(),descriptions=new Set();
const htmls=entries.map(([path,label,guide])=>{
  const html=readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/&amp;/g,"&");
  const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert(title&&desc,label+" missing title or description");
  assert(title.includes(label === "Sukkur"?"Sukkur":label),label+" title lacks entity");
  assert(title.length<=70,label+" has overly long title");
  assert(desc.length>=90&&desc.length<=180,label+" description length out of range");
  assert(!titles.has(title)&&!descriptions.has(desc),"Titles and descriptions must be unique");
  titles.add(title);descriptions.add(desc);
  assert(html.includes('href="/assets/seo-patient-guide.css?v=20261109-top5-seo"'),label+" missing responsive CSS");
  assert(html.includes('id="'+guide+'"'),label+" missing visible patient answer");
  assert(html.includes("Slashcure")||html.includes("slashcure.com"),label+" needs published Slashcure connection");
  const pathUrl="https://slashpromo.com/"+path.slice(0,-"index.html".length);
  assert(html.includes('rel="canonical" href="'+pathUrl+'"'),label+" canonical mismatch");
  assert(sitemap.includes("<loc>"+pathUrl+"</loc>"),label+" absent from sitemap");
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert(schemas.length>=1,label+" missing structured data");
  for(const m of schemas){const schema=JSON.parse(m[1]);assert(schema["@context"]==="https://schema.org");}
  assert(html.includes('property="og:title"')&&html.includes('property="og:description"'),label+" missing OpenGraph snippets");
  if(label!=="Sukkur")assert(html.includes("sp-seo-patient-guide"),label+" guide missing markup");
  if(path.includes("red-crescent")||path.includes("dr-shahid-mirani"))
    assert(html.includes("not been independently"),label+" must disclose unverified phone number");
  return {path,label,html,title,desc};
});
for(const {path,label,html} of htmls){
 const anchors=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const m of html.matchAll(/href="#([^"]+)"/g))
   assert(anchors.has(m[1]),label+" broken jump link #"+m[1]);
 const required=path.includes("red-crescent")?["/doctors/sukkur/dr-tofique-ahmed-kamboh/","/doctors/sukkur/dr-aftab-ahmed-mughal/"]:
 path.includes("umair")?["/lahore/","/doctors/"]:
 path.includes("ziauddin")?["/doctors/sukkur/dr-naveed-ahmed-mahar/","/doctors/sukkur/dr-aisha-aman/"]:
 path.includes("mirani")?["/doctors/sukkur/dr-ammara-bhatti/","/doctors/sukkur/dr-muhammad-nasir-soomro/"]:
 ["/hospitals/sukkur/red-crescent-hospital-sukkur/","/hospitals/sukkur/dr-ziauddin-hospital-sukkur/","/hospitals/sukkur/dr-shahid-mirani-hospital-sukkur/"];
 for(const destination of required)assert(html.includes('href="'+destination+'"'),label+" missing internal link "+destination);
}
console.log("PASS: five unique SEO snippets, accurate patient contact disclaimers, relevant internal links, valid JSON-LD, canonical URLs, sitemap and mobile guides.");
