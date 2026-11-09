import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const api=readFileSync(new URL("../functions/api/analytics-report.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../analytics/index.html",import.meta.url),"utf8");
const lib=readFileSync(new URL("../functions/_lib/analytics.js",import.meta.url),"utf8");
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert(scripts.length>0,"Dashboard must contain inline script.");
for(const script of scripts)new Function(script);
for(const key of ["topDoctors","topHospitals","visitorGeography"]){
  assert(api.includes(key),"Private API missing "+key);
}
for(const id of ["top-doctors","top-hospitals","referral-rate","whatsapp-rate","export-summary"]){
  assert(html.includes('id="'+id+'"'),"Missing private dashboard control "+id);
}
assert(api.includes("GLOB '/doctors/*/dr-*'"),"Must exclude doctor directory pages.");
assert(api.includes("GLOB '/hospitals/*/*/'"),"Must rank hospital profiles.");
assert(html.includes("csvField"),"CSV field injection protection required.");
assert(html.includes("latestReport"),"Export should use last authenticated report.");
assert(!api.includes("visitor_ip")&&!api.includes("latitude"),"No precise visitor data in reports.");
assert(lib.includes("lakhi-ghulam-shah")&&lib.includes("pano-aqil"),"Smaller cities must be classified.");
for(const id of ["compare-page-cities","compare-visitor-cities"])assert(html.includes('id="'+id+'"'),"Missing comparison section "+id);
assert(html.includes("Traffic by Slashpromo page city"),"Page-content city label must be explicit.");
assert(html.includes("Estimated visitor cities"),"Visitor location label must be explicit.");
assert(api.includes("WHEN page_path='/' THEN 'homepage'"),"Homepage must be counted separately.");
assert(api.includes("THEN 'directories' ELSE city END"),"National directory traffic must be separated.");
assert(api.includes("GROUP BY 1 ORDER BY views DESC"),"Page-grouped SQL must aggregate by derived content group.");
assert(html.includes("Homepage, nationwide directories and other pages"),"Other filter must disclose combined scope.");
assert(html.includes("pageCityLabel(r.city)"),"Page-group labels must be human-readable.");
console.log("PASS: dashboard syntax, page-city vs visitor-origin comparison, homepage and directory splits, CSV and privacy invariants.");
