import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const home=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../assets/home/landing.css",import.meta.url),"utf8");
const report=readFileSync(new URL("../functions/api/analytics-report.js",import.meta.url),"utf8");
for(const route of ["https://slashcure.com/doctors","https://slashcure.com/hospitals"]){
  assert(home.includes('href="'+route+'"'),"Homepage must link to verified Slashcure route "+route);
}
assert(home.includes('aria-label="Open healthcare directories on Slashcure"'),"Homepage needs accessible referral actions");
assert(css.includes(".home-care-actions")&&css.includes("@media(max-width:540px)"),"Referral actions must be responsive");
assert(report.includes("page_path LIKE '%/health-news/%'"),"News articles must be included in private conversion reports");
assert(report.includes("page_path NOT LIKE '%/health-news/'"),"Category landing page must be excluded from article report");
assert(report.includes("requireOptionalAccess")&&report.includes("constantTimeEqual"),"Private report access protections must remain");
console.log("PASS: homepage referral calls to action, article report and private access checks.");
