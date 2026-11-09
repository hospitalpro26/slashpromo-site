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
console.log("PASS: dashboard script syntax, authenticated aggregate provider rankings, CSV export, city classification and privacy invariants.");
