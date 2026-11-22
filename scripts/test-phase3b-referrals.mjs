import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const cases=[
["doctors/sukkur/rheumatologists/index.html",["https://slashcure.com/rheumatologists/sukkur/dr-bashir-ahmed-khoso"]],
["sukkur/health-topics/endoscopy-consultations/index.html",["https://slashcure.com/consultant-physicians/sukkur/dr-kirpal-das-makheja","https://slashcure.com/gastroenterologists/sukkur/dr-murk-channa"]],
["sukkur/health-topics/breathing-and-lung-concerns/index.html",["https://slashcure.com/pulmonologists/sukkur/dr-riaz-hussain-hakro","https://slashcure.com/pulmonologists/sukkur/dr-muhammad-nasir-soomro"]]
];
const css=readFileSync("assets/provider-referral-path.css","utf8");
assert(css.includes("@media(max-width:560px)")&&css.includes(":focus-visible"),"Referral paths need mobile and keyboard styles");
for(const [file,links] of cases){
 const content=readFileSync(file,"utf8");
 assert(content.includes('class="sp-referral-path"'),"Missing visible referral path: "+file);
 assert(content.includes("/assets/provider-referral-path.css"),"Styles missing: "+file);
 assert.equal((content.match(/class="sp-referral-path"/g)||[]).length,1,"Duplicate referral section: "+file);
 assert(content.includes("/assets/site.js"),"Existing first-party analytics loader missing: "+file);
 for(const url of links)assert(content.includes('href="'+url+'"'),"Expected published Slashcure profile missing: "+url);
 assert(content.includes('rel="noopener noreferrer"'),"Outbound links should be safe");
}
console.log("PASS: three non-destructive, trackable, keyboard-friendly healthcare referral paths");
