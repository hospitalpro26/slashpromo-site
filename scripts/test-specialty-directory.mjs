/* Regression checks for the nationwide specialty directory. No network or publishing. */
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("specialties/index.html","utf8");
const js=fs.readFileSync("assets/specialty-directory.js","utf8");
const sitemap=fs.readFileSync("sitemap.xml","utf8");
const homepage=fs.readFileSync("index.html","utf8");
const doctorsPage=fs.readFileSync("doctors/index.html","utf8");
const db=JSON.parse(fs.readFileSync("assets/directory.json","utf8"));
assert.equal(db.doctors.length>0,true,"Directory data is required");
assert.ok(html.includes('<link rel="canonical" href="https://slashpromo.com/specialties/">'),"Canonical must be exact");
assert.ok(html.includes('id="specialtyQuery"')&&html.includes('id="specialtyCity"')&&html.includes('id="specialtyCategory"'),"Search filters must exist");
assert.ok(html.includes('src="/assets/specialty-directory.js'),"Browser script must load");
assert.ok(sitemap.includes("<loc>https://slashpromo.com/specialties/</loc>"),"Sitemap URL required");
assert.ok(homepage.includes('href="/specialties/"'),"Homepage should link to specialty directory");
assert.ok(doctorsPage.includes('href="/specialties/"'),"Doctor directory should link to specialties");
const match=js.match(/const groups=(\[[\s\S]*?\]);\s*const clean=/);
assert.ok(match,"Static specialty taxonomy must exist");
const groups=Function("return "+match[1])();
assert.equal(groups.length,20,"Expected reviewed specialty taxonomy");
assert.equal(new Set(groups.map(g=>g.id)).size,groups.length,"No duplicate specialty IDs");
for(const g of groups){
 assert.ok(g.id&&g.name&&g.urdu&&g.match instanceof RegExp,"Every specialty must have a name, Urdu label and regex");
 assert.ok(db.doctors.some(d=>g.match.test(d.specialty||"")),"Specialty must have at least one existing doctor: "+g.name);
}
const byId=id=>groups.find(g=>g.id===id);
assert.ok(byId("gynecology").match.test("Gynecologist & Obstetrician"),"Gynecology matching");
assert.ok(byId("gynecology").match.test("Gynaecologist"),"Gynaecology spelling matching");
assert.ok(byId("cardiology").match.test("Consultant Cardiologist"),"Cardiology matching");
assert.ok(byId("physiotherapy").match.test("Consultant Physiotherapist"),"Physiotherapy matching");
assert.equal(byId("paediatrics").match.test("Consultant Paediatric Surgeon"),false,"Child surgeons not equivalent to paediatricians");
assert.ok(js.includes("ماہر امراض قلب")||js.includes("دل کا ڈاکٹر"),"Urdu heart alias");
assert.ok(js.includes("بچوں کا ڈاکٹر"),"Urdu child-health alias");
const routes=[...html.matchAll(/href="(\/[^"#?]*)"/g)].map(m=>m[1]);
for(const p of routes){if(p!=="/")assert.ok(sitemap.includes("<loc>https://slashpromo.com"+p+"</loc>"),"Linked page missing sitemap "+p);}
assert.ok(js.includes("safePath(d.url)"),"Only structured SlashPromo doctor routes allowed");
assert.ok(!js.includes("innerHTML"),"Public doctor names must be rendered with textContent, not HTML");
console.log("PASS: 20 verified-data specialty groups, Urdu labels, sitemap links, SEO canonical and safe doctor rendering.");
