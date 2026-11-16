import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {onRequestPost} from "../functions/api/ai-discovery.js";

const directory=JSON.parse(readFileSync(new URL("../assets/directory.json",import.meta.url)));
const scheduleData=JSON.parse(readFileSync(new URL("../assets/opd-schedules.json",import.meta.url)));
const monday=new Date("2026-11-16T09:00:00Z");
async function search(question,todayOnly=false,now=monday){
  const request=new Request("https://slashpromo.com/api/ai-discovery",{method:"POST",headers:{"content-type":"application/json","origin":"https://slashpromo.com"},body:JSON.stringify({question,todayOnly})});
  const env={ASSETS:{fetch:async request=>new Response(JSON.stringify(new URL(request.url).pathname.endsWith("opd-schedules.json")?scheduleData:directory),{status:200})}};
  const response=await onRequestPost({request,env,now});
  assert.equal(response.status,200);
  return response.json();
}
const normal=await search("consultant physician in Ratodero");
assert(normal.results.some(r=>r.name==="Dr. Nadia Khan Arbani"&&r.opdUrl.endsWith("#clinics")));
const today=await search("consultant physician in Ratodero",true);
assert(today.results.some(r=>r.name==="Dr. Nadia Khan Arbani"&&r.scheduledToday?.checkedAt==="2026-11-16"));
assert(today.results.every(r=>r.scheduledToday),"Today-only results must have a fresh schedule");
const expired=await search("consultant physician in Ratodero",true,new Date("2026-12-07T09:00:00Z"));
assert.equal(expired.results.length,0,"Expired OPD snapshots must not imply today's attendance");
assert.match(expired.message,/does not mean other doctors are unavailable/i);
const suk=await search("cardiologist in Sukkur");
assert(suk.results.every(r=>!r.scheduledToday),"An ordinary published profile is not itself evidence of today's timetable");
assert(suk.results.some(r=>r.opdUrl?.endsWith("#clinics")),"Published direct Slashcure doctor profiles should link to OPD sections");
console.log("PASS: sourced OPD links, fresh-timetable-only filtering, expiry safety, and no invented attendance.");
