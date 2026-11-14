import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {onRequestPost} from "../functions/api/ai-discovery.js";

const directory=JSON.parse(readFileSync(new URL("../assets/directory.json",import.meta.url),"utf8"));
let aiCalls=0;
async function search(question,enableAi=false){
  const request=new Request("https://slashpromo.com/api/ai-discovery",{method:"POST",headers:{"content-type":"application/json","origin":"https://slashpromo.com"},body:JSON.stringify({question})});
  const response=await onRequestPost({request,env:{
    ASSETS:{fetch:async()=>new Response(JSON.stringify(directory))},
    AI_DISCOVERY_ENABLED:enableAi?"true":"false",
    AI:{run:async()=>{aiCalls++;return {response:'{"query":"general surgeon in Lahore","city":"Lahore"}'}}}
  }});
  assert.equal(response.status,200,question);
  return response.json();
}
const arthritis=await search("Who treats arthritis in Sukkur?",true);
assert.equal(arthritis.suggestedSpecialty,"rheumatologist");
assert(arthritis.results.some(r=>/rheumatolog/i.test(r.specialty)),"Sukkur rheumatologist should be discoverable");
assert(arthritis.results.every(r=>r.city==="Sukkur"&&/rheumatolog/i.test(r.specialty)));
assert(arthritis.message.includes("not a diagnosis"));
assert.equal(aiCalls,0,"General symptom text must not reach optional generative model");

const diabetes=await search("Diabetes doctor in Ratodero");
assert.equal(diabetes.suggestedSpecialty,"consultant physician");
assert(diabetes.results.some(r=>r.name==="Dr. Nadia Khan Arbani"));
assert(diabetes.results.every(r=>r.city==="Ratodero"&&!/surgeon/i.test(r.specialty)));

const breathing=await search("سانس کے ڈاکٹر گھوٹکی میں");
assert.equal(breathing.suggestedSpecialty,"pulmonologist");
assert(breathing.results.some(r=>r.name==="Dr. Imran Ali Kalwar"));
assert(breathing.results.every(r=>r.city==="Ghotki"));

const child=await search("بچوں کا ڈاکٹر شکارپور میں");
assert(child.results.every(r=>r.city==="Shikarpur"&&!/surgeon/i.test(r.specialty)));
const thyroid=await search("thyroid problems in Ratodero");
assert.equal(thyroid.suggestedSpecialty,"consultant physician");
assert(thyroid.results.every(r=>r.city==="Ratodero"&&!/surgeon/i.test(r.specialty)));

const explicit=await search("physiotherapist for back pain in Sukkur");
assert.equal(explicit.suggestedSpecialty,null,"Explicit specialty outranks symptom routing");
assert(explicit.results.every(r=>/physiotherap|rehabilitation/i.test(r.specialty)));

for(const phrase of ["severe shortness of breath in Sukkur","chest pain in Sukkur","سانس نہیں آ رہی","سینے میں شدید درد"]){
  const response=await search(phrase);
  assert.equal(response.urgent,true,phrase);
  assert.equal(response.results.length,0,phrase);
}

const unknown=await search("unknown mysterious problem in Sukkur");
assert.equal(unknown.results.length,0,"Unknown concerns must not yield arbitrary specialists");
console.log("PASS: conservative English/Urdu symptom routing, city and explicit-specialty precedence, emergency guidance, privacy.");
